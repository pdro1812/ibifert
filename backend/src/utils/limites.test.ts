// AUD-05: faixas de entrada da calagem e da adubação.
//
// Cada faixa é testada nos dois lados do limite. Os valores esperados das
// doses nos limites foram conferidos à mão contra as tabelas do motor
// (comentário em cada caso).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { ajustarDosePorPRNT, validarEntrada } from '../services/calculadoraCalagem';
import { executarMotorCalagem } from '../services/motorCalagem';
import { executarMotorAdubacao } from '../services/motorAdubacao';
import { tabelaSmpLookup } from '../services/tabelaSmp';
import { AdubacaoSchema } from '../schemas/adubacaoSchema';
import { CalagemValidationError, SistemaManejo, type InputCalagem } from '../schemas/calagemSchema';
import { RENDIMENTO_MAXIMO_T_HA, formatarLimite } from '../schemas/limitesAgronomicos';

const perto = (obtido: number, esperado: number) =>
  assert.ok(Math.abs(obtido - esperado) < 1e-9, `esperado ${esperado}, obtido ${obtido}`);

// Reaplicação convencional pelo SMP: NC_smp = 6,1 t/ha (Tabela 5.2, SMP 5,5, pH 6,0).
const CALAGEM: InputCalagem = {
  sistema_manejo: SistemaManejo.CONVENCIONAL,
  primeira_calagem: false,
  pH_agua: 5.0,
  SMP: 5.5,
  PRNT: 100,
  V_atual: 55,
  CTC_pH7: 10,
};

const aceita = (extra: Partial<InputCalagem>) => validarEntrada({ ...CALAGEM, ...extra });
const recusa = (extra: Record<string, unknown>, mensagem: RegExp) =>
  assert.throws(() => validarEntrada({ ...CALAGEM, ...extra }), (e: unknown) => {
    assert.ok(e instanceof CalagemValidationError);
    assert.match(e.message, mensagem);
    return true;
  });

test('Limites da calagem (AUD-05)', async (t) => {
  await t.test('PRNT: 45 a 100 (mínimo legal do calcário, Manual p. 299)', () => {
    aceita({ PRNT: 45 });
    aceita({ PRNT: 100 });
    recusa({ PRNT: 44.9 }, /PRNT inválido: deve estar entre 45 e 100/);
    recusa({ PRNT: 100.1 }, /PRNT/);
    // Caso da auditoria: PRNT 0,01 dava 61.000 t/ha.
    recusa({ PRNT: 0.01 }, /PRNT/);
    recusa({ PRNT: 0 }, /PRNT/);
  });

  await t.test('PRNT 45 corrige a dose por 100/45', () => {
    const r = executarMotorCalagem({ ...CALAGEM, PRNT: 45 });
    perto(r.NC_final, 6.1);
    perto(r.NC_ajustada, (6.1 * 100) / 45); // 13,56 t/ha
  });

  await t.test('ajustarDosePorPRNT recusa fora de 45–100, inclusive NaN', () => {
    perto(ajustarDosePorPRNT(3.0, 45), (3.0 * 100) / 45);
    perto(ajustarDosePorPRNT(3.0, 100), 3.0);
    assert.throws(() => ajustarDosePorPRNT(3.0, 44.99), CalagemValidationError);
    assert.throws(() => ajustarDosePorPRNT(3.0, 100.01), CalagemValidationError);
    assert.throws(() => ajustarDosePorPRNT(3.0, Number.NaN), CalagemValidationError);
  });

  await t.test('SMP: 4,0 a 7,5', () => {
    aceita({ SMP: 4.0 });
    aceita({ SMP: 7.5, MO: 3, Al_trocavel: 0 });
    recusa({ SMP: 3.99 }, /SMP inválido: deve estar entre 4 e 7,5/);
    recusa({ SMP: 7.51 }, /SMP/);
    // Caso da auditoria: SMP −50 era aceito.
    recusa({ SMP: -50 }, /SMP/);
  });

  await t.test('SMP entre 4,0 e 4,4 usa a linha "≤ 4,4"; acima de 7,1 a dose é zero', () => {
    perto(executarMotorCalagem({ ...CALAGEM, SMP: 4.0 }).NC_base, 21.0);
    perto(executarMotorCalagem({ ...CALAGEM, SMP: 4.4 }).NC_base, 21.0);
    const alto = executarMotorCalagem({ ...CALAGEM, SMP: 7.5, MO: 3, Al_trocavel: 0 });
    perto(alto.NC_base, 0);
    perto(alto.NC_ajustada, 0);
  });

  await t.test('cada linha da Tabela 5.2 é encontrada pelo próprio SMP (sem erro de ponto flutuante)', () => {
    // Coluna pH 6,0 do Manual, de SMP 4,4 a 6,3.
    const pH6 = [21.0, 17.3, 15.1, 13.3, 11.9, 10.7, 9.9, 9.1, 8.3, 7.5, 6.8, 6.1, 5.4, 4.8, 4.2, 3.7,
      3.2, 2.7, 2.2, 1.8];
    pH6.forEach((nc, i) => {
      const smp = Number((4.4 + i / 10).toFixed(1));
      perto(tabelaSmpLookup(smp, 6.0), nc);
    });
  });

  await t.test('SMP_10_20 segue a mesma faixa', () => {
    const base = { sistema_manejo: SistemaManejo.PD_COM_RESTRICAO, Al_sat_10_20: 40 };
    aceita({ ...base, SMP_10_20: 4.0 });
    recusa({ ...base, SMP_10_20: 3.9 }, /SMP_10_20 inválido/);
    recusa({ ...base, SMP_10_20: 8 }, /SMP_10_20 inválido/);
  });

  await t.test('MO: 0 a 20', () => {
    aceita({ MO: 0 });
    aceita({ MO: 20 });
    recusa({ MO: 20.1 }, /MO inválida: deve estar entre 0 e 20/);
    recusa({ MO: -0.1 }, /MO inválida/);
  });

  await t.test('CTC pH 7: maior que 0 e até 60', () => {
    aceita({ CTC_pH7: 60 });
    recusa({ CTC_pH7: 60.1 }, /CTC_pH7 inválido: deve ser maior que 0 e até 60/);
    recusa({ CTC_pH7: 0 }, /CTC_pH7/);
  });

  await t.test('Al trocável: 0 a 15 e nunca maior que a CTC pH 7', () => {
    aceita({ Al_trocavel: 15, CTC_pH7: 20 });
    aceita({ Al_trocavel: 10, CTC_pH7: 10 });
    recusa({ Al_trocavel: 15.1, CTC_pH7: 20 }, /Al_trocavel inválido: deve estar entre 0 e 15/);
    recusa({ Al_trocavel: 10.1, CTC_pH7: 10 }, /Al_trocavel não pode ser maior que a CTC_pH7/);
    recusa({ Al_trocavel: -1 }, /Al_trocavel/);
  });

  await t.test('NaN e infinito são recusados', () => {
    recusa({ PRNT: Number.POSITIVE_INFINITY }, /./);
    recusa({ SMP: Number.NaN }, /./);
  });

  await t.test('no pior caso dentro das faixas, todas as doses são finitas e limitadas', () => {
    const r = executarMotorCalagem({
      ...CALAGEM,
      SMP: 4.0,
      PRNT: 45,
      MO: 20,
      Al_trocavel: 15,
      CTC_pH7: 60,
      V_atual: 0,
      calcular_polinomial: true,
    });
    // SMP: 21 t/ha × 100/45; Sat. bases: (80 − 0)/100 × 60 = 48;
    // Polinomial: −0,516 + 0,805 × 20 + 2,435 × 15 = 52,109.
    perto(r.NC_ajustada, (21 * 100) / 45);
    perto(r.NC_vb!, 48);
    perto(r.NC_polinomial!, 52.109);
  });
});

