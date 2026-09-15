import { test, expect, type Page } from '@playwright/test';

/**
 * Matriz de verificação dos blocos condicionais da Calculadora de Calagem
 * (B1 — Saturação por Bases, B2 — Trava do PD Consolidado, B3 — Método
 * Polinomial).
 *
 *   B1 aparece  <=>  SMP <= 6.3 (método roteado = SMP)
 *   B2 aparece  <=>  sistema = PD_CONSOLIDADO  E  pH_agua < 5.5
 *   B3 aparece  <=>  SMP > 6.3 (método roteado = POLINOMIAL)
 *
 * O campo "Tipo de Aplicação" (Primeira calagem / Reaplicação) foi removido
 * da interface — todo cálculo é tratado como reaplicação por padrão (ver
 * docs/diagnostico-primeira-calagem-metodo-smp.md), então B1 agora depende
 * só do método roteado pelo SMP.
 */

const SISTEMAS = ['CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO'] as const;
const SMP_BAIXO = 5.0; // <= 6.3 -> método SMP
const SMP_ALTO = 6.5; // > 6.3  -> método Polinomial
const PH_BAIXO = 5.0; // < 5.5
const PH_ALTO = 6.0; // >= 5.5

async function configurarFormulario(
  page: Page,
  opts: { sistema: string; ph: number; smp: number }
) {
  await page.goto('/');
  await page.locator('select[name="sistema_manejo"]').selectOption(opts.sistema);
  await page.locator('input[name="pH_agua"]').fill(String(opts.ph));
  await page.locator('input[name="SMP"]').fill(String(opts.smp));
  // dá tempo para os watchers do react-hook-form re-renderizarem os blocos
  await page.waitForTimeout(150);
}

async function blocosVisiveis(page: Page) {
  const texto = await page.locator('body').innerText();
  return {
    b1: texto.includes('Bloco B1'),
    b2: texto.includes('Bloco B2'),
    b3: texto.includes('Bloco B3'),
  };
}

test.describe('Regressão: "Tipo de Aplicação" não deve mais existir na tela', () => {
  test('o select "primeira_calagem" foi removido do formulário', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('select[name="primeira_calagem"]')).toHaveCount(0);
  });
});

test.describe('Blocos condicionais da calculadora de calagem', () => {
  for (const sistema of SISTEMAS) {
    for (const smp of [SMP_BAIXO, SMP_ALTO]) {
      for (const ph of [PH_BAIXO, PH_ALTO]) {
        const label = `${sistema} · pH=${ph} · SMP=${smp}`;

        test(label, async ({ page }) => {
          await configurarFormulario(page, { sistema, ph, smp });
          const { b1, b2, b3 } = await blocosVisiveis(page);

          const esperadoB1 = smp <= 6.3;
          const esperadoB2 = sistema === 'PD_CONSOLIDADO' && ph < 5.5;
          const esperadoB3 = smp > 6.3;

          expect(b1, 'Bloco B1 (Saturação por Bases)').toBe(esperadoB1);
          expect(b2, 'Bloco B2 (Trava PD Consolidado)').toBe(esperadoB2);
          expect(b3, 'Bloco B3 (Método Polinomial)').toBe(esperadoB3);
        });
      }
    }
  }
});
