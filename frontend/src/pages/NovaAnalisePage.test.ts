import { describe, expect, test } from 'vitest';
import { isCellEnabled, type LinhaAmostra, type ModoInsercao } from './NovaAnalisePage';
import { CalagemSchema } from '../schemas/calagemSchema';
import { AdubacaoSchema } from '../schemas/adubacaoSchema';

/**
 * A "Inserção Rápida de Lotes" reimplementa, em isCellEnabled, a mesma regra
 * de campos condicionais das calculadoras (ver docs/ref-calagem.md §9), só
 * que habilitando/desabilitando células da planilha em vez de blocos JSX.
 *
 * Estes testes garantem que nenhuma célula fique desabilitada para um campo
 * que o schema (fonte de verdade, validada no submit) exige — se isso
 * acontecer, o lote nunca consegue ser salvo e não há como corrigir pela UI.
 * Vale para os três modos: CALAGEM, ADUBACAO e AMBOS (calagem + adubação).
 */

const SISTEMAS = ['CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO'] as const;
const SMPS = [5.0, 6.5];
const PHS = [5.0, 6.0];
const POLINOMIAL = [false, true];
const CAMPOS_CALAGEM_COND: Array<keyof LinhaAmostra> = ['v_atual', 'ctc', 'al_sat', 'mo', 'al_trocavel'];

function linha(ph: number, smp: number): LinhaAmostra {
  return {
    id: 'x',
    talhao_id: 't',
    identificacao: 'Amostra 1',
    ph: String(ph),
    smp: String(smp),
    mo: '',
    al_trocavel: '',
    v_atual: '',
    ctc: '',
    al_sat: '',
    argila: '',
    p: '',
    k: '',
    ca: '',
    mg: '',
    s: '',
    cu: '',
    zn: '',
    b: '',
    mn: '',
  };
}

function exigidoPeloCalagemSchema(
  campo: keyof LinhaAmostra,
  sistemaManejo: (typeof SISTEMAS)[number],
  smp: number,
  ph: number,
  calcularPolinomial: boolean
): boolean {
  // Payload mínimo válido, exceto pelo campo sob teste (deixado de fora):
  // pergunta ao schema real "isto é obrigatório aqui?".
  const base: Record<string, unknown> = {
    sistema_manejo: sistemaManejo,
    primeira_calagem: false,
    pH_agua: ph,
    SMP: smp,
    PRNT: 90,
    calcular_polinomial: calcularPolinomial ? true : undefined,
  };
  const campoParaSchema: Record<string, string> = {
    v_atual: 'V_atual',
    ctc: 'CTC_pH7',
    al_sat: 'Al_sat',
    mo: 'MO',
    al_trocavel: 'Al_trocavel',
  };
  const resultado = CalagemSchema.safeParse(base);
  if (resultado.success) return false;
  return resultado.error.issues.some((i) => i.path[0] === campoParaSchema[campo]);
}

const MODOS_COM_CALAGEM: ModoInsercao[] = ['CALAGEM', 'AMBOS'];

for (const modo of MODOS_COM_CALAGEM) {
  describe(`isCellEnabled (${modo}) não pode bloquear campo exigido pelo CalagemSchema`, () => {
    for (const sistemaManejo of SISTEMAS) {
      for (const smp of SMPS) {
        for (const ph of PHS) {
          for (const calcularPolinomial of POLINOMIAL) {
            test(`${sistemaManejo} · SMP=${smp} · pH=${ph} · polinomial=${calcularPolinomial}`, () => {
              const configGlobais = { sistemaManejo, calcularPolinomial };
              const l = linha(ph, smp);
              for (const campo of CAMPOS_CALAGEM_COND) {
                if (exigidoPeloCalagemSchema(campo, sistemaManejo, smp, ph, calcularPolinomial)) {
                  expect(
                    isCellEnabled(modo, campo, l, configGlobais),
                    `campo "${campo}" é exigido pelo CalagemSchema mas a célula está desabilitada`
                  ).toBe(true);
                }
              }
            });
          }
        }
      }
    }
  });
}

