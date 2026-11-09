// Aplica as migrações de drizzle/ no start do container (AUD-07).
//
// Substitui o `drizzle-kit push` do entrypoint, que comparava o schema.ts
// direto com o banco, ignorava os SQL versionados e, sem TTY, não executava
// as remoções (DROP) que pedem confirmação. Aqui só roda o que está em
// drizzle/*.sql, na ordem do _journal, com o migrator do próprio drizzle-orm
// (o drizzle-kit não vai mais para a imagem).
//
// Banco criado por push não tem a tabela drizzle.__drizzle_migrations. Nesse
// caso o schema do banco é comparado com os snapshots de drizzle/meta, do
// mais novo para o mais velho:
//
// - bate exatamente com o snapshot N: as migrações 0..N são marcadas como
//   aplicadas (baseline) e as seguintes rodam normalmente;
// - tem tudo do snapshot N e sobram só colunas/enums que migrações de
//   remoção até N deveriam ter apagado (o push pulou os DROP): essas
//   migrações precisam ser reaplicadas. Como apagam dados, só rodam com
//   --aplicar-remocoes, dentro da mesma transação do baseline, e a transação
//   é desfeita se o schema final não bater com o snapshot N;
// - qualquer outra diferença: nada é gravado e o start falha listando-a.
//
// Uso:
//   node dist/database/migrar.js                     aplica (start do container)
//   node dist/database/migrar.js --verificar         só mostra o que faria
//   node dist/database/migrar.js --aplicar-remocoes  aceita reaplicar remoções

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';

export const PASTA_MIGRACOES = path.join(__dirname, '..', '..', 'drizzle');

interface Snapshot {
  tables: Record<string, { name: string; columns: Record<string, { name: string; type: string; typeSchema?: string }> }>;
  enums: Record<string, { name: string; values: string[] }>;
}

interface Migracao {
  tag: string;
  quando: number;
  hash: string;
  comandos: string[];
  schema: Set<string>;
}

export interface Plano {
  estado: 'com_historico' | 'vazio' | 'criado_por_push';
  // Marcadas como aplicadas sem rodar (só em criado_por_push).
  baseline: string[];
  // Dentro do baseline: migrações de remoção que o push não executou e que
  // precisam rodar (apagam dados; exigem --aplicar-remocoes).
  reaplicar: string[];
  // O que essas remoções apagam (colunas e enums que sobraram no banco).
  sobras: string[];
  // Rodam depois, pelo migrator do drizzle.
  pendentes: string[];
}

export class SchemaDivergenteError extends Error {
  constructor(public readonly diferencas: string[]) {
    super(
      'O banco não tem histórico de migrações e o schema dele não bate com nenhum snapshot de drizzle/meta. ' +
        'Nada foi alterado. Diferenças em relação ao snapshot mais recente (- falta no banco, + só no banco):\n' +
        diferencas.map((d) => `  ${d}`).join('\n')
    );
    this.name = 'SchemaDivergenteError';
  }
}

export class RemocoesPendentesError extends Error {
  constructor(public readonly plano: Plano) {
    super(
      `O banco foi criado por push e não recebeu as remoções de ${plano.reaplicar.join(', ')}. ` +
        'Elas apagam estes dados:\n' +
        plano.sobras.map((s) => `  ${s}`).join('\n') +
        '\nNada foi alterado. Faça o backup do banco e rode uma vez: node dist/database/migrar.js --aplicar-remocoes'
    );
    this.name = 'RemocoesPendentesError';
  }
}

// Tipo do snapshot → udt_name do information_schema.
const TIPO_POSTGRES: Record<string, string> = {
  boolean: 'bool',
  date: 'date',
  integer: 'int4',
  jsonb: 'jsonb',
  real: 'float4',
  text: 'text',
  timestamp: 'timestamp',
  uuid: 'uuid',
};

function tipoPostgres(tipo: string, typeSchema?: string): string {
  if (tipo.endsWith('[]')) return `_${tipoPostgres(tipo.slice(0, -2), typeSchema)}`;
  if (typeSchema) return tipo; // enum
  const udt = TIPO_POSTGRES[tipo];
  if (!udt) throw new Error(`Tipo "${tipo}" do snapshot sem correspondência em migrar.ts.`);
  return udt;
}

