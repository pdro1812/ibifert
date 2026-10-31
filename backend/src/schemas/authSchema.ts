import { z } from 'zod';
import { UfAtendidaSchema } from './localizacaoSchema';

// Mesmas regras de frontend/src/schemas/senhaSchema.ts — manter as duas em sincronia.
export const SenhaForteSchema = z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/\p{Lu}/u, 'A senha deve ter uma letra maiúscula.')
  .regex(/\p{Ll}/u, 'A senha deve ter uma letra minúscula.')
  .regex(/\d/, 'A senha deve ter um número.')
  .regex(/[^\p{L}\p{N}\s]/u, 'A senha deve ter um caractere especial.');

export const RegistroSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  cidade: z.string().min(2, 'Cidade é obrigatória.'),
  estado: UfAtendidaSchema,
  email: z.string().email('E-mail inválido.'),
  telefone: z.string().optional(),
  senha: SenhaForteSchema
});

export const ExcluirContaSchema = z.object({
  senha: z.string().min(1, 'Informe sua senha para confirmar.')
});

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(1, 'A senha é obrigatória.')
});

export type EntradaRegistro = z.infer<typeof RegistroSchema>;
export type EntradaLogin = z.infer<typeof LoginSchema>;