import { EntradaAdubacao } from "../schemas/adubacaoSchema";
import { converterMehlich3ParaMehlich1_P, converterMehlich3ParaMehlich1_K } from "./calculadoraAdubacao";
import { gerarAlertasDiagnose, AlertaAdubacao } from "./warningsAdubacao";
import {
  classificarArgila, classificarMO, classificarCTC, classificarFosforo, classificarPotassio,
  TABELA_N_BASE, TABELA_PK_CULTURA, CULTURAS_INFO, ClasseDisponibilidade
} from "./tabelasAdubacaoGraos";

export function executarMotorAdubacao(entrada: EntradaAdubacao) {
  const alertas = gerarAlertasDiagnose(entrada);
  
  // 1. Pré-processamento Mehlich
  const p_m1 = entrada.metodo_P === 'Mehlich-3' 
    ? converterMehlich3ParaMehlich1_P(entrada.P, entrada.argila) 
    : entrada.P;
  
  const k_m1 = entrada.metodo_K === 'Mehlich-3'
    ? converterMehlich3ParaMehlich1_K(entrada.K)
    : entrada.K;

  // 2. Classificação do Solo
  const classeArgila = classificarArgila(entrada.argila);
  const classeMO = classificarMO(entrada.MO);
  const classeCTC = classificarCTC(entrada.CTC_pH7);
  const classeP = classificarFosforo(p_m1, classeArgila);
  const classeK = classificarPotassio(k_m1, classeCTC);

  // 3. Cálculo de N
  const infoCultura = CULTURAS_INFO[entrada.cultura];
  let doseN = 0;
  let tipoN = "";
  
  if (infoCultura.bnf) {
    doseN = 0;
    tipoN = "FBN (0 N)";
    alertas.push({ nivel: 'INFO', codigo: 'BNF_INOCULAR', mensagem: "Recomenda-se inoculação com rizóbio apropriado." });
  } else {
    const regraN = TABELA_N_BASE[entrada.cultura];
    if (!regraN) {
      throw new Error(`Regra de N não encontrada para a cultura: ${entrada.cultura}`);
    }

    let nBase = 0;
    const moRegra = regraN[classeMO];
    if (typeof moRegra === 'number') {
      nBase = moRegra;
    } else if (entrada.cultura_antecedente) {
      // 2 ou 3 categorias
      const ca = entrada.cultura_antecedente === 'Leguminosa' ? 'leguminosa' 
               : entrada.cultura_antecedente === 'Gramínea' ? 'graminea' 
               : 'consorciacao_pousio';
      nBase = (moRegra as any)[ca] || 0;
    }

    // Ajuste de produtividade
    const rendRef = regraN.rend_ref_adic || infoCultura.rend_ref_t;
    const nAdicT = regraN.n_adic_t || 0;
    let ajusteRend = 0;
    
    if (entrada.rendimento_esperado > rendRef) {
      // Para culturas de 2 categorias, o adicional depende se foi leg ou gram, mas a tabela
      // consolidou como n_adic_t: 30 (que a doc diz ser 20 leg e 30 gram para aveias e afins)
      let fatorAdic = nAdicT;
      if (['aveia_branca', 'aveia_preta', 'centeio', 'cevada', 'trigo', 'triticale'].includes(entrada.cultura)) {
        fatorAdic = entrada.cultura_antecedente === 'Leguminosa' ? 20 : 30;
      }
      ajusteRend = (entrada.rendimento_esperado - rendRef) * fatorAdic;
    }
    
    // Sem bônus por densidade de plantas no milho (validação da coordenadora, cenário A3)
    doseN = nBase + ajusteRend;

    // Milho: prod > 10t
    if (entrada.rendimento_esperado > 10) {
      alertas.push({ nivel: 'AVISO', codigo: 'N_REND_ALTO', mensagem: "Rendimento esperado > 10 t/ha. Considerar aumento de N em 20-40% a critério do técnico." });
    }
    
    // Cevada cervejeira
    if (entrada.cultura === 'cevada' && entrada.finalidade_cevada === 'cervejeira_malte_unico') {
      alertas.push({ nivel: 'AVISO', codigo: 'N_CEVADA_CERVEJEIRA', mensagem: "CEVADA CERVEJEIRA — Malte Tipo Único: NÃO aplicar N após o espigamento. Proteína do grão deve ser ≤ 12%." });
    }
  }

  // 4 e 5. Cálculo de P2O5 e K2O
  // Dose = tabela por classe/cultivo + ajuste de rendimento, em todas as classes
  // (inclusive muito alto) e também na correção "Total", conforme os cenários
  // validados pela coordenadora (docs/registro-alteracoes-propostas.md, item 8).
  const numCultivo: 1 | 2 = entrada.num_cultivo === '2' ? 2 : 1;
  const recomPK = TABELA_PK_CULTURA[entrada.cultura];
  const excedenteRend = Math.max(0, entrada.rendimento_esperado - infoCultura.rend_ref_t);

  const doseP2O5 = recomPK.P2O5[classeP][numCultivo] + excedenteRend * infoCultura.p2o5_adic_t;
  const tipoP2O5 = tipoAdubacaoPK(classeP, numCultivo, doseP2O5);

  if (classeP === 'muito_alto' && numCultivo === 1) {
    const reposicao = infoCultura.exportacao_t.p2o5 * entrada.rendimento_esperado;
    alertas.push({ nivel: 'INFO', codigo: 'P_MUITO_ALTO_REP', mensagem: `Fósforo Muito Alto. Reposição estimada: ${reposicao.toFixed(0)} kg P₂O₅/ha (a critério do técnico).` });
  }

  // K2O
  const doseK2O = recomPK.K2O[classeK][numCultivo] + excedenteRend * infoCultura.k2o_adic_t;
  const tipoK2O = tipoAdubacaoPK(classeK, numCultivo, doseK2O);

  // Limite K semeadura
  let kSemeadura = doseK2O;
  let kCobertura = 0;
  if (doseK2O > 80) {
    kSemeadura = 80;
    kCobertura = doseK2O - 80;
    alertas.push({ nivel: 'AVISO', codigo: 'K_LIMITE_SEMEADURA', mensagem: `K₂O total (${Math.round(doseK2O)} kg/ha) excede 80 kg/ha na linha. Aplicar 80 kg na semeadura e ${Math.round(kCobertura)} kg em cobertura ou a lanço.` });
  }

  return {
    classificacao_solo: {
      argila_classe: classeArgila,
      mo_classe: classeMO,
      ctc_classe: classeCTC,
      p_classe: classeP,
      k_classe: classeK,
    },
    recomendacao: {
      n: {
        dose_total_kg_ha: Math.round(doseN),
        tipo: tipoN
      },
      p2o5: {
        dose_total_kg_ha: Math.round(doseP2O5),
        tipo_adubacao: tipoP2O5
      },
      k2o: {
        dose_total_kg_ha: Math.round(doseK2O),
        k2o_semeadura_kg_ha: Math.round(kSemeadura),
        k2o_complementar_kg_ha: Math.round(kCobertura),
        tipo_adubacao: tipoK2O
      }
    },
    alertas
  };
}

function tipoAdubacaoPK(classe: ClasseDisponibilidade, numCultivo: 1 | 2, dose: number): string {
  if (classe === 'muito_alto') return dose > 0 ? "Reposição (Muito Alto)" : "Sem Aplicação (Muito Alto)";
  if (['muito_baixo', 'baixo'].includes(classe)) {
    return numCultivo === 1 ? "Corretiva Gradual 2/3 + Manutenção" : "Corretiva Gradual 1/3 + Manutenção";
  }
  if (classe === 'medio' && numCultivo === 1) return "Corretiva Total + Manutenção";
  return "Manutenção";
}
