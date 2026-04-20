// backend/src/services/motorCalagem.ts

import { CalagemSchema, EntradaCalagem } from '../schemas/calagemSchema';
import {
  aplicarClampingSuperficial,
  aplicarFracionamento,
  aplicarPrnt,
  calcularMediaSmp,
  soloSuperficialAtingiuMeta,
} from './calculadoraCalagem';
import { calcularNcViaPolinomio, calcularNcViaTabelaSmp } from './tabelaSmp';
import { coletarWarningsLaboratoriais, Alerta } from './warnings';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

export interface RespostaSucesso {
  sucesso: true;
  versao_regra: string;
  sistema_manejo: string;
  estado_motor: string;
  necessita_calagem: boolean;
  modo_aplicacao: string;
  metodo_nc_utilizado: string;
  dose_base_prnt100_t_ha: number;
  prnt_utilizado_pct: number;
  dose_final_t_ha: number;
  mensagem_principal: string;
  alertas: Alerta[];
  auditoria: Record<string, unknown>;
}

interface RespostaErro {
  sucesso: false;
  versao_regra: string;
  codigo_erro: string;
  mensagem: string;
  detalhes: Array<{ campo: string; problema: string }>;
}

export type RespostaMotor = RespostaSucesso | RespostaErro;

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

/**
 * Ordena amostras por profundidade para que o motor não dependa da ordem
 * do array enviado pelo cliente. Garante também o default de prnt_pct.
 */
function normalizarEntrada(dados: EntradaCalagem): EntradaCalagem {
  const ORDEM_PROFUNDIDADE: Record<string, number> = { '0-20': 0, '0-10': 1, '10-20': 2 };
  return {
    ...dados,
    prnt_pct: dados.prnt_pct ?? 100,
    amostras: [...dados.amostras].sort(
      (a, b) => (ORDEM_PROFUNDIDADE[a.profundidade] ?? 99) - (ORDEM_PROFUNDIDADE[b.profundidade] ?? 99)
    ),
  };
}

/**
 * Transforma o array de amostras em um mapa indexado por profundidade
 * para acesso seguro e sem dependência de posição.
 */
function indexarAmostrasPorProfundidade(dados: EntradaCalagem) {
  return Object.fromEntries(dados.amostras.map((a) => [a.profundidade, a]));
}

// ---------------------------------------------------------------------------
// Geradores de resposta
// ---------------------------------------------------------------------------

function montarRespostaErro(
  versao_regra: string,
  codigo_erro: string,
  mensagem: string,
  detalhes: Array<{ campo: string; problema: string }>
): RespostaErro {
  return { sucesso: false, versao_regra, codigo_erro, mensagem, detalhes };
}

function montarRespostaSucesso(
  dados: EntradaCalagem,
  campos: {
    estado_motor: string;
    necessita_calagem: boolean;
    modo_aplicacao: string;
    metodo_nc_utilizado: string;
    dose_base: number;
    alertas: Alerta[];
    auditoria: Record<string, unknown>;
  }
): RespostaSucesso {
  const { estado_motor, necessita_calagem, modo_aplicacao, metodo_nc_utilizado, dose_base, alertas, auditoria } = campos;
  const prnt_pct = dados.prnt_pct ?? 100;
  const dose_final_t_ha = aplicarPrnt(dose_base, prnt_pct);

  return {
    sucesso: true,
    versao_regra: dados.versao_regra,
    sistema_manejo: dados.sistema_manejo,
    estado_motor,
    necessita_calagem,
    modo_aplicacao,
    metodo_nc_utilizado,
    dose_base_prnt100_t_ha: dose_base,
    prnt_utilizado_pct: prnt_pct,
    dose_final_t_ha,
    mensagem_principal: necessita_calagem
      ? `Calagem recomendada: ${dose_final_t_ha} t/ha (${modo_aplicacao})`
      : 'Solo não necessita de calagem.',
    alertas,
    auditoria: {
      ...auditoria,
      dose_antes_prnt_t_ha: dose_base,
    },
  };
}

