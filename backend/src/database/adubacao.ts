import { eq, desc } from 'drizzle-orm';
import { db } from './db';
import { analisesAdubacao } from './schema';

export type NovaAnaliseAdubacao = typeof analisesAdubacao.$inferInsert;
export type AnaliseAdubacao = typeof analisesAdubacao.$inferSelect;

export async function criarAnaliseAdubacao(dados: NovaAnaliseAdubacao): Promise<AnaliseAdubacao> {
  const [analise] = await db.insert(analisesAdubacao).values(dados).returning();
  return analise;
}

export async function buscarAnaliseAdubacaoPorId(id: string): Promise<AnaliseAdubacao | undefined> {
  const [analise] = await db
    .select()
    .from(analisesAdubacao)
    .where(eq(analisesAdubacao.id, id));
  
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
