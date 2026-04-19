/**
 * Converte a dose técnica (PRNT 100%) para a dose comercial baseada no PRNT do calcário.
 */
export function aplicarPrnt(doseBase: number, prntPct: number): number {
  if (doseBase <= 0) return 0;
  // Regra de três: (doseBase * 100) / prntPct
  const doseComercial = (doseBase * 100) / prntPct;
  return Number(doseComercial.toFixed(2)); // Arredonda para 2 casas no final
}

/**
 * Limita a dose de calagem superficial a 5.0 t/ha (antes do PRNT).
 */
export function aplicarClampingSuperficial(dose: number): number {
  return dose > 5.0 ? 5.0 : dose;
}

/**
 * Calcula a média aritmética do Índice SMP (usado no cenário de reinício do PD).
 */
export function calcularMediaSmp(smp1: number, smp2: number): number {
  return Number(((smp1 + smp2) / 2).toFixed(2));
}

/**
 * Aplica o fracionamento da calagem (ex: 1/4 da dose para manutenção superficial).
 */
export function aplicarFracionamento(dose: number, fracao: number): number {
  return dose * fracao;
}

/**
 * Avalia a trava superficial de V% e m% para PD Consolidado.
 * Retorna TRUE se o solo já está bom o suficiente e NÃO precisa de calcário.
 */
export function soloSuperficialAtingiuMeta(v_pct?: number, m_pct?: number): boolean {
  if (v_pct === undefined || m_pct === undefined) return false;
  return v_pct >= 65 && m_pct < 10;
}