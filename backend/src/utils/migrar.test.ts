// AUD-07: migrador que substitui o `drizzle-kit push` do entrypoint.
//
// Cada caso sobe um Postgres descartável (PGlite) e monta o banco do jeito
// que ele pode estar em produção: vazio, criado por push (sem histórico) em
// várias versões, ou divergente.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { Pool } from 'pg';

import {
  PASTA_MIGRACOES,
  RemocoesPendentesError,
  SchemaDivergenteError,
  migrarBanco,
  planejarMigracao,
} from '../database/migrar';

const PORTA = 54330;
const journal = JSON.parse(readFileSync(path.join(PASTA_MIGRACOES, 'meta', '_journal.json'), 'utf8'));
const TAGS: string[] = journal.entries.map((e: { tag: string }) => e.tag);
const silencioso = () => undefined;

// Banco "criado por push": as migrações escolhidas (um índice final ou a
// lista de índices) aplicadas direto, sem a tabela de histórico do drizzle
// (o push nunca a cria).
async function comBanco(ate: number | number[], corpo: (pool: Pool, db: PGlite) => Promise<void>): Promise<void> {
  const db = await PGlite.create();
  const indices = Array.isArray(ate) ? ate : TAGS.map((_, i) => i).filter((i) => i <= ate);
  for (const tag of indices.map((i) => TAGS[i])) {
    const sql = readFileSync(path.join(PASTA_MIGRACOES, `${tag}.sql`), 'utf8');
    for (const comando of sql.split('--> statement-breakpoint')) {
      if (comando.trim()) await db.exec(comando);
    }
  }
  const servidor = new PGLiteSocketServer({ db, port: PORTA, host: '127.0.0.1' });
  await servidor.start();
  const pool = new Pool({ connectionString: `postgres://postgres:postgres@127.0.0.1:${PORTA}/postgres?sslmode=disable`, max: 1 });
  try {
    await corpo(pool, db);
  } finally {
    await pool.end();
    await servidor.stop();
    await db.close();
  }
}

async function historico(pool: Pool): Promise<{ hash: string; created_at: string }[]> {
  const { rows } = await pool.query(`SELECT to_regclass('drizzle.__drizzle_migrations')::text AS t`);
  if (!rows[0].t) return [];
  return (await pool.query('SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at')).rows;
}

async function colunas(pool: Pool, tabela: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [tabela]
  );
  return rows.map((r) => r.column_name).sort();
}