// ---------------------------------------------------------------------------
// Lógica interna de seleção de método NC para rotas 0-20
// ---------------------------------------------------------------------------

function selecionarMetodoNc020(
  amostra: EntradaCalagem['amostras'][number],
  auditoria: Record<string, unknown>
): { dose: number; metodo: string } {
  if (
    amostra.indice_smp > 6.3 &&
    amostra.mo_pct !== undefined &&
    amostra.al_cmolc_dm3 !== undefined
  ) {
    const regras = (auditoria.regras_disparadas as string[]);
    regras.push('POLINOMIO_SMP_MAIOR_6_3');
    return {
      dose: calcularNcViaPolinomio(amostra.mo_pct, amostra.al_cmolc_dm3, 6.0),
      metodo: 'POLINOMIAL_BAIXO_TAMPAO',
    };
  }
  return {
    dose: calcularNcViaTabelaSmp(amostra.indice_smp, 6.0),
    metodo: 'TABELA_SMP_5_2',
  };
}

// ---------------------------------------------------------------------------
// Resolvedores por sistema de manejo
// ---------------------------------------------------------------------------

function resolverEstadoConvencional(
  dados: EntradaCalagem,
  amostras: ReturnType<typeof indexarAmostrasPorProfundidade>,
  alertas: Alerta[],
  auditoria: Record<string, unknown>
): RespostaSucesso {
  const amostra = dados.amostras[0];
  auditoria.amostra_decisoria = amostra.profundidade;
  auditoria.smp_usado_calculo = amostra.indice_smp;
  auditoria.ph_usado_decisao = amostra.ph;

  const { dose, metodo } = selecionarMetodoNc020(amostra, auditoria);

  const estado_motor = dose > 0 ? 'CONV_CALAGEM_INCORPORADA' : 'CONV_SEM_CALAGEM';
  const necessita_calagem = dose > 0;
  const modo_aplicacao = dose > 0 ? 'INCORPORADO' : 'NENHUM';

  return montarRespostaSucesso(dados, {
    estado_motor,
    necessita_calagem,
    modo_aplicacao,
    metodo_nc_utilizado: metodo,
    dose_base: dose,
    alertas,
    auditoria,
  });
}

function resolverEstadoPDImplantacao(
  dados: EntradaCalagem,
  amostras: ReturnType<typeof indexarAmostrasPorProfundidade>,
  alertas: Alerta[],
  auditoria: Record<string, unknown>
): RespostaSucesso {
  const amostra = dados.amostras[0];
  auditoria.amostra_decisoria = amostra.profundidade;
  auditoria.smp_usado_calculo = amostra.indice_smp;
  auditoria.ph_usado_decisao = amostra.ph;

  const { dose: doseInicial, metodo } = selecionarMetodoNc020(amostra, auditoria);

  if (doseInicial <= 0) {
    return montarRespostaSucesso(dados, {
      estado_motor: 'PDI_SEM_CALAGEM',
      necessita_calagem: false,
      modo_aplicacao: 'NENHUM',
      metodo_nc_utilizado: metodo,
      dose_base: 0,
      alertas,
      auditoria,
    });
  }

  if (dados.modo_implantacao_pd === 'CAMPO_NATURAL_SUPERFICIAL') {
    // Fracionamento 0,25: conservador para não comprometer a pastagem
    const doseFracionada = aplicarFracionamento(doseInicial, 0.25);
    const doseClamped = aplicarClampingSuperficial(doseFracionada);
    auditoria.fracionamento_superficial = 0.25;
    auditoria.clamping_superficial_aplicado = doseFracionada > doseClamped || doseFracionada > 5.0;

    return montarRespostaSucesso(dados, {
      estado_motor: 'PDI_CALAGEM_SUPERFICIAL_CAMPO_NATURAL',
      necessita_calagem: true,
      modo_aplicacao: 'SUPERFICIAL',
      metodo_nc_utilizado: metodo,
      dose_base: doseClamped,
      alertas,
      auditoria,
    });
  }

  return montarRespostaSucesso(dados, {
    estado_motor: 'PDI_CALAGEM_INCORPORADA',
    necessita_calagem: true,
    modo_aplicacao: 'INCORPORADO',
    metodo_nc_utilizado: metodo,
    dose_base: doseInicial,
    alertas,
    auditoria,
  });
}

