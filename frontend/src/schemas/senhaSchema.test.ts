import { describe, expect, it } from 'vitest';
import { REGRAS_SENHA, SenhaForteSchema } from './senhaSchema';

const regrasAtendidas = (senha: string) =>
  REGRAS_SENHA.filter((r) => r.valida(senha)).map((r) => r.id);

describe('SenhaForteSchema', () => {
  it('aceita senha com 8+ caracteres, maiúscula, minúscula, número e especial', () => {
    expect(SenhaForteSchema.safeParse('Adubo#2026').success).toBe(true);
  });

  it.each([
    ['curta', 'Ab1#xyz'],
    ['sem maiúscula', 'adubo#2026'],
    ['sem minúscula', 'ADUBO#2026'],
    ['sem número', 'Adubo#Solo'],
    ['sem especial', 'Adubo2026'],
  ])('rejeita senha %s', (_caso, senha) => {
    expect(SenhaForteSchema.safeParse(senha).success).toBe(false);
  });

  it('marca cada regra conforme a senha é digitada', () => {
    expect(regrasAtendidas('')).toEqual([]);
    expect(regrasAtendidas('a')).toEqual(['minuscula']);
    expect(regrasAtendidas('aB1')).toEqual(['maiuscula', 'minuscula', 'numero']);
    expect(regrasAtendidas('aB1!aaaa')).toEqual(['tamanho', 'maiuscula', 'minuscula', 'numero', 'especial']);
  });

  it('aceita letras acentuadas como maiúscula/minúscula e não conta espaço como especial', () => {
    expect(regrasAtendidas('Ção')).toEqual(['maiuscula', 'minuscula']);
    expect(regrasAtendidas('a b')).toEqual(['minuscula']);
  });
});
