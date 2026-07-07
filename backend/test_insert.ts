const { db } = require('./src/database/db');
const { analisesAdubacao } = require('./src/database/schema');
async function test() {
  try {
    const payload = {
      uf: 'RS',
      cidade: 'Não informada',
      identificacao: 'Análise Adubação',
      argila: 30,
      MO: 1.5,
      CTC_pH7: 8,
      P: 2,
      metodo_P: 'Mehlich-1',
      K: 15,
      metodo_K: 'Mehlich-1',
      Ca: 1,
      Mg: 0.2,
      S: 1,
      Cu: 1,
      Zn: 1,
      B: 1,
      Mn: 1,
      pH_agua: 1,
      cultura: 'milho',
      num_cultivo: '1',
      rendimento_esperado: 8,
      cultura_antecedente: 'Gramínea',
      sistema_cultivo: 'Plantio Direto',
      tipo_correcao: 'Total',
      recomendacao_json: {"classificacao_solo":{"argila_classe":3,"mo_classe":"baixo","ctc_classe":"media","p_classe":"muito_baixo","k_classe":"muito_baixo"},"recomendacao":{"n":{"dose_total_kg_ha":120,"tipo":""},"p2o5":{"dose_total_kg_ha":280,"tipo_adubacao":"Corretiva Total + Manutenção"},"k2o":{"dose_total_kg_ha":200,"k2o_semeadura_kg_ha":80,"k2o_complementar_kg_ha":120,"tipo_adubacao":"Corretiva Total + Manutenção"}},"alertas":[{"nivel":"AVISO","codigo":"S_BAIXO","mensagem":"S abaixo do teor crítico (5 mg/dm³). Aplicar 20 kg S-SO4²⁻/ha."}]}
    };
    await db.insert(analisesAdubacao).values(payload).returning();
    console.log("Success");
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}
test();