function resolverEstadoPDConsolidado(
  dados: EntradaCalagem,
  amostras: ReturnType<typeof indexarAmostrasPorProfundidade>,
  alertas: Alerta[],
  auditoria: Record<string, unknown>
): RespostaSucesso {
  const amostra010 = amostras['0-10']!;
  const amostra1020 = amostras['10-20']!;

  auditoria.ph_usado_decisao = amostra010.ph;
  auditoria.smp_usado_calculo = amostra010.indice_smp;

  // ── Estado PDC_SEM_CALAGEM_PH ────────────────────────────────────────────
  // Critério: ph >= 6.0 na camada 0-10 indica que o solo já está
  // adequadamente corrigido em termos de reação, dispensando calagem
  // independentemente de V% e m%. Verificado ANTES da trava V/m por ser
  // uma condição mais objetiva e menos sujeita a variação amostral.
  //
  // REVISÃO AGRONÔMICA RECOMENDADA: confirmar limiar 6.0 com especialista
  // para culturas específicas (soja pode exigir 6.2, por exemplo).
  // ────────────────────────────────────────────────────────────────────────
  if (amostra010.ph >= 6.0) {
    (auditoria.regras_disparadas as string[]).push('PDC_PH_ADEQUADO');
    return montarRespostaSucesso(dados, {
      estado_motor: 'PDC_SEM_CALAGEM_PH',
      necessita_calagem: false,
      modo_aplicacao: 'NENHUM',
      metodo_nc_utilizado: 'TABELA_SMP_5_2',
      dose_base: 0,
      alertas,
      auditoria,
    });
  }

  // ── Estado PDC_SEM_CALAGEM_TRAVA_V_M ────────────────────────────────────
  if (soloSuperficialAtingiuMeta(amostra010.v_pct, amostra010.m_pct)) {
    (auditoria.regras_disparadas as string[]).push('TRAVA_SUPERFICIAL_ATINGIDA');
    return montarRespostaSucesso(dados, {
      estado_motor: 'PDC_SEM_CALAGEM_TRAVA_V_M',
      necessita_calagem: false,
      modo_aplicacao: 'NENHUM',
      metodo_nc_utilizado: 'TABELA_SMP_5_2',
      dose_base: 0,
      alertas,
      auditoria,
    });
  }

  // ── Estado PDC_CENARIO_REINICIO_PD ──────────────────────────────────────
  const subsoloRestritivo = amostra1020.m_pct !== undefined && amostra1020.m_pct > 10;

  if (subsoloRestritivo) {
    (auditoria.regras_disparadas as string[]).push('PDC_SUBSOLO_RESTRITIVO');
    alertas.push({
      codigo: 'W001',
      nivel: 'warning',
      mensagem: 'Cenário de reinício sugerido. Exige validação agronômica de campo.',
    });

    const smpMedio = calcularMediaSmp(amostra010.indice_smp, amostra1020.indice_smp);
    auditoria.smp_medio = smpMedio;
    auditoria.smp_usado_calculo = smpMedio;
    auditoria.amostra_decisoria = 'MEDIA_0_10_10_20';

    const dose = calcularNcViaTabelaSmp(smpMedio, 6.0);

    return montarRespostaSucesso(dados, {
      estado_motor: 'PDC_CENARIO_REINICIO_PD',
      necessita_calagem: true,
      modo_aplicacao: 'INCORPORADO',
      metodo_nc_utilizado: 'TABELA_SMP_5_2',
      dose_base: dose,
      alertas,
      auditoria,
    });
  }

  // ── Estado PDC_CALAGEM_SUPERFICIAL ──────────────────────────────────────
  auditoria.amostra_decisoria = '0-10';

  const doseInicial = calcularNcViaTabelaSmp(amostra010.indice_smp, 6.0);
  const doseFracionada = aplicarFracionamento(doseInicial, 0.5);
  const doseClamped = aplicarClampingSuperficial(doseFracionada);

  auditoria.fracionamento_superficial = 0.5;
  auditoria.clamping_superficial_aplicado = doseFracionada > doseClamped || doseFracionada > 5.0;

  return montarRespostaSucesso(dados, {
    estado_motor: 'PDC_CALAGEM_SUPERFICIAL',
    necessita_calagem: true,
    modo_aplicacao: 'SUPERFICIAL',
    metodo_nc_utilizado: 'TABELA_SMP_5_2',
    dose_base: doseClamped,
    alertas,
    auditoria,
  });
}

