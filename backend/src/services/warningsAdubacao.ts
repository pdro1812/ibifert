import { EntradaAdubacao } from "../schemas/adubacaoSchema";
import { classificarS, classificarMicronutriente, classificarCa, classificarMg } from "./tabelasAdubacaoGraos";
import { RENDIMENTO_MAXIMO_T_HA, formatarLimite } from "../schemas/limitesAgronomicos";

export interface AlertaAdubacao {
  nivel: 'INFO' | 'AVISO' | 'ERRO';
  codigo: string;
  mensagem: string;
}

export function gerarAlertasDiagnose(entrada: EntradaAdubacao): AlertaAdubacao[] {
  const alertas: AlertaAdubacao[] = [];

  // Rendimento acima do realista (docs_antigos/adubacao.md §6.2): aceito,
  // mas as doses sobem junto. Acima do limite o schema já recusou.
  const { razoavel } = RENDIMENTO_MAXIMO_T_HA[entrada.cultura];
  if (entrada.rendimento_esperado > razoavel) {
    alertas.push({
      nivel: 'AVISO',
      codigo: 'REND_ACIMA_RAZOAVEL',
      mensagem: `Rendimento esperado acima do máximo realista para a cultura (${formatarLimite(razoavel)} t/ha). Confirme o valor: as doses de N, P₂O₅ e K₂O aumentam com o rendimento.`,
    });
  }

  // Enxofre
  if (entrada.S !== undefined) {
    const exigente = ['soja', 'ervilha', 'ervilhaca', 'canola', 'nabo_forrageiro'].includes(entrada.cultura);
    const classeS = classificarS(entrada.S, exigente);
    if (classeS === 'baixo') {
      const critico = exigente ? 10 : 5;
      alertas.push({
        nivel: 'AVISO',
        codigo: 'S_BAIXO',
        mensagem: `S abaixo do teor crítico (${critico} mg/dm³). Aplicar 20 kg S-SO4²⁻/ha.`
      });
      if (entrada.cultura === 'soja') {
        alertas.push({
          nivel: 'INFO',
          codigo: 'S_SOJA_DICA',
          mensagem: "Pode-se substituir 1 saco de ureia/ha por 2 sacos de sulfato de amônio na 1ª cobertura."
        });
      }
    }
  }

  // Molibdênio
  if (entrada.cultura === 'soja' && entrada.pH_agua !== undefined && entrada.pH_agua < 5.5) {
    alertas.push({
      nivel: 'AVISO',
      codigo: 'MO_SOJA',
      mensagem: "pH < 5,5 pode reduzir eficiência da FBN. Considerar Mo: 12–25 g/ha via semente OU 25–50 g/ha via foliar (30–45 dias após emergência). Aplicar Mo ANTES do inoculante."
    });
  }

  // Micronutrientes
  const micros = [
    { key: 'Cu', val: entrada.Cu },
    { key: 'Zn', val: entrada.Zn },
    { key: 'B', val: entrada.B },
    { key: 'Mn', val: entrada.Mn }
  ] as const;

  for (const m of micros) {
    if (m.val !== undefined) {
      const classe = classificarMicronutriente(m.key, m.val);
      if (classe === 'baixo') {
        alertas.push({
          nivel: 'AVISO',
          codigo: `MICROS_${m.key}_BAIXO`,
          mensagem: `${m.key} em nível Baixo. Avaliar aplicação conforme recomendação específica da cultura.`
        });
      }
    }
  }

  // Ca e Mg
  if (entrada.Ca !== undefined) {
    if (classificarCa(entrada.Ca) === 'baixo') {
      alertas.push({ nivel: 'AVISO', codigo: 'CA_BAIXO', mensagem: "Cálcio em nível Baixo. Avaliar calagem." });
    }
  }
  if (entrada.Mg !== undefined) {
    if (classificarMg(entrada.Mg) === 'baixo') {
      alertas.push({ nivel: 'AVISO', codigo: 'MG_BAIXO', mensagem: "Magnésio em nível Baixo. Avaliar calagem com calcário dolomítico." });
    }
  }

  return alertas;
}
