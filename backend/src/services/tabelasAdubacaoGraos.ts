export type Cultura =
  | 'aveia_branca'
  | 'aveia_preta'
  | 'canola'
  | 'centeio'
  | 'cevada'
  | 'ervilha'
  | 'ervilhaca'
  | 'feijao'
  | 'girassol'
  | 'milho'
  | 'milho_pipoca'
  | 'nabo_forrageiro'
  | 'soja'
  | 'sorgo'
  | 'trigo'
  | 'triticale';

export type ClasseArgila = 1 | 2 | 3 | 4;
export type ClasseMO = 'baixo' | 'medio' | 'alto';
export type ClasseCTC = 'baixa' | 'media' | 'alta' | 'muito_alta';
export type ClasseDisponibilidade = 'muito_baixo' | 'baixo' | 'medio' | 'alto' | 'muito_alto';
export type ClasseNutrienteSecundario = 'baixo' | 'medio' | 'alto';

// TAB-01A
export function classificarArgila(argila: number): ClasseArgila {
  if (argila <= 20) return 4;
  if (argila <= 40) return 3;
  if (argila <= 60) return 2;
  return 1;
}

// TAB-01B
export function classificarMO(mo: number): ClasseMO {
  if (mo <= 2.5) return 'baixo';
  if (mo <= 5.0) return 'medio';
  return 'alto';
}

// TAB-01C
export function classificarCTC(ctc: number): ClasseCTC {
  if (ctc <= 7.5) return 'baixa';
  if (ctc <= 15.0) return 'media';
  if (ctc <= 30.0) return 'alta';
  return 'muito_alta';
}

// TAB-02P (P em mg/dm3)
export function classificarFosforo(p: number, classeArgila: ClasseArgila): ClasseDisponibilidade {
  if (classeArgila === 1) {
    if (p <= 3.0) return 'muito_baixo';
    if (p <= 6.0) return 'baixo';
    if (p <= 9.0) return 'medio';
    if (p <= 18.0) return 'alto';
    return 'muito_alto';
  } else if (classeArgila === 2) {
    if (p <= 4.0) return 'muito_baixo';
    if (p <= 8.0) return 'baixo';
    if (p <= 12.0) return 'medio';
    if (p <= 24.0) return 'alto';
    return 'muito_alto';
  } else if (classeArgila === 3) {
    if (p <= 6.0) return 'muito_baixo';
    if (p <= 12.0) return 'baixo';
    if (p <= 18.0) return 'medio';
    if (p <= 36.0) return 'alto';
    return 'muito_alto';
  } else { // 4
    if (p <= 10.0) return 'muito_baixo';
    if (p <= 20.0) return 'baixo';
    if (p <= 30.0) return 'medio';
    if (p <= 60.0) return 'alto';
    return 'muito_alto';
  }
}

// TAB-02K (K em mg/dm3)
export function classificarPotassio(k: number, classeCtc: ClasseCTC): ClasseDisponibilidade {
  if (classeCtc === 'baixa') {
    if (k <= 20) return 'muito_baixo';
    if (k <= 40) return 'baixo';
    if (k <= 60) return 'medio';
    if (k <= 120) return 'alto';
    return 'muito_alto';
  } else if (classeCtc === 'media') {
    if (k <= 30) return 'muito_baixo';
    if (k <= 60) return 'baixo';
    if (k <= 90) return 'medio';
    if (k <= 180) return 'alto';
    return 'muito_alto';
  } else if (classeCtc === 'alta') {
    if (k <= 40) return 'muito_baixo';
    if (k <= 80) return 'baixo';
    if (k <= 120) return 'medio';
    if (k <= 240) return 'alto';
    return 'muito_alto';
  } else { // muito_alta
    if (k <= 45) return 'muito_baixo';
    if (k <= 90) return 'baixo';
    if (k <= 135) return 'medio';
    if (k <= 270) return 'alto';
    return 'muito_alto';
  }
}

// TAB-04
export const TABELA_CORRECAO_TOTAL = {
  muito_baixo: { p2o5: 160, k2o: 120 },
  baixo: { p2o5: 80, k2o: 60 },
  medio: { p2o5: 40, k2o: 30 },
  alto: { p2o5: 0, k2o: 0 },
  muito_alto: { p2o5: 0, k2o: 0 },
};

// TAB-05 e TAB-06 e infos da cultura
export interface CulturaInfo {
  rend_ref_t: number;
  p2o5_manutencao: number;
  k2o_manutencao: number;
  p2o5_adic_t: number;
  k2o_adic_t: number;
  exportacao_t: { n: number; p2o5: number; k2o: number };
  bnf: boolean; // Fixação Biológica de Nitrogênio (N = 0)
}

