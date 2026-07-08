import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EntradaAdubacao } from '../schemas/adubacaoSchema';

export interface GerarPDFAdubacaoParams {
  dadosEntrada: EntradaAdubacao;
  resultado: any;
  identificacao?: string;
  uf?: string;
  cidade?: string;
}

function formatarNumero(valor: number | undefined, casas = 2, sufixo = ''): string {
  if (valor === undefined || Number.isNaN(valor)) return '—';
  return `${valor.toFixed(casas).replace('.', ',')}${sufixo}`;
}

function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/₂/g, '2')
    .replace(/₅/g, '5')
    .replace(/²/g, '2')
    .replace(/⁻/g, '-')
    .replace(/³/g, '3');
}

export function gerarPDFRelatorioAdubacao({
  dadosEntrada,
  resultado,
  identificacao,
  uf,
  cidade,
}: GerarPDFAdubacaoParams) {
  const doc = new jsPDF();
  const title = 'Relatório Ibiferti - Adubação (Grãos)';
  const date = new Date().toLocaleDateString('pt-BR');

  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // green-600
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Data da geração: ${date}`, 14, 26);

  if (identificacao) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Identificação: ${identificacao}`, 14, 32);
    doc.setFont('helvetica', 'normal');
  }

  if (uf && cidade) {
    doc.text(`Localização: ${cidade} - ${uf}`, 14, identificacao ? 38 : 32);
  }

  let finalY = identificacao ? (uf ? 46 : 40) : (uf ? 40 : 34);

  // Informações de Cultura e Manejo
  autoTable(doc, {
    startY: finalY,
    head: [['Informações de Cultura e Manejo', '']],
    body: [
      ['Cultura', dadosEntrada.cultura],
      ['Rendimento Esperado', `${formatarNumero(dadosEntrada.rendimento_esperado, 1)} t/ha`],
      ['Cultivo / Correção', `${dadosEntrada.num_cultivo}º Cultivo | ${dadosEntrada.tipo_correcao}`],
      ['Sistema de Cultivo', dadosEntrada.sistema_cultivo],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  // Análise de Solo
  autoTable(doc, {
    startY: finalY,
    head: [['Dados Informados (Solo)', 'Valores']],
    body: [
      ['Argila', `${formatarNumero(dadosEntrada.argila, 1, '%')}`],
      ['Matéria Orgânica (M.O.)', `${formatarNumero(dadosEntrada.MO, 1, '%')}`],
      ['CTC a pH 7.0', sanitizeText(`${formatarNumero(dadosEntrada.CTC_pH7, 1, ' cmolc/dm³')}`)],
      ['Fósforo (P) / Método', sanitizeText(`${formatarNumero(dadosEntrada.P, 1, ' mg/dm³')} (${dadosEntrada.metodo_P})`)],
      ['Potássio (K) / Método', sanitizeText(`${formatarNumero(dadosEntrada.K, 1, ' mg/dm³')} (${dadosEntrada.metodo_K})`)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 37, 36], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  // Classificação
  autoTable(doc, {
    startY: finalY,
    head: [['Diagnóstico Agronômico', 'Classe']],
    body: [
      ['Argila', resultado.classificacao_solo.argila_classe],
      ['Matéria Orgânica', resultado.classificacao_solo.mo_classe],
      ['CTC', resultado.classificacao_solo.ctc_classe],
      ['Fósforo (P)', resultado.classificacao_solo.p_classe],
      ['Potássio (K)', resultado.classificacao_solo.k_classe],
    ],
    theme: 'grid',
    headStyles: { fillColor: [87, 83, 78], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  // Recomendação
  autoTable(doc, {
    startY: finalY,
    head: [['Nutriente', 'Dose Total (kg/ha)', 'Tipo / Aplicação']],
    body: [
      ['Nitrogênio (N)', formatarNumero(resultado.recomendacao.n.dose_total_kg_ha, 0), sanitizeText(resultado.recomendacao.n.tipo)],
      ['Fósforo (P2O5)', formatarNumero(resultado.recomendacao.p2o5.dose_total_kg_ha, 0), sanitizeText(resultado.recomendacao.p2o5.tipo_adubacao)],
      ['Potássio (K2O)', formatarNumero(resultado.recomendacao.k2o.dose_total_kg_ha, 0), sanitizeText(`Semeadura: ${formatarNumero(resultado.recomendacao.k2o.k2o_semeadura_kg_ha, 0)} | Cobertura/Lanço: ${formatarNumero(resultado.recomendacao.k2o.k2o_complementar_kg_ha, 0)}`)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { halign: 'center', cellWidth: 40 } },
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  // Alertas
  if (resultado.alertas && resultado.alertas.length > 0) {
    autoTable(doc, {
      startY: finalY,
      head: [['Alertas e Observações Técnicas']],
      body: resultado.alertas.map((a: any) => [`[${a.nivel}] ${sanitizeText(a.mensagem)}`]),
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8], textColor: [255, 255, 255] },
      styles: { overflow: 'linebreak', cellWidth: 'wrap' },
    });
  }

  const nomeArquivo = identificacao
    ? `adubacao-${identificacao.toLowerCase().replace(/\s+/g, '-')}.pdf`
    : 'laudo-ibiferti-adubacao.pdf';

  doc.save(nomeArquivo);
}
