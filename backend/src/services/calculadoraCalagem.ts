import { ZodError } from "zod";

import {
  CalagemSchema,
  CalagemValidationError,
  EntradaCalagem,
  MetodoCalcRoteado,
  SistemaManejo,
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

export function rotearMetodoCalagem(SMP: number): MetodoCalcRoteado {
  return SMP > 6.3 ? MetodoCalcRoteado.POLINOMIAL : MetodoCalcRoteado.SMP;
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

  if (entrada.modo === "simplificado") {
    return campos;
  }

  if (entrada.SMP !== undefined) {
    const metodo = rotearMetodoCalagem(entrada.SMP);

    if (metodo === MetodoCalcRoteado.POLINOMIAL) {
      adicionar("MO", entrada.MO === undefined);
      adicionar("Al_trocavel", entrada.Al_trocavel === undefined);
    }

    if (entrada.primeira_calagem === false && metodo === MetodoCalcRoteado.SMP) {
      adicionar("V_atual", entrada.V_atual === undefined);
      adicionar("CTC_pH7", entrada.CTC_pH7 === undefined);
    }
  }

  if (
    entrada.sistema_manejo === SistemaManejo.PD_CONSOLIDADO &&
    entrada.pH_agua !== undefined &&
    entrada.pH_agua < 5.5
  ) {
    const temAlSatDireto = entrada.Al_sat !== undefined;
    const temAlSatPorCalculo =
      entrada.Al_trocavel !== undefined && entrada.CTC_pH7 !== undefined;

    if (!temAlSatDireto && !temAlSatPorCalculo) {
      adicionar("Al_sat");
      adicionar("Al_trocavel", entrada.Al_trocavel === undefined);
      adicionar("CTC_pH7", entrada.CTC_pH7 === undefined);
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
