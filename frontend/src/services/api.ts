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

api.interceptors.request.use(
  (config) => {
    // Pega o token que salvaremos no login
    const token = localStorage.getItem('@ibiferti:token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
  const isSimplificado = dados.modo === 'simplificado';
  const metodo = rotearMetodoCalagem(dados.SMP);
  const primeira_calagem = isSimplificado ? true : dados.primeira_calagem;
  const precisaSatBases = !primeira_calagem && metodo === 'SMP';
  const precisaAlSat =
    dados.sistema_manejo === 'PD_CONSOLIDADO' && dados.pH_agua < 5.5;
  const monitoramento = dados.monitoramento;
  const temRestricao =
    !isSimplificado &&
    dados.sistema_manejo === 'PD_CONSOLIDADO' &&
    detectarRestricaoMonitoramento(monitoramento);

  const payload: CalagemPayload = {
    modo: dados.modo ?? 'avancado',
    sistema_manejo: temRestricao ? 'PD_COM_RESTRICAO' : dados.sistema_manejo,
    primeira_calagem: primeira_calagem,
    pH_agua:
      temRestricao && monitoramento
        ? calcularPhMedio0_20(dados.pH_agua, monitoramento)
        : dados.pH_agua,
    SMP: dados.SMP,
    PRNT: dados.PRNT,
  };

  if (!isSimplificado && metodo === 'POLINOMIAL') {
    payload.MO = dados.MO;
    payload.Al_trocavel = dados.Al_trocavel;
  }

  if (!isSimplificado && precisaSatBases) {
    payload.V_atual = dados.V_atual;
    payload.CTC_pH7 = dados.CTC_pH7;
  }

  if (!isSimplificado && !temRestricao && precisaAlSat) {
    if (!primeira_calagem && dados.V_atual !== undefined) {
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
  dados: EntradaCalagem,
  localizacao: { uf: string; cidade: string; modo_al_sat?: 'direto' | 'calculado'; monitoramento_ativo?: boolean }
): Promise<CalagemResultado> {
  const payload = {
    ...sanitizarPayloadCalagem(dados),
    uf:                  localizacao.uf,
    cidade:              localizacao.cidade,
    modo_al_sat:         localizacao.modo_al_sat,
    monitoramento_ativo: localizacao.monitoramento_ativo,
  };
  const resposta = await api.post('/analises/calcular', payload);
  return resposta.data.resultado ?? resposta.data;
}


// Adicionar em frontend/src/services/api.ts
// (junto das outras funções existentes, sem mexer no que já existe)

 
// ── Fazendas ──────────────────────────────────────────────────────────────────
 
export async function getFazendas() {
  const res = await api.get('/fazendas');
  return res.data;
}
 
export async function postFazenda(data: { nome: string; municipio: string; uf: string }) {
  const res = await api.post('/fazendas', data);
  return res.data;
}
 
export async function deleteFazendaApi(id: string) {
  const res = await api.delete(`/fazendas/${id}`);
  return res.data;
}
 
// ── Talhoes ───────────────────────────────────────────────────────────────────
 
export async function postTalhao(
  fazendaId: string,
  data: { nome: string; cultura: string }
) {
  const res = await api.post(`/fazendas/${fazendaId}/talhoes`, data);
  return res.data;
}
 
export async function deleteTalhaoApi(id: string) {
  const res = await api.delete(`/fazendas/talhoes/${id}`);
  return res.data;
}

export async function getTalhao(id: string) {
  const res = await api.get(`/fazendas/talhoes/${id}`);
  return res.data;
}

export async function getAnalisesByTalhao(id: string) {
  const res = await api.get(`/fazendas/talhoes/${id}/analises`);
  return res.data;
}

export async function postAnalisesBulk(data: {
  talhao_id: string;
  uf: string;
  cidade: string;
  amostras: any[];
}) {
  const res = await api.post('/analises/bulk', data);
  return res.data;
}
 