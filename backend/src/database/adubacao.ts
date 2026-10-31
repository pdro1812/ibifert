import { and, eq, desc, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from './db';
import { analisesAdubacao } from './schema';

export type NovaAnaliseAdubacao = typeof analisesAdubacao.$inferInsert;
export type AnaliseAdubacao = typeof analisesAdubacao.$inferSelect;

export async function criarAnaliseAdubacao(dados: NovaAnaliseAdubacao): Promise<AnaliseAdubacao> {
  const [analise] = await db.insert(analisesAdubacao).values(dados).returning();
  return analise;
}

export async function buscarAnaliseAdubacaoPorId(id: string, usuario_id: string): Promise<AnaliseAdubacao | undefined> {
  const [analise] = await db
    .select()
    .from(analisesAdubacao)
    .where(and(eq(analisesAdubacao.id, id), eq(analisesAdubacao.usuario_id, usuario_id)));

  return analise;
}

export async function listarAnalisesAdubacaoPorUsuario(usuario_id: string): Promise<AnaliseAdubacao[]> {
  return db
    .select()
    .from(analisesAdubacao)
    .where(eq(analisesAdubacao.usuario_id, usuario_id))
    .orderBy(desc(analisesAdubacao.criado_em));
}

export async function listarAnalisesAdubacaoPorTalhao(talhao_id: string): Promise<AnaliseAdubacao[]> {
  return db
    .select()
    .from(analisesAdubacao)
    .where(eq(analisesAdubacao.talhao_id, talhao_id))
    .orderBy(desc(analisesAdubacao.criado_em));
}

const doUsuario = (id: string, usuario_id: string) =>
  and(eq(analisesAdubacao.id, id), eq(analisesAdubacao.usuario_id, usuario_id));

// Histórico: ativas (arquivada_em nula) ou só as arquivadas; sem usuário = todas (admin).
export async function listarAnalisesAdubacaoHistorico(usuario_id: string | undefined, arquivadas: boolean) {
  const filtroArquivo = arquivadas ? isNotNull(analisesAdubacao.arquivada_em) : isNull(analisesAdubacao.arquivada_em);
  return db
    .select()
    .from(analisesAdubacao)
    .where(usuario_id ? and(eq(analisesAdubacao.usuario_id, usuario_id), filtroArquivo) : filtroArquivo)
    .orderBy(desc(analisesAdubacao.criado_em));
}

// Edição: mesmo registro (id, criado_em, usuario_id, talhao_id e arquivada_em preservados).
export async function atualizarAnaliseAdubacao(
  id: string,
  usuario_id: string,
  dados: Omit<NovaAnaliseAdubacao, 'id' | 'usuario_id' | 'talhao_id' | 'criado_em' | 'arquivada_em'>
) {
  const [analise] = await db.update(analisesAdubacao).set(dados).where(doUsuario(id, usuario_id)).returning();
  return analise;
}

export async function excluirAnaliseAdubacao(id: string, usuario_id: string) {
  const [analise] = await db
    .delete(analisesAdubacao)
    .where(doUsuario(id, usuario_id))
    .returning({ id: analisesAdubacao.id });
  return analise;
}

export async function arquivarAnaliseAdubacao(id: string, usuario_id: string, arquivada: boolean) {
  const [analise] = await db
    .update(analisesAdubacao)
    .set({ arquivada_em: arquivada ? sql`now()` : null })
    .where(doUsuario(id, usuario_id))
    .returning({ id: analisesAdubacao.id, arquivada_em: analisesAdubacao.arquivada_em });
  return analise;
}
