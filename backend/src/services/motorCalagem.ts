import {
  AcaoRequerida,
  EntradaCalagem,
  EntradaMonitoramento10_20,
  InputCalagem,
  MetodoCalcRoteado,
  ModoAplicacao,
  ResultadoCalagem,
  ResultadoMonitoramento,
  SistemaManejo,
  polinomialAutomatico,
  precisaPolinomial,
  precisaSatBases,
} from "../schemas/calagemSchema";
import {
  ajustarDosePorPRNT,
  calcularNCPolinomial6_0,
  calcularNCVB,
  determinarCamposNecessarios,
  resolverAlSat,
  resolverAlSat10_20,
  divergeDoSMP,
  validarEntrada,
} from "./calculadoraCalagem";
import { tabelaSmpLookup } from "./tabelaSmp";
import {
  MSG_AVALIACAO_AGRONOMICA,
  MSG_LIMITE_SUPERFICIAL_PD,
  MSG_NOTA_REAPLICACAO,
  MSG_POLINOMIAL_AUTOMATICO,
  msgDivergenciaMetodos,
  MSG_SEM_NECESSIDADE_CALAGEM,
  MSG_SEM_REINICIO_PD,
  MSG_TRAVA_PD_CONSOLIDADO,
} from "./warnings";

function criarResultadoNaoAplicar(params: {
  metodo_calc_roteado: MetodoCalcRoteado;
  calcular_tambem_sat_bases: boolean;
  fator_manejo: number;
  modo_aplicacao: ModoAplicacao;
  mensagem: string;
  profundidade_cm?: number;
  campos_necessarios?: string[];
  nota_tecnica?: string;
}): ResultadoCalagem {
  return {
    aplicar_calcario: false,
    metodo_calc_roteado: params.metodo_calc_roteado,
    calcular_tambem_sat_bases: params.calcular_tambem_sat_bases,
    polinomial_calculado: false,
    polinomial_automatico: false,
    NC_base: 0.0,
    NC_smp: 0.0,
    NC_final: 0.0,
    NC_ajustada: 0.0,
    fator_manejo: params.fator_manejo,
    modo_aplicacao: params.modo_aplicacao,
    profundidade_cm: params.profundidade_cm,
    alertas: [params.mensagem],
    nota_tecnica: params.nota_tecnica,
    campos_necessarios: params.campos_necessarios ?? [],
  };
}

