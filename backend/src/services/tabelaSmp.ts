// backend/src/services/tabelaSmp.ts

/**
 * Tabela 5.2 — Manual de Calagem e Adubação RS/SC (2016), Capítulo 5
 * Colunas: smp, pH_5_5, pH_6_0, pH_6_5
 * Regra de uso: floor do SMP para busca (sem interpolação, conforme especificação)
 * SE SMP < 4.4 → usar linha 4.4 (máximo da tabela)
 * SE SMP > 7.1 → NC_base = 0.0
 */
const TABELA_SMP: ReadonlyArray<{ smp: number; pH_5_5: number; pH_6_0: number; pH_6_5: number }> = [
  { smp: 4.4, pH_5_5: 15.0, pH_6_0: 21.0, pH_6_5: 29.0 },
  { smp: 4.5, pH_5_5: 12.5, pH_6_0: 17.3, pH_6_5: 24.0 },
  { smp: 4.6, pH_5_5: 10.9, pH_6_0: 15.1, pH_6_5: 20.0 },
  { smp: 4.7, pH_5_5:  9.6, pH_6_0: 13.3, pH_6_5: 17.5 },
  { smp: 4.8, pH_5_5:  8.5, pH_6_0: 11.9, pH_6_5: 15.7 },
  { smp: 4.9, pH_5_5:  7.7, pH_6_0: 10.7, pH_6_5: 14.2 },
  { smp: 5.0, pH_5_5:  6.6, pH_6_0:  9.9, pH_6_5: 13.3 },
  { smp: 5.1, pH_5_5:  6.0, pH_6_0:  9.1, pH_6_5: 12.3 },
  { smp: 5.2, pH_5_5:  5.3, pH_6_0:  8.3, pH_6_5: 11.3 },
  { smp: 5.3, pH_5_5:  4.8, pH_6_0:  7.5, pH_6_5: 10.4 },
  { smp: 5.4, pH_5_5:  4.2, pH_6_0:  6.8, pH_6_5:  9.5 },
  { smp: 5.5, pH_5_5:  3.7, pH_6_0:  6.1, pH_6_5:  8.6 },
  { smp: 5.6, pH_5_5:  3.2, pH_6_0:  5.4, pH_6_5:  7.8 },
  { smp: 5.7, pH_5_5:  2.8, pH_6_0:  4.8, pH_6_5:  7.0 },
  { smp: 5.8, pH_5_5:  2.3, pH_6_0:  4.2, pH_6_5:  6.3 },
  { smp: 5.9, pH_5_5:  2.0, pH_6_0:  3.7, pH_6_5:  5.6 },
  { smp: 6.0, pH_5_5:  1.6, pH_6_0:  3.2, pH_6_5:  4.9 },
  { smp: 6.1, pH_5_5:  1.3, pH_6_0:  2.7, pH_6_5:  4.3 },
  { smp: 6.2, pH_5_5:  1.0, pH_6_0:  2.2, pH_6_5:  3.7 },
  { smp: 6.3, pH_5_5:  0.8, pH_6_0:  1.8, pH_6_5:  3.1 },
  { smp: 6.4, pH_5_5:  0.6, pH_6_0:  1.4, pH_6_5:  2.6 },
  { smp: 6.5, pH_5_5:  0.4, pH_6_0:  1.1, pH_6_5:  2.1 },
  { smp: 6.6, pH_5_5:  0.2, pH_6_0:  0.8, pH_6_5:  1.6 },
  { smp: 6.7, pH_5_5:  0.0, pH_6_0:  0.5, pH_6_5:  1.2 },
  { smp: 6.8, pH_5_5:  0.0, pH_6_0:  0.3, pH_6_5:  0.8 },
  { smp: 6.9, pH_5_5:  0.0, pH_6_0:  0.2, pH_6_5:  0.5 },
  { smp: 7.0, pH_5_5:  0.0, pH_6_0:  0.0, pH_6_5:  0.2 },
  { smp: 7.1, pH_5_5:  0.0, pH_6_0:  0.0, pH_6_5:  0.0 },
] as const;

export type PHAlvo = 5.5 | 6.0 | 6.5;

/**
 * Consulta a Tabela 5.2 para o SMP e pH-alvo fornecidos.
 *
 * - SMP < 4.4 → usa linha 4.4 (máximo)
 * - SMP > 7.1 → retorna 0.0
 * - Sem interpolação: usa floor para 1 casa decimal
 */
export function tabelaSmpLookup(smp: number, pHAlvo: PHAlvo): number {
  // Acima do limite superior → sem necessidade
  if (smp > 7.1) return 0.0;

  // Arredonda para 1 casa decimal via floor (ex: 5.85 → 5.8)
  const smpFloor = Math.floor(smp * 10) / 10;

  // Clamp no mínimo da tabela
  const smpBusca = Math.max(smpFloor, 4.4);

  const linha = TABELA_SMP.find((row) => row.smp === smpBusca);

  // Fallback seguro: se por algum motivo não encontrar, usa 4.4
  const row = linha ?? TABELA_SMP[0];

  switch (pHAlvo) {
    case 5.5: return row.pH_5_5;
    case 6.0: return row.pH_6_0;
    case 6.5: return row.pH_6_5;
  }
}