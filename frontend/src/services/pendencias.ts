import { calcularCalagem, calcularAdubacao, salvarAdubacao } from './api';
import type { EntradaCalagem, CalagemResultado } from '../schemas/calagemSchema';
import type { EntradaAdubacao } from '../schemas/adubacaoSchema';

interface CalagemPendente {
  dados: EntradaCalagem;
  localizacao: { uf: string; cidade: string };
}

interface AdubacaoPendente {
  dados: EntradaAdubacao;
}

export type AnalisePendenteRecuperada =
  | { tipo: 'CALAGEM'; destino: string; resultado: CalagemResultado }
  | { tipo: 'ADUBACAO'; destino: string; resultado: any };

/**
 * Chamado logo após login/registro. Se o usuário tinha calculado uma
 * análise antes de se autenticar (calagem ou adubação) e clicou em
 * "Salvar", recalcula e persiste a análise agora associada à conta,
 * em vez de simplesmente descartar o que ele já tinha preenchido.
 */
export async function recuperarAnalisePendente(): Promise<AnalisePendenteRecuperada | null> {
  const calagemRaw = sessionStorage.getItem('analisePendente');
  if (calagemRaw) {
    sessionStorage.removeItem('analisePendente');
    try {
      const pendente: CalagemPendente = JSON.parse(calagemRaw);
      const resultado = await calcularCalagem(pendente.dados, pendente.localizacao);
      return { tipo: 'CALAGEM', destino: '/', resultado };
    } catch {
      return null;
    }
  }

  const adubacaoRaw = sessionStorage.getItem('adubacaoPendente');
  if (adubacaoRaw) {
    sessionStorage.removeItem('adubacaoPendente');
    try {
      const pendente: AdubacaoPendente = JSON.parse(adubacaoRaw);
      const calculado = await calcularAdubacao(pendente.dados);
      await salvarAdubacao({ dadosForm: pendente.dados, resultado: calculado.resultado });
      return {
        tipo: 'ADUBACAO',
        destino: '/adubacao',
        resultado: { ...calculado.resultado, dadosEntrada: pendente.dados },
      };
    } catch {
      return null;
    }
  }

  return null;
}
