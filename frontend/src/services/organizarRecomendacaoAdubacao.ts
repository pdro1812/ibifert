// Organiza o resultado da adubação para exibição (tela e PDF usam a mesma
// função): recomendações de nutrientes separadas em macro e micro,
// observações técnicas e, por último, alertas e avisos.
//
// Só reorganiza o que o motor já devolve — doses e mensagens não mudam.
// A classificação usa o `codigo` de cada alerta, então também funciona para
// análises antigas guardadas em recomendacao_json.

export interface AlertaAdubacao {
  nivel: 'INFO' | 'AVISO' | 'ERRO';
  codigo: string;
  mensagem: string;
}

export interface LinhaNutriente {
  nutriente: string;
  dose: string;
  orientacao: string;
}

export interface RecomendacaoOrganizada {
  macronutrientes: LinhaNutriente[];
  micronutrientes: LinhaNutriente[];
  observacoes: AlertaAdubacao[];
  alertas: AlertaAdubacao[];
}

export interface ResultadoAdubacao {
  recomendacao: {
    n: { dose_total_kg_ha: number; tipo: string };
    p2o5: { dose_total_kg_ha: number; tipo_adubacao: string };
    k2o: {
      dose_total_kg_ha: number;
      k2o_semeadura_kg_ha: number;
      k2o_complementar_kg_ha: number;
      tipo_adubacao: string;
    };
  };
  alertas?: AlertaAdubacao[];
}

// Mensagens que são orientação de manejo, não alerta. Qualquer código novo
// sem classificação explícita cai pelo nível: INFO vira observação,
// AVISO/ERRO vira alerta.
const CODIGOS_OBSERVACAO = new Set([
  'BNF_INOCULAR',
  'S_SOJA_DICA',
  'P_MUITO_ALTO_REP',
  'K_LIMITE_SEMEADURA',
  'N_REND_ALTO',
]);

const CODIGOS_ALERTA = new Set(['CA_BAIXO', 'MG_BAIXO', 'N_CEVADA_CERVEJEIRA']);

const NOME_MICRONUTRIENTE: Record<string, string> = {
  Cu: 'Cobre (Cu)',
  Zn: 'Zinco (Zn)',
  B: 'Boro (B)',
  Mn: 'Manganês (Mn)',
};

// Doses citadas na própria mensagem do motor ("20 kg S-SO4²⁻/ha",
// "12–25 g/ha via semente"); sem dose numérica, a coluna fica "—".
export function extrairDoses(mensagem: string): string {
  const doses = mensagem.match(/\d+(?:[–-]\d+)?\s*(?:kg|g)\b[^,.;()]*?\/ha(?: via \w+)?/g);
  return doses ? doses.join(' ou ') : '—';
}

function linhaMacroDeAlerta(alerta: AlertaAdubacao): LinhaNutriente | null {
  if (alerta.codigo === 'S_BAIXO') {
    return { nutriente: 'Enxofre (S)', dose: extrairDoses(alerta.mensagem), orientacao: alerta.mensagem };
  }
  return null;
}

function linhaMicroDeAlerta(alerta: AlertaAdubacao): LinhaNutriente | null {
  const micro = /^MICROS_(Cu|Zn|B|Mn)_BAIXO$/.exec(alerta.codigo);
  if (micro) {
    return { nutriente: NOME_MICRONUTRIENTE[micro[1]], dose: extrairDoses(alerta.mensagem), orientacao: alerta.mensagem };
  }
  if (alerta.codigo === 'MO_SOJA') {
    return { nutriente: 'Molibdênio (Mo)', dose: extrairDoses(alerta.mensagem), orientacao: alerta.mensagem };
  }
  return null;
}

export function organizarRecomendacaoAdubacao(resultado: ResultadoAdubacao): RecomendacaoOrganizada {
  const { n, p2o5, k2o } = resultado.recomendacao;

  const macronutrientes: LinhaNutriente[] = [
    { nutriente: 'Nitrogênio (N)', dose: `${n.dose_total_kg_ha} kg/ha`, orientacao: n.tipo },
    { nutriente: 'Fósforo (P₂O₅)', dose: `${p2o5.dose_total_kg_ha} kg/ha`, orientacao: p2o5.tipo_adubacao },
    {
      nutriente: 'Potássio (K₂O)',
      dose: `${k2o.dose_total_kg_ha} kg/ha`,
      orientacao: `${k2o.tipo_adubacao} — Linha: ${k2o.k2o_semeadura_kg_ha} kg/ha | Lanço: ${k2o.k2o_complementar_kg_ha} kg/ha`,
    },
  ];
  const micronutrientes: LinhaNutriente[] = [];
  const observacoes: AlertaAdubacao[] = [];
  const alertas: AlertaAdubacao[] = [];

  for (const alerta of resultado.alertas ?? []) {
    const macro = linhaMacroDeAlerta(alerta);
    if (macro) { macronutrientes.push(macro); continue; }

    const micro = linhaMicroDeAlerta(alerta);
    if (micro) { micronutrientes.push(micro); continue; }

    if (CODIGOS_OBSERVACAO.has(alerta.codigo)) observacoes.push(alerta);
    else if (CODIGOS_ALERTA.has(alerta.codigo)) alertas.push(alerta);
    else if (alerta.nivel === 'INFO') observacoes.push(alerta);
    else alertas.push(alerta);
  }

  return { macronutrientes, micronutrientes, observacoes, alertas };
}
