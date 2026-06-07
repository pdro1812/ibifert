import { tabelaSmpLookup } from './tabelaSmp';

export interface StandaloneResult {
  dose_recomendada: number;
  modo_aplicacao: 0 | 1 | null; // 0: Superficial, 1: Incorporado
  erro: number | null;
  msg: string;
}

function choicesModoAplicacao(modo: number | null): string {
  if (modo === 0) return 'Superficial';
  if (modo === 1) return 'Incorporado';
  return '';
}

/**
 * Função 2: obtem_dose_convencional
 */
export function obtemDoseConvencional(
  ph_0_20: number,
  smp_0_20: number,
  ph_referencia_informado: number,
  prnt: number | null
): StandaloneResult {
  if (ph_0_20 >= 5.5) {
    return {
      dose_recomendada: 0,
      msg: 'Não é necessária a correção de acidez do solo na área analisada, pois o pH informado é igual ou superior a 5,5.',
      modo_aplicacao: null,
      erro: null,
    };
  }

  // ph_referencia deve ser 5.5, 6.0 ou 6.5 para a tabela
  const phAlvo = (ph_referencia_informado === 6) ? 6.0 : ph_referencia_informado as any;
  let dose = tabelaSmpLookup(smp_0_20, phAlvo);

  if (prnt !== null && prnt > 0) {
    dose = (dose * 100) / prnt;
  }

  const modo_aplicacao = 1;
  return {
    dose_recomendada: dose,
    modo_aplicacao,
    erro: null,
    msg: `Aplicar ${dose.toFixed(3)} toneladas de calcário por hectare no modo ${choicesModoAplicacao(modo_aplicacao)}`,
  };
}

/**
 * Função 3: obtem_dose_direto_implantacao
 */
export function obtemDoseDiretoImplantacao(
  ph_0_20: number,
  smp_0_20: number,
  ph_referencia_informado: number,
  prnt: number | null
): StandaloneResult {
  if (ph_0_20 >= 5.5) {
    return {
      dose_recomendada: 0,
      msg: 'Não é necessária a correção de acidez do solo na área analisada, pois o pH informado é igual ou superior a 5,5.',
      modo_aplicacao: null,
      erro: null,
    };
  }

  const phAlvo = (ph_referencia_informado === 6) ? 6.0 : ph_referencia_informado as any;
  let dose = tabelaSmpLookup(smp_0_20, phAlvo);

  if (prnt !== null && prnt > 0) {
    dose = (dose * 100) / prnt;
  }

  const modo_aplicacao = 1;
  return {
    dose_recomendada: dose,
    modo_aplicacao,
    erro: null,
    msg: `Com base nas informações fornecidas, a recomendação é aplicar ${dose.toFixed(3)} t ha-1 de calcário, de modo ${choicesModoAplicacao(modo_aplicacao)}`,
  };
}

/**
 * Função 4: obtem_dose_direto_consolidado_sem_restricao
 */
export function obtemDoseDiretoConsolidadoSemRestricao(
  ph_0_10: number,
  saturacao_base_0_10: number,
  saturacao_aluminio_0_10: number,
  smp_0_10: number,
  ph_referencia_informado: number,
  prnt: number | null
): StandaloneResult {
  if (ph_0_10 >= 5.5 && saturacao_base_0_10 >= 65 && saturacao_aluminio_0_10 < 10) {
    return {
      dose_recomendada: 0,
      msg: 'Não é necessária a aplicação de corretivo de acidez do solo na área analisada, pois os valores de pH, saturação por alumínio e saturação por bases não trazem indícios de acidez no solo.',
      modo_aplicacao: null,
      erro: null,
    };
  }

  const phAlvo = (ph_referencia_informado === 6) ? 6.0 : ph_referencia_informado as any;
  let dose = tabelaSmpLookup(smp_0_10, phAlvo);

  dose = dose / 4;

  if (prnt !== null && prnt > 0) {
    dose = (dose * 100) / prnt;
  }

  const modo_aplicacao = 0;
  return {
    dose_recomendada: dose,
    modo_aplicacao,
    erro: null,
    msg: `Com base nas informações fornecidas, a recomendação é aplicar ${dose.toFixed(3)} t ha-1 de calcário, de modo ${choicesModoAplicacao(modo_aplicacao)}`,
  };
}

/**
 * Função 5: obtem_dose_direto_consolidado_com_restricao
 */
export function obtemDoseDiretoConsolidadoComRestricao(
  ph_10_20: number,
  saturacao_aluminio_10_20: number,
  smp_10_20: number,
  ph_referencia_informado: number,
  prnt: number | null
): StandaloneResult {
  if (ph_10_20 >= 5.5 && saturacao_aluminio_10_20 <= 30) {
    return {
      dose_recomendada: 0,
      msg: 'Não é necessária a aplicação de corretivo de acidez do solo na área analisada, pois a saturação de alumínio se encontra igual ou inferior a 30% e o pH se encontra igual ou superior a 5,5. Verifique a condição da área novamente.',
      modo_aplicacao: null,
      erro: null,
    };
  }

  const phAlvo = (ph_referencia_informado === 6) ? 6.0 : ph_referencia_informado as any;
  let dose = tabelaSmpLookup(smp_10_20, phAlvo);

  if (prnt !== null && prnt > 0) {
    dose = (dose * 100) / prnt;
  }

  const modo_aplicacao = 1;
  return {
    dose_recomendada: dose,
    modo_aplicacao,
    erro: null,
    msg: `Com base nas informações fornecidas, a recomendação é aplicar ${dose.toFixed(3)} t ha-1 de calcário, de modo ${choicesModoAplicacao(modo_aplicacao)}`,
  };
}
