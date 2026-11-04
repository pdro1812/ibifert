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

// AUD-06: erro interno não devolve error.message (trazia a query SQL e os
// parâmetros) e id que não é UUID vira 404, não 500.
function assertSemVazamento(corpo: unknown) {
  const texto = JSON.stringify(corpo);
  assert.doesNotMatch(texto, /Failed query|select |insert into|params:|invalid input/i);
  assert.equal(typeof corpo === 'object' && corpo !== null && 'detalhes' in corpo, false);
}

test('Erros não expõem detalhes internos', async (t) => {
  const cookie = await cadastrar(requisitar, 'erros-internos@exemplo.test');

  await t.test('id que não é UUID → 404 nas rotas de análise', async () => {
    const casos: [string, string, unknown?][] = [
      ['GET', '/analises/nao-e-uuid'],
      ['PUT', '/analises/nao-e-uuid', { ...AMOSTRA_CALAGEM, uf: 'RS', cidade: 'Ibirubá' }],
      ['DELETE', '/analises/nao-e-uuid'],
      ['PATCH', '/analises/nao-e-uuid/arquivar', { arquivada: true }],
      ['POST', '/analises/nao-e-uuid/salvar', {}],
      ['GET', '/adubacao/nao-e-uuid'],
      ['PUT', '/adubacao/nao-e-uuid', { dadosForm: FORM_ADUBACAO }],
      ['DELETE', '/adubacao/nao-e-uuid'],
      ['PATCH', '/adubacao/nao-e-uuid/arquivar', { arquivada: true }],
    ];
    for (const [metodo, caminho, corpo] of casos) {
      const r = await requisitar(metodo, caminho, { cookie, corpo });
      assert.equal(r.status, 404, `${metodo} ${caminho}`);
      assertSemVazamento(r.corpo);
    }
  });

  await t.test('talhao_id que não é UUID → 404', async () => {
    const r = await requisitar('POST', '/analises/bulk', { cookie, corpo: { talhao_id: 'xyz', uf: 'RS', cidade: 'Ibirubá', amostras: [AMOSTRA_CALAGEM] } });
    assert.equal(r.status, 404);
    assertSemVazamento(r.corpo);
  });

  await t.test('falha do banco → 500 com mensagem genérica', async () => {
    // Sem uf/cidade o insert viola NOT NULL no banco.
    const r = await requisitar('POST', '/analises/bulk', { cookie, corpo: { amostras: [AMOSTRA_CALAGEM] } });
    assert.equal(r.status, 500);
    assertSemVazamento(r.corpo);
    assert.equal(r.corpo.mensagem, 'Erro ao processar lote de análises.');
  });

  await t.test('amostra inválida no lote de adubação devolve só a mensagem de validação', async () => {
    const r = await requisitar('POST', '/adubacao/bulk', { cookie, corpo: { amostras: [{ ...FORM_ADUBACAO, argila: 150 }] } });
    assert.equal(r.status, 200);
    assert.equal(r.corpo.resultados[0].sucesso, false);
    assert.equal(r.corpo.resultados[0].erro, 'Argila deve ser <= 99%');
  });

  await t.test('JSON malformado → 400 em JSON', async () => {
    const resposta = await fetch(`${ambiente.url}/feedback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.200' }, body: '{"nome":',
    });
    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: 'JSON inválido.' });
  });
});

// AUD-20: no zod 4 a lista de problemas é error.issues (error.errors não
// existe), então os 400 de validação saíam sem dizer qual campo falhou.
test('Erros de validação dizem qual campo falhou', async (t) => {
  const cookie = await cadastrar(requisitar, 'validacao@exemplo.test');
  const casos: [string, string, string | undefined, unknown][] = [
    ['POST /feedback', '/feedback', undefined, {}],
    ['POST /adubacao/calcular', '/adubacao/calcular', undefined, {}],
    ['POST /fazendas', '/fazendas', cookie, {}],
  ];
  for (const [nome, caminho, comCookie, corpo] of casos) {
    await t.test(nome, async () => {
      const r = await requisitar('POST', caminho, { cookie: comCookie, corpo });
      assert.equal(r.status, 400);
      assert.ok(Array.isArray(r.corpo.details) && r.corpo.details.length > 0, JSON.stringify(r.corpo));
      assert.ok(r.corpo.details.every((d: { path: unknown; message: unknown }) => Array.isArray(d.path) && typeof d.message === 'string'));
    });
  }

  await t.test('POST /fazendas/:id/talhoes', async () => {
    const fazenda = await requisitar('POST', '/fazendas', { cookie, corpo: { nome: 'Fazenda Validação', municipio: 'Ibirubá', uf: 'RS' } });
    const r = await requisitar('POST', `/fazendas/${fazenda.corpo.id}/talhoes`, { cookie, corpo: {} });
    assert.equal(r.status, 400);
    assert.deepEqual(r.corpo.details.map((d: { path: string[] }) => d.path[0]).sort(), ['cultura', 'nome']);
  });
});

// AUD-05: a API pública aceitava PRNT 0,01 (61.000 t/ha) e rendimento de
// 1.000 t/ha (14.980 kg N/ha). Agora recusa com 400 e não grava nada.
test('Entradas fora das faixas agronômicas são recusadas pela API', async (t) => {
  const totalCalagens = async () => (await requisitar('GET', '/analises/regional-stats')).corpo.medias.total;

  await t.test('POST /analises/calcular com PRNT 0,01', async () => {
    const antes = await totalCalagens();
    const r = await requisitar('POST', '/analises/calcular', { corpo: { ...AMOSTRA_CALAGEM, PRNT: 0.01, uf: 'RS', cidade: 'Ibirubá' } });
    assert.equal(r.status, 400);
    assert.match(r.corpo.mensagem, /PRNT inválido: deve estar entre 45 e 100/);
    assert.equal(await totalCalagens(), antes, 'cálculo recusado não pode virar registro anônimo');
  });

  await t.test('POST /analises/calcular com PRNT 45 continua calculando', async () => {
    const r = await requisitar('POST', '/analises/calcular', { corpo: { ...AMOSTRA_CALAGEM, PRNT: 45, uf: 'RS', cidade: 'Ibirubá' } });
    assert.equal(r.status, 200);
    // SMP 5,5 → 6,1 t/ha (Tabela 5.2, pH 6,0) × 100/45.
    assert.ok(Math.abs(r.corpo.resultado.NC_ajustada - (6.1 * 100) / 45) < 1e-9);
  });

  await t.test('POST /adubacao/calcular com rendimento de 1.000 t/ha', async () => {
    const r = await requisitar('POST', '/adubacao/calcular', { corpo: { ...FORM_ADUBACAO, rendimento_esperado: 1000 } });
    assert.equal(r.status, 400);
    const erro = r.corpo.details.find((d: { path: string[] }) => d.path[0] === 'rendimento_esperado');
    assert.match(erro.message, /<= 40 t\/ha/);
  });

  await t.test('POST /adubacao/calcular acima do razoável devolve alerta', async () => {
    const r = await requisitar('POST', '/adubacao/calcular', { corpo: { ...FORM_ADUBACAO, rendimento_esperado: 25 } });
    assert.equal(r.status, 200);
    assert.ok(r.corpo.resultado.alertas.some((a: { codigo: string }) => a.codigo === 'REND_ACIMA_RAZOAVEL'));
  });

  await t.test('POST /adubacao/bulk recusa só a amostra fora da faixa', async () => {
    const cookie = await cadastrar(requisitar, 'faixas@exemplo.test');
    const r = await requisitar('POST', '/adubacao/bulk', {
      cookie,
      corpo: { amostras: [{ ...FORM_ADUBACAO, identificacao: 'ok' }, { ...FORM_ADUBACAO, identificacao: 'ruim', P: 5000 }] },
    });
    assert.equal(r.status, 200);
    assert.deepEqual(
      r.corpo.resultados.map((x: { identificacao: string; sucesso: boolean }) => [x.identificacao, x.sucesso]),
      [['ok', true], ['ruim', false]]
    );
    assert.match(r.corpo.resultados[1].erro, /Fósforo deve ser <= 500/);
  });
});