// Schema como um conjunto de linhas comparáveis: colunas com tipo e enums com valores.
function descreverSnapshot(snapshot: Snapshot): Set<string> {
  const linhas = new Set<string>();
  for (const tabela of Object.values(snapshot.tables)) {
    for (const coluna of Object.values(tabela.columns)) {
      linhas.add(`coluna ${tabela.name}.${coluna.name}: ${tipoPostgres(coluna.type, coluna.typeSchema)}`);
    }
  }
  for (const e of Object.values(snapshot.enums)) linhas.add(`enum ${e.name}: ${e.values.join(', ')}`);
  return linhas;
}

function lerMigracoes(pasta: string): Migracao[] {
  const journal = JSON.parse(readFileSync(path.join(pasta, 'meta', '_journal.json'), 'utf8')) as {
    entries: { idx: number; tag: string; when: number }[];
  };
  // Mesmos comandos, hash e created_at que o migrator do drizzle usa.
  const arquivos = readMigrationFiles({ migrationsFolder: pasta });
  return journal.entries.map((entrada, i) => ({
    tag: entrada.tag,
    quando: entrada.when,
    hash: arquivos[i].hash,
    comandos: arquivos[i].sql,
    schema: descreverSnapshot(
      JSON.parse(readFileSync(path.join(pasta, 'meta', `${String(entrada.idx).padStart(4, '0')}_snapshot.json`), 'utf8'))
    ),
  }));
}

type Consulta = Pick<Pool | PoolClient, 'query'>;

async function descreverBanco(banco: Consulta): Promise<Set<string>> {
  const colunas = await banco.query<{ table_name: string; column_name: string; udt_name: string }>(`
    SELECT c.table_name, c.column_name, c.udt_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'`);
  const enums = await banco.query<{ nome: string; valores: string[] }>(`
    SELECT t.typname AS nome, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS valores
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname`);
  const linhas = new Set<string>();
  for (const c of colunas.rows) linhas.add(`coluna ${c.table_name}.${c.column_name}: ${c.udt_name}`);
  for (const e of enums.rows) linhas.add(`enum ${e.nome}: ${e.valores.join(', ')}`);
  return linhas;
}

const faltando = (esperado: Set<string>, banco: Set<string>) => [...esperado].filter((l) => !banco.has(l));

function diferencas(esperado: Set<string>, banco: Set<string>): string[] {
  const linhas = [
    ...faltando(esperado, banco).map((l) => `- ${l}`),
    ...faltando(banco, esperado).map((l) => `+ ${l}`),
  ];
  return linhas.sort((a, b) => a.slice(2).localeCompare(b.slice(2)));
}

async function temHistorico(pool: Pool): Promise<{ existe: boolean; ultimo?: number }> {
  const { rows } = await pool.query<{ tabela: string | null }>(
    `SELECT to_regclass('drizzle.__drizzle_migrations')::text AS tabela`
  );
  if (!rows[0].tabela) return { existe: false };
  const ultimo = await pool.query<{ created_at: string }>(
    'SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1'
  );
  return ultimo.rows.length ? { existe: true, ultimo: Number(ultimo.rows[0].created_at) } : { existe: false };
}

// O banco tem tudo do snapshot N e as sobras são só o que migrações até N
// removeram? Devolve essas migrações, ou null se a sobra não se explica assim.
function remocoesQueExplicam(migracoes: Migracao[], n: number, sobras: string[]): string[] | null {
  const reaplicar: string[] = [];
  const explicadas = new Set<string>();
  for (let i = 1; i <= n; i++) {
    const removidas = sobras.filter((l) => migracoes[i - 1].schema.has(l) && !migracoes[i].schema.has(l));
    if (removidas.length) {
      reaplicar.push(migracoes[i].tag);
      removidas.forEach((l) => explicadas.add(l));
    }
  }
  return sobras.every((l) => explicadas.has(l)) ? reaplicar : null;
}

