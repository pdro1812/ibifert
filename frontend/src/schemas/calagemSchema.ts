import { z } from 'zod';

const AmostraSchema = z.object({
  profundidade: z.enum(['0-20', '0-10', '10-20']),
  ph_agua: z.coerce.number().positive().max(14, 'Máx 14'),
  indice_smp: z.coerce.number().positive().max(14, 'Máx 14'),
  v_pct: z.coerce.number().min(0).max(100).optional(),
  m_pct: z.coerce.number().min(0).max(100).optional(),
  mo_pct: z.coerce.number().min(0).max(100).optional(),
  al_cmolc_dm3: z.coerce.number().min(0).optional(),
});

export const CalagemSchema = z.object({
  versao_regra: z.literal('ibiferti-calagem-graos-v1.6'),
  sistema_manejo: z.enum(['CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO']),
  modo_implantacao_pd: z.enum(['INCORPORADO', 'CAMPO_NATURAL_SUPERFICIAL']).optional(),
  prnt_pct: z.coerce.number().positive().max(100).default(100),
  amostras: z.array(AmostraSchema),
}).superRefine((data, ctx) => {
  // Validação dinâmica para o Front: Se PD Consolidado, exige 2 amostras
  if (data.sistema_manejo === 'PD_CONSOLIDADO' && data.amostras.length !== 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PD Consolidado exige camadas 0-10 e 10-20.', path: ['amostras'] });
  }
});

export type EntradaCalagem = z.infer<typeof CalagemSchema>;