export const CULTURAS_INFO: Record<Cultura, CulturaInfo> = {
  aveia_branca: { rend_ref_t: 3, p2o5_manutencao: 45, k2o_manutencao: 30, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 20, p2o5: 7, k2o: 5 }, bnf: false },
  aveia_preta: { rend_ref_t: 3, p2o5_manutencao: 45, k2o_manutencao: 30, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 20, p2o5: 7, k2o: 5 }, bnf: false },
  canola: { rend_ref_t: 1.5, p2o5_manutencao: 30, k2o_manutencao: 25, p2o5_adic_t: 20, k2o_adic_t: 15, exportacao_t: { n: 20, p2o5: 15, k2o: 12 }, bnf: false },
  centeio: { rend_ref_t: 2, p2o5_manutencao: 30, k2o_manutencao: 20, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 20, p2o5: 9, k2o: 5 }, bnf: false },
  cevada: { rend_ref_t: 3, p2o5_manutencao: 45, k2o_manutencao: 30, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 20, p2o5: 10, k2o: 6 }, bnf: false },
  ervilha: { rend_ref_t: 2, p2o5_manutencao: 30, k2o_manutencao: 40, p2o5_adic_t: 15, k2o_adic_t: 20, exportacao_t: { n: 36, p2o5: 9, k2o: 12 }, bnf: true },
  ervilhaca: { rend_ref_t: 2, p2o5_manutencao: 40, k2o_manutencao: 50, p2o5_adic_t: 20, k2o_adic_t: 25, exportacao_t: { n: 35, p2o5: 15, k2o: 19 }, bnf: true },
  feijao: { rend_ref_t: 2, p2o5_manutencao: 30, k2o_manutencao: 40, p2o5_adic_t: 15, k2o_adic_t: 20, exportacao_t: { n: 50, p2o5: 10, k2o: 15 }, bnf: false },
  girassol: { rend_ref_t: 2, p2o5_manutencao: 30, k2o_manutencao: 30, p2o5_adic_t: 15, k2o_adic_t: 15, exportacao_t: { n: 25, p2o5: 14, k2o: 6 }, bnf: false },
  milho: { rend_ref_t: 6, p2o5_manutencao: 90, k2o_manutencao: 60, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 16, p2o5: 8, k2o: 6 }, bnf: false },
  milho_pipoca: { rend_ref_t: 5, p2o5_manutencao: 75, k2o_manutencao: 50, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 17, p2o5: 8, k2o: 6 }, bnf: false },
  nabo_forrageiro: { rend_ref_t: 3, p2o5_manutencao: 45, k2o_manutencao: 60, p2o5_adic_t: 15, k2o_adic_t: 20, exportacao_t: { n: 20, p2o5: 11, k2o: 18 }, bnf: false },
  soja: { rend_ref_t: 3, p2o5_manutencao: 45, k2o_manutencao: 75, p2o5_adic_t: 15, k2o_adic_t: 25, exportacao_t: { n: 60, p2o5: 14, k2o: 20 }, bnf: true },
  sorgo: { rend_ref_t: 4, p2o5_manutencao: 60, k2o_manutencao: 40, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 15, p2o5: 8, k2o: 4 }, bnf: false },
  trigo: { rend_ref_t: 3, p2o5_manutencao: 45, k2o_manutencao: 30, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 22, p2o5: 10, k2o: 6 }, bnf: false },
  triticale: { rend_ref_t: 3, p2o5_manutencao: 45, k2o_manutencao: 30, p2o5_adic_t: 15, k2o_adic_t: 10, exportacao_t: { n: 22, p2o5: 8, k2o: 6 }, bnf: false },
};

export interface RegraNMOCultAnterior {
  leguminosa: number;
  graminea: number;
  consorciacao_pousio?: number;
}

export interface RegraNCultura {
  baixo: number | RegraNMOCultAnterior;
  medio: number | RegraNMOCultAnterior;
  alto: number | RegraNMOCultAnterior;
  n_adic_t?: number;
  rend_ref_adic?: number;
}

