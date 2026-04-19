import { EntradaCalagem } from '../schemas/calagemSchema';
import {
  aplicarClampingSuperficial,
  aplicarFracionamento,
  aplicarPrnt,
  calcularMediaSmp,
  soloSuperficialAtingiuMeta
} from './calculadoraCalagem';
import { calcularNcViaPolinomio, calcularNcViaTabelaSmp } from './tabelaSmp';

export function executarMotorCalagem(dados: EntradaCalagem) {
  const { sistema_manejo, modo_implantacao_pd, prnt_pct = 100, amostras } = dados;
  
  // Variáveis para montar a saída
  let estado_motor = '';
  let necessita_calagem = false;
  let modo_aplicacao = 'NENHUM';
  let metodo_nc_utilizado = 'TABELA_SMP_5_2';
  let dose_base = 0;
  let alertas: any[] = [];
  let auditoria: any = {
    regras_disparadas: []
  };

  // Função interna auxiliar para decidir entre Tabela ou Polinômio na camada 0-20
  const selecionarMetodoNc020 = (amostra: any) => {
    if (amostra.indice_smp > 6.3 && amostra.mo_pct !== undefined && amostra.al_cmolc_dm3 !== undefined) {
      metodo_nc_utilizado = 'POLINOMIAL_BAIXO_TAMPAO';
      auditoria.regras_disparadas.push('POLINOMIO_SMP_MAIOR_6_3');
      return calcularNcViaPolinomio(amostra.mo_pct, amostra.al_cmolc_dm3, 6.0);
    }
    return calcularNcViaTabelaSmp(amostra.indice_smp, 6.0);
  };

  // ==========================================
  // ROTA 1: CONVENCIONAL
  // ==========================================
  if (sistema_manejo === 'CONVENCIONAL') {
    const amostra = amostras[0];
    auditoria.amostra_decisoria = amostra.profundidade;
    
    dose_base = selecionarMetodoNc020(amostra);
    
    if (dose_base > 0) {
      estado_motor = 'CONV_CALAGEM_INCORPORADA';
      necessita_calagem = true;
      modo_aplicacao = 'INCORPORADO';
    } else {
      estado_motor = 'CONV_SEM_CALAGEM';
    }
  }

  // ==========================================
  // ROTA 2: PLANTIO DIRETO - IMPLANTAÇÃO
  // ==========================================
  else if (sistema_manejo === 'PD_IMPLANTACAO') {
    const amostra = amostras[0];
    auditoria.amostra_decisoria = amostra.profundidade;

    dose_base = selecionarMetodoNc020(amostra);

    if (dose_base > 0) {
      necessita_calagem = true;
      if (modo_implantacao_pd === 'CAMPO_NATURAL_SUPERFICIAL') {
        estado_motor = 'PDI_CALAGEM_SUPERFICIAL_CAMPO_NATURAL';
        modo_aplicacao = 'SUPERFICIAL';
        // Regra RS/SC: Campo natural superficial divide a dose (geralmente 1/4 a 1/2 dependendo do contexto, adotando 0.25 como default conservador para não queimar)
        dose_base = aplicarFracionamento(dose_base, 0.25); 
        dose_base = aplicarClampingSuperficial(dose_base);
        auditoria.fracionamento_superficial = 0.25;
        auditoria.clamping_superficial_aplicado = true;
      } else {
        estado_motor = 'PDI_CALAGEM_INCORPORADA';
        modo_aplicacao = 'INCORPORADO';
      }
    } else {
      estado_motor = 'PDI_SEM_CALAGEM';
    }
  }

  // ==========================================
  // ROTA 3: PLANTIO DIRETO - CONSOLIDADO
  // ==========================================
  else if (sistema_manejo === 'PD_CONSOLIDADO') {
    const amostra010 = amostras.find(a => a.profundidade === '0-10')!;
    const amostra1020 = amostras.find(a => a.profundidade === '10-20')!;

    // Trava de V% e m% na superfície
    if (soloSuperficialAtingiuMeta(amostra010.v_pct, amostra010.m_pct)) {
      estado_motor = 'PDC_SEM_CALAGEM_TRAVA_V_M';
      auditoria.regras_disparadas.push('TRAVA_SUPERFICIAL_ATINGIDA');
    } else {
      // Avalia restrição no subsolo
      const subsoloRestritivo = amostra1020.m_pct !== undefined && amostra1020.m_pct > 10;
      
      if (subsoloRestritivo) {
        estado_motor = 'PDC_CENARIO_REINICIO_PD';
        necessita_calagem = true;
        modo_aplicacao = 'INCORPORADO'; // Reinício sugere revolvimento
        auditoria.regras_disparadas.push('PDC_SUBSOLO_RESTRITIVO');
        alertas.push({ codigo: 'W001', nivel: 'warning', mensagem: 'Cenário de reinício sugerido. Exige validação agronômica de campo.' });

        const smpMedio = calcularMediaSmp(amostra010.indice_smp, amostra1020.indice_smp);
        auditoria.smp_medio = smpMedio;
        auditoria.amostra_decisoria = 'MEDIA_0_10_10_20';
        dose_base = calcularNcViaTabelaSmp(smpMedio, 6.0);

      } else {
        estado_motor = 'PDC_CALAGEM_SUPERFICIAL';
        necessita_calagem = true;
        modo_aplicacao = 'SUPERFICIAL';
        auditoria.amostra_decisoria = '0-10';
        
        dose_base = calcularNcViaTabelaSmp(amostra010.indice_smp, 6.0);
        dose_base = aplicarFracionamento(dose_base, 0.5); // Superficial divide a dose do SMP por 2 ou 3, padrão RS/SC manual
        dose_base = aplicarClampingSuperficial(dose_base);
        auditoria.fracionamento_superficial = 0.5;
        auditoria.clamping_superficial_aplicado = true;
      }
    }
  }

  // ==========================================
  // FINALIZAÇÃO E RETORNO
  // ==========================================
  auditoria.dose_antes_prnt_t_ha = dose_base;
  const dose_final_t_ha = aplicarPrnt(dose_base, prnt_pct);

  return {
    sucesso: true,
    versao_regra: dados.versao_regra,
    sistema_manejo,
    estado_motor,
    necessita_calagem,
    modo_aplicacao,
    metodo_nc_utilizado,
    dose_base_prnt100_t_ha: dose_base,
    prnt_utilizado_pct: prnt_pct,
    dose_final_t_ha,
    mensagem_principal: necessita_calagem 
      ? `Calagem recomendada: ${dose_final_t_ha} t/ha (${modo_aplicacao})` 
      : 'Solo não necessita de calagem.',
    alertas,
    auditoria
  };
}