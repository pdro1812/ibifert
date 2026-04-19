import { z } from 'zod';

const AmostraSchema = z.object({
  profundidade: z.enum(['0-20', '0-10', '10-20']),
  ph_agua: z.number().positive().max(14),
  indice_smp: z.number().positive().max(14),
  v_pct: z.number().min(0).max(100).optional(),
  m_pct: z.number().min(0).max(100).optional(),
  mo_pct: z.number().min(0).max(100).optional(),
  al_cmolc_dm3: z.number().min(0).optional(),
}).strict();

export const CalagemSchema = z.object({
  versao_regra: z.literal('ibiferti-calagem-graos-v1.6'),
  sistema_manejo: z.enum(['CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO']),
  modo_implantacao_pd: z.enum(['INCORPORADO', 'CAMPO_NATURAL_SUPERFICIAL']).optional(),
  prnt_pct: z.number().positive().max(100).optional().default(100),
  amostras: z.array(AmostraSchema),
  contexto_pd: z.object({
    corrigido_0_20_na_implantacao: z.boolean().optional(),
    produtividade_abaixo_media_local: z.boolean().optional(),
    compactacao_solo: z.boolean().optional(),
    fosforo_10_20_abaixo_critico: z.boolean().optional(),
  }).strict().optional(),
  metadados: z.object({
    id_requisicao: z.string().uuid().optional(),
    origem_dado: z.enum(['manual', 'digitado', 'importado_laboratorio']).optional()
  }).strict().optional(),
}).strict().superRefine((data, ctx) => {
  // Regra 1: Profundidades não podem se repetir
  const profundidades = data.amostras.map(a => a.profundidade);
  const profundidadesUnicas = new Set(profundidades);
  if (profundidades.length !== profundidadesUnicas.size) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Profundidades não podem se repetir no array de amostras.',
      path: ['amostras'],
    });
  }

  // Regra 2: CONVENCIONAL ou PD_IMPLANTACAO exige exatamente 1 amostra
  if (['CONVENCIONAL', 'PD_IMPLANTACAO'].includes(data.sistema_manejo)) {
    if (data.amostras.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `O sistema_manejo ${data.sistema_manejo} exige exatamente 1 amostra.`,
        path: ['amostras'],
      });
    }
  }

  // Regra 3: PD_CONSOLIDADO exige exatamente 2 amostras (uma 0-10 e outra 10-20)
  if (data.sistema_manejo === 'PD_CONSOLIDADO') {
    if (data.amostras.length !== 2 || !profundidadesUnicas.has('0-10') || !profundidadesUnicas.has('10-20')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O sistema PD_CONSOLIDADO exige exatamente 2 amostras, sendo obrigatoriamente uma 0-10 e outra 10-20.',
        path: ['amostras'],
      });
    }
  }

  // Regra 4: modo_implantacao_pd só pode existir se o sistema for PD_IMPLANTACAO
  if (data.sistema_manejo !== 'PD_IMPLANTACAO' && data.modo_implantacao_pd !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A chave modo_implantacao_pd só deve ser enviada se o sistema_manejo for PD_IMPLANTACAO.',
      path: ['modo_implantacao_pd'],
    });
  }

  // Regra 5: Se CAMPO_NATURAL_SUPERFICIAL, a amostra 0-20 deve ter indice_smp > 5.5
  if (data.modo_implantacao_pd === 'CAMPO_NATURAL_SUPERFICIAL') {
    const amostra020 = data.amostras.find(a => a.profundidade === '0-20');
    if (amostra020 && amostra020.indice_smp <= 5.5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Para o modo_implantacao_pd CAMPO_NATURAL_SUPERFICIAL, a amostra 0-20 deve ter indice_smp > 5.5.',
        path: ['amostras'],
      });
    }
  }
  // Regra 6: Exigências específicas do PD_CONSOLIDADO
  if (data.sistema_manejo === 'PD_CONSOLIDADO') {
    const amostra010 = data.amostras.find(a => a.profundidade === '0-10');
    const amostra1020 = data.amostras.find(a => a.profundidade === '10-20');

    if (amostra010 && (amostra010.v_pct === undefined || amostra010.m_pct === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Em PD_CONSOLIDADO, a amostra 0-10 exige os campos v_pct e m_pct.',
        path: ['amostras'],
      });
    }
    if (amostra1020 && amostra1020.m_pct === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Em PD_CONSOLIDADO, a amostra 10-20 exige o campo m_pct.',
        path: ['amostras'],
      });
    }
  }
});
