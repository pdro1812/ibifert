import { describe, expect, test } from 'vitest';
import { normalizarNumero } from './AdubacaoPage';
import { AdubacaoSchema } from '../schemas/adubacaoSchema';

/**
 * Bug corrigido em 2026-08-23: CampoNumerico usava
 * register(name, { valueAsNumber: true }), e o react-hook-form converte
 * campo vazio para NaN (não undefined). Como o AdubacaoSchema declara Cu,
 * Zn, B, Mn, S e pH_agua como z.number().optional(), o zod rejeita NaN
 * mesmo em campo opcional ("Invalid input: expected number, received NaN")
 * — o formulário nunca submetia se qualquer campo opcional ficasse em
 * branco. Passou despercebido porque os botões de cenário de exemplo
 * preenchem todos os micronutrientes.
 *
 * normalizarNumero converte '' para undefined antes de chegar no zod,
 * corrigindo o problema.
 */
describe('normalizarNumero', () => {
  test('string vazia vira undefined (não NaN)', () => {
    expect(normalizarNumero('')).toBeUndefined();
  });

  test('undefined/null permanecem undefined', () => {
    expect(normalizarNumero(undefined)).toBeUndefined();
    expect(normalizarNumero(null)).toBeUndefined();
  });

  test('aceita vírgula como separador decimal', () => {
    expect(normalizarNumero('5,2')).toBe(5.2);
  });

  test('string numérica válida vira number', () => {
    expect(normalizarNumero('12.5')).toBe(12.5);
  });

  test('string não numérica vira undefined, não NaN', () => {
    expect(normalizarNumero('abc')).toBeUndefined();
  });
});

describe('AdubacaoSchema aceita payload com micronutrientes opcionais omitidos', () => {
  test('campo vazio normalizado (undefined) não quebra campos opcionais', () => {
    const payload = {
      argila: 30,
      MO: 2.5,
      CTC_pH7: 10,
      P: 20,
      metodo_P: 'Mehlich-1',
      K: 100,
      metodo_K: 'Mehlich-1',
      Ca: 4,
      Mg: 2,
      // S, Cu, Zn, B, Mn, pH_agua deliberadamente omitidos (opcionais)
      cultura: 'trigo',
      num_cultivo: '1',
      rendimento_esperado: 3,
      cultura_antecedente: 'Gramínea',
      sistema_cultivo: 'Plantio Direto',
      tipo_correcao: 'Gradual',
    };
    const resultado = AdubacaoSchema.safeParse(payload);
    expect(resultado.success).toBe(true);
  });

  test('NaN nesses mesmos campos é rejeitado (reproduz o bug se normalizarNumero não for usado)', () => {
    const payload = {
      argila: 30,
      MO: 2.5,
      CTC_pH7: 10,
      P: 20,
      metodo_P: 'Mehlich-1',
      K: 100,
      metodo_K: 'Mehlich-1',
      Ca: 4,
      Mg: 2,
      Cu: NaN, // o que valueAsNumber produzia para um campo vazio
      cultura: 'trigo',
      num_cultivo: '1',
      rendimento_esperado: 3,
      cultura_antecedente: 'Gramínea',
      sistema_cultivo: 'Plantio Direto',
      tipo_correcao: 'Gradual',
    };
    const resultado = AdubacaoSchema.safeParse(payload);
    expect(resultado.success).toBe(false);
  });
});
