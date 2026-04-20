import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const gerarPDFRelatorio = (dadosEntrada: any, resultado: any) => {
  // Cria um documento A4 em modo retrato (portrait)
  const doc = new jsPDF('p', 'mm', 'a4');

  // Configurações de cores (RGB)
  const corPrimaria = [34, 197, 94] as [number, number, number]; // Verde
  const corTexto = [87, 83, 78] as [number, number, number]; // Stone

  // --- CABEÇALHO ---
  doc.setFontSize(22);
  doc.setTextColor(...corPrimaria);
  doc.text('IbIFerti - Laudo de Calagem', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Baseado nas diretrizes do Manual de Adubação e Calagem RS/SC', 14, 26);
  
  // Linha separadora
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 30, 196, 30);

  // --- DADOS GERAIS ---
  doc.setFontSize(12);
  doc.setTextColor(...corTexto);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 40);
  doc.text(`Sistema de Manejo: ${dadosEntrada.sistema_manejo.replace('_', ' ')}`, 14, 48);
  doc.text(`PRNT Utilizado: ${resultado.prnt_utilizado_pct}%`, 14, 56);

  // --- RESULTADO PRINCIPAL ---
  // Uma caixa de destaque para a dose
  doc.setFillColor(240, 253, 244); // Fundo verde super claro
  doc.roundedRect(14, 65, 182, 30, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61); // Verde escuro
  doc.text('Recomendação Final', 20, 75);
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${resultado.dose_final_t_ha} t/ha`, 20, 86);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...corTexto);
  doc.text(`Modo: ${resultado.modo_aplicacao}`, 100, 75);
  doc.text(`Método: ${resultado.metodo_nc_utilizado}`, 100, 83);

  // --- TABELA DE AMOSTRAS ---
  doc.setFontSize(14);
  doc.text('Dados da Análise de Solo', 14, 110);

  const tableData = dadosEntrada.amostras.map((a: any) => [
    `${a.profundidade} cm`, 
    a.ph || '-', 
    a.indice_smp || '-', 
    a.mo_pct || '-', 
    a.v_pct || '-', 
    a.m_pct || '-', 
    a.al_cmolc_dm3 || '-'
  ]);

  autoTable(doc, {
    startY: 115,
    head: [['Camada', 'pH H2O', 'Índice SMP', 'M.O. (%)', 'V (%)', 'm (%)', 'Al']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: corPrimaria, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [250, 250, 249] }
  });

  // --- ALERTAS (SE HOUVER) ---
  if (resultado.alertas && resultado.alertas.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 115;
    doc.setTextColor(220, 38, 38); // Vermelho
    doc.setFont('helvetica', 'bold');
    doc.text('Observações e Alertas:', 14, finalY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    resultado.alertas.forEach((alerta: any, index: number) => {
      doc.text(`• ${alerta.mensagem}`, 14, finalY + 22 + (index * 7));
    });
  }

  // --- RODAPÉ ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Gerado por IbIFerti - Ibirubá/RS', 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 180, 290);
  }

  // Baixa o arquivo
  doc.save('laudo-ibiferti-calagem.pdf');
};