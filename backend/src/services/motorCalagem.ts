// backend/src/services/motorCalagem.ts

import {
  CalagemValidationError,
  EntradaCalagem,
  EntradaMonitoramento10_20,
  ModoAplicacao,
  ResultadoCalagem,
  ResultadoMonitoramento,
  SistemaManejo,
  MetodoCalcRoteado,
} from "../schemas/calagemSchema";
import { tabelaSmpLookup } from "./tabelaSmp";

// ─── Validação interna de entrada (Parte 10 do documento) ────────────────────

function validarEntrada(entrada: EntradaCalagem): void {
  const { pH_agua, PRNT, V_atual, Al_sat, CTC_pH7, MO, Al_trocavel } = entrada;

  // pH_agua: [3.5, 8.0]
  if (pH_agua < 3.5 || pH_agua > 8.0) {
    throw new CalagemValidationError(
      `pH inválido: ${pH_agua}. Deve estar entre 3.5 e 8.0.`
    );
  }

  // PRNT: (0, 100]
  if (PRNT <= 0 || PRNT > 100) {
    throw new CalagemValidationError(
      `PRNT inválido: ${PRNT}. Deve estar entre 1 e 100.`
    );
  }

  // V_atual: [0, 100] — se fornecido
  if (V_atual !== undefined && (V_atual < 0.0 || V_atual > 100.0)) {
    throw new CalagemValidationError(
      `V_atual inválido: ${V_atual}. Deve estar entre 0 e 100.`
    );
  }

  // Al_sat: [0, 100] — se fornecido
  if (Al_sat !== undefined && (Al_sat < 0.0 || Al_sat > 100.0)) {
    throw new CalagemValidationError(
      `Al_sat inválido: ${Al_sat}. Deve estar entre 0 e 100.`
    );
  }

  // CTC_pH7: > 0 — se fornecido
  if (CTC_pH7 !== undefined && CTC_pH7 <= 0.0) {
    throw new CalagemValidationError(
      `CTC_pH7 inválido: ${CTC_pH7}. Deve ser maior que 0.`
    );
  }

  // MO: [0, 100] — se fornecido
  if (MO !== undefined && (MO < 0.0 || MO > 100.0)) {
    throw new CalagemValidationError(
      `MO inválida: ${MO}. Deve estar entre 0 e 100.`
    );
  }

  // Al_trocavel: >= 0 — se fornecido
  if (Al_trocavel !== undefined && Al_trocavel < 0.0) {
    throw new CalagemValidationError(
      `Al_trocavel inválido: ${Al_trocavel}. Deve ser >= 0.`
    );
  }
}

// ─── Funções internas de cálculo ─────────────────────────────────────────────

/** RN-08: equação polinomial para pH 6.0 — TRAVA-08: mínimo 0 */
function calcularNC_pol_6_0(MO: number, Al_trocavel: number): number {
  const nc = -0.516 + 0.805 * MO + 2.435 * Al_trocavel;
  return Math.max(0.0, nc);
}

/** RN-09: método saturação por bases */
function calcularNC_vb(V_atual: number, CTC_pH7: number): number {
  let V_desejada = 75.0;
  if (CTC_pH7 < 7.5)  V_desejada -= 5.0; // → 70%
  if (CTC_pH7 > 15.0) V_desejada += 5.0; // → 80%
  const nc = ((V_desejada - V_atual) / 100.0) * CTC_pH7;
  return Math.max(0.0, nc); // TRAVA-02
}

/** Resolve Al_sat: opção 1 (direto) ou opção 2 (calculado via Al_trocavel/CTC_pH7) */
function resolverAlSat(entrada: EntradaCalagem): number | undefined {
  if (entrada.Al_sat !== undefined) return entrada.Al_sat;
  if (entrada.Al_trocavel !== undefined && entrada.CTC_pH7 !== undefined && entrada.CTC_pH7 > 0) {
    return (entrada.Al_trocavel / entrada.CTC_pH7) * 100.0;
  }
  return undefined;
}

// ─── Motor principal ──────────────────────────────────────────────────────────

