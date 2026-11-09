// Faixas aceitas nas entradas da calagem e da adubação (AUD-05).
//
// Sem elas a API aceitava, por exemplo, PRNT 0,01 (61.000 t/ha de calcário)
// e rendimento de 1.000 t/ha (14.980 kg N/ha). A origem de cada faixa está em
// docs/auditoria-2026-10-31.md, seção 6.3. Quando o Manual RS/SC 2016 não traz
// um máximo, o teto é só uma barreira contra erro de digitação, largo o
// bastante para não recusar laudo real.
//
// O frontend tem uma cópia em frontend/src/schemas/limitesAgronomicos.ts; o
// teste limites.test.ts garante que as duas são iguais.

export const LIMITES_CALAGEM = {
  // Manual p. 299: calcário comercializado tem PRNT mínimo de 45%.
  PRNT: { min: 45, max: 100 },
  // Tabela 5.2 (p. 70) vai de "≤ 4,4" a 7,1; o tampão SMP parte de pH 7,5.
  SMP: { min: 4.0, max: 7.5 },
  pH_agua: { min: 3.5, max: 8.0 },
  // Tabela 6.1 classifica até "> 5,0"; acima de 20% é solo orgânico.
  MO: { min: 0, max: 20 },
  // CTC > 0; 60 é teto de digitação (Tabela 6.1 vai até "> 30").
  CTC_pH7: { max: 60 },
  // Teto de digitação; além disso Al ≤ CTC pH 7 quando os dois vierem.
  Al_trocavel: { min: 0, max: 15 },
} as const;

export const LIMITES_ADUBACAO = {
  argila: { min: 0, max: 99 },
  MO: { max: 20 },
  CTC_pH7: { max: 60 },
  pH_agua: { min: 3.5, max: 8.0 },
  // Tetos de digitação (mg/dm³ para P e K, cmolc/dm³ para Ca e Mg). O P fica
  // em 500 porque solo com dejeto suíno em SC passa de 300 mg/dm³.
  P: { max: 500 },
  K: { max: 1000 },
  Ca: { max: 30 },
  Mg: { max: 15 },
  densidade_plantas: { min: 30000, max: 120000 },
} as const;

// Rendimento esperado (t/ha) por cultura. "razoavel" é o máximo realista de
// docs_antigos/adubacao.md §6.2: acima dele o motor devolve um alerta, sem
// bloquear. "limite" é o dobro: acima dele a entrada é recusada, porque as
// doses de N, P e K crescem linearmente com o rendimento. Pendente do aval
// da coordenadora (basta ajustar esta tabela e a cópia do frontend).
export const RENDIMENTO_MAXIMO_T_HA = {
  aveia_branca: { razoavel: 6, limite: 12 },
  aveia_preta: { razoavel: 6, limite: 12 },
  canola: { razoavel: 4, limite: 8 },
  centeio: { razoavel: 5, limite: 10 },
  cevada: { razoavel: 7, limite: 14 },
  ervilha: { razoavel: 4, limite: 8 },
  ervilhaca: { razoavel: 4, limite: 8 },
  feijao: { razoavel: 5, limite: 10 },
  girassol: { razoavel: 4, limite: 8 },
  milho: { razoavel: 20, limite: 40 },
  milho_pipoca: { razoavel: 8, limite: 16 },
  nabo_forrageiro: { razoavel: 6, limite: 12 },
  soja: { razoavel: 7, limite: 14 },
  sorgo: { razoavel: 10, limite: 20 },
  trigo: { razoavel: 8, limite: 16 },
  triticale: { razoavel: 8, limite: 16 },
} as const;

export type CulturaComLimite = keyof typeof RENDIMENTO_MAXIMO_T_HA;

// Número para mensagem: 4 → "4", 7.5 → "7,5", 30000 → "30.000". Sem
// toLocaleString para não depender do ICU da imagem.
export function formatarLimite(valor: number): string {
  const [inteiro, decimal] = String(valor).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${comMilhar},${decimal}` : comMilhar;
}
