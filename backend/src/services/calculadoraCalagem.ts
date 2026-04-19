/**
 * Converte a dose técnica (PRNT 100%) para a dose comercial baseada no PRNT do calcário.
 * ÚNICO ponto de arredondamento final permitido pelo spec (2 casas decimais).
 */
export function aplicarPrnt(doseBase: number, prntPct: number): number {
  if (doseBase <= 0) return 0;
  const doseComercial = (doseBase * 100) / prntPct;
  return Number(doseComercial.toFixed(2));
}

/**
 * Limita a dose de calagem superficial a 5.0 t/ha (antes do PRNT).
 * Ref: Tabela 5.3 nota 5, p.75 do Manual RS/SC.
 */
export function aplicarClampingSuperficial(dose: number): number {
  return dose > 5.0 ? 5.0 : dose;
}

/**
 * Calcula a média aritmética do Índice SMP com precisão de 1 casa decimal.
 * Arredondamento necessário aqui pois a média é usada como CHAVE de lookup
 * na Tabela 5.2 — não é um valor intermediário de cálculo contínuo.
 */
export function calcularMediaSmp(smp1: number, smp2: number): number {
  return Number(((smp1 + smp2) / 2).toFixed(1));
}

/**
 * Aplica o fracionamento da calagem (ex: 1/2 ou 1/4 da dose para aplicação superficial).
 * Sem arredondamento — valor continua no pipeline até dose_final_t_ha.
 */
export function aplicarFracionamento(dose: number, fracao: number): number {
  return dose * fracao;
}

/**
 * Avalia a trava superficial de V% e m% para PD Consolidado.
 * Retorna TRUE se a amostra 0-10 já atingiu a saturação ideal e o alumínio não é tóxico.
 * Critério estrito: V >= 65 E m < 10 (m = 10 não satisfaz).
 */
export function soloSuperficialAtingiuMeta(v_pct?: number, m_pct?: number): boolean {
  if (v_pct === undefined || m_pct === undefined) return false;
  return v_pct >= 65 && m_pct < 10;
}