describe('isCellEnabled — Polinomial selecionado no lote', () => {
  test('MO e Al ficam desabilitados com SMP <= 6,3 sem o checkbox, e habilitados com ele', () => {
    const l = linha(5.0, 5.5);
    expect(isCellEnabled('CALAGEM', 'mo', l, { sistemaManejo: 'CONVENCIONAL' })).toBe(false);
    expect(isCellEnabled('CALAGEM', 'al_trocavel', l, { sistemaManejo: 'CONVENCIONAL' })).toBe(false);
    expect(isCellEnabled('CALAGEM', 'mo', l, { sistemaManejo: 'CONVENCIONAL', calcularPolinomial: true })).toBe(true);
    expect(isCellEnabled('CALAGEM', 'al_trocavel', l, { sistemaManejo: 'CONVENCIONAL', calcularPolinomial: true })).toBe(true);
  });

  test('SMP > 6,3 habilita MO e Al mesmo sem o checkbox (Polinomial automático)', () => {
    const l = linha(5.0, 6.5);
    expect(isCellEnabled('CALAGEM', 'mo', l, { sistemaManejo: 'CONVENCIONAL' })).toBe(true);
    expect(isCellEnabled('CALAGEM', 'al_trocavel', l, { sistemaManejo: 'CONVENCIONAL' })).toBe(true);
  });
});

describe('isCellEnabled (AMBOS) — adubação', () => {
  const CULTURAS_COM_S = ['soja', 'canola'];
  const CULTURAS_SEM_S = ['milho', 'trigo', 'cevada'];
  const baseAdubacao = {
    num_cultivo: '1',
    sistema_cultivo: 'Plantio Direto',
    tipo_correcao: 'Gradual',
    metodo_P: 'Mehlich-1',
    metodo_K: 'Mehlich-1',
    rendimento_esperado: 4,
    argila: 30,
    MO: 3,
    CTC_pH7: 10,
    P: 10,
    K: 100,
    Ca: 4,
    Mg: 2,
    pH_agua: 5.5,
    cultura_antecedente: 'Gramínea',
  };

  test('S é exigido pelo AdubacaoSchema exatamente nas culturas em que a célula está habilitada', () => {
    for (const cultura of [...CULTURAS_COM_S, ...CULTURAS_SEM_S]) {
      const resultado = AdubacaoSchema.safeParse({ ...baseAdubacao, cultura });
      const exigeS = !resultado.success && resultado.error.issues.some((i) => i.path[0] === 'S');
      const habilitada = isCellEnabled('AMBOS', 's', linha(5.5, 5.5), { cultura });
      if (exigeS) expect(habilitada, `S exigido para ${cultura} mas desabilitado`).toBe(true);
      expect(habilitada).toBe(CULTURAS_COM_S.includes(cultura));
    }
  });

  test('colunas compartilhadas (pH, MO, CTC) ficam sempre habilitadas em AMBOS', () => {
    // MO e CTC são sempre exigidas pela adubação, mesmo com SMP <= 6,3 sem Polinomial.
    const l = linha(5.0, 5.0);
    for (const campo of ['ph', 'mo', 'ctc'] as const) {
      expect(isCellEnabled('AMBOS', campo, l, { sistemaManejo: 'CONVENCIONAL', cultura: 'soja' })).toBe(true);
    }
  });

  test('colunas de calagem em AMBOS seguem a regra da calagem (Al saturação só em PD Consolidado com pH < 5,5)', () => {
    expect(isCellEnabled('AMBOS', 'al_sat', linha(5.0, 5.0), { sistemaManejo: 'CONVENCIONAL', cultura: 'soja' })).toBe(false);
    expect(isCellEnabled('AMBOS', 'al_sat', linha(5.0, 5.0), { sistemaManejo: 'PD_CONSOLIDADO', cultura: 'soja' })).toBe(true);
  });
});
