// backend/src/schemas/calagemSchema.ts

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

// ─── Entradas ────────────────────────────────────────────────────────────────

export interface EntradaCalagemBase {
  sistema_manejo: SistemaManejo;
  primeira_calagem: boolean;
  pH_agua: number;
  SMP: number;
  PRNT: number;
}

/** Bloco B1 — reaplicação com método SMP */
export interface EntradaSatBases {
  V_atual: number;
  CTC_pH7: number;
}

/** Bloco B2 — trava PD Consolidado */
export interface EntradaAlSat {
  /** Pode ser fornecido diretamente (opção 1) */
  Al_sat?: number;
  /** Ou calculado via opção 2 */
  Al_trocavel?: number;
  CTC_pH7?: number;
}

/** Bloco B3 — método polinomial */
export interface EntradaPolinomial {
  MO: number;
  Al_trocavel: number;
}

/** PD com Restrição — SMP médio das camadas */
export interface EntradaPDRestricao {
  SMP_0_10: number;
  SMP_10_20: number;
}

/** PD Implantação superficial em campo natural */
export interface EntradaPDImplantacaoSuperficial {
  opcao_superficial_campo_natural: boolean;
}

/** Monitoramento camada 10–20 cm (Bloco B4) */
export interface EntradaMonitoramento10_20 {
  pH_agua_10_20: number;
  Al_sat_10_20: number;
  disponibilidade_P_10_20_abaixo_critico: boolean;
  compactacao_restringindo_raiz: boolean;
  produtividade_abaixo_media: boolean;
}

/** Entrada consolidada completa para o motor */
export interface EntradaCalagem
  extends EntradaCalagemBase,
    Partial<EntradaSatBases>,
    Partial<EntradaPolinomial>,
    Partial<EntradaPDRestricao>,
    Partial<EntradaPDImplantacaoSuperficial> {
  /** B2 — Al_sat direto ou calculado */
  Al_sat?: number;
  /** B2 opção 2 — se Al_sat não informado diretamente */
  Al_trocavel?: number;
  CTC_pH7?: number;
  /** Monitoramento (independente) */
  monitoramento?: EntradaMonitoramento10_20;
}

// ─── Resultados ──────────────────────────────────────────────────────────────

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

  alertas: string[];
  campos_necessarios: string[];
}

export interface ResultadoMonitoramento {
  restricao_10_20: boolean;
  sistema_manejo_atualizado: SistemaManejo;
  emitir_alerta?: string;
}

// ─── Erros de validação ───────────────────────────────────────────────────────

export class CalagemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalagemValidationError";
  }
}