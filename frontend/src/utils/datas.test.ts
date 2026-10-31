import { describe, expect, test } from 'vitest';
import { formatarDataAnalise, hojeLocalISO } from './datas';

describe('datas da análise', () => {
  test('data da análise é exibida como informada, sem deslocamento de fuso', () => {
    expect(formatarDataAnalise('2026-10-01')).toBe('01/10/2026');
  });

  test('sem data da análise não inventa uma (fica "não informada" na tela)', () => {
    expect(formatarDataAnalise(null)).toBeNull();
    expect(formatarDataAnalise('')).toBeNull();
  });

  test('hojeLocalISO no formato do input date', () => {
    expect(hojeLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