export const TABELA_N_BASE: Partial<Record<Cultura, RegraNCultura>> = {
  aveia_branca: { baixo: { leguminosa: 60, graminea: 80 }, medio: { leguminosa: 40, graminea: 60 }, alto: { leguminosa: 20, graminea: 20 }, n_adic_t: 30, rend_ref_adic: 3 }, // n_adic_t can be 20(leg) or 30(gram), this will be handled in code
  aveia_preta: { baixo: { leguminosa: 60, graminea: 80 }, medio: { leguminosa: 40, graminea: 60 }, alto: { leguminosa: 20, graminea: 20 }, n_adic_t: 30, rend_ref_adic: 3 },
  centeio: { baixo: { leguminosa: 40, graminea: 50 }, medio: { leguminosa: 20, graminea: 30 }, alto: { leguminosa: 10, graminea: 10 }, n_adic_t: 30, rend_ref_adic: 2 },
  cevada: { baixo: { leguminosa: 60, graminea: 80 }, medio: { leguminosa: 40, graminea: 60 }, alto: { leguminosa: 20, graminea: 20 }, n_adic_t: 30, rend_ref_adic: 3 },
  trigo: { baixo: { leguminosa: 60, graminea: 80 }, medio: { leguminosa: 40, graminea: 60 }, alto: { leguminosa: 20, graminea: 20 }, n_adic_t: 30, rend_ref_adic: 3 },
  triticale: { baixo: { leguminosa: 60, graminea: 80 }, medio: { leguminosa: 40, graminea: 60 }, alto: { leguminosa: 20, graminea: 20 }, n_adic_t: 30, rend_ref_adic: 3 },
  
  milho: {
    baixo: { leguminosa: 70, consorciacao_pousio: 80, graminea: 90 },
    medio: { leguminosa: 50, consorciacao_pousio: 60, graminea: 70 },
    alto: { leguminosa: 40, consorciacao_pousio: 40, graminea: 50 },
    n_adic_t: 15, rend_ref_adic: 6
  },
  
  canola: { baixo: 60, medio: 40, alto: 30, n_adic_t: 20, rend_ref_adic: 1.5 },
  feijao: { baixo: 70, medio: 50, alto: 30, n_adic_t: 20, rend_ref_adic: 2 },
  girassol: { baixo: 60, medio: 40, alto: 30, n_adic_t: 20, rend_ref_adic: 2 },
  milho_pipoca: { baixo: 60, medio: 40, alto: 30, n_adic_t: 15, rend_ref_adic: 5 },
  nabo_forrageiro: { baixo: 60, medio: 50, alto: 20, n_adic_t: 20, rend_ref_adic: 3 },
  sorgo: { baixo: 75, medio: 55, alto: 20, n_adic_t: 15, rend_ref_adic: 4 },
};

export interface DosesPK {
  1: number;
  2: number;
}
export type DosesClassePK = Record<ClasseDisponibilidade, DosesPK>;
export interface RecomendacaoPKCultura {
  P2O5: DosesClassePK;
  K2O: DosesClassePK;
}

const P_TIPO1: DosesClassePK = { muito_baixo: { 1: 155, 2: 95 }, baixo: { 1: 95, 2: 75 }, medio: { 1: 85, 2: 45 }, alto: { 1: 45, 2: 45 }, muito_alto: { 1: 0, 2: 45 } };
const P_TIPO2: DosesClassePK = { muito_baixo: { 1: 140, 2: 80 }, baixo: { 1: 80, 2: 60 }, medio: { 1: 70, 2: 30 }, alto: { 1: 30, 2: 30 }, muito_alto: { 1: 0, 2: 30 } };

const K_TIPO1: DosesClassePK = { muito_baixo: { 1: 110, 2: 70 }, baixo: { 1: 70, 2: 50 }, medio: { 1: 60, 2: 30 }, alto: { 1: 30, 2: 30 }, muito_alto: { 1: 0, 2: 30 } };
const K_TIPO2: DosesClassePK = { muito_baixo: { 1: 120, 2: 80 }, baixo: { 1: 80, 2: 60 }, medio: { 1: 70, 2: 40 }, alto: { 1: 40, 2: 40 }, muito_alto: { 1: 0, 2: 40 } };