export async function planejarMigracao(pool: Pool, pasta = PASTA_MIGRACOES): Promise<Plano> {
  const migracoes = lerMigracoes(pasta);
  const tags = migracoes.map((m) => m.tag);
  const historico = await temHistorico(pool);

  if (historico.existe) {
    // Mesma regra do migrator: roda o que for mais novo que o último aplicado.
    const pendentes = migracoes.filter((m) => m.quando > historico.ultimo!).map((m) => m.tag);
    return { estado: 'com_historico', baseline: [], reaplicar: [], sobras: [], pendentes };
  }

  const banco = await descreverBanco(pool);
  if (banco.size === 0) {
    return { estado: 'vazio', baseline: [], reaplicar: [], sobras: [], pendentes: tags };
  }

  // Primeiro um snapshot idêntico: o banco está numa versão conhecida e o
  // resto roda como qualquer migração pendente.
  for (let n = migracoes.length - 1; n >= 0; n--) {
    if (diferencas(migracoes[n].schema, banco).length === 0) {
      return { estado: 'criado_por_push', baseline: tags.slice(0, n + 1), reaplicar: [], sobras: [], pendentes: tags.slice(n + 1) };
    }
  }
  // Depois o caso do push que pulou remoções: tudo do snapshot N presente,
  // mais sobras que só migrações de remoção até N explicam.
  for (let n = migracoes.length - 1; n >= 0; n--) {
    if (faltando(migracoes[n].schema, banco).length) continue;
    const sobras = faltando(banco, migracoes[n].schema).sort();
    const reaplicar = remocoesQueExplicam(migracoes, n, sobras);
    if (reaplicar) {
      return { estado: 'criado_por_push', baseline: tags.slice(0, n + 1), reaplicar, sobras, pendentes: tags.slice(n + 1) };
    }
  }
  throw new SchemaDivergenteError(diferencas(migracoes[migracoes.length - 1].schema, banco));
}

async function gravarBaseline(pool: Pool, migracoes: Migracao[], plano: Plano): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    // Mesma estrutura que o migrator do drizzle cria.
    await cliente.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await cliente.query(
      'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)'
    );
    for (const m of migracoes.filter((x) => plano.baseline.includes(x.tag))) {
      if (plano.reaplicar.includes(m.tag)) {
        for (const comando of m.comandos) {
          if (comando.trim()) await cliente.query(comando);
        }
      }
      await cliente.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [m.hash, m.quando]);
    }
    const ultima = migracoes.find((m) => m.tag === plano.baseline.at(-1))!;
    const resto = diferencas(ultima.schema, await descreverBanco(cliente));
    if (resto.length) throw new SchemaDivergenteError(resto);
    await cliente.query('COMMIT');
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function migrarBanco(
  pool: Pool,
  {
    pasta = PASTA_MIGRACOES,
    aplicarRemocoes = false,
    log = console.log,
  }: { pasta?: string; aplicarRemocoes?: boolean; log?: (mensagem: string) => void } = {}
): Promise<Plano> {
  const plano = await planejarMigracao(pool, pasta);
  if (plano.reaplicar.length && !aplicarRemocoes) throw new RemocoesPendentesError(plano);

  if (plano.baseline.length) {
    await gravarBaseline(pool, lerMigracoes(pasta), plano);
    log(`[migrar] Banco criado por push: ${plano.baseline.length} migrações marcadas como aplicadas (até ${plano.baseline.at(-1)}).`);
    if (plano.reaplicar.length) log(`[migrar] Remoções reaplicadas: ${plano.reaplicar.join(', ')}.`);
  }

  if (plano.pendentes.length) {
    log(`[migrar] Aplicando: ${plano.pendentes.join(', ')}`);
    await migrate(drizzle(pool), { migrationsFolder: pasta });
  }
  log(plano.pendentes.length ? '[migrar] Migrações aplicadas.' : '[migrar] Banco já está na última migração.');
  return plano;
}

// Erros de quem ainda está subindo (rede ou "the database system is starting
// up"). Senha errada ou banco inexistente falham na hora.
const ERROS_TRANSITORIOS = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', '57P03']);

// O container do banco pode ainda estar subindo: tenta conectar por até 60 s.
async function esperarBanco(pool: Pool, tentativas = 30): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (i >= tentativas || !codigo || !ERROS_TRANSITORIOS.has(codigo)) throw erro;
      console.log(`[migrar] Banco indisponível (tentativa ${i}/${tentativas}), aguardando...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function principal(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await esperarBanco(pool);
    if (process.argv.includes('--verificar')) {
      const plano = await planejarMigracao(pool);
      console.log(`[migrar] Estado: ${plano.estado}`);
      console.log(`[migrar] Baseline (marcar sem rodar): ${plano.baseline.join(', ') || 'nenhuma'}`);
      if (plano.reaplicar.length) {
        console.log(`[migrar] Remoções a reaplicar (exigem --aplicar-remocoes): ${plano.reaplicar.join(', ')}`);
        plano.sobras.forEach((s) => console.log(`[migrar]   apaga ${s}`));
      }
      console.log(`[migrar] Pendentes (rodar): ${plano.pendentes.join(', ') || 'nenhuma'}`);
    } else {
      await migrarBanco(pool, { aplicarRemocoes: process.argv.includes('--aplicar-remocoes') });
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  principal().catch((erro) => {
    console.error('[migrar] Falhou:', erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
