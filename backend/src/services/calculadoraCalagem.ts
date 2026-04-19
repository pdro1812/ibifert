/**
 * Converte a dose técnica (PRNT 100%) para a dose comercial baseada no PRNT do calcário.
 */
export function aplicarPrnt(doseBase: number, prntPct: number): number {
  if (doseBase <= 0) return 0;
  
  // Regra de três matemática: Dose Comercial = (Dose Técnica * 100) / PRNT
  const doseComercial = (doseBase * 100) / prntPct;
  return Number(doseComercial.toFixed(2));
}

/**
 * Limita a dose de calagem superficial a 5.0 t/ha (antes do PRNT).
 */
export function aplicarClampingSuperficial(dose: number): number {
  return dose > 5.0 ? 5.0 : dose;
}

/**
 * Calcula a média aritmética do Índice SMP com precisão de 1 casa decimal.
 * Usado no cenário de reinício do PD (média entre 0-10 e 10-20).
 */
export function calcularMediaSmp(smp1: number, smp2: number): number {
  // O manual utiliza leitura em uma casa decimal, então garantimos o arredondamento na média.
  return Number(((smp1 + smp2) / 2).toFixed(1));
}

/**
 * Aplica o fracionamento da calagem (ex: 1/4 da dose para manutenção superficial).
 */
export function aplicarFracionamento(dose: number, fracao: number): number {
  return Number((dose * fracao).toFixed(2));
}

/**
 * Avalia a trava superficial de V% e m% para PD Consolidado.
 * Retorna TRUE se a amostra 0-10 já atingiu a saturação ideal e o alumínio não é tóxico.
 */
export function soloSuperficialAtingiuMeta(v_pct?: number, m_pct?: number): boolean {
  if (v_pct === undefined || m_pct === undefined) return false;
  return v_pct >= 65 && m_pct < 10;
}