import { describe, expect, test } from 'vitest';
import {
  extrairDoses,
  organizarRecomendacaoAdubacao,
  type AlertaAdubacao,
} from './organizarRecomendacaoAdubacao';

// Mensagens iguais às geradas por backend/src/services/warningsAdubacao.ts
// e motorAdubacao.ts.
const ALERTAS: AlertaAdubacao[] = [
  { nivel: 'AVISO', codigo: 'S_BAIXO', mensagem: 'S abaixo do teor crítico (10 mg/dm³). Aplicar 20 kg S-SO4²⁻/ha.' },
  { nivel: 'INFO', codigo: 'S_SOJA_DICA', mensagem: 'Pode-se substituir 1 saco de ureia/ha por 2 sacos de sulfato de amônio na 1ª cobertura.' },
  { nivel: 'AVISO', codigo: 'MO_SOJA', mensagem: 'pH < 5,5 pode reduzir eficiência da FBN. Considerar Mo: 12–25 g/ha via semente OU 25–50 g/ha via foliar (30–45 dias após emergência). Aplicar Mo ANTES do inoculante.' },
  { nivel: 'AVISO', codigo: 'MICROS_Zn_BAIXO', mensagem: 'Zn em nível Baixo. Avaliar aplicação conforme recomendação específica da cultura.' },
  { nivel: 'AVISO', codigo: 'MICROS_B_BAIXO', mensagem: 'B em nível Baixo. Avaliar aplicação conforme recomendação específica da cultura.' },
  { nivel: 'AVISO', codigo: 'CA_BAIXO', mensagem: 'Cálcio em nível Baixo. Avaliar calagem.' },
  { nivel: 'INFO', codigo: 'BNF_INOCULAR', mensagem: 'Recomenda-se inoculação com rizóbio apropriado.' },
  { nivel: 'AVISO', codigo: 'K_LIMITE_SEMEADURA', mensagem: 'K₂O total (120 kg/ha) excede 80 kg/ha na linha. Aplicar 80 kg na semeadura e 40 kg em cobertura ou a lanço.' },
  { nivel: 'AVISO', codigo: 'N_CEVADA_CERVEJEIRA', mensagem: 'CEVADA CERVEJEIRA — Malte Tipo Único: NÃO aplicar N após o espigamento.' },
];

const RESULTADO = {
  recomendacao: {
    n: { dose_total_kg_ha: 0, tipo: 'FBN (0 N)' },
    p2o5: { dose_total_kg_ha: 90, tipo_adubacao: 'Manutenção' },
    k2o: { dose_total_kg_ha: 120, k2o_semeadura_kg_ha: 80, k2o_complementar_kg_ha: 40, tipo_adubacao: 'Manutenção' },
  },
  alertas: ALERTAS,
};

describe('organizarRecomendacaoAdubacao', () => {
  const org = organizarRecomendacaoAdubacao(RESULTADO);

  test('macronutrientes: N, P₂O₅, K₂O com as doses do motor e o enxofre quando recomendado', () => {
    expect(org.macronutrientes.map((l) => l.nutriente)).toEqual(['Nitrogênio (N)', 'Fósforo (P₂O₅)', 'Potássio (K₂O)', 'Enxofre (S)']);
    expect(org.macronutrientes[1].dose).toBe('90 kg/ha');
    expect(org.macronutrientes[2].orientacao).toContain('Linha: 80 kg/ha | Lanço: 40 kg/ha');
    expect(org.macronutrientes[3].dose).toBe('20 kg S-SO4²⁻/ha');
  });

  test('micronutrientes: só os que têm recomendação (baixos e Mo da soja)', () => {
    expect(org.micronutrientes.map((l) => l.nutriente)).toEqual(['Molibdênio (Mo)', 'Zinco (Zn)', 'Boro (B)']);
    expect(org.micronutrientes[0].dose).toBe('12–25 g/ha via semente ou 25–50 g/ha via foliar');
    expect(org.micronutrientes[1].dose).toBe('—');
  });

  test('observações técnicas e alertas separados', () => {
    expect(org.observacoes.map((a) => a.codigo)).toEqual(['S_SOJA_DICA', 'BNF_INOCULAR', 'K_LIMITE_SEMEADURA']);
    expect(org.alertas.map((a) => a.codigo)).toEqual(['CA_BAIXO', 'N_CEVADA_CERVEJEIRA']);
  });

  test('nenhuma mensagem duplicada nem perdida', () => {
    const recomendacoesDeAlerta = org.macronutrientes.length - 3 + org.micronutrientes.length;
    expect(recomendacoesDeAlerta + org.observacoes.length + org.alertas.length).toBe(ALERTAS.length);
  });

  test('código desconhecido cai pelo nível', () => {
    const outro = organizarRecomendacaoAdubacao({
      ...RESULTADO,
      alertas: [
        { nivel: 'INFO', codigo: 'NOVO_INFO', mensagem: 'x' },
        { nivel: 'AVISO', codigo: 'NOVO_AVISO', mensagem: 'y' },
      ],
    });
    expect(outro.observacoes.map((a) => a.codigo)).toEqual(['NOVO_INFO']);
    expect(outro.alertas.map((a) => a.codigo)).toEqual(['NOVO_AVISO']);
  });

  test('extrairDoses sem dose numérica devolve travessão', () => {
    expect(extrairDoses('Avaliar calagem.')).toBe('—');
  });
});
