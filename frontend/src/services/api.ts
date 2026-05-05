import axios from 'axios';

import type {
  CalagemPayload,
  CalagemResultado,
  EntradaCalagem,
  Monitoramento10_20,
} from '../schemas/calagemSchema';
import {
  detectarRestricaoMonitoramento,
  rotearMetodoCalagem,
} from '../schemas/calagemSchema';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function arredondar(valor: number): number {
  return Number(valor.toFixed(2));
}

function calcularPhMedio0_20(
  ph0_10: number,
  monitoramento: Monitoramento10_20
): number {
  return arredondar((ph0_10 + monitoramento.pH_agua_10_20) / 2);
}

export function sanitizarPayloadCalagem(dados: EntradaCalagem): CalagemPayload {
  const metodo = rotearMetodoCalagem(dados.SMP);
  const precisaSatBases = !dados.primeira_calagem && metodo === 'SMP';
  const precisaAlSat =
    dados.sistema_manejo === 'PD_CONSOLIDADO' && dados.pH_agua < 5.5;
  const monitoramento = dados.monitoramento;
  const temRestricao =
    dados.sistema_manejo === 'PD_CONSOLIDADO' &&
    detectarRestricaoMonitoramento(monitoramento);

  const payload: CalagemPayload = {
    sistema_manejo: temRestricao ? 'PD_COM_RESTRICAO' : dados.sistema_manejo,
    primeira_calagem: dados.primeira_calagem,
    pH_agua:
      temRestricao && monitoramento
        ? calcularPhMedio0_20(dados.pH_agua, monitoramento)
        : dados.pH_agua,
    SMP: dados.SMP,
    PRNT: dados.PRNT,
  };

  if (metodo === 'POLINOMIAL') {
    payload.MO = dados.MO;
    payload.Al_trocavel = dados.Al_trocavel;
  }

  if (precisaSatBases) {
    payload.V_atual = dados.V_atual;
    payload.CTC_pH7 = dados.CTC_pH7;
  }

  if (!temRestricao && precisaAlSat) {
    if (!dados.primeira_calagem && dados.V_atual !== undefined) {
      payload.V_atual = dados.V_atual;
    }

    if (dados.Al_sat !== undefined) {
      payload.Al_sat = dados.Al_sat;
    } else {
      payload.Al_trocavel = dados.Al_trocavel;
      payload.CTC_pH7 = dados.CTC_pH7;
    }
  }

  if (dados.sistema_manejo === 'PD_IMPLANTACAO') {
    payload.opcao_superficial_campo_natural =
      dados.opcao_superficial_campo_natural ?? false;
  }

  if (temRestricao && monitoramento) {
    payload.Al_sat_10_20 = monitoramento.Al_sat_10_20;
    payload.SMP_0_10 = dados.SMP;
    payload.SMP_10_20 = dados.SMP_10_20;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, valor]) => valor !== undefined)
  ) as CalagemPayload;
}

export async function calcularCalagem(
  dados: EntradaCalagem
): Promise<CalagemResultado> {
  const payload = sanitizarPayloadCalagem(dados);
  const resposta = await api.post('/calcular', payload);
  return resposta.data.resultado ?? resposta.data;
}
