import { test, expect, type Page, type Request } from '@playwright/test';

/**
 * ALT-005 / ALT-007: um bloco de localização só, usado pelos dois motores,
 * e dados preservados ao alternar entre "Apenas Calagem", "Apenas Adubação"
 * e "Calagem + Adubação".
 *
 * A API e o IBGE são simulados — o que interessa aqui é o formulário: os
 * campos voltam preenchidos, os resultados continuam na tela e o payload
 * enviado ao motor de calagem é idêntico antes e depois das trocas (nenhum
 * campo de bloco oculto vaza para o cálculo).
 */

const RESULTADO_CALAGEM = {
  sucesso: true,
  resultado: {
    aplicar_calcario: true,
    NC_final: 2.9,
    NC_ajustada: 3.22,
    metodo_calc_roteado: 'SMP',
    alertas: [],
  },
};

const RESULTADO_ADUBACAO = {
  resultado: {
    classificacao_solo: { argila_classe: '2', mo_classe: 'medio', ctc_classe: 'medio', p_classe: 'medio', k_classe: 'alto' },
    recomendacao: {
      n: { dose_total_kg_ha: 40, tipo: 'Base' },
      p2o5: { dose_total_kg_ha: 90, tipo_adubacao: 'Manutenção' },
      k2o: { dose_total_kg_ha: 60, k2o_semeadura_kg_ha: 60, k2o_complementar_kg_ha: 0, tipo_adubacao: 'Manutenção' },
    },
    alertas: [
      { nivel: 'AVISO', codigo: 'MICROS_Zn_BAIXO', mensagem: 'Zn em nível Baixo. Avaliar aplicação conforme recomendação específica da cultura.' },
      { nivel: 'AVISO', codigo: 'CA_BAIXO', mensagem: 'Cálcio em nível Baixo. Avaliar calagem.' },
    ],
  },
};

async function prepararApis(page: Page) {
  const corposCalagem: unknown[] = [];
  await page.route('https://servicodados.ibge.gov.br/**', (route) =>
    route.fulfill({ json: [{ id: 1, nome: 'Ibirubá' }, { id: 2, nome: 'Cruz Alta' }] })
  );
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: { erro: 'sem sessão' } }));
  await page.route('**/api/analises/calcular', (route, request: Request) => {
    corposCalagem.push(request.postDataJSON());
    return route.fulfill({ json: RESULTADO_CALAGEM });
  });
  await page.route('**/api/adubacao/calcular', (route) => route.fulfill({ json: RESULTADO_ADUBACAO }));
  return corposCalagem;
}

const campo = (page: Page, nome: string) => page.locator(`[name="${nome}"]`);
const modo = (page: Page, titulo: string) => page.getByRole('button', { name: new RegExp(titulo) });

async function preencherAmbos(page: Page) {
  await campo(page, 'sistema_manejo').selectOption('CONVENCIONAL');
  await campo(page, 'PRNT').fill('90');
  await campo(page, 'pH_agua').fill('5');
  await campo(page, 'SMP').fill('5');
  await campo(page, 'MO').fill('2.5');
  await campo(page, 'CTC_pH7').fill('10');
  await campo(page, 'V_atual').fill('50');
  await campo(page, 'argila').fill('35');
  await campo(page, 'P').fill('8');
  await campo(page, 'K').fill('120');
  await campo(page, 'Ca').fill('4');
  await campo(page, 'Mg').fill('1.5');
  await campo(page, 'Zn').fill('0.1');
  await campo(page, 'cultura').selectOption('feijao');
  await campo(page, 'rendimento_esperado').fill('3');
  await page.locator('label', { hasText: 'Li e concordo' }).locator('input[type="checkbox"]').check();
}

test.describe('Calculadora: localização única e troca de modo', () => {
  test('a localização aparece também em "Apenas Adubação"', async ({ page }) => {
    await prepararApis(page);
    await page.goto('/');
    await modo(page, 'Apenas Adubação').click();
    await expect(page.getByText('Identificação e Localização')).toBeVisible();
    await expect(page.getByRole('combobox').first()).toHaveValue('RS');
    await expect(page.locator('select option', { hasText: /^UF$/ })).toHaveCount(0);
  });

  test('campos e resultados sobrevivem a várias trocas de modo, sem alterar o cálculo', async ({ page }) => {
    const corposCalagem = await prepararApis(page);
    await page.goto('/');
    await preencherAmbos(page);
    await page.getByRole('button', { name: /Calcular Calagem \+ Adubação/ }).click();

    await expect(page.getByText('3.22')).toBeVisible();
    await expect(page.getByTestId('secao-micronutrientes')).toContainText('Zinco (Zn)');
    await expect(page.getByTestId('secao-alertas')).toContainText('Cálcio em nível Baixo');

    for (const titulo of ['Apenas Calagem', 'Apenas Adubação', 'Calagem \\+ Adubação', 'Apenas Adubação', 'Apenas Calagem']) {
      await modo(page, titulo).click();
      await page.waitForTimeout(100);
    }

    // Em "Apenas Calagem": campos da calagem e compartilhados preenchidos,
    // resultado ainda na tela e sem aviso de desatualizado.
    await expect(campo(page, 'PRNT')).toHaveValue('90');
    await expect(campo(page, 'pH_agua')).toHaveValue('5');
    await expect(campo(page, 'V_atual')).toHaveValue('50');
    await expect(page.getByText('3.22')).toBeVisible();
    await expect(page.getByTestId('aviso-desatualizado')).toHaveCount(0);

    // Recalcular em "Apenas Calagem" manda exatamente o mesmo payload.
    await page.getByRole('button', { name: /^Calcular Calagem/ }).click();
    await expect.poll(() => corposCalagem.length).toBe(2);
    expect(corposCalagem[1]).toEqual(corposCalagem[0]);

    // Volta para "Ambos": os campos da adubação continuam lá.
    await modo(page, 'Calagem \\+ Adubação').click();
    await expect(campo(page, 'argila')).toHaveValue('35');
    await expect(campo(page, 'P')).toHaveValue('8');
    await expect(campo(page, 'Zn')).toHaveValue('0.1');
    await expect(campo(page, 'cultura')).toHaveValue('feijao');
    await expect(campo(page, 'MO')).toHaveValue('2.5');
    await expect(page.getByTestId('secao-macronutrientes')).toBeVisible();
  });

  test('mudar um dado depois do cálculo avisa que o resultado está desatualizado', async ({ page }) => {
    await prepararApis(page);
    await page.goto('/');
    await preencherAmbos(page);
    await page.getByRole('button', { name: /Calcular Calagem \+ Adubação/ }).click();
    await expect(page.getByText('3.22')).toBeVisible();
    await expect(page.getByTestId('aviso-desatualizado')).toHaveCount(0);

    await campo(page, 'PRNT').fill('80');
    await expect(page.getByTestId('aviso-desatualizado')).toHaveCount(1);

    await campo(page, 'PRNT').fill('90');
    await expect(page.getByTestId('aviso-desatualizado')).toHaveCount(0);
  });
});