export function executarMotorCalagem(entrada: EntradaCalagem): ResultadoCalagem {
  // 1) Validações de entrada (Parte 10)
  validarEntrada(entrada);

  const alertas: string[] = [];
  const campos_necessarios: string[] = [];

  const { sistema_manejo, primeira_calagem, pH_agua, SMP, PRNT } = entrada;

  // ── RN-01: Roteamento de método ──────────────────────────────────────────
  const metodo_calc_roteado: MetodoCalcRoteado =
    SMP > 6.3 ? MetodoCalcRoteado.POLINOMIAL : MetodoCalcRoteado.SMP;

  // ── RN-02: Saturação por Bases como referência ───────────────────────────
  // TRAVA-04: nunca em primeira calagem
  // TRAVA-11: nunca quando método é POLINOMIAL
  const calcular_tambem_sat_bases: boolean =
    !primeira_calagem && metodo_calc_roteado === MetodoCalcRoteado.SMP;

  // ── Campos condicionais necessários (Parte 1) ────────────────────────────
  if (metodo_calc_roteado === MetodoCalcRoteado.POLINOMIAL) {
    campos_necessarios.push("MO", "Al_trocavel"); // B3
  }

  if (sistema_manejo === SistemaManejo.PD_CONSOLIDADO && pH_agua < 5.5) {
    campos_necessarios.push("Al_sat"); // B2
  }

  if (calcular_tambem_sat_bases) {
    campos_necessarios.push("V_atual", "CTC_pH7"); // B1
  }

  // ── Helpers para retorno antecipado (não aplicar) ────────────────────────
  const naoAplicar = (
    fator: number,
    modo: ModoAplicacao,
    msg: string,
    profundidade?: number
  ): ResultadoCalagem => ({
    aplicar_calcario: false,
    metodo_calc_roteado,
    calcular_tambem_sat_bases,
    NC_base: 0,
    NC_smp: 0,
    NC_final: 0,
    NC_ajustada: 0,
    fator_manejo: fator,
    modo_aplicacao: modo,
    profundidade_cm: profundidade,
    alertas: [msg],
    campos_necessarios,
  });

  const MSG_NAO_NECESSARIO = "pH acima do limiar — não há necessidade de calagem no momento";

  // ── RN-03: Gatilho — Convencional e PD Implantação ──────────────────────
  if (
    sistema_manejo === SistemaManejo.CONVENCIONAL ||
    sistema_manejo === SistemaManejo.PD_IMPLANTACAO
  ) {
    if (pH_agua >= 5.5) {
      return naoAplicar(1.0, ModoAplicacao.INCORPORADO, MSG_NAO_NECESSARIO, 20);
    }
  }

  // ── RN-04: Gatilho — PD Consolidado ─────────────────────────────────────
  if (sistema_manejo === SistemaManejo.PD_CONSOLIDADO) {
    // Passo 1
    if (pH_agua >= 5.5) {
      return naoAplicar(0.25, ModoAplicacao.SUPERFICIAL, MSG_NAO_NECESSARIO);
    }

    // Passo 2 — pH < 5.5: resolver Al_sat (TRAVA-09)
    const Al_sat_resolvido = resolverAlSat(entrada);
    if (Al_sat_resolvido === undefined) {
      throw new CalagemValidationError(
        "Al_sat é obrigatório para PD_CONSOLIDADO quando pH_agua < 5.5"
      );
    }

    // TRAVA-03: V>=65 E Al_sat<10 → não aplicar
    const { V_atual } = entrada;
    if (V_atual !== undefined && V_atual >= 65.0 && Al_sat_resolvido < 10.0) {
      return naoAplicar(
        0.25,
        ModoAplicacao.SUPERFICIAL,
        "pH abaixo de 5,5 mas saturação por bases >= 65% e Al_sat < 10%: calagem não recomendada neste momento"
      );
    }
  }

  // ── RN-06: Gatilho — PD com Restrição ───────────────────────────────────
  if (sistema_manejo === SistemaManejo.PD_COM_RESTRICAO) {
    if (pH_agua >= 5.5) {
      return naoAplicar(1.0, ModoAplicacao.INCORPORADO, MSG_NAO_NECESSARIO, 20);
    }
  }

  // ── Fator de manejo (RN-07 Passo 3) ─────────────────────────────────────
  let fator_manejo: number;
  switch (sistema_manejo) {
    case SistemaManejo.PD_CONSOLIDADO:
      fator_manejo = 0.25;
      break;
    default:
      fator_manejo = 1.0;
  }

  // ── SMP de entrada (PD_COM_RESTRICAO usa média das camadas) ─────────────
  let smp_entrada = SMP;
  if (sistema_manejo === SistemaManejo.PD_COM_RESTRICAO) {
    const { SMP_0_10, SMP_10_20 } = entrada;
    if (SMP_0_10 === undefined || SMP_10_20 === undefined) {
      throw new CalagemValidationError(
        "SMP_0_10 e SMP_10_20 são obrigatórios para PD_COM_RESTRICAO"
      );
    }
    smp_entrada = (SMP_0_10 + SMP_10_20) / 2.0;
  }

  // ── Cálculo de NC_base ───────────────────────────────────────────────────
  let NC_base: number;
  let NC_smp: number | undefined;
  let NC_vb: number | undefined;

  if (metodo_calc_roteado === MetodoCalcRoteado.SMP) {
    // RN-07
    NC_base = tabelaSmpLookup(smp_entrada, 6.0);
    NC_smp = NC_base * fator_manejo;

    // RN-09: NC_vb como referência (somente reaplicação, TRAVA-10/11 já garantidas)
    if (calcular_tambem_sat_bases) {
      const { V_atual, CTC_pH7 } = entrada;
      if (V_atual === undefined || CTC_pH7 === undefined) {
        throw new CalagemValidationError(
          "V_atual e CTC_pH7 são obrigatórios para reaplicação com método SMP"
        );
      }
      NC_vb = calcularNC_vb(V_atual, CTC_pH7);
    }
  } else {
    // RN-08: POLINOMIAL
    const { MO, Al_trocavel } = entrada;
    if (MO === undefined || Al_trocavel === undefined) {
      throw new CalagemValidationError(
        "MO e Al_trocavel são obrigatórios para método POLINOMIAL (SMP > 6.3)"
      );
    }
    NC_base = calcularNC_pol_6_0(MO, Al_trocavel);
    NC_smp = NC_base * fator_manejo;
  }

  // ── RN-10 + RN-11: NC_final e modo de aplicação ─────────────────────────
  let NC_final: number;
  let modo_aplicacao: ModoAplicacao;
  let profundidade_cm: number | undefined;

  switch (sistema_manejo) {
    case SistemaManejo.PD_CONSOLIDADO: {
      // RN-10: trava 5 t/ha para aplicação superficial
      const NC_calculada = NC_base * fator_manejo;
      if (NC_calculada > 5.0) {
        NC_final = 5.0;
        alertas.push(
          "Dose calculada excede o limite de 5 t/ha para aplicação superficial. " +
            "A correção completa poderá requerer reaplicação futura."
        );
      } else {
        NC_final = NC_calculada;
      }
      modo_aplicacao = ModoAplicacao.SUPERFICIAL;
      break;
    }

    case SistemaManejo.PD_IMPLANTACAO: {
      // RN-11: opção superficial em campo natural (TRAVA-07: fator 0.5, não 0.25)
      const opcao = entrada.opcao_superficial_campo_natural ?? false;
      if (opcao && SMP > 5.5) {
        NC_final = tabelaSmpLookup(SMP, 6.0) * 0.5;
        modo_aplicacao = ModoAplicacao.SUPERFICIAL;
      } else {
        NC_final = NC_base * fator_manejo;
        modo_aplicacao = ModoAplicacao.INCORPORADO;
        profundidade_cm = 20;
      }
      break;
    }

    default:
      // CONVENCIONAL e PD_COM_RESTRICAO — sem limite máximo
      NC_final = NC_base * fator_manejo;
      modo_aplicacao = ModoAplicacao.INCORPORADO;
      profundidade_cm = 20;
  }

  // TRAVA-02: NC mínima = 0
  NC_final = Math.max(0.0, NC_final);

  // ── RN-12: Ajuste pelo PRNT ──────────────────────────────────────────────
  const NC_ajustada = NC_final * (100.0 / PRNT);

  return {
    aplicar_calcario: true,
    metodo_calc_roteado,
    calcular_tambem_sat_bases,
    NC_base,
    NC_smp,
    NC_vb,
    NC_final,
    NC_ajustada,
    fator_manejo,
    modo_aplicacao,
    profundidade_cm,
    alertas,
    campos_necessarios,
  };
}

// ─── RN-05: Monitoramento 10–20 cm ───────────────────────────────────────────

export function avaliarMonitoramento10_20(
  dados: EntradaMonitoramento10_20
): ResultadoMonitoramento {
  const {
    Al_sat_10_20,
    produtividade_abaixo_media,
    compactacao_restringindo_raiz,
    disponibilidade_P_10_20_abaixo_critico,
  } = dados;

  const restricao_10_20 =
    Al_sat_10_20 >= 30.0 &&
    (produtividade_abaixo_media ||
      compactacao_restringindo_raiz ||
      disponibilidade_P_10_20_abaixo_critico);

  if (restricao_10_20) {
    return {
      restricao_10_20: true,
      sistema_manejo_atualizado: SistemaManejo.PD_COM_RESTRICAO,
      emitir_alerta:
        "Recomenda-se avaliação por engenheiro agrônomo antes de reiniciar o sistema plantio direto",
    };
  }

  return {
    restricao_10_20: false,
    sistema_manejo_atualizado: SistemaManejo.PD_CONSOLIDADO,
  };
}