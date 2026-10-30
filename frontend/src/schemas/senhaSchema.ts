import { z } from 'zod';

// Mesmas regras de backend/src/schemas/authSchema.ts — manter as duas em sincronia.
export const REGRAS_SENHA = [
  { id: 'tamanho', texto: 'Pelo menos 8 caracteres', valida: (s: string) => s.length >= 8 },
  { id: 'maiuscula', texto: 'Uma letra maiúscula', valida: (s: string) => /\p{Lu}/u.test(s) },
  { id: 'minuscula', texto: 'Uma letra minúscula', valida: (s: string) => /\p{Ll}/u.test(s) },
  { id: 'numero', texto: 'Um número', valida: (s: string) => /\d/.test(s) },
  { id: 'especial', texto: 'Um caractere especial (ex.: ! @ # $ %)', valida: (s: string) => /[^\p{L}\p{N}\s]/u.test(s) },
] as const;

export const SenhaForteSchema = z
  .string()
  .refine((s) => REGRAS_SENHA.every((r) => r.valida(s)), 'A senha não atende a todos os requisitos.');
