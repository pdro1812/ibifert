export const MSG_SEM_NECESSIDADE_CALAGEM =
  "pH acima do limiar — não há necessidade de calagem no momento";

export const MSG_TRAVA_PD_CONSOLIDADO =
  "Embora o pH em água esteja abaixo de 5,5, a Saturação por Bases (V) está em nível adequado (>= 65%) e a Saturação por Alumínio (m) está baixa (< 10%). Nestas condições de tamponamento, a calagem não é recomendada para o Sistema de Plantio Direto Consolidado.";

export const MSG_LIMITE_SUPERFICIAL_PD =
  "Dose calculada excede o limite de 5 t/ha para aplicação superficial. A correção completa poderá requerer reaplicação futura.";

export const MSG_AVALIACAO_AGRONOMICA =
  "Recomenda-se avaliação por engenheiro agrônomo antes de reiniciar o sistema plantio direto";

export const MSG_NOTA_REAPLICACAO =
  "A definição do método a aplicar é decisão do técnico responsável. O valor recomendado por este sistema é sempre o valor SMP; a Saturação por Bases é apresentada apenas como referência complementar.";

export const MSG_SEM_REINICIO_PD =
  "Critérios de restrição do PD_COM_RESTRICAO não atendidos; não há indicação de reiniciar o sistema de plantio direto.";


export const MSG_POLINOMIAL_AUTOMATICO =
  "SMP > 6,3: o método Polinomial foi calculado automaticamente como valor complementar. O valor em evidência segue o SMP.";

export function msgDivergenciaMetodos(
  nomeMetodo: string,
  valor: number,
  referenciaSMP: number
): string {
  const desvio =
    referenciaSMP > 0
      ? ` (${Math.round((Math.abs(valor - referenciaSMP) / referenciaSMP) * 100)}% de diferença)`
      : "";

  return `Divergência entre métodos: ${nomeMetodo} (${valor.toFixed(2)} t/ha) difere do SMP (${referenciaSMP.toFixed(2)} t/ha)${desvio}, acima do limite de 20%. O valor em evidência segue o SMP; avalie com critério técnico.`;
}
