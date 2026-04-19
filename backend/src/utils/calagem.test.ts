/**
 * Testes de validação para o motor de calagem.
 * Fonte de verdade: Manual de Calagem e Adubação para os Estados do RS e SC (2016).
 * Todos os resultadoEsperado foram verificados manualmente contra a Tabela 5.2 (p.70)
 * e as fórmulas polinomiais (p.72).
 *
 * O campo resultadoEsperado corresponde sempre a dose_final_t_ha retornada por
 * executarMotorCalagem(), já com PRNT aplicado.
 */

import { executarMotorCalagem } from '../services/motorCalagem';
import { EntradaCalagem } from '../schemas/calagemSchema';

// ---------------------------------------------------------------------------
// Tipo auxiliar para documentar cada caso
// ---------------------------------------------------------------------------
interface CasoTesteCalagem {
  descricao: string;
  entrada: EntradaCalagem;
  resultadoEsperado: number;
  unidade: 't/ha';
  metodo: string;
  referencia: string;
}

// ---------------------------------------------------------------------------
// Tabela de casos
// ---------------------------------------------------------------------------
const casos: CasoTesteCalagem[] = [
  // ======================================================================
  // GRUPO 1 — CONVENCIONAL (sistema_manejo = 'CONVENCIONAL')
  // Regra: 1× SMP para pH 6,0, incorporado, camada 0-20 cm.
  // Manual p.72 (Tabela 5.3) e Tabela 5.2 (p.70).
  // ======================================================================
  {
    descricao: 'CONV-01 | SMP 5.0 | PRNT 100% | dose_base = 9,9 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 4.9, indice_smp: 5.0 },
      ],
    },
    resultadoEsperado: 9.9,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 5.0, pH desejado 6,0 = 9,9 t/ha',
  },
  {
    descricao: 'CONV-02 | SMP 4.4 (limite inferior da tabela) | PRNT 100% | dose_base = 21,0 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 4.2, indice_smp: 4.4 },
      ],
    },
    resultadoEsperado: 21,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP ≤4.4, pH desejado 6,0 = 21,0 t/ha',
  },
  {
    descricao: 'CONV-03 | SMP 3.0 (abaixo do mínimo, clamped a 4.4) | PRNT 100% | dose_base = 21,0 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 3.8, indice_smp: 3.0 },
      ],
    },
    resultadoEsperado: 21,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP ≤4.4 (clamped), pH desejado 6,0 = 21,0 t/ha',
  },
  {
    descricao: 'CONV-04 | SMP 7.1 (limite superior) | PRNT 100% | solo sem necessidade de calagem',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 6.5, indice_smp: 7.1 },
      ],
    },
    resultadoEsperado: 0,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP ≥7.1, pH desejado 6,0 = 0 t/ha',
  },
  {
    descricao: 'CONV-05 | SMP 6.0 | PRNT 80% | dose comercial = 4,0 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 80,
      amostras: [
        { profundidade: '0-20', ph_agua: 5.4, indice_smp: 6.0 },
      ],
    },
    // NC_base = 3,2 t/ha (Tabela 5.2). Comercial = (3,2 × 100) / 80 = 4,0
    resultadoEsperado: 4,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 6.0, pH 6,0 = 3,2 t/ha; ajuste PRNT: ÷ 0,80 = 4,0',
  },
  {
    descricao: 'CONV-06 | SMP 5.5 | PRNT 75% | dose comercial = 8,13 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 75,
      amostras: [
        { profundidade: '0-20', ph_agua: 5.0, indice_smp: 5.5 },
      ],
    },
    // NC_base = 6,1 t/ha. Comercial = (6,1 × 100) / 75 = 8,13
    resultadoEsperado: 8.13,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 5.5, pH 6,0 = 6,1 t/ha; ajuste PRNT: ÷ 0,75 = 8,13',
  },
  {
    descricao: 'CONV-07 | SMP 4.5 | PRNT 90% | dose comercial = 19,22 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 90,
      amostras: [
        { profundidade: '0-20', ph_agua: 4.3, indice_smp: 4.5 },
      ],
    },
    // NC_base = 17,3 t/ha. Comercial = (17,3 × 100) / 90 = 19,22
    resultadoEsperado: 19.22,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 4.5, pH 6,0 = 17,3 t/ha; ajuste PRNT: ÷ 0,90 = 19,22',
  },
  {
    descricao: 'CONV-08 | SMP 7.0 | PRNT 100% | solo sem necessidade de calagem',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 6.3, indice_smp: 7.0 },
      ],
    },
    // NC = 0,0 (Tabela 5.2, SMP 7.0, pH 6,0)
    resultadoEsperado: 0,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 7.0, pH 6,0 = 0 t/ha',
  },

  // ======================================================================
  // GRUPO 2 — CONVENCIONAL com MÉTODO POLINOMIAL (SMP > 6.3)
  // Regra: solos de baixo poder tampão (SMP > 6.3, com mo_pct e al fornecidos).
  // Equações: NC pH 6,0 = -0,516 + (0,805 × MO) + (2,435 × Al). Manual p.72.
  // ======================================================================
  {
    descricao: 'CONV-POL-01 | SMP 6.4 | MO=2.5% | Al=0.3 | PRNT 100% | NC = 2,23 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 100,
      amostras: [
        {
          profundidade: '0-20',
          ph_agua: 5.6,
          indice_smp: 6.4,
          mo_pct: 2.5,
          al_cmolc_dm3: 0.3,
        },
      ],
    },
    // NC = -0,516 + (0,805 × 2,5) + (2,435 × 0,3) = -0,516 + 2,0125 + 0,7305 = 2,227 → 2,23
    resultadoEsperado: 2.23,
    unidade: 't/ha',
    metodo: 'POLINOMIAL_BAIXO_TAMPAO',
    referencia: 'p.72 — eq. NC pH 6,0 para solos de baixo poder tampão (SMP > 6,3)',
  },
  {
    descricao: 'CONV-POL-02 | SMP 6.5 | MO=0.1% | Al=0.0 | resultado negativo → NC = 0',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 100,
      amostras: [
        {
          profundidade: '0-20',
          ph_agua: 5.8,
          indice_smp: 6.5,
          mo_pct: 0.1,
          al_cmolc_dm3: 0.0,
        },
      ],
    },
    // NC = -0,516 + (0,805 × 0,1) + (2,435 × 0,0) = -0,516 + 0,0805 = -0,4355 < 0 → 0
    resultadoEsperado: 0,
    unidade: 't/ha',
    metodo: 'POLINOMIAL_BAIXO_TAMPAO',
    referencia: 'p.72 — equação polinomial com resultado negativo → NC = 0 (não negativo)',
  },

  // ======================================================================
  // GRUPO 3 — PD_IMPLANTACAO INCORPORADO
  // Regra: 1× SMP para pH 6,0, incorporado. Tabela 5.3 (p.75).
  // ======================================================================
  {
    descricao: 'PDI-INC-01 | SMP 5.2 | PRNT 100% | dose = 8,3 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_IMPLANTACAO',
      modo_implantacao_pd: 'INCORPORADO',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 4.8, indice_smp: 5.2 },
      ],
    },
    resultadoEsperado: 8.3,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 5.2, pH 6,0 = 8,3 t/ha; Tabela 5.3, p.75 — PD implantação incorporado',
  },
  {
    descricao: 'PDI-INC-02 | SMP 5.0 | PRNT 70% | dose comercial = 14,14 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_IMPLANTACAO',
      modo_implantacao_pd: 'INCORPORADO',
      prnt_pct: 70,
      amostras: [
        { profundidade: '0-20', ph_agua: 4.8, indice_smp: 5.0 },
      ],
    },
    // NC_base = 9,9. Comercial = (9,9 × 100) / 70 = 14,14
    resultadoEsperado: 14.14,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 5.0, pH 6,0 = 9,9 t/ha; ajuste PRNT 70%',
  },

  // ======================================================================
  // GRUPO 4 — PD_IMPLANTACAO CAMPO_NATURAL_SUPERFICIAL
  // Regra: ½ da dose SMP para pH 6,0 em superfície, conforme o manual (p.73):
  // "dose sugerida corresponde a ½ (metade) do que o índice SMP indicar para pH 6,0".
  // O motor adota fracionamento 0,25 para esta rota (conservador).
  // Limite superficial: máx 5,0 t/ha PRNT 100% (nota 5, Tabela 5.3, p.75).
  // ======================================================================
  {
    descricao: 'PDI-CN-01 | SMP 5.8 | PRNT 100% | NC_base=4.2 × 0.25 = 1.05 t/ha superficial',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_IMPLANTACAO',
      modo_implantacao_pd: 'CAMPO_NATURAL_SUPERFICIAL',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 5.1, indice_smp: 5.8 },
      ],
    },
    // NC_tabela = 4,2 → ×0,25 = 1,05 → clamping: 1,05 ≤ 5 → 1,05
    resultadoEsperado: 1.05,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 5.8, pH 6,0 = 4,2; p.73 — aplicação superficial campo natural; limite 5 t/ha (Tabela 5.3 nota 5, p.75)',
  },
  {
    descricao: 'PDI-CN-02 | SMP 4.4 | clamping ativo | dose superficial limitada a 5,0 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_IMPLANTACAO',
      modo_implantacao_pd: 'CAMPO_NATURAL_SUPERFICIAL',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 4.2, indice_smp: 4.4 },
      ],
    },
    // NC_tabela = 21,0 → ×0,25 = 5,25 → clamped a 5,0 → PRNT 100% → 5,0
    resultadoEsperado: 5,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP ≤4.4 = 21,0; ×0,25 = 5,25; clamped a 5,0 (Tabela 5.3 nota 5, p.75)',
  },
  {
    descricao: 'PDI-CN-03 | SMP 6.2 | PRNT 100% | NC_base=2.2 × 0.25 = 0.55 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_IMPLANTACAO',
      modo_implantacao_pd: 'CAMPO_NATURAL_SUPERFICIAL',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-20', ph_agua: 5.5, indice_smp: 6.2 },
      ],
    },
    // NC_tabela = 2,2 → ×0,25 = 0,55 → clamping: ok → 0,55
    resultadoEsperado: 0.55,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 6.2, pH 6,0 = 2,2; ×0,25 = 0,55',
  },

  // ======================================================================
  // GRUPO 5 — PD_CONSOLIDADO SEM RESTRIÇÃO NO SUBSOLO
  // Regra: amostra 0-10; verificar trava V/m; fracionamento 0,5; clamping 5 t/ha.
  // Tabela 5.3, p.75; p.73.
  // ======================================================================
  {
    descricao: 'PDC-SUP-01 | SMP 0-10=5.5 | V=55% m=15% (sem trava) | subsolo ok | dose=3.05 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_CONSOLIDADO',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-10', ph_agua: 5.0, indice_smp: 5.5, v_pct: 55, m_pct: 15 },
        { profundidade: '10-20', ph_agua: 5.2, indice_smp: 5.8, m_pct: 8 },
      ],
      contexto_pd: { corrigido_0_20_na_implantacao: true },
    },
    // NC_010 = 6,1 → ×0,5 = 3,05 → clamping: ok → PRNT 100% → 3,05
    resultadoEsperado: 3.05,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 5.5, pH 6,0 = 6,1; Tabela 5.3, p.75 — PD consolidado ¼ SMP; p.73 — fracionamento superficial',
  },
  {
    descricao: 'PDC-SUP-02 | trava ATIVA (V=70% m=5%) | dose = 0 (sem calagem)',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_CONSOLIDADO',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-10', ph_agua: 5.3, indice_smp: 5.5, v_pct: 70, m_pct: 5 },
        { profundidade: '10-20', ph_agua: 5.5, indice_smp: 5.8, m_pct: 8 },
      ],
    },
    // V=70 ≥ 65 e m=5 < 10 → trava ativa → sem calagem
    resultadoEsperado: 0,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'p.73 — não aplicar quando V ≥ 65% e saturação por Al na CTC < 10% (Tabela 5.3 nota 1, p.75)',
  },
  {
    descricao: 'PDC-SUP-03 | trava exata (V=65% m=9%) | dose = 0 (trava ATIVA)',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_CONSOLIDADO',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-10', ph_agua: 4.9, indice_smp: 5.5, v_pct: 65, m_pct: 9 },
        { profundidade: '10-20', ph_agua: 5.0, indice_smp: 5.8, m_pct: 8 },
      ],
    },
    // V=65 ≥ 65 e m=9 < 10 → trava ativa
    resultadoEsperado: 0,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.3 nota 1, p.75 — limite exato V=65%, m=9% (< 10%)',
  },
  {
    descricao: 'PDC-SUP-04 | trava NÃO ativa (V=65% m=10%) | SMP 0-10=5.5 | dose=3.05 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_CONSOLIDADO',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-10', ph_agua: 5.0, indice_smp: 5.5, v_pct: 65, m_pct: 10 },
        { profundidade: '10-20', ph_agua: 5.2, indice_smp: 5.8, m_pct: 8 },
      ],
    },
    // m=10 não é < 10 → trava NÃO ativa → calagem superficial
    // NC_010 = 6,1 → ×0,5 = 3,05 → clamping: ok
    resultadoEsperado: 3.05,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.3 nota 1, p.75 — m=10 não satisfaz m_pct < 10 → trava inativa',
  },
  {
    descricao: 'PDC-SUP-05 | V=64% m=9% (trava NÃO ativa) | SMP 0-10=5.0 | dose=4.95 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_CONSOLIDADO',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-10', ph_agua: 4.8, indice_smp: 5.0, v_pct: 64, m_pct: 9 },
        { profundidade: '10-20', ph_agua: 5.0, indice_smp: 5.3, m_pct: 8 },
      ],
    },
    // V=64 < 65 → trava NÃO ativa
    // NC_010 = 9,9 → ×0,5 = 4,95 → clamping: ok
    resultadoEsperado: 4.95,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP 5.0 = 9,9; Tabela 5.3, p.75 — PDC superficial ×0,5',
  },
  {
    descricao: 'PDC-SUP-06 | SMP 0-10=4.4 (clamping ativo) | V=40% m=30% | dose=5.0 t/ha (teto)',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_CONSOLIDADO',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-10', ph_agua: 4.2, indice_smp: 4.4, v_pct: 40, m_pct: 30 },
        { profundidade: '10-20', ph_agua: 4.5, indice_smp: 4.8, m_pct: 8 },
      ],
    },
    // NC_010 = 21,0 → ×0,5 = 10,5 → clamped a 5,0 → PRNT 100% → 5,0
    resultadoEsperado: 5,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.3 nota 5, p.75 — quantidade superficial limitada a 5 t/ha PRNT 100%',
  },

  // ======================================================================
  // GRUPO 6 — PD_CONSOLIDADO COM RESTRIÇÃO NO SUBSOLO (REINÍCIO)
  // Regra: m_pct 10-20 > 10% → cenário de reinício → incorporado → média SMP.
  // Manual p.74; Tabela 5.3, p.75.
  // ======================================================================
  {
    descricao: 'PDC-REI-01 | SMP 0-10=5.4, 10-20=5.0 | subsolo restritivo | média SMP=5.2 | dose=8.3 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_CONSOLIDADO',
      prnt_pct: 100,
      amostras: [
        { profundidade: '0-10', ph_agua: 5.0, indice_smp: 5.4, v_pct: 55, m_pct: 15 },
        { profundidade: '10-20', ph_agua: 4.8, indice_smp: 5.0, m_pct: 15 },
      ],
      contexto_pd: {
        produtividade_abaixo_media_local: true,
        compactacao_solo: false,
        fosforo_10_20_abaixo_critico: false,
      },
    },
    // m_1020=15 > 10 → subsolo restritivo → média SMP = (5,4+5,0)/2 = 5,2
    // NC_tabela(5.2) = 8,3 → PRNT 100% → 8,3
    resultadoEsperado: 8.3,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP médio 5.2, pH 6,0 = 8,3; p.74 — reinício PD usa média das duas camadas',
  },
  {
    descricao: 'PDC-REI-02 | SMP 0-10=5.0, 10-20=4.8 | subsolo restritivo | média SMP=4.9 | PRNT 90% | dose=11.89 t/ha',
    entrada: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'PD_CONSOLIDADO',
      prnt_pct: 90,
      amostras: [
        { profundidade: '0-10', ph_agua: 4.7, indice_smp: 5.0, v_pct: 55, m_pct: 20 },
        { profundidade: '10-20', ph_agua: 4.5, indice_smp: 4.8, m_pct: 12 },
      ],
      contexto_pd: {
        produtividade_abaixo_media_local: true,
        compactacao_solo: true,
        fosforo_10_20_abaixo_critico: true,
      },
    },
    // m_1020=12 > 10 → subsolo restritivo → média SMP = (5,0+4,8)/2 = 4,9
    // NC_tabela(4.9) = 10,7 → Comercial = (10,7×100)/90 = 11,89
    resultadoEsperado: 11.89,
    unidade: 't/ha',
    metodo: 'TABELA_SMP_5_2',
    referencia: 'Tabela 5.2, p.70 — SMP médio 4.9, pH 6,0 = 10,7; ajuste PRNT 90%',
  },
];

