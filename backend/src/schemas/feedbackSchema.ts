import { z } from 'zod';

export const CriarFeedbackSchema = z.object({
  nome: z.string().trim().min(2, 'Nome é obrigatório.').max(120, 'Nome muito longo.'),
  telefone: z.string().trim().min(8, 'Telefone é obrigatório.').max(20, 'Telefone inválido.'),
  uf: z.string().trim().length(2, 'Use a sigla do estado (ex: RS).'),
  cidade: z.string().trim().min(2, 'Cidade é obrigatória.'),
  email: z.string().trim().email('E-mail inválido.').optional(),
  descricao: z.string().trim().min(10, 'Descreva o problema com um pouco mais de detalhe.').max(2000, 'Descrição muito longa.'),
});

export type EntradaCriarFeedback = z.infer<typeof CriarFeedbackSchema>;
