import { describe, expect, test } from 'vitest';
import { adubacaoParaFormulario, calagemParaFormulario } from './analiseParaFormulario';

describe('calagemParaFormulario', () => {
  const base = {
    id: 'x', uf: 'SC', cidade: 'Concórdia', identificacao: null, data_analise: '2026-10-01',
    sistema_manejo: 'PD_CONSOLIDADO', PRNT: 90, pH_agua: 5.2, SMP: 5.4, MO: null, Al_trocavel: null,
    V_atual: 55, CTC_pH7: 10, Al_sat: 8, modo_al_sat: 'direto', monitoramento_ativo: true,
    monitoramento_pH_agua_10_20: 4.8, monitoramento_Al_sat_10_20: 30,
    monitoramento_disponibilidade_P_abaixo: true, monitoramento_compactacao_restringindo: false,
    monitoramento_produtividade_abaixo_media: null, SMP_10_20: null, NC_ajustada: 3,
  };

  test('mapeia colunas para os nomes do formulário e descarta nulos e resultados', () => {
    const f = calagemParaFormulario(base);
    expect(f.campos).toEqual({
      sistema_manejo: 'PD_CONSOLIDADO', PRNT: 90, pH_agua: 5.2, SMP: 5.4, V_atual: 55, CTC_pH7: 10, Al_sat: 8,
      'monitoramento.pH_agua_10_20': 4.8, 'monitoramento.Al_sat_10_20': 30,
      'monitoramento.disponibilidade_P_10_20_abaixo_critico': true,
      'monitoramento.compactacao_restringindo_raiz': false,
    });
    expect(f).toMatchObject({ uf: 'SC', cidade: 'Concórdia', data_analise: '2026-10-01', modo_al_sat: 'direto', monitoramento_ativo: true });
  });

  test('Polinomial complementar marcado quando havia MO com SMP <= 6,3', () => {
    expect(calagemParaFormulario({ ...base, MO: 2.5, Al_trocavel: 0.4 }).campos.calcular_polinomial).toBe(true);
    expect(calagemParaFormulario({ ...base, SMP: 6.5, MO: 2.5 }).campos.calcular_polinomial).toBeUndefined();
  });

  test('registro antigo sem data da análise fica como não informada', () => {
    expect(calagemParaFormulario({ ...base, data_analise: null }).data_analise).toBeNull();
  });
});

describe('adubacaoParaFormulario', () => {
  test('mantém os campos informados e ignora o resultado salvo', () => {
    const f = adubacaoParaFormulario({
      uf: 'RS', cidade: 'Ibirubá', argila: 35, MO: 2.5, CTC_pH7: 10, P: 8, metodo_P: 'Mehlich-1', K: 120,
      metodo_K: 'Mehlich-1', Ca: 4, Mg: 1.5, S: null, Zn: 0.1, cultura: 'feijao', num_cultivo: '1',
      rendimento_esperado: 3, sistema_cultivo: 'Plantio Direto', tipo_correcao: 'Gradual', recomendacao_json: {},
    });
    expect(f.campos).not.toHaveProperty('S');
    expect(f.campos).not.toHaveProperty('recomendacao_json');
    expect(f.campos).toMatchObject({ argila: 35, Zn: 0.1, cultura: 'feijao', num_cultivo: '1' });
  });
});
