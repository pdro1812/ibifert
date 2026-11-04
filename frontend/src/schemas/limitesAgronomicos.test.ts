// AUD-05: o formulário recusa as mesmas faixas que a API, para o usuário ver
// o erro no campo e não um 400 genérico depois de enviar.
import { describe, expect, it } from 'vitest';
import { CalagemSchema } from './calagemSchema';
import { AdubacaoSchema } from './adubacaoSchema';

const CALAGEM = {
  sistema_manejo: 'CONVENCIONAL' as const,
  primeira_calagem: false,
  pH_agua: 5.0,
  SMP: 5.5,
  PRNT: 100,
  V_atual: 55,
  CTC_pH7: 10,
};

const ADUBACAO = {
  argila: 50, MO: 3, CTC_pH7: 12, P: 20, metodo_P: 'Mehlich-1', K: 150, metodo_K: 'Mehlich-1',
  Ca: 5, Mg: 2, S: 15, cultura: 'soja', num_cultivo: '1', rendimento_esperado: 4.5,
  sistema_cultivo: 'Plantio Direto', tipo_correcao: 'Gradual',
};

function erroNoCampo(resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, campo: string) {
  expect(resultado.success).toBe(false);
  return resultado.error!.issues.find((i) => i.path[0] === campo)?.message;
}

describe('faixas da calagem no formulário', () => {
  it('PRNT de 45 a 100', () => {
    expect(CalagemSchema.safeParse({ ...CALAGEM, PRNT: 45 }).success).toBe(true);
    expect(erroNoCampo(CalagemSchema.safeParse({ ...CALAGEM, PRNT: 44 }), 'PRNT')).toBe('PRNT inválido: deve estar entre 45 e 100.');
  });

  it('CTC até 60, MO até 20, Al até 15', () => {
    expect(erroNoCampo(CalagemSchema.safeParse({ ...CALAGEM, CTC_pH7: 61 }), 'CTC_pH7')).toMatch(/até 60/);
    expect(erroNoCampo(CalagemSchema.safeParse({ ...CALAGEM, MO: 21 }), 'MO')).toMatch(/entre 0 e 20/);
    expect(erroNoCampo(CalagemSchema.safeParse({ ...CALAGEM, CTC_pH7: 20, Al_trocavel: 16 }), 'Al_trocavel')).toMatch(/entre 0 e 15/);
  });

  it('Al trocável maior que a CTC é recusado', () => {
    expect(CalagemSchema.safeParse({ ...CALAGEM, CTC_pH7: 10, Al_trocavel: 10 }).success).toBe(true);
    expect(erroNoCampo(CalagemSchema.safeParse({ ...CALAGEM, CTC_pH7: 10, Al_trocavel: 10.5 }), 'Al_trocavel'))
      .toBe('Al_trocavel não pode ser maior que a CTC_pH7.');
  });
});

describe('faixas da adubação no formulário', () => {
  it('rendimento acima do limite da cultura', () => {
    expect(AdubacaoSchema.safeParse({ ...ADUBACAO, rendimento_esperado: 14 }).success).toBe(true);
    expect(erroNoCampo(AdubacaoSchema.safeParse({ ...ADUBACAO, rendimento_esperado: 14.5 }), 'rendimento_esperado'))
      .toBe('Rendimento esperado deve ser <= 14 t/ha para esta cultura.');
  });

  it('tetos de solo e densidade', () => {
    expect(erroNoCampo(AdubacaoSchema.safeParse({ ...ADUBACAO, P: 501 }), 'P')).toMatch(/<= 500/);
    expect(erroNoCampo(AdubacaoSchema.safeParse({ ...ADUBACAO, K: 1001 }), 'K')).toMatch(/<= 1\.000/);
    expect(erroNoCampo(AdubacaoSchema.safeParse({ ...ADUBACAO, densidade_plantas: 1000 }), 'densidade_plantas'))
      .toMatch(/entre 30\.000 e 120\.000/);
  });
});
