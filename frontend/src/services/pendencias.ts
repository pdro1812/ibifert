import { calcularCalagem, calcularAdubacao, salvarAdubacao, salvarCalagem } from './api';
import type { EntradaCalagem, CalagemResultado } from '../schemas/calagemSchema';
import type { EntradaAdubacao } from '../schemas/adubacaoSchema';

interface CalagemPendente {
  // Cálculo já registrado (sem dono): basta vinculá-lo à conta.
  id?: string | null;
  resultado?: CalagemResultado;
  data_analise?: string | null;
  // Formato antigo (sem id): recalcula antes de salvar.
  dados?: EntradaCalagem;
  localizacao?: { uf: string; cidade: string };
  // Página de origem para onde voltar após o login. Opcional por
  // compatibilidade com pendências gravadas antes deste campo existir.
  destino?: string;
}

interface AdubacaoPendente {
  dados: EntradaAdubacao & { uf: string; cidade: string; data_analise?: string | null };
  // Ver comentário em CalagemPendente — mesmo padrão.
  destino?: string;
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
      let { id, resultado } = pendente;
      if ((!id || !resultado) && pendente.dados && pendente.localizacao) {
        ({ id, resultado } = await calcularCalagem(pendente.dados, pendente.localizacao));
      }
      if (!id || !resultado) return null;
      await salvarCalagem(id, { data_analise: pendente.data_analise ?? null });
      return { tipo: 'CALAGEM', destino: pendente.destino ?? '/', resultado };
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
        destino: pendente.destino ?? '/',
        resultado: { ...calculado.resultado, dadosEntrada: pendente.dados },
      };
    } catch {
      return null;
    }
  }

  return null;
}
