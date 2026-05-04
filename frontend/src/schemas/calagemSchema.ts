import { z } from 'zod';

// Espelha exatamente o EntradaCalagem do backend v2
export const CalagemSchema = z.object({
  sistema_manejo: z.enum(['CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO', 'PD_COM_RESTRICAO']),
  primeira_calagem: z.boolean(),
  pH_agua: z.coerce.number().min(3.5, 'Mín 3.5').max(8.0, 'Máx 8.0'),
  SMP: z.coerce.number().min(4.4, 'Mín 4.4').max(7.1, 'Máx 7.1'),
  PRNT: z.coerce.number().min(1, 'Mín 1').max(100, 'Máx 100'),

  // Bloco B1 — reaplicação + método SMP
  V_atual: z.coerce.number().min(0).max(100).optional(),
  CTC_pH7: z.coerce.number().positive().optional(),

  // Bloco B2 — trava PD_CONSOLIDADO
  Al_sat: z.coerce.number().min(0).max(100).optional(),

  // Bloco B3 — método polinomial (SMP > 6.3)
  MO: z.coerce.number().min(0).max(100).optional(),
  Al_trocavel: z.coerce.number().min(0).optional(),

  // PD com Restrição — SMP médio das camadas
  SMP_0_10: z.coerce.number().optional(),
  SMP_10_20: z.coerce.number().optional(),

  // PD Implantação — opção superficial campo natural
  opcao_superficial_campo_natural: z.boolean().optional(),

  // Identificação local (não enviada ao backend)
  identificacao: z.string().optional(),
});

export type EntradaCalagem = z.infer<typeof CalagemSchema>;