test('Migrador (AUD-07)', async (t) => {
  await t.test('banco vazio: aplica todas as migrações e registra o histórico', async () => {
    await comBanco(-1, async (pool) => {
      const plano = await migrarBanco(pool, { log: silencioso });
      assert.equal(plano.estado, 'vazio');
      assert.deepEqual(plano.pendentes, TAGS);
      assert.equal((await historico(pool)).length, TAGS.length);
      assert.ok((await colunas(pool, 'analises')).includes('arquivada_em'));

      const denovo = await migrarBanco(pool, { log: silencioso });
      assert.equal(denovo.estado, 'com_historico');
      assert.deepEqual(denovo.pendentes, []);
      assert.equal((await historico(pool)).length, TAGS.length);
    });
  });

  await t.test('criado por push na última versão: só baseline, nada roda e os dados ficam', async () => {
    await comBanco(TAGS.length - 1, async (pool) => {
      await pool.query(`INSERT INTO users (nome, email, senha, cidade, estado) VALUES ('A', 'a@exemplo.test', 'x', 'Ibirubá', 'RS')`);

      const plano = await migrarBanco(pool, { log: silencioso });
      assert.equal(plano.estado, 'criado_por_push');
      assert.deepEqual(plano.baseline, TAGS);
      assert.deepEqual(plano.pendentes, []);

      // Hash e created_at iguais aos que o migrator do drizzle grava: na
      // próxima execução ele não tenta reaplicar nada.
      const linhas = await historico(pool);
      assert.deepEqual(linhas.map((l) => Number(l.created_at)), journal.entries.map((e: { when: number }) => e.when));
      assert.ok(linhas.every((l) => /^[0-9a-f]{64}$/.test(l.hash)));
      assert.equal((await migrarBanco(pool, { log: silencioso })).pendentes.length, 0);

      const { rows } = await pool.query('SELECT email FROM users');
      assert.deepEqual(rows, [{ email: 'a@exemplo.test' }]);
    });
  });

  await t.test('criado por push sem a 0006: baseline até a 0005 e aplica a 0006', async () => {
    await comBanco(5, async (pool) => {
      await pool.query(`INSERT INTO analises_adubacao (uf, cidade, argila, "MO", "CTC_pH7", "P", "metodo_P", "K", "metodo_K", "Ca", "Mg",
        cultura, num_cultivo, rendimento_esperado, sistema_cultivo, tipo_correcao)
        VALUES ('RS', 'Ibirubá', 40, 3, 12, 5, 'Mehlich-1', 80, 'Mehlich-1', 5, 2, 'milho', '1', 8, 'Plantio Direto', 'Gradual')`);

      const plano = await migrarBanco(pool, { log: silencioso });
      assert.deepEqual(plano.baseline, TAGS.slice(0, 6));
      assert.deepEqual(plano.pendentes, ['0006_data_analise_e_arquivamento']);
      assert.ok((await colunas(pool, 'analises_adubacao')).includes('data_analise'));
      assert.equal((await historico(pool)).length, TAGS.length);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM analises_adubacao')).rows[0].n, 1);
    });
  });

  await t.test('push que parou antes de remover o cpf (0004): aplica 0005 e 0006', async () => {
    await comBanco(4, async (pool) => {
      await pool.query(`INSERT INTO users (nome, cpf, email, senha, cidade, estado) VALUES ('A', '000', 'a@exemplo.test', 'x', 'Ibirubá', 'RS')`);

      const plano = await migrarBanco(pool, { log: silencioso });
      assert.deepEqual(plano.baseline, TAGS.slice(0, 5));
      assert.deepEqual(plano.pendentes, TAGS.slice(5));
      assert.ok(!(await colunas(pool, 'users')).includes('cpf'));
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 1);
    });
  });

  // Estado encontrado no banco local do Docker (criado por push): tem a 0006,
  // mas o push nunca rodou os DROP da 0003 e da 0005. Com users.cpf ainda
  // NOT NULL, nenhum cadastro novo funciona.
  const SEM_REMOCOES = [0, 1, 2, 4, 6];
  const CADASTRO_SEM_CPF = `INSERT INTO users (nome, email, senha, cidade, estado) VALUES ('B', 'b@exemplo.test', 'x', 'Ibirubá', 'RS')`;

  await t.test('push que pulou as remoções: sem --aplicar-remocoes, recusa e não mexe em nada', async () => {
    await comBanco(SEM_REMOCOES, async (pool, db) => {
      await pool.query(`INSERT INTO users (nome, cpf, email, senha, cidade, estado) VALUES ('A', '000', 'a@exemplo.test', 'x', 'Ibirubá', 'RS')`);
      // Direto no PGlite: um erro pelo socket derruba a única conexão do pool.
      await assert.rejects(db.query(CADASTRO_SEM_CPF), /null value in column "cpf"/);

      const plano = await planejarMigracao(pool);
      assert.deepEqual(plano.baseline, TAGS);
      assert.deepEqual(plano.reaplicar, ['0003_remove_sistema_efetivo_enum', '0005_remove_cpf_users']);
      assert.deepEqual(plano.sobras, [
        'coluna analises.sistema_efetivo: sistema_efetivo',
        'coluna users.cpf: text',
        'enum sistema_efetivo: CONVENCIONAL, PD_IMPLANTACAO, PD_CONSOLIDADO, PD_COM_RESTRICAO',
      ]);

      await assert.rejects(migrarBanco(pool, { log: silencioso }), (erro: unknown) => {
        assert.ok(erro instanceof RemocoesPendentesError);
        assert.match(erro.message, /users\.cpf/);
        assert.match(erro.message, /--aplicar-remocoes/);
        return true;
      });
      assert.deepEqual(await historico(pool), []);
      assert.ok((await colunas(pool, 'users')).includes('cpf'));
    });
  });

  await t.test('push que pulou as remoções: com --aplicar-remocoes, remove as sobras e o cadastro volta a funcionar', async () => {
    await comBanco(SEM_REMOCOES, async (pool) => {
      await pool.query(`INSERT INTO users (nome, cpf, email, senha, cidade, estado) VALUES ('A', '000', 'a@exemplo.test', 'x', 'Ibirubá', 'RS')`);

      const plano = await migrarBanco(pool, { aplicarRemocoes: true, log: silencioso });
      assert.deepEqual(plano.pendentes, []);
      assert.equal((await historico(pool)).length, TAGS.length);
      assert.ok(!(await colunas(pool, 'users')).includes('cpf'));
      assert.ok(!(await colunas(pool, 'analises')).includes('sistema_efetivo'));
      await pool.query(CADASTRO_SEM_CPF);
      assert.deepEqual((await pool.query('SELECT email FROM users ORDER BY email')).rows.map((r) => r.email), [
        'a@exemplo.test',
        'b@exemplo.test',
      ]);
      // Agora o banco tem histórico: a próxima execução não faz nada.
      assert.equal((await migrarBanco(pool, { log: silencioso })).estado, 'com_historico');
    });
  });

  await t.test('se uma remoção falhar no meio, a transação inteira é desfeita', async () => {
    await comBanco(SEM_REMOCOES, async (pool) => {
      // Sem a constraint, o "DROP CONSTRAINT users_cpf_unique" da 0005 falha
      // depois que a 0003 já rodou.
      await pool.query('ALTER TABLE users DROP CONSTRAINT users_cpf_unique');
      await assert.rejects(migrarBanco(pool, { aplicarRemocoes: true, log: silencioso }), /users_cpf_unique/);
      assert.deepEqual(await historico(pool), []);
      assert.ok((await colunas(pool, 'analises')).includes('sistema_efetivo'), 'a 0003 tem de ter sido desfeita');
      assert.ok((await colunas(pool, 'users')).includes('cpf'));
    });
  });

  await t.test('schema divergente: não grava nada e lista a diferença', async () => {
    await comBanco(TAGS.length - 1, async (pool) => {
      await pool.query('ALTER TABLE users ADD COLUMN apelido text');
      await pool.query('ALTER TABLE analises DROP COLUMN arquivada_em');

      await assert.rejects(migrarBanco(pool, { log: silencioso }), (erro: unknown) => {
        assert.ok(erro instanceof SchemaDivergenteError);
        assert.deepEqual(erro.diferencas, ['- coluna analises.arquivada_em: timestamp', '+ coluna users.apelido: text']);
        return true;
      });
      assert.deepEqual(await historico(pool), []);
      assert.ok(!(await colunas(pool, 'analises')).includes('arquivada_em'), 'não pode ter rodado migração');
    });
  });

  await t.test('tipo diferente também conta como divergência', async () => {
    await comBanco(TAGS.length - 1, async (pool) => {
      await pool.query('ALTER TABLE analises ALTER COLUMN "PRNT" TYPE double precision');
      await assert.rejects(planejarMigracao(pool), /coluna analises\.PRNT: float4/);
    });
  });

  await t.test('--verificar (planejarMigracao) não altera o banco', async () => {
    await comBanco(5, async (pool) => {
      const plano = await planejarMigracao(pool);
      assert.equal(plano.estado, 'criado_por_push');
      assert.deepEqual(plano.pendentes, ['0006_data_analise_e_arquivamento']);
      assert.deepEqual(await historico(pool), []);
      assert.ok(!(await colunas(pool, 'analises')).includes('data_analise'));
    });
  });
});
