// backend/src/database/feedback.ts

import { desc } from 'drizzle-orm';
import { db } from './db';
import { feedbacks } from './schema';

export async function createFeedback(data: {
  nome: string;
  telefone: string;
  uf: string;
  cidade: string;
  email?: string;
  descricao: string;
}) {
  const [feedback] = await db.insert(feedbacks).values(data).returning();
  return feedback;
}

export async function getAllFeedbacks() {
  return db.select().from(feedbacks).orderBy(desc(feedbacks.criado_em));
}
