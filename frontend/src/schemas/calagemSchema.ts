import { z } from 'zod';

export const SISTEMAS_MANEJO = [
  'CONVENCIONAL',
  'PD_IMPLANTACAO',
  'PD_CONSOLIDADO',
  'PD_COM_RESTRICAO',
] as const;

export const SistemaManejoSchema = z.enum(SISTEMAS_MANEJO);
export type SistemaManejo = z.infer<typeof SistemaManejoSchema>;

export type MetodoCalcRoteado = 'SMP' | 'POLINOMIAL';

const numeroObrigatorio = (mensagem: string) => z.number({ error: mensagem });
const numeroOpcional = () => z.number().optional();

export const MonitoramentoSchema = z.object({
  pH_agua_10_20: numeroObrigatorio('Informe o pH em água da camada 10–20 cm.')
    .min(3.5, 'pH inválido: deve estar entre 3.5 e 8.0.')
    .max(8.0, 'pH inválido: deve estar entre 3.5 e 8.0.'),
  Al_sat_10_20: numeroObrigatorio('Informe o Al_sat da camada 10–20 cm.')
    .min(0, 'Al_sat_10_20 inválido: deve estar entre 0 e 100.')
    .max(100, 'Al_sat_10_20 inválido: deve estar entre 0 e 100.'),
  disponibilidade_P_10_20_abaixo_critico: z.boolean(),
  compactacao_restringindo_raiz: z.boolean(),
  produtividade_abaixo_media: z.boolean(),
});

export type Monitoramento10_20 = z.infer<typeof MonitoramentoSchema>;

export const CalagemSchema = z
  .object({
    modo: z.enum(['simplificado', 'avancado']),
    sistema_manejo: SistemaManejoSchema,
    primeira_calagem: z.boolean(),
    pH_agua: numeroObrigatorio('Informe o pH em água.')
      .min(3.5, 'pH inválido: deve estar entre 3.5 e 8.0.')
      .max(8.0, 'pH inválido: deve estar entre 3.5 e 8.0.'),
    SMP: numeroObrigatorio('Informe o índice SMP.')
      .min(4.4, 'SMP inválido: deve estar entre 4.4 e 7.1.')
      .max(7.1, 'SMP inválido: deve estar entre 4.4 e 7.1.'),
    PRNT: numeroObrigatorio('Informe o PRNT do calcário.')
      .gt(0, 'PRNT inválido: deve estar entre 1 e 100.')
      .max(100, 'PRNT inválido: deve estar entre 1 e 100.'),

    V_atual: numeroOpcional()
      .refine((valor) => valor === undefined || (valor >= 0 && valor <= 100), {
        message: 'V_atual inválido: deve estar entre 0 e 100.',
      }),
    CTC_pH7: numeroOpcional().refine((valor) => valor === undefined || valor > 0, {
      message: 'CTC_pH7 inválido: deve ser maior que 0.',
    }),

    Al_sat: numeroOpcional()
      .refine((valor) => valor === undefined || (valor >= 0 && valor <= 100), {
        message: 'Al_sat inválido: deve estar entre 0 e 100.',
      }),
    MO: numeroOpcional().refine((valor) => valor === undefined || (valor >= 0 && valor <= 100), {
      message: 'MO inválida: deve estar entre 0 e 100.',
    }),
    Al_trocavel: numeroOpcional().refine((valor) => valor === undefined || valor >= 0, {
      message: 'Al_trocavel inválido: deve ser >= 0.',
    }),

    SMP_10_20: numeroOpcional().refine(
      (valor) => valor === undefined || (valor >= 4.4 && valor <= 7.1),
      { message: 'SMP_10_20 inválido: deve estar entre 4.4 e 7.1.' }
    ),

    opcao_superficial_campo_natural: z.boolean().optional(),
    monitoramento: MonitoramentoSchema.optional(),
    identificacao: z.string().trim().max(120, 'Identificação muito longa.').optional(),
  })
  .superRefine((entrada, ctx) => {
    if (entrada.modo === 'simplificado') {
      return;
    }

    const metodo = rotearMetodoCalagem(entrada.SMP);
    const precisaAlSat =
      entrada.sistema_manejo === 'PD_CONSOLIDADO' && entrada.pH_agua < 5.5;
    const precisaSatBases = !entrada.primeira_calagem && metodo === 'SMP';
    const monitoramentoComRestricao =
      entrada.sistema_manejo === 'PD_CONSOLIDADO' &&
      detectarRestricaoMonitoramento(entrada.monitoramento);

    if (metodo === 'POLINOMIAL') {
      if (entrada.MO === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MO'],
          message: 'MO é obrigatória quando SMP > 6.3.',
        });
      }

      if (entrada.Al_trocavel === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['Al_trocavel'],
          message: 'Al_trocavel é obrigatório quando SMP > 6.3.',
        });
      }
    }

    if (precisaSatBases) {
      if (entrada.V_atual === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['V_atual'],
          message: 'V_atual é obrigatório em reaplicação com método SMP.',
        });
      }

      if (entrada.CTC_pH7 === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CTC_pH7'],
          message: 'CTC_pH7 é obrigatório em reaplicação com método SMP.',
        });
      }
    }

    if (precisaAlSat) {
      const temAlSatDireto = entrada.Al_sat !== undefined;
      const temAlSatCalculado =
        entrada.Al_trocavel !== undefined && entrada.CTC_pH7 !== undefined;

      if (!temAlSatDireto && !temAlSatCalculado) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['Al_sat'],
          message:
            'Al_sat é obrigatório em PD Consolidado com pH_agua < 5.5, diretamente ou via Al_trocavel + CTC_pH7.',
        });
      }

      if (!entrada.primeira_calagem && entrada.V_atual === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['V_atual'],
          message:
            'V_atual é obrigatório para verificar a trava do PD Consolidado em reaplicações.',
        });
      }
    }

    if (entrada.monitoramento && entrada.sistema_manejo !== 'PD_CONSOLIDADO') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['monitoramento'],
        message:
          'O monitoramento de profundidade só pode ser informado em PD Consolidado.',
      });
    }

    if (monitoramentoComRestricao && entrada.SMP_10_20 === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SMP_10_20'],
        message:
          'SMP_10_20 é obrigatório quando o monitoramento caracteriza PD com restrição.',
      });
    }
  });

