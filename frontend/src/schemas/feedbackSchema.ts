import { z } from 'zod';

export const FeedbackSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.').max(120, 'Nome muito longo.'),
  telefone: z.string().trim().min(8, 'Informe um telefone para contato.').max(20, 'Telefone inválido.'),
  uf: z.string().trim().length(2, 'Selecione o estado.'),
  cidade: z.string().trim().min(2, 'Selecione a cidade.'),
  email: z
    .string()
    .trim()
    .email('E-mail inválido.')
    .optional()
    .or(z.literal('')),
  descricao: z
    .string()
    .trim()
    .min(10, 'Descreva o problema com um pouco mais de detalhe.')
    .max(2000, 'Descrição muito longa.'),
});

export type EntradaFeedback = z.infer<typeof FeedbackSchema>;
