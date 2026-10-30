import test from 'node:test';
import assert from 'node:assert/strict';
import { executarMotorAdubacao } from '../services/motorAdubacao';
import { EntradaAdubacao } from '../schemas/adubacaoSchema';

test('Motor de Adubação', async (t) => {
  await t.test('Deve calcular corretamente adubação de manutenção para Soja (P/K Altos)', () => {
    const entrada: EntradaAdubacao = {
      argila: 50, // Classe 2
      MO: 3.0, // Medio
      CTC_pH7: 12.0, // Media
      P: 20, // Alto (>12, <=24 para argila classe 2)
      metodo_P: 'Mehlich-1',
      K: 150, // Alto (>90, <180)
      metodo_K: 'Mehlich-1',
      Ca: 5, // Alto
      Mg: 2, // Alto
      S: 15, // Alto
      cultura: 'soja',
      num_cultivo: '1',
      rendimento_esperado: 4.5, // 1.5t acima ref(3.0t)
      sistema_cultivo: 'Plantio Direto',
      tipo_correcao: 'Gradual'
    };

    const resultado = executarMotorAdubacao(entrada);

    assert.equal(resultado.recomendacao.n.dose_total_kg_ha, 0);
    assert.match(resultado.recomendacao.n.tipo, /FBN/);

    assert.equal(resultado.recomendacao.p2o5.dose_total_kg_ha, 68);
    assert.match(resultado.recomendacao.p2o5.tipo_adubacao, /Manutenção/);

    assert.equal(resultado.recomendacao.k2o.dose_total_kg_ha, 113);
    assert.equal(resultado.recomendacao.k2o.k2o_semeadura_kg_ha, 80);
    assert.equal(resultado.recomendacao.k2o.k2o_complementar_kg_ha, 33);
  });

  await t.test('Deve gerar alertas corretos para Milho com Solo Muito Baixo e Correção Total', () => {
    const entrada: EntradaAdubacao = {
      argila: 30, // Classe 3
      MO: 1.0, // Baixo
      CTC_pH7: 8.0, // Media
      P: 2.0, // Muito Baixo
      metodo_P: 'Mehlich-1',
      K: 15.0, // Muito Baixo
      metodo_K: 'Mehlich-1',
      Ca: 1.0, // Baixo
      Mg: 0.2, // Baixo
      cultura: 'milho',
      num_cultivo: '1',
      rendimento_esperado: 8.0, // 2t acima ref(6.0t)
      cultura_antecedente: 'Gramínea',
      sistema_cultivo: 'Plantio Direto',
      tipo_correcao: 'Total'
    };

    const resultado = executarMotorAdubacao(entrada);

    assert.ok(resultado.alertas.find(a => a.codigo === 'CA_BAIXO'));
    assert.ok(resultado.alertas.find(a => a.codigo === 'MG_BAIXO'));

    assert.equal(resultado.recomendacao.n.dose_total_kg_ha, 120);

    // "Total" usa a mesma tabela por classe do Gradual (item 8 do registro)
    assert.equal(resultado.recomendacao.p2o5.dose_total_kg_ha, 230);
    assert.match(resultado.recomendacao.p2o5.tipo_adubacao, /Corretiva Gradual/);
  });
});

// Valores calculados à mão pela coordenadora (docs/registro-alteracoes-propostas.md, item 8)
test('Cenários validados pela coordenadora', async (t) => {
  await t.test('Print — soja, 1º cultivo, P muito alto: 0 / 30 / 125', () => {
    const resultado = executarMotorAdubacao({
      argila: 20, MO: 7.9, CTC_pH7: 20.73,
      P: 80, metodo_P: 'Mehlich-1', K: 220, metodo_K: 'Mehlich-1',
      Ca: 52.36, Mg: 34.06, S: 54.9, pH_agua: 5.82,
      cultura: 'soja', num_cultivo: '1', rendimento_esperado: 5,
      sistema_cultivo: 'Plantio Direto', tipo_correcao: 'Gradual'
    });

    assert.equal(resultado.classificacao_solo.p_classe, 'muito_alto');
    assert.equal(resultado.classificacao_solo.k_classe, 'alto');
    assert.equal(resultado.recomendacao.n.dose_total_kg_ha, 0);
    assert.equal(resultado.recomendacao.p2o5.dose_total_kg_ha, 30);
    assert.equal(resultado.recomendacao.k2o.dose_total_kg_ha, 125);
  });

  await t.test('A3 — milho, correção Total, 70.000 plantas: 120 / 230 / 160', () => {
    const resultado = executarMotorAdubacao({
      argila: 25, MO: 2.0, CTC_pH7: 8.0,
      P: 5, metodo_P: 'Mehlich-1', K: 25, metodo_K: 'Mehlich-1',
      Ca: 3.0, Mg: 1.0,
      cultura: 'milho', cultura_antecedente: 'Gramínea', num_cultivo: '1',
      rendimento_esperado: 8, sistema_cultivo: 'Plantio Direto',
      tipo_correcao: 'Total', densidade_plantas: 70000
    });

    assert.equal(resultado.recomendacao.n.dose_total_kg_ha, 120);
    assert.equal(resultado.recomendacao.p2o5.dose_total_kg_ha, 230);
    assert.equal(resultado.recomendacao.k2o.dose_total_kg_ha, 160);
    assert.equal(resultado.recomendacao.k2o.k2o_semeadura_kg_ha, 80);
    assert.equal(resultado.recomendacao.k2o.k2o_complementar_kg_ha, 80);
  });

  await t.test('A4 — soja, 2º cultivo, P e K muito altos: 0 / 45 / 75', () => {
    const resultado = executarMotorAdubacao({
      argila: 30, MO: 3.0, CTC_pH7: 10.0,
      P: 40, metodo_P: 'Mehlich-1', K: 200, metodo_K: 'Mehlich-1',
      Ca: 3.0, Mg: 1.0, S: 15,
      cultura: 'soja', num_cultivo: '2', rendimento_esperado: 3,
      sistema_cultivo: 'Plantio Direto', tipo_correcao: 'Gradual'
    });

    assert.equal(resultado.classificacao_solo.p_classe, 'muito_alto');
    assert.equal(resultado.classificacao_solo.k_classe, 'muito_alto');
    assert.equal(resultado.recomendacao.n.dose_total_kg_ha, 0);
    assert.equal(resultado.recomendacao.p2o5.dose_total_kg_ha, 45);
    assert.equal(resultado.recomendacao.k2o.dose_total_kg_ha, 75);
  });

  await t.test('Muito alto, 1º cultivo, rendimento na referência: dose zero', () => {
    const resultado = executarMotorAdubacao({
      argila: 30, MO: 3.0, CTC_pH7: 10.0,
      P: 40, metodo_P: 'Mehlich-1', K: 200, metodo_K: 'Mehlich-1',
      Ca: 3.0, Mg: 1.0, S: 15,
      cultura: 'soja', num_cultivo: '1', rendimento_esperado: 3,
      sistema_cultivo: 'Plantio Direto', tipo_correcao: 'Gradual'
    });

    assert.equal(resultado.recomendacao.p2o5.dose_total_kg_ha, 0);
    assert.equal(resultado.recomendacao.k2o.dose_total_kg_ha, 0);
    assert.match(resultado.recomendacao.p2o5.tipo_adubacao, /Sem Aplicação/);
  });
});
