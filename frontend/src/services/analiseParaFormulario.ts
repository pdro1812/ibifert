// Registro salvo (linha do banco) → valores do formulário da calculadora,
// para abrir uma análise do histórico em modo de edição. Campos nulos ficam
// de fora: o formulário só recebe o que foi de fato informado.

export interface AnaliseParaFormulario {
  // Campos do react-hook-form, com caminho pontuado ("monitoramento.x")
  campos: Record<string, unknown>;
  uf: string;
  cidade: string;
  data_analise: string | null;
  modo_al_sat: 'direto' | 'calculado';
  monitoramento_ativo: boolean;
}

function semNulos(campos: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(campos).filter(([, valor]) => valor !== null && valor !== undefined));
}

export function calagemParaFormulario(r: Record<string, unknown>): AnaliseParaFormulario {
  // calcular_polinomial não é gravado: com SMP <= 6,3 o MO só vai ao motor
  // quando o Polinomial complementar foi marcado (ver sanitizarPayloadCalagem).
  const polinomialMarcado = typeof r.SMP === 'number' && r.SMP <= 6.3 && r.MO !== null && r.MO !== undefined;

  return {
    campos: semNulos({
      identificacao: r.identificacao,
      sistema_manejo: r.sistema_manejo,
      opcao_superficial_campo_natural: r.opcao_superficial_campo_natural,
      PRNT: r.PRNT,
      pH_agua: r.pH_agua,
      SMP: r.SMP,
      MO: r.MO,
      Al_trocavel: r.Al_trocavel,
      V_atual: r.V_atual,
      CTC_pH7: r.CTC_pH7,
      Al_sat: r.Al_sat,
      SMP_10_20: r.SMP_10_20,
      calcular_polinomial: polinomialMarcado ? true : undefined,
      'monitoramento.pH_agua_10_20': r.monitoramento_pH_agua_10_20,
      'monitoramento.Al_sat_10_20': r.monitoramento_Al_sat_10_20,
      'monitoramento.disponibilidade_P_10_20_abaixo_critico': r.monitoramento_disponibilidade_P_abaixo,
      'monitoramento.compactacao_restringindo_raiz': r.monitoramento_compactacao_restringindo,
      'monitoramento.produtividade_abaixo_media': r.monitoramento_produtividade_abaixo_media,
    }),
    uf: String(r.uf ?? ''),
    cidade: String(r.cidade ?? ''),
    data_analise: (r.data_analise as string | null) ?? null,
    modo_al_sat: r.modo_al_sat === 'calculado' ? 'calculado' : 'direto',
    monitoramento_ativo: r.monitoramento_ativo === true,
  };
}

export function adubacaoParaFormulario(r: Record<string, unknown>): AnaliseParaFormulario {
  return {
    campos: semNulos({
      identificacao: r.identificacao,
      argila: r.argila,
      MO: r.MO,
      CTC_pH7: r.CTC_pH7,
      P: r.P,
      metodo_P: r.metodo_P,
      K: r.K,
      metodo_K: r.metodo_K,
      Ca: r.Ca,
      Mg: r.Mg,
      S: r.S,
      Cu: r.Cu,
      Zn: r.Zn,
      B: r.B,
      Mn: r.Mn,
      pH_agua: r.pH_agua,
      cultura: r.cultura,
      num_cultivo: r.num_cultivo,
      rendimento_esperado: r.rendimento_esperado,
      cultura_antecedente: r.cultura_antecedente,
      sistema_cultivo: r.sistema_cultivo,
      tipo_correcao: r.tipo_correcao,
      densidade_plantas: r.densidade_plantas,
      finalidade_cevada: r.finalidade_cevada,
    }),
    uf: String(r.uf ?? ''),
    cidade: String(r.cidade ?? ''),
    data_analise: (r.data_analise as string | null) ?? null,
    modo_al_sat: 'direto',
    monitoramento_ativo: false,
  };
}
