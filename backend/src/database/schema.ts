import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id:        uuid('id').defaultRandom().primaryKey(),
  nome:      text('nome').notNull(),
  cpf:       text('cpf').notNull().unique(),
  email:     text('email').notNull().unique(),
  senha:     text('senha').notNull(),
  cidade:    text('cidade').notNull(),
  estado:    text('estado').notNull(),
  telefone:  text('telefone'),
  role:      text('role').notNull().default('PRODUTOR'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});