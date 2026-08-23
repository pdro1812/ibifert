import { test, expect, type Page } from '@playwright/test';

/**
 * Matriz de verificação dos blocos condicionais da Calculadora de Calagem
 * (B1 — Saturação por Bases, B2 — Trava do PD Consolidado, B3 — Método
 * Polinomial), contra a regra escrita em docs_antigos/regras_calagem_graos_v2.md:
 *
 *   B1 aparece  <=>  NÃO é primeira calagem  E  SMP <= 6.3 (método roteado = SMP)
 *   B2 aparece  <=>  sistema = PD_CONSOLIDADO  E  pH_agua < 5.5
 *   B3 aparece  <=>  SMP > 6.3 (método roteado = POLINOMIAL)
 *
 * As expectativas abaixo são escritas independentemente do código-fonte da
 * tela, a partir da spec de negócio — se a implementação divergir da regra
 * (como aconteceu com o bug do campo "Tipo de Aplicação" virando
 * "Reaplicação" sozinho), este teste falha.
 */

const SISTEMAS = ['CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO'] as const;
const PRIMEIRA_CALAGEM = [true, false] as const;
const SMP_BAIXO = 5.0; // <= 6.3 -> método SMP
const SMP_ALTO = 6.5; // > 6.3  -> método Polinomial
const PH_BAIXO = 5.0; // < 5.5
const PH_ALTO = 6.0; // >= 5.5

async function configurarFormulario(
  page: Page,
  opts: { sistema: string; primeiraCalagem: boolean; ph: number; smp: number }
) {
  await page.goto('/');
  await page.locator('select[name="sistema_manejo"]').selectOption(opts.sistema);
  await page
    .locator('select[name="primeira_calagem"]')
    .selectOption(opts.primeiraCalagem ? 'true' : 'false');
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

test.describe('Regressão: valor padrão de "Tipo de Aplicação" não deve corromper ao montar', () => {
  // Este caso reproduz o bug original: o usuário NUNCA interage com os
  // selects "Sistema de Manejo" nem "Tipo de Aplicação" (ambos ficam no
  // valor padrão "Convencional" / "Primeira calagem"), preenchendo apenas
  // pH e SMP — igual ao fluxo real que expôs o defeito de setValueAs
  // recebendo o defaultValue booleano em vez de string.
  test('sem tocar nos selects, "Primeira calagem" deve permanecer true (sem Bloco B1)', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[name="pH_agua"]').fill('4');
    await page.locator('input[name="SMP"]').fill('4');
    await page.waitForTimeout(150);

    await expect(page.locator('select[name="primeira_calagem"]')).toHaveValue('true');
    const texto = await page.locator('body').innerText();
    expect(texto.includes('Bloco B1'), 'Bloco B1 não deveria aparecer em primeira calagem').toBe(false);
  });
});

test.describe('Blocos condicionais da calculadora de calagem', () => {
  for (const sistema of SISTEMAS) {
    for (const primeiraCalagem of PRIMEIRA_CALAGEM) {
      for (const smp of [SMP_BAIXO, SMP_ALTO]) {
        for (const ph of [PH_BAIXO, PH_ALTO]) {
          const tipoCalagem = primeiraCalagem ? 'primeira calagem' : 'reaplicação';
          const label = `${sistema} · ${tipoCalagem} · pH=${ph} · SMP=${smp}`;

          test(label, async ({ page }) => {
            await configurarFormulario(page, { sistema, primeiraCalagem, ph, smp });
            const { b1, b2, b3 } = await blocosVisiveis(page);

            const esperadoB1 = !primeiraCalagem && smp <= 6.3;
            const esperadoB2 = sistema === 'PD_CONSOLIDADO' && ph < 5.5;
            const esperadoB3 = smp > 6.3;

            expect(b1, 'Bloco B1 (Saturação por Bases)').toBe(esperadoB1);
            expect(b2, 'Bloco B2 (Trava PD Consolidado)').toBe(esperadoB2);
            expect(b3, 'Bloco B3 (Método Polinomial)').toBe(esperadoB3);
          });
        }
      }
    }
  }
});
