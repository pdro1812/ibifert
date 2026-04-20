// backend/src/services/warnings.ts

import { EntradaCalagem } from '../schemas/calagemSchema';

export interface Alerta {
  codigo: string;
  nivel: 'warning' | 'info';
  mensagem: string;
}

/**
 * Coleta todos os soft warnings (não-bloqueantes) do payload.
 * Hard blocks são responsabilidade do schema Zod (calagemSchema.ts).
 */
export function coletarWarningsLaboratoriais(dados: EntradaCalagem): Alerta[] {
  const alertas: Alerta[] = [];

  for (const amostra of dados.amostras) {
    const prof = amostra.profundidade;

    // W-LAB-01: ph fora da faixa laboratorial comum
    if (amostra.ph < 4.0 || amostra.ph > 7.0) {
      alertas.push({
        codigo: 'W-LAB-01',
        nivel: 'warning',
        mensagem: `Amostra ${prof}: ph ${amostra.ph} está fora da faixa laboratorial comum (4,0 – 7,0).`,
      });
    }

    // W-LAB-02: indice_smp fora da faixa laboratorial comum
    if (amostra.indice_smp < 4.0 || amostra.indice_smp > 7.5) {
      alertas.push({
        codigo: 'W-LAB-02',
        nivel: 'warning',
        mensagem: `Amostra ${prof}: indice_smp ${amostra.indice_smp} está fora da faixa laboratorial comum (4,0 – 7,5).`,
      });
    }

    // W-LAB-03: Possível inconsistência entre ph e indice_smp
    // pH baixo (<5.0) com SMP alto (>6.5) é fisicamente improvável
    if (amostra.ph < 5.0 && amostra.indice_smp > 6.5) {
      alertas.push({
        codigo: 'W-LAB-03',
        nivel: 'warning',
        mensagem: `Amostra ${prof}: combinação ph ${amostra.ph} < 5,0 com indice_smp ${amostra.indice_smp} > 6,5 é possivelmente inconsistente. Verificar laudo laboratorial.`,
      });
    }
  }

  // W-LAB-04: Rota 0-20 com SMP > 6.3 mas sem mo_pct e al_cmolc_dm3
  // Motor cairia no polinômio mas não tem os dados necessários
  if (['CONVENCIONAL', 'PD_IMPLANTACAO'].includes(dados.sistema_manejo)) {
    const amostra = dados.amostras[0];
    if (
      amostra &&
      amostra.indice_smp > 6.3 &&
      (amostra.mo_pct === undefined || amostra.al_cmolc_dm3 === undefined)
    ) {
      alertas.push({
        codigo: 'W-LAB-04',
        nivel: 'warning',
        mensagem: `Amostra ${amostra.profundidade}: indice_smp ${amostra.indice_smp} > 6,3 sugere uso do método polinomial, mas mo_pct e/ou al_cmolc_dm3 estão ausentes. O motor usará a Tabela 5.2 como fallback.`,
      });
    }
  }

  // W-LAB-05: Sistema CONVENCIONAL / PD_IMPLANTACAO com profundidade diferente de 0-20
  if (['CONVENCIONAL', 'PD_IMPLANTACAO'].includes(dados.sistema_manejo)) {
    const amostra = dados.amostras[0];
    if (amostra && amostra.profundidade !== '0-20') {
      alertas.push({
        codigo: 'W-LAB-05',
        nivel: 'warning',
        mensagem: `Sistema ${dados.sistema_manejo} espera amostra de profundidade 0-20 cm, mas recebeu ${amostra.profundidade}.`,
      });
    }
  }

  // W-AGR-01: Campo natural superficial — risco de comprometer reaplicações futuras
  if (dados.modo_implantacao_pd === 'CAMPO_NATURAL_SUPERFICIAL') {
    alertas.push({
      codigo: 'W-AGR-01',
      nivel: 'warning',
      mensagem: 'Modo CAMPO_NATURAL_SUPERFICIAL: aplicação superficial fracionada pode comprometer reaplicações futuras. Monitorar evolução do pH anualmente.',
    });
  }

  return alertas;
}