export function converterMehlich3ParaMehlich1_P(p_m3: number, argila: number): number {
  if (argila >= 100) {
    throw new Error("Divisão por zero: argila não pode ser >= 100");
  }
  return p_m3 / (2 - (0.02 * argila));
}

export function converterMehlich3ParaMehlich1_K(k_m3: number): number {
  return k_m3 * 0.83;
}
