import test from 'node:test';
import assert from 'node:assert/strict';
import { UfAtendidaSchema, LocalizacaoSchema } from '../schemas/localizacaoSchema';
import { RegistroSchema, LocalidadePreferencialSchema } from '../schemas/authSchema';
import { CriarFazendaSchema } from '../schemas/fazendasSchema';
import { CriarFeedbackSchema } from '../schemas/feedbackSchema';

test('Estados atendidos: só RS e SC', async (t) => {
  await t.test('aceita RS e SC', () => {
    assert.equal(UfAtendidaSchema.safeParse('RS').success, true);
    assert.equal(UfAtendidaSchema.safeParse('SC').success, true);
  });

  for (const uf of ['PR', 'SP', 'rs', '', 'RSS']) {
    await t.test(`rejeita "${uf}"`, () => {
      assert.equal(UfAtendidaSchema.safeParse(uf).success, false);
    });
  }

  await t.test('cadastro, propriedade, feedback e localização do cálculo usam a mesma regra', () => {
    const cadastro = { nome: 'Fulano', cidade: 'Curitiba', email: 'a@b.com', senha: 'Adubo#2026' };
    assert.equal(RegistroSchema.safeParse({ ...cadastro, estado: 'PR' }).success, false);
    assert.equal(RegistroSchema.safeParse({ ...cadastro, estado: 'SC' }).success, true);
    assert.equal(CriarFazendaSchema.safeParse({ nome: 'Sede', municipio: 'Curitiba', uf: 'PR' }).success, false);
    assert.equal(
      CriarFeedbackSchema.safeParse({ nome: 'Fulano', telefone: '54999999999', uf: 'PR', cidade: 'Curitiba', descricao: 'Algo deu errado aqui.' }).success,
      false,
    );
    assert.equal(LocalizacaoSchema.safeParse({ uf: 'RS', cidade: 'Ibirubá' }).success, true);
    assert.equal(LocalizacaoSchema.safeParse({ uf: 'RS', cidade: '' }).success, false);
  });
});

test('Perfil regional (localidade preferencial)', async (t) => {
  await t.test('aceita cidade + RS/SC', () => {
    assert.equal(LocalidadePreferencialSchema.safeParse({ cidade: 'Chapecó', estado: 'SC' }).success, true);
  });
  await t.test('rejeita estado fora de RS/SC e cidade vazia', () => {
    assert.equal(LocalidadePreferencialSchema.safeParse({ cidade: 'Londrina', estado: 'PR' }).success, false);
    assert.equal(LocalidadePreferencialSchema.safeParse({ cidade: ' ', estado: 'RS' }).success, false);
  });
});
