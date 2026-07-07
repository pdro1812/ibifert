import { EntradaAdubacao } from "../schemas/adubacaoSchema";
import { converterMehlich3ParaMehlich1_P, converterMehlich3ParaMehlich1_K } from "./calculadoraAdubacao";
import { gerarAlertasDiagnose, AlertaAdubacao } from "./warningsAdubacao";
import {
  classificarArgila, classificarMO, classificarCTC, classificarFosforo, classificarPotassio,
  TABELA_N_BASE, TABELA_PK_CULTURA, TABELA_CORRECAO_TOTAL, CULTURAS_INFO
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
    
    doseN = nBase + ajusteRend;

    // Milho: densidade
    if (entrada.cultura === 'milho' && entrada.densidade_plantas && entrada.densidade_plantas > 65000) {
      const extraPlantas = Math.floor((entrada.densidade_plantas - 65000) / 5000);
      doseN += extraPlantas * 10;
    }
    
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
  const numCultivo: 1 | 2 = entrada.num_cultivo === '2' ? 2 : 1;
  const recomPK = TABELA_PK_CULTURA[entrada.cultura];

  let doseP2O5 = 0;
  let tipoP2O5 = "";
  
  if (classeP === 'muito_alto') {
    if (numCultivo === 1) {
      doseP2O5 = 0;
      tipoP2O5 = "Sem Aplicação (Muito Alto)";
      const reposicao = infoCultura.exportacao_t.p2o5 * entrada.rendimento_esperado;
      alertas.push({ nivel: 'INFO', codigo: 'P_MUITO_ALTO_REP', mensagem: `Fósforo Muito Alto. Reposição estimada: ${reposicao.toFixed(0)} kg P₂O₅/ha (a critério do técnico).` });
    } else {
      tipoP2O5 = "Reposição parcial — a critério do técnico";
    }
  } else {
    const pBase = recomPK.P2O5[classeP][numCultivo];
    const ajusteRendP = entrada.rendimento_esperado > infoCultura.rend_ref_t 
      ? (entrada.rendimento_esperado - infoCultura.rend_ref_t) * infoCultura.p2o5_adic_t 
      : 0;

    if (entrada.tipo_correcao === 'Total' && numCultivo === 1 && ['muito_baixo', 'baixo', 'medio'].includes(classeP)) {
      doseP2O5 = TABELA_CORRECAO_TOTAL[classeP as 'baixo'|'medio'|'muito_baixo'].p2o5 + infoCultura.p2o5_manutencao + Math.max(0, ajusteRendP);
      tipoP2O5 = "Corretiva Total + Manutenção";
    } else {
      doseP2O5 = pBase + Math.max(0, ajusteRendP);
      if (['muito_baixo', 'baixo'].includes(classeP) && numCultivo === 1) tipoP2O5 = "Corretiva Gradual 2/3 + Manutenção";
      else if (['muito_baixo', 'baixo'].includes(classeP) && numCultivo === 2) tipoP2O5 = "Corretiva Gradual 1/3 + Manutenção";
      else if (classeP === 'medio' && numCultivo === 1) tipoP2O5 = "Corretiva Total + Manutenção";
      else tipoP2O5 = "Manutenção";
    }
  }

  // K2O
  let doseK2O = 0;
  let tipoK2O = "";

  if (classeK === 'muito_alto') {
    if (numCultivo === 1) {
      doseK2O = 0;
      tipoK2O = "Sem Aplicação (Muito Alto)";
    } else {
      tipoK2O = "Reposição parcial — a critério do técnico";
    }
  } else {
    const kBase = recomPK.K2O[classeK][numCultivo];
    const ajusteRendK = entrada.rendimento_esperado > infoCultura.rend_ref_t 
      ? (entrada.rendimento_esperado - infoCultura.rend_ref_t) * infoCultura.k2o_adic_t 
      : 0;

    if (entrada.tipo_correcao === 'Total' && numCultivo === 1 && ['muito_baixo', 'baixo', 'medio'].includes(classeK)) {
      doseK2O = TABELA_CORRECAO_TOTAL[classeK as 'baixo'|'medio'|'muito_baixo'].k2o + infoCultura.k2o_manutencao + Math.max(0, ajusteRendK);
      tipoK2O = "Corretiva Total + Manutenção";
    } else {
      doseK2O = kBase + Math.max(0, ajusteRendK);
      if (['muito_baixo', 'baixo'].includes(classeK) && numCultivo === 1) tipoK2O = "Corretiva Gradual 2/3 + Manutenção";
      else if (['muito_baixo', 'baixo'].includes(classeK) && numCultivo === 2) tipoK2O = "Corretiva Gradual 1/3 + Manutenção";
      else if (classeK === 'medio' && numCultivo === 1) tipoK2O = "Corretiva Total + Manutenção";
      else tipoK2O = "Manutenção";
    }
  }

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
