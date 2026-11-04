import { z } from "zod";
import { LIMITES_CALAGEM, formatarLimite } from "./limitesAgronomicos";

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

// Acima deste SMP o Polinomial é calculado mesmo sem seleção do usuário (o SMP
// continua sendo o valor em evidência).
export const SMP_LIMITE_POLINOMIAL = 6.3;

export function polinomialAutomatico(SMP: number): boolean {
  return SMP > SMP_LIMITE_POLINOMIAL;
}

export function precisaPolinomial(entrada: {
  SMP: number;
  calcular_polinomial?: boolean;
}): boolean {
  return entrada.calcular_polinomial === true || polinomialAutomatico(entrada.SMP);
}

export function precisaSatBases(entrada: {
  SMP: number;
  primeira_calagem?: boolean;
}): boolean {
  return entrada.primeira_calagem !== true && !polinomialAutomatico(entrada.SMP);
}

export function precisaAlSatPDConsolidado(
  sistema_manejo: SistemaManejo | undefined,
  pH_agua: number | undefined
): boolean {
  return (
    sistema_manejo === SistemaManejo.PD_CONSOLIDADO &&
    typeof pH_agua === "number" &&
    pH_agua < 5.5
  );
}

export function temAlSatResolvido(entrada: {
  Al_sat?: number;
  Al_trocavel?: number;
  CTC_pH7?: number;
}): boolean {
  const temAlSatDireto = entrada.Al_sat !== undefined;
  const temAlSatPorCalculo =
    entrada.Al_trocavel !== undefined && entrada.CTC_pH7 !== undefined;

  return temAlSatDireto || temAlSatPorCalculo;
}

const percentualSchema = (campo: string) =>
  z
    .number()
    .finite()
    .min(0.0, `${campo} inválido: deve estar entre 0 e 100.`)
    .max(100.0, `${campo} inválido: deve estar entre 0 e 100.`);

const L = LIMITES_CALAGEM;
const faixa = (campo: string, min: number, max: number) =>
  `${campo} inválido: deve estar entre ${formatarLimite(min)} e ${formatarLimite(max)}.`;

const phSchema = z
  .number()
  .finite()
  .min(L.pH_agua.min, faixa("pH", L.pH_agua.min, L.pH_agua.max))
  .max(L.pH_agua.max, faixa("pH", L.pH_agua.min, L.pH_agua.max));

// Fora da Tabela 5.2 (≤ 4,4 a 7,1) o motor usa a linha 4,4 ou dose zero;
// abaixo de 4,0 ou acima de 7,5 o valor não é um SMP possível.
const smpSchema = (campo = "SMP") =>
  z
    .number()
    .finite()
    .min(L.SMP.min, faixa(campo, L.SMP.min, L.SMP.max))
    .max(L.SMP.max, faixa(campo, L.SMP.min, L.SMP.max));

const ctcSchema = z
  .number()
  .finite()
  .gt(0.0, `CTC_pH7 inválido: deve ser maior que 0 e até ${formatarLimite(L.CTC_pH7.max)}.`)
  .max(L.CTC_pH7.max, `CTC_pH7 inválido: deve ser maior que 0 e até ${formatarLimite(L.CTC_pH7.max)}.`);

const moSchema = z
  .number()
  .finite()
  .min(L.MO.min, `MO inválida: deve estar entre ${formatarLimite(L.MO.min)} e ${formatarLimite(L.MO.max)}.`)
  .max(L.MO.max, `MO inválida: deve estar entre ${formatarLimite(L.MO.min)} e ${formatarLimite(L.MO.max)}.`);

const alTrocavelSchema = z
  .number()
  .finite()
  .min(L.Al_trocavel.min, faixa("Al_trocavel", L.Al_trocavel.min, L.Al_trocavel.max))
  .max(L.Al_trocavel.max, faixa("Al_trocavel", L.Al_trocavel.min, L.Al_trocavel.max));