// ---------------------------------------------------------------------------
// Pipeline principal
// ---------------------------------------------------------------------------

export function executarMotorCalagem(payload: unknown): RespostaMotor {
  // ── 1. Validação de schema (hard blocks via Zod) ─────────────────────────
  const parse = CalagemSchema.safeParse(payload);

  if (!parse.success) {
    const detalhes = parse.error.issues.map((issue) => ({
      campo: issue.path.join('.') || 'raiz',
      problema: issue.message,
    }));

    // Deriva um código de erro semântico a partir do primeiro issue
    const primeiroIssue = parse.error.issues[0];
    const campoErro = primeiroIssue?.path.join('.') ?? '';
    let codigo_erro = 'E001_PAYLOAD_INVALIDO';

    if (campoErro.includes('amostras') || primeiroIssue?.message.includes('PD_CONSOLIDADO')) {
      codigo_erro = 'E002_PD_CONSOLIDADO_AMOSTRAS_INVALIDAS';
    } else if (campoErro.includes('modo_implantacao_pd')) {
      codigo_erro = 'E003_MODO_IMPLANTACAO_PD_INVALIDO';
    } else if (campoErro.includes('versao_regra')) {
      codigo_erro = 'E004_VERSAO_REGRA_INVALIDA';
    } else if (campoErro.includes('prnt_pct')) {
      codigo_erro = 'E005_PRNT_INVALIDO';
    }

    return montarRespostaErro(
      (payload as Record<string, unknown>)?.versao_regra as string ?? 'desconhecida',
      codigo_erro,
      primeiroIssue?.message ?? 'Payload inválido.',
      detalhes
    );
  }

  // ── 2. Normalização ──────────────────────────────────────────────────────
  const dados = normalizarEntrada(parse.data);
  const amostras = indexarAmostrasPorProfundidade(dados);

  // ── 3. Soft warnings laboratoriais ──────────────────────────────────────
  const alertas = coletarWarningsLaboratoriais(dados);

  // ── 4. Auditoria base ────────────────────────────────────────────────────
  const auditoria: Record<string, unknown> = {
    regras_disparadas: [] as string[],
  };

  // ── 5. Dispatch por sistema de manejo ────────────────────────────────────
  switch (dados.sistema_manejo) {
    case 'CONVENCIONAL':
      return resolverEstadoConvencional(dados, amostras, alertas, auditoria);

    case 'PD_IMPLANTACAO':
      return resolverEstadoPDImplantacao(dados, amostras, alertas, auditoria);

    case 'PD_CONSOLIDADO':
      return resolverEstadoPDConsolidado(dados, amostras, alertas, auditoria);

    default: {
      // TypeScript garante exhaustiveness, mas protege o runtime
      return montarRespostaErro(
        dados.versao_regra,
        'E006_SISTEMA_MANEJO_DESCONHECIDO',
        'sistema_manejo não reconhecido pelo motor.',
        [{ campo: 'sistema_manejo', problema: `Valor '${dados.sistema_manejo}' não mapeado.` }]
      );
    }
  }
}