export function executarMotorCalagem(
  entradaRecebida: InputCalagem
): ResultadoCalagem {
  const entrada = validarEntrada(entradaRecebida);
  const campos_necessarios = determinarCamposNecessarios(entrada);
  const alertas: string[] = [];

  const {
    sistema_manejo,
    primeira_calagem,
    pH_agua,
    SMP,
    PRNT,
    opcao_superficial_campo_natural,
  } = entrada;

  // O SMP é sempre o método em evidência. O Polinomial entra como valor
  // complementar quando selecionado pelo usuário ou quando SMP > 6.3; a
  // Saturação por Bases segue como referência só quando SMP <= 6.3.
  const metodo_calc_roteado = MetodoCalcRoteado.SMP;
  const calcular_polinomial = precisaPolinomial(entrada);
  const polinomial_automatico = polinomialAutomatico(SMP);
  const calcular_tambem_sat_bases = precisaSatBases({ SMP, primeira_calagem });

  if (
    sistema_manejo === SistemaManejo.CONVENCIONAL ||
    sistema_manejo === SistemaManejo.PD_IMPLANTACAO
  ) {
    if (pH_agua >= 5.5) {
      return criarResultadoNaoAplicar({
        metodo_calc_roteado,
        calcular_tambem_sat_bases,
        fator_manejo: 1.0,
        modo_aplicacao: ModoAplicacao.INCORPORADO,
        profundidade_cm: 20,
        mensagem: MSG_SEM_NECESSIDADE_CALAGEM,
        campos_necessarios,
        nota_tecnica: calcular_tambem_sat_bases ? MSG_NOTA_REAPLICACAO : undefined,
      });
    }
  }

  if (sistema_manejo === SistemaManejo.PD_CONSOLIDADO) {
    if (pH_agua >= 5.5) {
      return criarResultadoNaoAplicar({
        metodo_calc_roteado,
        calcular_tambem_sat_bases,
        fator_manejo: 0.25,
        modo_aplicacao: ModoAplicacao.SUPERFICIAL,
        mensagem: MSG_SEM_NECESSIDADE_CALAGEM,
        campos_necessarios,
        nota_tecnica: calcular_tambem_sat_bases ? MSG_NOTA_REAPLICACAO : undefined,
      });
    }

    const Al_sat_resolvido = resolverAlSat(entrada);

    if (
      entrada.V_atual !== undefined &&
      entrada.V_atual >= 65.0 &&
      Al_sat_resolvido !== undefined &&
      Al_sat_resolvido < 10.0
    ) {
      return criarResultadoNaoAplicar({
        metodo_calc_roteado,
        calcular_tambem_sat_bases,
        fator_manejo: 0.25,
        modo_aplicacao: ModoAplicacao.SUPERFICIAL,
        mensagem: MSG_TRAVA_PD_CONSOLIDADO,
        campos_necessarios,
        nota_tecnica: calcular_tambem_sat_bases ? MSG_NOTA_REAPLICACAO : undefined,
      });
    }
  }

  if (sistema_manejo === SistemaManejo.PD_COM_RESTRICAO) {
    const alSat10_20 = resolverAlSat10_20(entrada);
    const aplicar_calcario = pH_agua < 5.5 && alSat10_20 !== undefined && alSat10_20 >= 30.0;

    if (!aplicar_calcario) {
      return criarResultadoNaoAplicar({
        metodo_calc_roteado,
        calcular_tambem_sat_bases,
        fator_manejo: 1.0,
        modo_aplicacao: ModoAplicacao.INCORPORADO,
        profundidade_cm: 20,
        mensagem: MSG_SEM_REINICIO_PD,
        campos_necessarios,
        nota_tecnica: calcular_tambem_sat_bases ? MSG_NOTA_REAPLICACAO : undefined,
      });
    }
  }

  let fator_manejo = 1.0;
  if (sistema_manejo === SistemaManejo.PD_CONSOLIDADO) {
    fator_manejo = 0.25;
  }

  // RN-19 do manual: a dose por Saturação por Bases (NC_vb) é calculada para
  // a camada de 0-20 cm e precisa do "mesmo fator empregado para o SMP"
  // quando a aplicação é superficial — senão NC_vb deixa de ser comparável
  // a NC_smp/NC_final na tela (ver docs/auditoria-calagem-manual-vs-codigo.md §1.1).
  let fatorAjusteReferenciaVB = fator_manejo;

  const SMP_0_10 = entrada.SMP_0_10 ?? SMP;
  const smpParaTabela =
    sistema_manejo === SistemaManejo.PD_COM_RESTRICAO
      ? (SMP_0_10 + (entrada.SMP_10_20 ?? 0.0)) / 2.0
      : SMP;

  let NC_polinomial: number | undefined;
  let NC_vb: number | undefined;

  const NC_base = tabelaSmpLookup(smpParaTabela, 6.0);
  const NC_smp = NC_base * fator_manejo;
  const NC_calculada = NC_smp;

  if (calcular_tambem_sat_bases) {
    NC_vb = calcularNCVB(entrada.V_atual!, entrada.CTC_pH7!);
  }

  if (calcular_polinomial) {
    NC_polinomial = calcularNCPolinomial6_0(entrada.MO!, entrada.Al_trocavel!);
  }

  let NC_final = Math.max(0.0, NC_calculada);
  let modo_aplicacao = ModoAplicacao.INCORPORADO;
  let profundidade_cm: number | undefined;
  let acao_requerida: AcaoRequerida | undefined;

  switch (sistema_manejo) {
    case SistemaManejo.CONVENCIONAL:
      modo_aplicacao = ModoAplicacao.INCORPORADO;
      profundidade_cm = 20;
      break;

    case SistemaManejo.PD_IMPLANTACAO:
      if (opcao_superficial_campo_natural === true && SMP > 5.5) {
        modo_aplicacao = ModoAplicacao.SUPERFICIAL;
        NC_final = tabelaSmpLookup(SMP, 6.0) * 0.5;
        fatorAjusteReferenciaVB = 0.5;
      } else {
        modo_aplicacao = ModoAplicacao.INCORPORADO;
        profundidade_cm = 20;
      }
      break;

    case SistemaManejo.PD_CONSOLIDADO:
      modo_aplicacao = ModoAplicacao.SUPERFICIAL;
      if (NC_calculada > 5.0) {
        NC_final = 5.0;
        alertas.push(MSG_LIMITE_SUPERFICIAL_PD);
      } else {
        NC_final = NC_calculada;
      }
      break;

    case SistemaManejo.PD_COM_RESTRICAO:
      modo_aplicacao = ModoAplicacao.INCORPORADO;
      profundidade_cm = 20;
      acao_requerida = AcaoRequerida.REINICIAR_PLANTIO_DIRETO;
      break;
  }

  NC_final = Math.max(0.0, NC_final);
  const NC_ajustada = ajustarDosePorPRNT(NC_final, PRNT);

  if (NC_vb !== undefined) {
    NC_vb = NC_vb * fatorAjusteReferenciaVB;
  }

  if (NC_polinomial !== undefined) {
    NC_polinomial = NC_polinomial * fatorAjusteReferenciaVB;
  }

  if (polinomial_automatico) {
    alertas.push(MSG_POLINOMIAL_AUTOMATICO);
  }

  // Comparação sempre contra o SMP, antes do PRNT e sem o teto de 5 t/ha do PD.
  const referenciaSMP = NC_base * fatorAjusteReferenciaVB;

  if (NC_polinomial !== undefined && divergeDoSMP(NC_polinomial, referenciaSMP)) {
    alertas.push(msgDivergenciaMetodos("Polinomial", NC_polinomial, referenciaSMP));
  }

  if (NC_vb !== undefined && divergeDoSMP(NC_vb, referenciaSMP)) {
    alertas.push(msgDivergenciaMetodos("Saturação por Bases", NC_vb, referenciaSMP));
  }

  return {
    aplicar_calcario: true,
    metodo_calc_roteado,
    calcular_tambem_sat_bases,
    polinomial_calculado: calcular_polinomial,
    polinomial_automatico,
    NC_base,
    NC_smp,
    NC_vb,
    NC_polinomial,
    NC_final,
    NC_ajustada,
    fator_manejo,
    modo_aplicacao,
    profundidade_cm,
    acao_requerida,
    alertas,
    nota_tecnica: calcular_tambem_sat_bases ? MSG_NOTA_REAPLICACAO : undefined,
    campos_necessarios,
  };
}

export function avaliarMonitoramento10_20(
  dados: EntradaMonitoramento10_20
): ResultadoMonitoramento {
  const restricao_10_20 =
    dados.Al_sat_10_20 >= 30.0 &&
    (
      dados.produtividade_abaixo_media ||
      dados.compactacao_restringindo_raiz ||
      dados.disponibilidade_P_10_20_abaixo_critico
    );

  if (restricao_10_20) {
    return {
      restricao_10_20: true,
      sistema_manejo_atualizado: SistemaManejo.PD_COM_RESTRICAO,
      emitir_alerta: MSG_AVALIACAO_AGRONOMICA,
      campos_adicionais_necessarios: ["SMP_10_20"],
    };
  }

  return {
    restricao_10_20: false,
    sistema_manejo_atualizado: SistemaManejo.PD_CONSOLIDADO,
    campos_adicionais_necessarios: [],
  };
}
