import { z } from 'zod';

export const CriarFazendaSchema = z.object({
  nome: z.string().min(2, 'Nome da fazenda é obrigatório.'),
  municipio: z.string().min(2, 'Município é obrigatório.'),
  uf: z.string().length(2, 'Use a sigla do estado (ex: RS).'),
});

export const CriarTalhaoSchema = z.object({
  nome: z.string().min(1, 'Nome do talhão é obrigatório.'),
  cultura: z.string().min(1, 'Cultura é obrigatória.'),
});

export type EntradaCriarFazenda = z.infer<typeof CriarFazendaSchema>;
export type EntradaCriarTalhao = z.infer<typeof CriarTalhaoSchema>;
