// backend/src/database/fazendas.ts

import { eq, desc } from 'drizzle-orm';
import { db } from './db';
import { fazendas, talhoes, analises } from './schema';

// ── Fazendas ──────────────────────────────────────────────────────────────────

export async function getAllFazendas() {
  return db.select().from(fazendas);
}

export async function getFazendasByUsuario(usuarioId: string) {
  return db
    .select()
    .from(fazendas)
    .where(eq(fazendas.usuario_id, usuarioId));
}

export async function createFazenda(data: {
  usuario_id: string;
  nome: string;
  municipio: string;
  uf: string;
}) {
  const [fazenda] = await db
    .insert(fazendas)
    .values(data)
    .returning();
  return fazenda;
}

export async function deleteFazenda(id: string) {
  await db.delete(talhoes).where(eq(talhoes.fazenda_id, id));
  const [fazenda] = await db
    .delete(fazendas)
    .where(eq(fazendas.id, id))
    .returning();
  return fazenda;
}

// ── Talhoes ───────────────────────────────────────────────────────────────────

export async function getTalhoesByFazenda(fazendaId: string) {
  const rows = await db
    .select()
    .from(talhoes)
    .where(eq(talhoes.fazenda_id, fazendaId));

  // Para cada talhão, busca a última análise
  return Promise.all(
    rows.map(async (talhao) => {
      const [ultimaAnalise] = await db
        .select({
          id: analises.id,
          criado_em: analises.criado_em,
          NC_ajustada: analises.NC_ajustada,
          aplicar_calcario: analises.aplicar_calcario,
        })
        .from(analises)
        .where(eq(analises.talhao_id, talhao.id))
        .orderBy(desc(analises.criado_em))
        .limit(1);

      return {
        ...talhao,
        ultimaAnalise: ultimaAnalise ?? null,
      };
    })
  );
}

export async function createTalhao(data: {
  fazenda_id: string;
  nome: string;
  cultura: string;
}) {
  const [talhao] = await db
    .insert(talhoes)
    .values(data)
    .returning();
  return talhao;
}

export async function deleteTalhao(id: string) {
  const [talhao] = await db
    .delete(talhoes)
    .where(eq(talhoes.id, id))
    .returning();
  return talhao;
}

export async function getTalhaoById(id: string) {
  const [row] = await db
    .select()
    .from(talhoes)
    .where(eq(talhoes.id, id))
    .limit(1);
  return row;
}

export async function getAnalisesByTalhao(talhaoId: string) {
  return db
    .select()
    .from(analises)
    .where(eq(analises.talhao_id, talhaoId))
    .orderBy(desc(analises.criado_em));
}