export type EntradaCalagem = z.infer<typeof CalagemSchema>;

export interface CalagemPayload {
  modo: 'simplificado' | 'avancado';
  sistema_manejo: SistemaManejo;
  primeira_calagem: boolean;
  pH_agua: number;
  SMP: number;
  PRNT: number;
  V_atual?: number;
  CTC_pH7?: number;
  Al_sat?: number;
  Al_sat_10_20?: number;
  MO?: number;
  Al_trocavel?: number;
  SMP_0_10?: number;
  SMP_10_20?: number;
  opcao_superficial_campo_natural?: boolean;
}

export interface CalagemResultado {
  aplicar_calcario: boolean;
  metodo_calc_roteado: MetodoCalcRoteado;
  calcular_tambem_sat_bases: boolean;
  NC_base: number;
  NC_smp?: number;
  NC_vb?: number;
  NC_final: number;
  NC_ajustada: number;
  fator_manejo: number;
  modo_aplicacao: 'INCORPORADO' | 'SUPERFICIAL';
  profundidade_cm?: number;
  acao_requerida?: 'REINICIAR_PLANTIO_DIRETO';
  alertas: string[];
  nota_tecnica?: string;
  campos_necessarios: string[];
}

export function rotearMetodoCalagem(smp: number): MetodoCalcRoteado {
  return smp > 6.3 ? 'POLINOMIAL' : 'SMP';
}

export function detectarRestricaoMonitoramento(
  monitoramento?: Partial<Monitoramento10_20>
): boolean {
  if (!monitoramento) {
    return false;
  }

  return (
    typeof monitoramento.Al_sat_10_20 === 'number' &&
    monitoramento.Al_sat_10_20 >= 30 &&
    Boolean(
      monitoramento.produtividade_abaixo_media ||
      monitoramento.compactacao_restringindo_raiz ||
      monitoramento.disponibilidade_P_10_20_abaixo_critico
    )
  );
}

export function resolverSistemaEfetivo(entrada: Partial<EntradaCalagem>): SistemaManejo {
  if (
    entrada.sistema_manejo === 'PD_CONSOLIDADO' &&
    detectarRestricaoMonitoramento(entrada.monitoramento)
  ) {
    return 'PD_COM_RESTRICAO';
  }

  return entrada.sistema_manejo ?? 'CONVENCIONAL';
}
