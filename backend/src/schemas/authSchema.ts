import { z } from 'zod';

export const RegistroSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  cpf: z.string().length(11, 'CPF inválido, deve conter 11 dígitos sem pontuação.'),
  cidade: z.string().min(2, 'Cidade é obrigatória.'),
  estado: z.string().length(2, 'Use a sigla do estado (ex: RS).'),
  email: z.string().email('E-mail inválido.'),
  telefone: z.string().optional(),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.')
});

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(1, 'A senha é obrigatória.')
});

export type EntradaRegistro = z.infer<typeof RegistroSchema>;
export type EntradaLogin = z.infer<typeof LoginSchema>;