export const TABELA_PK_CULTURA: Record<Cultura, RecomendacaoPKCultura> = {
  aveia_branca: { P2O5: P_TIPO1, K2O: K_TIPO1 },
  aveia_preta: { P2O5: P_TIPO1, K2O: K_TIPO1 },
  canola: { P2O5: P_TIPO2, K2O: { muito_baixo: { 1: 105, 2: 65 }, baixo: { 1: 65, 2: 45 }, medio: { 1: 55, 2: 25 }, alto: { 1: 25, 2: 25 }, muito_alto: { 1: 0, 2: 25 } } },
  centeio: { P2O5: P_TIPO2, K2O: { muito_baixo: { 1: 100, 2: 60 }, baixo: { 1: 60, 2: 40 }, medio: { 1: 50, 2: 20 }, alto: { 1: 20, 2: 20 }, muito_alto: { 1: 0, 2: 20 } } },
  cevada: { P2O5: P_TIPO1, K2O: K_TIPO1 },
  ervilha: { P2O5: P_TIPO2, K2O: K_TIPO2 },
  ervilhaca: {
    P2O5: { muito_baixo: { 1: 150, 2: 90 }, baixo: { 1: 90, 2: 70 }, medio: { 1: 80, 2: 40 }, alto: { 1: 40, 2: 40 }, muito_alto: { 1: 0, 2: 40 } },
    K2O: { muito_baixo: { 1: 130, 2: 90 }, baixo: { 1: 90, 2: 70 }, medio: { 1: 80, 2: 50 }, alto: { 1: 50, 2: 50 }, muito_alto: { 1: 0, 2: 50 } }
  },
  feijao: { P2O5: P_TIPO2, K2O: K_TIPO2 },
  girassol: { P2O5: P_TIPO2, K2O: K_TIPO1 },
  milho: {
    P2O5: { muito_baixo: { 1: 200, 2: 140 }, baixo: { 1: 140, 2: 120 }, medio: { 1: 130, 2: 90 }, alto: { 1: 90, 2: 90 }, muito_alto: { 1: 0, 2: 90 } },
    K2O: { muito_baixo: { 1: 140, 2: 100 }, baixo: { 1: 100, 2: 80 }, medio: { 1: 90, 2: 60 }, alto: { 1: 60, 2: 60 }, muito_alto: { 1: 0, 2: 60 } }
  },
  milho_pipoca: {
    P2O5: { muito_baixo: { 1: 185, 2: 125 }, baixo: { 1: 125, 2: 105 }, medio: { 1: 115, 2: 75 }, alto: { 1: 75, 2: 75 }, muito_alto: { 1: 0, 2: 75 } },
    K2O: { muito_baixo: { 1: 130, 2: 90 }, baixo: { 1: 90, 2: 70 }, medio: { 1: 80, 2: 50 }, alto: { 1: 50, 2: 50 }, muito_alto: { 1: 0, 2: 50 } }
  },
  nabo_forrageiro: {
    P2O5: P_TIPO1,
    K2O: { muito_baixo: { 1: 140, 2: 100 }, baixo: { 1: 100, 2: 80 }, medio: { 1: 90, 2: 60 }, alto: { 1: 60, 2: 60 }, muito_alto: { 1: 0, 2: 60 } }
  },
  soja: {
    P2O5: P_TIPO1,
    K2O: { muito_baixo: { 1: 155, 2: 115 }, baixo: { 1: 115, 2: 95 }, medio: { 1: 105, 2: 75 }, alto: { 1: 75, 2: 75 }, muito_alto: { 1: 0, 2: 75 } }
  },
  sorgo: {
    P2O5: { muito_baixo: { 1: 170, 2: 110 }, baixo: { 1: 110, 2: 90 }, medio: { 1: 100, 2: 60 }, alto: { 1: 60, 2: 60 }, muito_alto: { 1: 0, 2: 60 } },
    K2O: K_TIPO2
  },
  trigo: { P2O5: P_TIPO1, K2O: K_TIPO1 },
  triticale: { P2O5: P_TIPO1, K2O: K_TIPO1 }
};

// Diagnose Secundaria (TAB-03A e TAB-03B)
export function classificarCa(ca: number): ClasseNutrienteSecundario {
  if (ca < 2.0) return 'baixo';
  if (ca <= 4.0) return 'medio';
  return 'alto';
}

export function classificarMg(mg: number): ClasseNutrienteSecundario {
  if (mg < 0.5) return 'baixo';
  if (mg <= 1.0) return 'medio';
  return 'alto';
}

export function classificarS(s: number, culturaExigente: boolean): ClasseNutrienteSecundario {
  const critico = culturaExigente ? 10.0 : 5.0;
  if (s < 2.0) return 'baixo';
  if (s <= critico) return 'medio';
  return 'alto';
}

export function classificarMicronutriente(nutriente: 'Cu' | 'Zn' | 'B' | 'Mn', valor: number): ClasseNutrienteSecundario {
  switch (nutriente) {
    case 'Cu':
      if (valor < 0.2) return 'baixo';
      if (valor <= 0.4) return 'medio';
      return 'alto';
    case 'Zn':
      if (valor < 0.2) return 'baixo';
      if (valor <= 0.5) return 'medio';
      return 'alto';
    case 'B':
      if (valor <= 0.1) return 'baixo'; // The rule says <= 0.1
      if (valor <= 0.3) return 'medio';
      return 'alto';
    case 'Mn':
      if (valor < 2.5) return 'baixo';
      if (valor <= 5.0) return 'medio';
      return 'alto';
  }
}

