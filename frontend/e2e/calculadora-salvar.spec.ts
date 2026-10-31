import { test, expect, type Page } from '@playwright/test';

/**
 * ALT-014: o resultado da calculadora é temporário até o usuário clicar em
 * "Salvar no histórico". API e IBGE simulados.
 */

const RESULTADO_CALAGEM = {
  sucesso: true,
  id: 'calculo-123',
  resultado: { aplicar_calcario: true, NC_final: 2.9, NC_ajustada: 3.22, metodo_calc_roteado: 'SMP', alertas: [] },
};

async function prepararApis(page: Page, logado: boolean) {
  const salvamentos: Array<{ url: string; corpo: unknown }> = [];
  await page.route('https://servicodados.ibge.gov.br/**', (route) =>
    route.fulfill({ json: [{ id: 1, nome: 'Ibirubá' }, { id: 2, nome: 'Concórdia' }] })
  );
  await page.route('**/api/auth/me', (route) =>
    logado
      ? route.fulfill({ json: { usuario: { id: 'u1', nome: 'Ana', email: 'a@b.com', role: 'PRODUTOR', cidade: 'Concórdia', estado: 'SC' } } })
      : route.fulfill({ status: 401, json: { erro: 'sem sessão' } })
  );
  await page.route('**/api/analises/calcular', (route) => route.fulfill({ json: RESULTADO_CALAGEM }));
  await page.route('**/api/analises/*/salvar', (route, request) => {
    salvamentos.push({ url: request.url(), corpo: request.postDataJSON() });
    return route.fulfill({ status: 201, json: { sucesso: true, id: 'calculo-123' } });
  });
  return salvamentos;
}

async function calcularCalagem(page: Page) {
  await page.getByRole('button', { name: /Apenas Calagem/ }).click();
  await page.locator('[name="sistema_manejo"]').selectOption('CONVENCIONAL');
  await page.locator('[name="PRNT"]').fill('90');
  await page.locator('[name="pH_agua"]').fill('5');
  await page.locator('[name="SMP"]').fill('5');
  await page.locator('[name="V_atual"]').fill('50');
  await page.locator('[name="CTC_pH7"]').fill('10');
  await page.locator('label', { hasText: 'Li e concordo' }).locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: /^Calcular Calagem/ }).click();
  await expect(page.getByText('3.22')).toBeVisible();
}

test('logado: resultado começa temporário e vai ao histórico só ao salvar', async ({ page }) => {
  const salvamentos = await prepararApis(page, true);
  await page.goto('/');
  // Localização vem do perfil regional
  await expect(page.getByRole('combobox').first()).toHaveValue('SC');
  await calcularCalagem(page);

  await expect(page.getByTestId('selo-temporario')).toBeVisible();
  expect(salvamentos).toHaveLength(0);

  await page.locator('#data-analise').fill('2026-10-15');
  await page.getByRole('button', { name: /Salvar no histórico/ }).click();
  await expect(page.getByTestId('selo-salvo')).toBeVisible();
  expect(salvamentos).toHaveLength(1);
  expect(salvamentos[0].url).toContain('/api/analises/calculo-123/salvar');
  expect(salvamentos[0].corpo).toEqual({ data_analise: '2026-10-15' });
  await expect(page.getByRole('button', { name: /^Salvo$/ })).toBeDisabled();
});

test('sem login: "Salvar no histórico" leva ao login guardando o cálculo', async ({ page }) => {
  await prepararApis(page, false);
  await page.goto('/');
  await calcularCalagem(page);
  await expect(page.getByTestId('selo-temporario')).toBeVisible();

  await page.getByRole('button', { name: /Salvar no histórico/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  const pendente = await page.evaluate(() => JSON.parse(sessionStorage.getItem('analisePendente') ?? 'null'));
  expect(pendente).toMatchObject({ id: 'calculo-123', destino: '/' });
});