// ---------------------------------------------------------------------------
// Execução dos testes com Jest
// ---------------------------------------------------------------------------
describe('Motor de Calagem — Validação contra Manual RS/SC 2016', () => {
  test.each(casos)(
    '$descricao',
    ({ entrada, resultadoEsperado }) => {
      const resultado = executarMotorCalagem(entrada);
      expect(resultado.dose_final_t_ha).toBeCloseTo(resultadoEsperado, 2);
    },
  );

  // -----------------------------------------------------------------------
  // Testes de estado do motor (campos além de dose_final)
  // -----------------------------------------------------------------------
  describe('Estado do motor — campos de auditoria', () => {
    test('CONVENCIONAL com calagem necessária deve retornar necessita_calagem=true e modo_aplicacao=INCORPORADO', () => {
      const entrada: EntradaCalagem = {
        versao_regra: 'ibiferti-calagem-graos-v1.6',
        sistema_manejo: 'CONVENCIONAL',
        prnt_pct: 100,
        amostras: [{ profundidade: '0-20', ph_agua: 4.9, indice_smp: 5.0 }],
      };
      const r = executarMotorCalagem(entrada);
      expect(r.necessita_calagem).toBe(true);
      expect(r.modo_aplicacao).toBe('INCORPORADO');
      expect(r.estado_motor).toBe('CONV_CALAGEM_INCORPORADA');
    });

    test('CONVENCIONAL SMP 7.1 deve retornar necessita_calagem=false', () => {
      const entrada: EntradaCalagem = {
        versao_regra: 'ibiferti-calagem-graos-v1.6',
        sistema_manejo: 'CONVENCIONAL',
        prnt_pct: 100,
        amostras: [{ profundidade: '0-20', ph_agua: 6.5, indice_smp: 7.1 }],
      };
      const r = executarMotorCalagem(entrada);
      expect(r.necessita_calagem).toBe(false);
      expect(r.estado_motor).toBe('CONV_SEM_CALAGEM');
    });

    test('PD_IMPLANTACAO CAMPO_NATURAL_SUPERFICIAL deve retornar modo_aplicacao=SUPERFICIAL', () => {
      const entrada: EntradaCalagem = {
        versao_regra: 'ibiferti-calagem-graos-v1.6',
        sistema_manejo: 'PD_IMPLANTACAO',
        modo_implantacao_pd: 'CAMPO_NATURAL_SUPERFICIAL',
        prnt_pct: 100,
        amostras: [{ profundidade: '0-20', ph_agua: 5.1, indice_smp: 5.8 }],
      };
      const r = executarMotorCalagem(entrada);
      expect(r.modo_aplicacao).toBe('SUPERFICIAL');
      expect(r.estado_motor).toBe('PDI_CALAGEM_SUPERFICIAL_CAMPO_NATURAL');
    });

    test('PDC trava ativa deve retornar estado_motor=PDC_SEM_CALAGEM_TRAVA_V_M', () => {
      const entrada: EntradaCalagem = {
        versao_regra: 'ibiferti-calagem-graos-v1.6',
        sistema_manejo: 'PD_CONSOLIDADO',
        prnt_pct: 100,
        amostras: [
          { profundidade: '0-10', ph_agua: 5.0, indice_smp: 5.5, v_pct: 70, m_pct: 5 },
          { profundidade: '10-20', ph_agua: 5.2, indice_smp: 5.8, m_pct: 8 },
        ],
      };
      const r = executarMotorCalagem(entrada);
      expect(r.estado_motor).toBe('PDC_SEM_CALAGEM_TRAVA_V_M');
      expect(r.necessita_calagem).toBe(false);
    });

    test('PDC cenário de reinício deve retornar estado_motor=PDC_CENARIO_REINICIO_PD e modo_aplicacao=INCORPORADO', () => {
      const entrada: EntradaCalagem = {
        versao_regra: 'ibiferti-calagem-graos-v1.6',
        sistema_manejo: 'PD_CONSOLIDADO',
        prnt_pct: 100,
        amostras: [
          { profundidade: '0-10', ph_agua: 5.0, indice_smp: 5.4, v_pct: 55, m_pct: 15 },
          { profundidade: '10-20', ph_agua: 4.8, indice_smp: 5.0, m_pct: 15 },
        ],
      };
      const r = executarMotorCalagem(entrada);
      expect(r.estado_motor).toBe('PDC_CENARIO_REINICIO_PD');
      expect(r.modo_aplicacao).toBe('INCORPORADO');
    });

    test('CONVENCIONAL com polinômio deve registrar metodo_nc_utilizado=POLINOMIAL_BAIXO_TAMPAO', () => {
      const entrada: EntradaCalagem = {
        versao_regra: 'ibiferti-calagem-graos-v1.6',
        sistema_manejo: 'CONVENCIONAL',
        prnt_pct: 100,
        amostras: [
          { profundidade: '0-20', ph_agua: 5.6, indice_smp: 6.4, mo_pct: 2.5, al_cmolc_dm3: 0.3 },
        ],
      };
      const r = executarMotorCalagem(entrada);
      expect(r.metodo_nc_utilizado).toBe('POLINOMIAL_BAIXO_TAMPAO');
    });

    test('PDC reinício deve expor smp_medio correto na auditoria', () => {
      const entrada: EntradaCalagem = {
        versao_regra: 'ibiferti-calagem-graos-v1.6',
        sistema_manejo: 'PD_CONSOLIDADO',
        prnt_pct: 100,
        amostras: [
          { profundidade: '0-10', ph_agua: 5.0, indice_smp: 5.4, v_pct: 55, m_pct: 15 },
          { profundidade: '10-20', ph_agua: 4.8, indice_smp: 5.0, m_pct: 15 },
        ],
      };
      const r = executarMotorCalagem(entrada);
      // (5,4 + 5,0) / 2 = 5,2
      expect(r.auditoria.smp_medio).toBeCloseTo(5.2, 1);
    });
  });
});