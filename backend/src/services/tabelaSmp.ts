// backend/src/services/tabelaSmp.ts

type PhAlvo = 5.5 | 6.0 | 6.5;

// Transcrição exata da Tabela 5.2 do Manual RS/SC
const DICIONARIO_SMP: Record<string, Record<PhAlvo, number>> = {
  "4.4": { 5.5: 15.0, 6.0: 21.0, 6.5: 29.0 },
  "4.5": { 5.5: 12.5, 6.0: 17.3, 6.5: 24.0 },
  "4.6": { 5.5: 10.9, 6.0: 15.1, 6.5: 20.0 },
  "4.7": { 5.5: 9.6,  6.0: 13.3, 6.5: 17.5 },
  "4.8": { 5.5: 8.5,  6.0: 11.9, 6.5: 15.7 },
  "4.9": { 5.5: 7.7,  6.0: 10.7, 6.5: 14.2 },
  "5.0": { 5.5: 6.6,  6.0: 9.9,  6.5: 13.3 },
  "5.1": { 5.5: 6.0,  6.0: 9.1,  6.5: 12.3 },
  "5.2": { 5.5: 5.3,  6.0: 8.3,  6.5: 11.3 },
  "5.3": { 5.5: 4.8,  6.0: 7.5,  6.5: 10.4 },
  "5.4": { 5.5: 4.2,  6.0: 6.8,  6.5: 9.5  },
  "5.5": { 5.5: 3.7,  6.0: 6.1,  6.5: 8.6  },
  "5.6": { 5.5: 3.2,  6.0: 5.4,  6.5: 7.8  },
  "5.7": { 5.5: 2.8,  6.0: 4.8,  6.5: 7.0  },
  "5.8": { 5.5: 2.3,  6.0: 4.2,  6.5: 6.3  },
  "5.9": { 5.5: 2.0,  6.0: 3.7,  6.5: 5.6  },
  "6.0": { 5.5: 1.6,  6.0: 3.2,  6.5: 4.9  },
  "6.1": { 5.5: 1.3,  6.0: 2.7,  6.5: 4.3  },
  "6.2": { 5.5: 1.0,  6.0: 2.2,  6.5: 3.7  },
  "6.3": { 5.5: 0.8,  6.0: 1.8,  6.5: 3.1  },
  "6.4": { 5.5: 0.6,  6.0: 1.4,  6.5: 2.6  },
  "6.5": { 5.5: 0.4,  6.0: 1.1,  6.5: 2.1  },
  "6.6": { 5.5: 0.2,  6.0: 0.8,  6.5: 1.6  },
  "6.7": { 5.5: 0.0,  6.0: 0.5,  6.5: 1.2  },
  "6.8": { 5.5: 0.0,  6.0: 0.3,  6.5: 0.8  },
  "6.9": { 5.5: 0.0,  6.0: 0.2,  6.5: 0.5  },
  "7.0": { 5.5: 0.0,  6.0: 0.0,  6.5: 0.2  },
  "7.1": { 5.5: 0.0,  6.0: 0.0,  6.5: 0.0  }
};

/**
 * Retorna a Necessidade de Calagem (t/ha) baseada na Tabela 5.2 do Índice SMP.
 * Clampa valores menores ou iguais a 4.4 e maiores ou iguais a 7.1.
 */
export function calcularNcViaTabelaSmp(indiceSmp: number, phAlvo: PhAlvo = 6.0): number {
  if (indiceSmp <= 4.4) return DICIONARIO_SMP["4.4"][phAlvo];
  if (indiceSmp >= 7.1) return DICIONARIO_SMP["7.1"][phAlvo];

  const chaveSmp = indiceSmp.toFixed(1);
  const necessidadeCalagem = DICIONARIO_SMP[chaveSmp][phAlvo];
  return necessidadeCalagem !== undefined ? necessidadeCalagem : 0;
}

/**
 * Cálculo via polinômio para solos de Baixo Poder Tampão (geralmente SMP > 6.3).
 * Utiliza as equações exatas do manual baseadas em MO e Al.
 * Sem arredondamento — valor segue no pipeline até dose_final_t_ha.
 */
export function calcularNcViaPolinomio(mo_pct: number, al_cmolc_dm3: number, phAlvo: PhAlvo = 6.0): number {
  let nc = 0;

  if (phAlvo === 5.5) {
    nc = -0.653 + (0.480 * mo_pct) + (1.937 * al_cmolc_dm3);
  } else if (phAlvo === 6.0) {
    nc = -0.516 + (0.805 * mo_pct) + (2.435 * al_cmolc_dm3);
  } else if (phAlvo === 6.5) {
    nc = -0.122 + (1.193 * mo_pct) + (2.713 * al_cmolc_dm3);
  }

  return nc > 0 ? nc : 0;
}