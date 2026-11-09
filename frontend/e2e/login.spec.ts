import { test, expect } from '@playwright/test';

/**
 * AUD-03: a tela de login de produção vinha com e-mail e senha de uma conta
 * de teste já preenchidos. Os campos devem abrir vazios.
 */

test('login abre com e-mail e senha vazios', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: { erro: 'sem sessão' } }));
  await page.goto('/login');

  await expect(page.locator('[name="email"]')).toHaveValue('');
  await expect(page.locator('[name="senha"]')).toHaveValue('');
});
