import { z } from 'zod';

// O manual de calagem e adubação usado pelos motores cobre só RS e SC.
export const UFS_ATENDIDAS = ['RS', 'SC'] as const;

export const UfAtendidaSchema = z.enum(UFS_ATENDIDAS, {
  message: 'Estado deve ser RS ou SC.',
});

export type UfAtendida = z.infer<typeof UfAtendidaSchema>;

export const LocalizacaoSchema = z.object({
  uf: UfAtendidaSchema,
  cidade: z.string().trim().min(2, 'Cidade é obrigatória.'),
});
