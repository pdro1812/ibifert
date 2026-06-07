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
} from "../schemas/calagemSchema";
import {
  ajustarDosePorPRNT,
  calcularNCPolinomial6_0,
  calcularNCVB,
  determinarCamposNecessarios,
  resolverAlSat,
  resolverAlSat10_20,
  rotearMetodoCalagem,
  validarEntrada,
} from "./calculadoraCalagem";
import { tabelaSmpLookup } from "./tabelaSmp";
import {
  MSG_AVALIACAO_AGRONOMICA,
  MSG_LIMITE_SUPERFICIAL_PD,
  MSG_MODO_SIMPLIFICADO,
  MSG_NOTA_REAPLICACAO,
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
    modo,
    sistema_manejo,
    primeira_calagem,
    pH_agua,
    SMP,
    PRNT,
    opcao_superficial_campo_natural,
  } = entrada;

  if (modo === "simplificado") {
    if (SMP > 6.3) {
      alertas.push("Modo Rápido: Este solo requer Matéria Orgânica e Alumínio para um cálculo preciso. O valor exibido é uma estimativa baseada na tabela SMP.");
    } else {
      alertas.push(MSG_MODO_SIMPLIFICADO);
    }
  }

  // No modo simplificado, forçamos o roteamento para SMP se MO/Al_trocavel não estiverem presentes
  const metodo_calc_roteado =
    modo === "simplificado"
      ? MetodoCalcRoteado.SMP
      : rotearMetodoCalagem(SMP);

  const calcular_tambem_sat_bases =
    !primeira_calagem && metodo_calc_roteado === MetodoCalcRoteado.SMP;

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
      entrada.modo === "avancado" &&
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

  const SMP_0_10 = entrada.SMP_0_10 ?? SMP;
  const smpParaTabela =
    sistema_manejo === SistemaManejo.PD_COM_RESTRICAO
      ? (SMP_0_10 + (entrada.SMP_10_20 ?? 0.0)) / 2.0
      : SMP;

  let NC_base = 0.0;
  let NC_smp: number | undefined;
  let NC_vb: number | undefined;
  let NC_calculada = 0.0;

  if (metodo_calc_roteado === MetodoCalcRoteado.SMP) {
    NC_base = tabelaSmpLookup(smpParaTabela, 6.0);
    NC_smp = NC_base * fator_manejo;
    NC_calculada = NC_smp;

    if (calcular_tambem_sat_bases) {
      NC_vb = calcularNCVB(entrada.V_atual!, entrada.CTC_pH7!);
    }
  } else {
    NC_base = calcularNCPolinomial6_0(entrada.MO!, entrada.Al_trocavel!);
    NC_calculada = NC_base * fator_manejo;
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

  return {
    aplicar_calcario: true,
    metodo_calc_roteado,
    calcular_tambem_sat_bases,
    NC_base,
    NC_smp,
    NC_vb,
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
