import { ZodError } from "zod";

import {
  CalagemSchema,
  CalagemValidationError,
  EntradaCalagem,
  SistemaManejo,
  precisaAlSatPDConsolidado,
  precisaPolinomial,
  precisaSatBases,
  temAlSatResolvido,
} from "../schemas/calagemSchema";

export function validarEntrada(entrada: unknown): EntradaCalagem {
  try {
    return CalagemSchema.parse(entrada);
  } catch (error) {
    if (error instanceof ZodError) {
      const mensagem = error.issues.map((issue) => issue.message).join(" ");
      throw new CalagemValidationError(mensagem);
    }

    throw error;
  }
}

export function calcularAlSat(Al_trocavel: number, CTC_pH7: number): number {
  if (CTC_pH7 <= 0) {
    throw new CalagemValidationError(
      "CTC_pH7 inválido: deve ser maior que 0."
    );
  }

  return (Al_trocavel / CTC_pH7) * 100.0;
}

export function calcularNCPolinomial6_0(
  MO: number,
  Al_trocavel: number
): number {
  const nc = -0.516 + 0.805 * MO + 2.435 * Al_trocavel;
  return Math.max(0.0, nc);
}

export function calcularNCVB(V_atual: number, CTC_pH7: number): number {
  let V_desejada = 75.0;

  if (CTC_pH7 < 7.5) {
    V_desejada -= 5.0;
  }

  if (CTC_pH7 > 15.0) {
    V_desejada += 5.0;
  }

  const nc = ((V_desejada - V_atual) / 100.0) * CTC_pH7;
  return Math.max(0.0, nc);
}

export function ajustarDosePorPRNT(NC_final: number, PRNT: number): number {
  if (PRNT <= 0.0 || PRNT > 100.0) {
    throw new CalagemValidationError(
      "PRNT inválido: deve estar entre 1 e 100."
    );
  }

  return NC_final * (100.0 / PRNT);
}

// Divergência entre métodos: desvio relativo ao SMP acima de 20% (e de pelo
// menos 0,5 t/ha, para não alertar em doses muito pequenas). Os valores
// comparados são brutos (antes do PRNT), já com o fator de manejo.
export const LIMITE_DIVERGENCIA_METODOS = 0.2;
export const PISO_DIVERGENCIA_T_HA = 0.5;

export function divergeDoSMP(valor: number, referenciaSMP: number): boolean {
  const diferenca = Math.abs(valor - referenciaSMP);

  if (diferenca < PISO_DIVERGENCIA_T_HA) {
    return false;
  }

  return referenciaSMP <= 0 || diferenca / referenciaSMP > LIMITE_DIVERGENCIA_METODOS;
}

export function resolverAlSat(entrada: Partial<EntradaCalagem>): number | undefined {
  if (entrada.Al_sat !== undefined) {
    return entrada.Al_sat;
  }

  if (entrada.Al_trocavel !== undefined && entrada.CTC_pH7 !== undefined) {
    return calcularAlSat(entrada.Al_trocavel, entrada.CTC_pH7);
  }

  return undefined;
}

export function resolverAlSat10_20(
  entrada: Partial<EntradaCalagem>
): number | undefined {
  return entrada.Al_sat_10_20 ?? entrada.monitoramento?.Al_sat_10_20;
}

export function determinarCamposNecessarios(
  entrada: Partial<EntradaCalagem>
): string[] {
  const campos: string[] = [];
  const adicionar = (campo: string, condicao = true): void => {
    if (condicao && !campos.includes(campo)) {
      campos.push(campo);
    }
  };

  adicionar("sistema_manejo", entrada.sistema_manejo === undefined);
  adicionar("primeira_calagem", entrada.primeira_calagem === undefined);
  adicionar("pH_agua", entrada.pH_agua === undefined);
  adicionar("SMP", entrada.SMP === undefined);
  adicionar("PRNT", entrada.PRNT === undefined);


  if (entrada.SMP !== undefined) {
    if (
      precisaPolinomial({
        SMP: entrada.SMP,
        calcular_polinomial: entrada.calcular_polinomial,
      })
    ) {
      adicionar("MO", entrada.MO === undefined);
      adicionar("Al_trocavel", entrada.Al_trocavel === undefined);
    }

    if (
      entrada.primeira_calagem === false &&
      precisaSatBases({ SMP: entrada.SMP, primeira_calagem: false })
    ) {
      adicionar("V_atual", entrada.V_atual === undefined);
      adicionar("CTC_pH7", entrada.CTC_pH7 === undefined);
    }
  }

  if (precisaAlSatPDConsolidado(entrada.sistema_manejo, entrada.pH_agua)) {
    if (!temAlSatResolvido(entrada)) {
      adicionar("Al_sat");
      adicionar("Al_trocavel", entrada.Al_trocavel === undefined);
      adicionar("CTC_pH7", entrada.CTC_pH7 === undefined);
    }

    if (entrada.primeira_calagem !== true) {
      adicionar("V_atual", entrada.V_atual === undefined);
    }
  }

  if (entrada.sistema_manejo === SistemaManejo.PD_COM_RESTRICAO) {
    adicionar("SMP_10_20", entrada.SMP_10_20 === undefined);
    adicionar(
      "Al_sat_10_20",
      resolverAlSat10_20(entrada) === undefined
    );
  }

  return campos;
}
