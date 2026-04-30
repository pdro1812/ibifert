// backend/src/services/calculadoraCalagem.ts
// Utilitários puros — sem dependência do motorCalagem para evitar imports circulares.

import { CalagemValidationError, EntradaCalagem } from "../schemas/calagemSchema";

/**
 * Validações de entrada conforme Parte 10 do documento.
 * Exportada para uso direto em testes e em camadas de controller/route.
 */
export function validarEntrada(entrada: EntradaCalagem): void {
  const { pH_agua, PRNT, V_atual, Al_sat, CTC_pH7, MO, Al_trocavel } = entrada;

  if (pH_agua < 3.5 || pH_agua > 8.0) {
    throw new CalagemValidationError(
      `pH inválido: ${pH_agua}. Deve estar entre 3.5 e 8.0.`
    );
  }

  if (PRNT <= 0 || PRNT > 100) {
    throw new CalagemValidationError(
      `PRNT inválido: ${PRNT}. Deve estar entre 1 e 100.`
    );
  }

  if (V_atual !== undefined && (V_atual < 0.0 || V_atual > 100.0)) {
    throw new CalagemValidationError(
      `V_atual inválido: ${V_atual}. Deve estar entre 0 e 100.`
    );
  }

  if (Al_sat !== undefined && (Al_sat < 0.0 || Al_sat > 100.0)) {
    throw new CalagemValidationError(
      `Al_sat inválido: ${Al_sat}. Deve estar entre 0 e 100.`
    );
  }

  if (CTC_pH7 !== undefined && CTC_pH7 <= 0.0) {
    throw new CalagemValidationError(
      `CTC_pH7 inválido: ${CTC_pH7}. Deve ser maior que 0.`
    );
  }

  if (MO !== undefined && (MO < 0.0 || MO > 100.0)) {
    throw new CalagemValidationError(
      `MO inválida: ${MO}. Deve estar entre 0 e 100.`
    );
  }

  if (Al_trocavel !== undefined && Al_trocavel < 0.0) {
    throw new CalagemValidationError(
      `Al_trocavel inválido: ${Al_trocavel}. Deve ser >= 0.`
    );
  }
}

/**
 * Calcula Al_sat a partir de Al_trocavel e CTC_pH7 (opção 2 do bloco B2).
 * CT-17
 */
export function calcularAlSat(Al_trocavel: number, CTC_pH7: number): number {
  if (CTC_pH7 <= 0) {
    throw new CalagemValidationError("CTC_pH7 deve ser maior que 0 para calcular Al_sat.");
  }
  return (Al_trocavel / CTC_pH7) * 100.0;
}

/**
 * Determina quais campos condicionais são necessários dado o estado parcial de entrada.
 * Útil para o frontend exibir campos progressivamente (Parte 1 do documento).
 */
export function determinarCamposNecessarios(
  entrada: Partial<EntradaCalagem>
): string[] {
  const campos: string[] = [];
  const { sistema_manejo, primeira_calagem, pH_agua, SMP } = entrada;

  if (!sistema_manejo)              campos.push("sistema_manejo");
  if (primeira_calagem === undefined) campos.push("primeira_calagem");
  if (pH_agua === undefined)        campos.push("pH_agua");
  if (SMP === undefined)            campos.push("SMP");
  if (entrada.PRNT === undefined)   campos.push("PRNT");

  if (SMP !== undefined) {
    // B3 — Polinomial (TRAVA-05)
    if (SMP > 6.3) {
      campos.push("MO", "Al_trocavel");
    }

    // B1 — Sat. Bases para reaplicação com método SMP (TRAVA-10/11)
    if (SMP <= 6.3 && primeira_calagem === false) {
      campos.push("V_atual", "CTC_pH7");
    }
  }

  // B2 — Al_sat para PD_CONSOLIDADO com pH < 5.5 (TRAVA-09)
  if (sistema_manejo === "PD_CONSOLIDADO" && pH_agua !== undefined && pH_agua < 5.5) {
    campos.push("Al_sat");
  }

  return campos;
}