// Soja do adubacao.test.ts: P2O5 = 45 + (R − 3) × 15; K2O = 75 + (R − 3) × 25.
const SOJA = {
  argila: 50, MO: 3, CTC_pH7: 12, P: 20, metodo_P: 'Mehlich-1', K: 150, metodo_K: 'Mehlich-1',
  Ca: 5, Mg: 2, S: 15, cultura: 'soja', num_cultivo: '1', rendimento_esperado: 4.5,
  sistema_cultivo: 'Plantio Direto', tipo_correcao: 'Gradual',
} as const;

const adubacaoAceita = (extra: Record<string, unknown>) => AdubacaoSchema.parse({ ...SOJA, ...extra });
const adubacaoRecusa = (extra: Record<string, unknown>, campo: string, mensagem: RegExp) => {
  const r = AdubacaoSchema.safeParse({ ...SOJA, ...extra });
  assert.equal(r.success, false, `deveria recusar ${JSON.stringify(extra)}`);
  const issue = r.error!.issues.find((i) => i.path[0] === campo);
  assert.ok(issue, `sem erro no campo ${campo}: ${JSON.stringify(r.error!.issues)}`);
  assert.match(issue.message, mensagem);
};

test('Limites da adubação (AUD-05)', async (t) => {
  await t.test('tetos de digitação de solo', () => {
    adubacaoAceita({ CTC_pH7: 60, P: 500, K: 1000, Ca: 30, Mg: 15, MO: 20 });
    adubacaoRecusa({ CTC_pH7: 60.1 }, 'CTC_pH7', /CTC deve ser <= 60/);
    adubacaoRecusa({ P: 500.1 }, 'P', /Fósforo deve ser <= 500/);
    adubacaoRecusa({ K: 1000.1 }, 'K', /Potássio deve ser <= 1\.000/);
    adubacaoRecusa({ Ca: 30.1 }, 'Ca', /Cálcio deve ser <= 30/);
    adubacaoRecusa({ Mg: 15.1 }, 'Mg', /Magnésio deve ser <= 15/);
    adubacaoRecusa({ MO: 20.1 }, 'MO', /MO deve ser <= 20/);
  });

  await t.test('pH em água: 3,5 a 8,0 quando informado', () => {
    adubacaoAceita({ pH_agua: 3.5 });
    adubacaoAceita({ pH_agua: 8 });
    adubacaoRecusa({ pH_agua: 3.4 }, 'pH_agua', /pH inválido: deve estar entre 3,5 e 8/);
    adubacaoRecusa({ pH_agua: 14 }, 'pH_agua', /pH inválido/);
  });

  await t.test('densidade de plantas: 30.000 a 120.000 quando informada', () => {
    const milho = { cultura: 'milho', cultura_antecedente: 'Gramínea', rendimento_esperado: 8 };
    adubacaoAceita({ ...milho, densidade_plantas: 30000 });
    adubacaoAceita({ ...milho, densidade_plantas: 120000 });
    adubacaoRecusa({ ...milho, densidade_plantas: 29999 }, 'densidade_plantas', /entre 30\.000 e 120\.000/);
    adubacaoRecusa({ ...milho, densidade_plantas: 120001 }, 'densidade_plantas', /entre 30\.000 e 120\.000/);
  });

  await t.test('rendimento: recusado acima do limite de cada cultura', () => {
    for (const [cultura, { limite }] of Object.entries(RENDIMENTO_MAXIMO_T_HA)) {
      const extra: Record<string, unknown> = { cultura, S: 15 };
      if (['aveia_branca', 'aveia_preta', 'centeio', 'cevada', 'trigo', 'triticale', 'milho'].includes(cultura)) {
        extra.cultura_antecedente = 'Gramínea';
      }
      if (cultura === 'cevada') extra.finalidade_cevada = 'outra';
      adubacaoAceita({ ...extra, rendimento_esperado: limite });
      adubacaoRecusa(
        { ...extra, rendimento_esperado: limite + 0.1 },
        'rendimento_esperado',
        new RegExp(`Rendimento esperado deve ser <= ${formatarLimite(limite)} t/ha`)
      );
    }
    // Caso da auditoria: milho a 1.000 t/ha dava 14.980 kg N/ha.
    adubacaoRecusa(
      { cultura: 'milho', cultura_antecedente: 'Gramínea', rendimento_esperado: 1000 },
      'rendimento_esperado',
      /<= 40 t\/ha/
    );
  });

  await t.test('rendimento acima do razoável: aceito, com alerta, e a dose não muda', () => {
    const codigos = (r: ReturnType<typeof executarMotorAdubacao>) => r.alertas.map((a) => a.codigo);

    const noRazoavel = executarMotorAdubacao(adubacaoAceita({ rendimento_esperado: 7 }));
    assert.ok(!codigos(noRazoavel).includes('REND_ACIMA_RAZOAVEL'));
    assert.equal(noRazoavel.recomendacao.p2o5.dose_total_kg_ha, 105); // 45 + 4 × 15
    assert.equal(noRazoavel.recomendacao.k2o.dose_total_kg_ha, 175); // 75 + 4 × 25

    const acima = executarMotorAdubacao(adubacaoAceita({ rendimento_esperado: 7.5 }));
    const alerta = acima.alertas.find((a) => a.codigo === 'REND_ACIMA_RAZOAVEL');
    assert.ok(alerta);
    assert.equal(alerta.nivel, 'AVISO');
    assert.match(alerta.mensagem, /\(7 t\/ha\)/);
    assert.equal(acima.recomendacao.p2o5.dose_total_kg_ha, 113); // 45 + 4,5 × 15 = 112,5
    assert.equal(acima.recomendacao.k2o.dose_total_kg_ha, 188); // 75 + 4,5 × 25 = 187,5
  });

  await t.test('milho no limite de 40 t/ha tem doses finitas e lineares no rendimento', () => {
    const r = executarMotorAdubacao(adubacaoAceita({
      cultura: 'milho', cultura_antecedente: 'Gramínea', S: undefined, rendimento_esperado: 40,
    }));
    // Milho (MO média, gramínea): N = 70 + (40 − 6) × 15; P2O5 = 90 + 34 × 15; K2O = 60 + 34 × 10.
    assert.equal(r.recomendacao.n.dose_total_kg_ha, 580);
    assert.equal(r.recomendacao.p2o5.dose_total_kg_ha, 600);
    assert.equal(r.recomendacao.k2o.dose_total_kg_ha, 400);
  });
});

test('Frontend e backend usam as mesmas faixas', () => {
  const backend = path.join(__dirname, '..', 'schemas', 'limitesAgronomicos.ts');
  const frontend = path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'schemas', 'limitesAgronomicos.ts');
  assert.equal(
    fs.readFileSync(frontend, 'utf8'),
    fs.readFileSync(backend, 'utf8'),
    'frontend/src/schemas/limitesAgronomicos.ts deve ser cópia exata do arquivo do backend'
  );
});
