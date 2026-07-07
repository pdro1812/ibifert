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

    assert.equal(resultado.recomendacao.p2o5.dose_total_kg_ha, 280);
    assert.match(resultado.recomendacao.p2o5.tipo_adubacao, /Corretiva Total/);
  });
});
