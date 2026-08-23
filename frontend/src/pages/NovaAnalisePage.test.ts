import { describe, expect, test } from 'vitest';
import { isCellEnabled, type LinhaAmostra } from './NovaAnalisePage';
import { CalagemSchema } from '../schemas/calagemSchema';

/**
 * A "Inserção Rápida de Lotes" reimplementa, em isCellEnabled, a mesma regra
 * de campos condicionais da calculadora (ver docs/ref-calagem.md §9), só que
 * habilitando/desabilitando células da planilha em vez de blocos JSX. Um bug
 * (property name `primeira_calagem` vs `primeiraCalagem`, e a condição de
 * `v_atual` invertida) fazia o toggle "1ª Calagem/Reaplicação" não ter efeito
 * algum e travava o preenchimento de `v_atual` em PD Consolidado + reaplicação
 * + pH baixo + SMP alto, mesmo sendo exigido pelo CalagemSchema no envio.
 *
 * Este teste garante que nenhuma célula fique desabilitada para um campo que
 * o schema (fonte de verdade real, validada no submit) exige — se isso
 * acontecer, o lote nunca consegue ser salvo e não há como corrigir pela UI.
 */

const SISTEMAS = ['CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO'] as const;
const PRIMEIRA_CALAGEM = [true, false];
const SMPS = [5.0, 6.5];
const PHS = [5.0, 6.0];
const CAMPOS_CONDICIONAIS: Array<keyof LinhaAmostra> = ['v_atual', 'ctc', 'al_sat', 'mo', 'al_trocavel'];

function linha(ph: number, smp: number): LinhaAmostra {
  return {
    id: 'x',
    talhao_id: 't',
    identificacao: 'Amostra 1',
    ph: String(ph),
    smp: String(smp),
    mo: '',
    al_trocavel: '',
    v_atual: '',
    ctc: '',
    al_sat: '',
    argila: '',
    p: '',
    k: '',
    ca: '',
    mg: '',
    s: '',
    cu: '',
    zn: '',
    b: '',
    mn: '',
  };
}

function exigidoPeloSchema(
  campo: keyof LinhaAmostra,
  sistemaManejo: (typeof SISTEMAS)[number],
  primeiraCalagem: boolean,
  smp: number,
  ph: number
): boolean {
  // Preenche um payload mínimo válido, exceto pelo campo sob teste (deixado
  // de fora), e verifica se o zod acusa ESSE campo especificamente como
  // faltante — ou seja, pergunta ao schema real "isto é obrigatório aqui?".
  const base: Record<string, unknown> = {
    sistema_manejo: sistemaManejo,
    primeira_calagem: primeiraCalagem,
    pH_agua: ph,
    SMP: smp,
    PRNT: 90,
  };
  const campoParaSchema: Record<string, string> = {
    v_atual: 'V_atual',
    ctc: 'CTC_pH7',
    al_sat: 'Al_sat',
    mo: 'MO',
    al_trocavel: 'Al_trocavel',
  };
  const resultado = CalagemSchema.safeParse(base);
  if (resultado.success) return false;
  return resultado.error.issues.some((i) => i.path[0] === campoParaSchema[campo]);
}

describe('isCellEnabled (Inserção Rápida de Lotes) não pode bloquear campo exigido pelo CalagemSchema', () => {
  for (const sistemaManejo of SISTEMAS) {
    for (const primeiraCalagem of PRIMEIRA_CALAGEM) {
      for (const smp of SMPS) {
        for (const ph of PHS) {
          const tipo = primeiraCalagem ? 'primeira calagem' : 'reaplicação';
          test(`${sistemaManejo} · ${tipo} · SMP=${smp} · pH=${ph}`, () => {
            const configGlobais = { sistemaManejo, primeiraCalagem };
            const l = linha(ph, smp);
            for (const campo of CAMPOS_CONDICIONAIS) {
              const exigido = exigidoPeloSchema(campo, sistemaManejo, primeiraCalagem, smp, ph);
              if (exigido) {
                expect(
                  isCellEnabled('CALAGEM', campo, l, configGlobais),
                  `campo "${campo}" é exigido pelo CalagemSchema mas a célula está desabilitada`
                ).toBe(true);
              }
            }
          });
        }
      }
    }
  }
});
