import { z } from "zod";

export enum SistemaManejo {
  CONVENCIONAL = "CONVENCIONAL",
  PD_IMPLANTACAO = "PD_IMPLANTACAO",
  PD_CONSOLIDADO = "PD_CONSOLIDADO",
  PD_COM_RESTRICAO = "PD_COM_RESTRICAO",
}

export enum MetodoCalcRoteado {
  SMP = "SMP",
  POLINOMIAL = "POLINOMIAL",
}

export enum ModoAplicacao {
  INCORPORADO = "INCORPORADO",
  SUPERFICIAL = "SUPERFICIAL",
}

export enum AcaoRequerida {
  REINICIAR_PLANTIO_DIRETO = "REINICIAR_PLANTIO_DIRETO",
}

const SISTEMA_MANEJO_SCHEMA = z.nativeEnum(SistemaManejo);

const percentualSchema = (campo: string) =>
  z
    .number()
    .finite()
    .min(0.0, `${campo} inválido: deve estar entre 0 e 100.`)
    .max(100.0, `${campo} inválido: deve estar entre 0 e 100.`);

const phSchema = z
  .number()
  .finite()
  .min(3.5, "pH inválido: deve estar entre 3.5 e 8.0.")
  .max(8.0, "pH inválido: deve estar entre 3.5 e 8.0.");

const smpSchema = z.number().finite();

const ctcSchema = z
  .number()
  .finite()
  .gt(0.0, "CTC_pH7 inválido: deve ser maior que 0.");

const moSchema = z
  .number()
  .finite()
  .min(0.0, "MO inválida: deve estar entre 0 e 100.")
  .max(100.0, "MO inválida: deve estar entre 0 e 100.");

const alTrocavelSchema = z
  .number()
  .finite()
  .min(0.0, "Al_trocavel inválido: deve ser >= 0.");

const prntSchema = z
  .number()
  .finite()
  .gt(0.0, "PRNT inválido: deve estar entre 1 e 100.")
  .max(100.0, "PRNT inválido: deve estar entre 1 e 100.");

export const Monitoramento10_20Schema = z.object({
  pH_agua_10_20: phSchema,
  Al_sat_10_20: percentualSchema("Al_sat_10_20"),
  disponibilidade_P_10_20_abaixo_critico: z.boolean(),
  compactacao_restringindo_raiz: z.boolean(),
  produtividade_abaixo_media: z.boolean(),
});

export type EntradaMonitoramento10_20 = z.infer<typeof Monitoramento10_20Schema>;

export const CalagemSchema = z
  .object({
    sistema_manejo: SISTEMA_MANEJO_SCHEMA,
    primeira_calagem: z.boolean(),
    pH_agua: phSchema,
    SMP: smpSchema,
    PRNT: prntSchema,

    V_atual: percentualSchema("V_atual").optional(),
    CTC_pH7: ctcSchema.optional(),

    Al_sat: percentualSchema("Al_sat").optional(),
    Al_sat_10_20: percentualSchema("Al_sat_10_20").optional(),

    MO: moSchema.optional(),
    Al_trocavel: alTrocavelSchema.optional(),

    SMP_0_10: smpSchema.optional(),
    SMP_10_20: smpSchema.optional(),

    opcao_superficial_campo_natural: z.boolean().optional(),
    monitoramento: Monitoramento10_20Schema.optional(),
  })
  .superRefine((entrada, ctx) => {
    const metodo =
      entrada.SMP > 6.3
        ? MetodoCalcRoteado.POLINOMIAL
        : MetodoCalcRoteado.SMP;

    if (metodo === MetodoCalcRoteado.POLINOMIAL) {
      if (entrada.MO === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MO"],
          message: "MO é obrigatória quando SMP > 6.3.",
        });
      }

      if (entrada.Al_trocavel === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["Al_trocavel"],
          message: "Al_trocavel é obrigatório quando SMP > 6.3.",
        });
      }
    }

    if (!entrada.primeira_calagem && metodo === MetodoCalcRoteado.SMP) {
      if (entrada.V_atual === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["V_atual"],
          message: "V_atual é obrigatório em reaplicação com método SMP.",
        });
      }

      if (entrada.CTC_pH7 === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CTC_pH7"],
          message: "CTC_pH7 é obrigatório em reaplicação com método SMP.",
        });
      }
    }

    if (
      entrada.sistema_manejo === SistemaManejo.PD_CONSOLIDADO &&
      entrada.pH_agua < 5.5
    ) {
      const temAlSatDireto = entrada.Al_sat !== undefined;
      const temAlSatPorCalculo =
        entrada.Al_trocavel !== undefined && entrada.CTC_pH7 !== undefined;

      if (!temAlSatDireto && !temAlSatPorCalculo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["Al_sat"],
          message:
            "Al_sat é obrigatório para PD_CONSOLIDADO quando pH_agua < 5.5 (diretamente ou via Al_trocavel + CTC_pH7).",
        });
      }
    }

    if (entrada.sistema_manejo === SistemaManejo.PD_COM_RESTRICAO) {
      if (entrada.SMP_10_20 === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMP_10_20"],
          message: "SMP_10_20 é obrigatório para PD_COM_RESTRICAO.",
        });
      }

      const alSat10_20 =
        entrada.Al_sat_10_20 ?? entrada.monitoramento?.Al_sat_10_20;

      if (alSat10_20 === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["Al_sat_10_20"],
          message:
            "Al_sat_10_20 é obrigatório para PD_COM_RESTRICAO.",
        });
      }
    }
  });

export type EntradaCalagem = z.infer<typeof CalagemSchema>;

export interface ResultadoCalagem {
  aplicar_calcario: boolean;
  metodo_calc_roteado: MetodoCalcRoteado;
  calcular_tambem_sat_bases: boolean;

  NC_base: number;
  NC_smp?: number;
  NC_vb?: number;
  NC_final: number;
  NC_ajustada: number;

  fator_manejo: number;
  modo_aplicacao: ModoAplicacao;
  profundidade_cm?: number;
  acao_requerida?: AcaoRequerida;

  alertas: string[];
  nota_tecnica?: string;
  campos_necessarios: string[];
}

export interface ResultadoMonitoramento {
  restricao_10_20: boolean;
  sistema_manejo_atualizado: SistemaManejo;
  emitir_alerta?: string;
  campos_adicionais_necessarios: string[];
}

export class CalagemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalagemValidationError";
  }
}
