import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { subirAmbienteDeTeste, clienteDeTeste, cadastrar, type AmbienteDeTeste } from './bancoDeTeste';

// Testes de rota contra o app real e um Postgres descartável (ver bancoDeTeste.ts).

let ambiente: AmbienteDeTeste;
let requisitar: ReturnType<typeof clienteDeTeste>;

const AMOSTRA_CALAGEM = { sistema_manejo: 'CONVENCIONAL', pH_agua: 5.0, SMP: 5.5, PRNT: 80, V_atual: 50, CTC_pH7: 10 };

const FORM_ADUBACAO = {
  argila: 40, MO: 3, CTC_pH7: 12, P: 5, metodo_P: 'Mehlich-1', K: 80, metodo_K: 'Mehlich-1', Ca: 5, Mg: 2,
  cultura: 'milho', num_cultivo: '1', rendimento_esperado: 8, cultura_antecedente: 'Gramínea',
  sistema_cultivo: 'Plantio Direto', tipo_correcao: 'Gradual', uf: 'RS', cidade: 'Ibirubá',
};

async function criarTalhao(cookie: string): Promise<string> {
  const fazenda = await requisitar('POST', '/fazendas', { cookie, corpo: { nome: 'Fazenda Teste', municipio: 'Ibirubá', uf: 'RS' } });
  const talhao = await requisitar('POST', `/fazendas/${fazenda.corpo.id}/talhoes`, { cookie, corpo: { nome: 'Talhão 1', cultura: 'soja' } });
  assert.equal(talhao.status, 201);
  return talhao.corpo.id;
}

before(async () => {
  ambiente = await subirAmbienteDeTeste();
  requisitar = clienteDeTeste(ambiente.url);
});

after(async () => {
  await ambiente.fechar();
});

test('Ambiente de teste: migrações aplicadas e app respondendo', async () => {
  const r = await requisitar('GET', '/analises/regional-stats');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.medias.total, 0);
});

// AUD-02: gravar análise exige que o talhão seja de quem está logado
// (como POST /analises/:id/salvar já fazia).
test('Talhão de outro usuário é recusado ao gravar análises', async (t) => {
  const dono = await cadastrar(requisitar, 'dono-talhao@exemplo.test');
  const outro = await cadastrar(requisitar, 'outro-usuario@exemplo.test');
  const talhaoDoDono = await criarTalhao(dono);

  await t.test('POST /analises/bulk', async () => {
    const r = await requisitar('POST', '/analises/bulk', {
      cookie: outro,
      corpo: { talhao_id: talhaoDoDono, uf: 'RS', cidade: 'Ibirubá', amostras: [{ ...AMOSTRA_CALAGEM, identificacao: 'injetada' }] },
    });
    assert.equal(r.status, 404);
  });

  await t.test('POST /adubacao/salvar', async () => {
    const r = await requisitar('POST', '/adubacao/salvar', { cookie: outro, corpo: { dadosForm: { ...FORM_ADUBACAO, talhao_id: talhaoDoDono } } });
    assert.equal(r.status, 404);
  });

  await t.test('POST /adubacao/bulk', async () => {
    const r = await requisitar('POST', '/adubacao/bulk', { cookie: outro, corpo: { talhao_id: talhaoDoDono, amostras: [FORM_ADUBACAO] } });
    assert.equal(r.status, 404);
  });

  await t.test('nada foi gravado no talhão do dono', async () => {
    const r = await requisitar('GET', `/fazendas/talhoes/${talhaoDoDono}/analises`, { cookie: dono });
    assert.deepEqual(r.corpo, []);
    const historicoOutro = await requisitar('GET', '/analises/historico', { cookie: outro });
    assert.equal(historicoOutro.corpo.dados.length, 0);
  });

  await t.test('o dono continua gravando no próprio talhão', async () => {
    const lote = await requisitar('POST', '/analises/bulk', {
      cookie: dono,
      corpo: { talhao_id: talhaoDoDono, uf: 'RS', cidade: 'Ibirubá', amostras: [AMOSTRA_CALAGEM] },
    });
    assert.equal(lote.status, 200);
    const salvar = await requisitar('POST', '/adubacao/salvar', { cookie: dono, corpo: { dadosForm: { ...FORM_ADUBACAO, talhao_id: talhaoDoDono } } });
    assert.equal(salvar.status, 201);
    assert.equal(salvar.corpo.data.talhao_id, talhaoDoDono);
    const loteAdubacao = await requisitar('POST', '/adubacao/bulk', { cookie: dono, corpo: { talhao_id: talhaoDoDono, amostras: [FORM_ADUBACAO] } });
    assert.equal(loteAdubacao.status, 200);
    assert.equal(loteAdubacao.corpo.resultados[0].sucesso, true);

    const doTalhao = await requisitar('GET', `/fazendas/talhoes/${talhaoDoDono}/analises`, { cookie: dono });
    assert.equal(doTalhao.corpo.length, 1);
  });

  await t.test('sem talhão a gravação continua permitida', async () => {
    const r = await requisitar('POST', '/analises/bulk', { cookie: outro, corpo: { uf: 'RS', cidade: 'Ibirubá', amostras: [AMOSTRA_CALAGEM] } });
    assert.equal(r.status, 200);
  });
});

// AUD-04: a recomendação salva é sempre a do motor, nunca a enviada pelo cliente.
test('POST /adubacao/salvar recalcula a recomendação no servidor', async () => {
  const cookie = await cadastrar(requisitar, 'recalculo-adubacao@exemplo.test');
  const calculado = await requisitar('POST', '/adubacao/calcular', { corpo: FORM_ADUBACAO });
  assert.equal(calculado.status, 200);

  const forjado = { recomendacao: { n: { dose_total_kg_ha: 99999, tipo: 'FORJADO' } }, alertas: [] };
  const salvo = await requisitar('POST', '/adubacao/salvar', { cookie, corpo: { dadosForm: FORM_ADUBACAO, resultado: forjado } });
  assert.equal(salvo.status, 201);
  assert.deepEqual(salvo.corpo.data.recomendacao_json, calculado.corpo.resultado);

  const semResultado = await requisitar('POST', '/adubacao/salvar', { cookie, corpo: { dadosForm: FORM_ADUBACAO } });
  assert.equal(semResultado.status, 201);
  assert.deepEqual(semResultado.corpo.data.recomendacao_json, calculado.corpo.resultado);
});