// Manual p. 299: PRNT mínimo de 45% para calcário comercializado.
export const MENSAGEM_PRNT = faixa("PRNT", L.PRNT.min, L.PRNT.max);
const prntSchema = z
  .number()
  .finite()
  .min(L.PRNT.min, MENSAGEM_PRNT)
  .max(L.PRNT.max, MENSAGEM_PRNT);

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
    identificacao: z.string().optional(),
    sistema_manejo: SISTEMA_MANEJO_SCHEMA,
    // Não é mais uma pergunta feita ao usuário — todo cálculo é tratado
    // como reaplicação por padrão (ver docs/diagnostico-primeira-calagem-metodo-smp.md).
    primeira_calagem: z.boolean().default(false),
    pH_agua: phSchema,
    SMP: smpSchema(),
    PRNT: prntSchema,

    // Seleção explícita do Polinomial como valor complementar ao SMP.
    // Acima de SMP 6.3 ele é calculado mesmo com este campo em false.
    calcular_polinomial: z.boolean().default(false),

    V_atual: percentualSchema("V_atual").optional(),
    CTC_pH7: ctcSchema.optional(),

    Al_sat: percentualSchema("Al_sat").optional(),
    Al_sat_10_20: percentualSchema("Al_sat_10_20").optional(),

    MO: moSchema.optional(),
    Al_trocavel: alTrocavelSchema.optional(),

    SMP_0_10: smpSchema("SMP_0_10").optional(),
    SMP_10_20: smpSchema("SMP_10_20").optional(),

    opcao_superficial_campo_natural: z.boolean().optional(),
    monitoramento: Monitoramento10_20Schema.optional(),
  })
  .superRefine((entrada, ctx) => {
    // O Al trocável faz parte da CTC: maior que ela é erro de digitação.
    if (
      entrada.Al_trocavel !== undefined &&
      entrada.CTC_pH7 !== undefined &&
      entrada.Al_trocavel > entrada.CTC_pH7
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["Al_trocavel"],
        message: "Al_trocavel não pode ser maior que a CTC_pH7.",
      });
    }

    if (precisaPolinomial(entrada)) {
      const motivo = polinomialAutomatico(entrada.SMP)
        ? "SMP > 6.3"
        : "Polinomial selecionado";

      if (entrada.MO === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MO"],
          message: `MO é obrigatória quando ${motivo}.`,
        });
      }

      if (entrada.Al_trocavel === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["Al_trocavel"],
          message: `Al_trocavel é obrigatório quando ${motivo}.`,
        });
      }
    }

    if (precisaSatBases(entrada)) {
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

    if (precisaAlSatPDConsolidado(entrada.sistema_manejo, entrada.pH_agua)) {
      if (!temAlSatResolvido(entrada)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["Al_sat"],
          message:
            "Al_sat é obrigatório para PD_CONSOLIDADO quando pH_agua < 5.5 (diretamente ou via Al_trocavel + CTC_pH7).",
        });
      }

      // A trava V>=65%/Al_sat<10% (Tabela 5.3 nota 1) depende do estado do
      // solo, não do método usado para calcular a dose — precisa de
      // V_atual mesmo quando SMP > 6.3 roteia para o método Polinomial.
      if (!entrada.primeira_calagem && entrada.V_atual === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["V_atual"],
          message:
            "V_atual é obrigatório para verificar a trava do PD Consolidado em reaplicações.",
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
export type InputCalagem = z.input<typeof CalagemSchema>;

export interface ResultadoCalagem {
  aplicar_calcario: boolean;
  metodo_calc_roteado: MetodoCalcRoteado;
  calcular_tambem_sat_bases: boolean;
  // Polinomial como valor complementar ao SMP (nunca é o valor em evidência).
  polinomial_calculado: boolean;
  polinomial_automatico: boolean;

  NC_base: number;
  NC_smp?: number;
  NC_vb?: number;
  NC_polinomial?: number;
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
