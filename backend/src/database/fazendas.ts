// backend/src/database/fazendas.ts

import { eq } from 'drizzle-orm';
import { db } from './db';
import { fazendas, talhoes } from './schema';

// ── Fazendas ──────────────────────────────────────────────────────────────────

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
  return db
    .select()
    .from(talhoes)
    .where(eq(talhoes.fazenda_id, fazendaId));
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