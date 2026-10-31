import { z } from 'zod';
import { UfAtendidaSchema } from './localizacaoSchema';

export const CriarFazendaSchema = z.object({
  nome: z.string().min(2, 'Nome da propriedade é obrigatório.'),
  municipio: z.string().min(2, 'Município é obrigatório.'),
  uf: UfAtendidaSchema,
});

export const CriarTalhaoSchema = z.object({
  nome: z.string().min(1, 'Nome do talhão é obrigatório.'),
  cultura: z.string().min(1, 'Cultura é obrigatória.'),
});

export type EntradaCriarFazenda = z.infer<typeof CriarFazendaSchema>;
export type EntradaCriarTalhao = z.infer<typeof CriarTalhaoSchema>;
