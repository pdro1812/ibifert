import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const gerarPDFRelatorio = (dadosEntrada: any, resultado: any) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Cores da Identidade Visual
  const verdeEscuro = [21, 128, 61] as [number, number, number];
  const verdeMedio = [34, 197, 94] as [number, number, number];
  const verdeClaro = [240, 253, 244] as [number, number, number];
  const stone600 = [87, 83, 78] as [number, number, number];
  const stone400 = [168, 162, 158] as [number, number, number];

  // --- TRATAMENTO DO NOME DO ARQUIVO ---
  const identificacao = dadosEntrada.identificacao || '';
  const nomeArquivo = identificacao 
    ? `laudo-${identificacao.toLowerCase().replace(/\s+/g, '-')}.pdf`
    : 'laudo-ibiferti-calagem.pdf';

  // --- CABEÇALHO ---
  // Faixa lateral decorativa
  doc.setFillColor(...verdeMedio);
  doc.rect(0, 0, 5, 40, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...verdeEscuro);
  doc.text('IbIFerti', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...stone400);
  doc.text('RECOMENDAÇÃO AGRONÔMICA DE CALAGEM', 14, 26);

  // Data e Identificação (Lado Direito)
  doc.setFontSize(9);
  doc.setTextColor(...stone600);
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 196, 20, { align: 'right' });
  
  if (identificacao) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...stone600);
    doc.text(`Análise: ${identificacao}`, 14, 38);
  }

  doc.setDrawColor(231, 229, 228);
  doc.line(14, 42, 196, 42);

  // --- INFO GERAIS ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...stone600);
  doc.text('Contexto do Manejo', 14, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Sistema: ${dadosEntrada.sistema_manejo.replace('_', ' ')}`, 14, 58);
  doc.text(`Calcário (PRNT): ${resultado.prnt_utilizado_pct}%`, 70, 58);
  doc.text(`Manual: RS/SC (v1.6)`, 130, 58);

  // --- RESULTADO (CARD DE DESTAQUE) ---
  doc.setFillColor(...verdeClaro);
  doc.setDrawColor(...verdeMedio);
  doc.roundedRect(14, 65, 182, 35, 3, 3, 'FD');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...verdeEscuro);
  doc.text('DOSE RECOMENDADA', 22, 75);
  
  doc.setFontSize(28);
  doc.text(`${resultado.dose_final_t_ha}`, 22, 90);
  doc.setFontSize(14);
  doc.text('t/ha', 55, 90); // Unidade ao lado do número

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...stone600);
  doc.text(`Modo de Aplicação:`, 100, 75);
  doc.setFont('helvetica', 'bold');
  doc.text(`${resultado.modo_aplicacao}`, 100, 80);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Método de Cálculo:`, 100, 88);
  doc.setFont('helvetica', 'bold');
  doc.text(`${resultado.metodo_nc_utilizado}`, 100, 93);

  // --- INDICADORES VISUAIS (GRÁFICOS SIMPLES) ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...stone600);
  doc.text('Indicadores de Acidez (Média)', 14, 115);

  const amostraPrincipal = dadosEntrada.amostras[0];
  const phAtual = amostraPrincipal.ph || 0;
  const vAtual = amostraPrincipal.v_pct || 0;

  // Barra de pH (Escala 4 a 7)
  const drawBar = (y: number, label: string, valor: number, min: number, max: number, ideal: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...stone600);
    doc.text(label, 14, y);
    
    // Fundo da barra
    doc.setFillColor(245, 245, 244);
    doc.rect(40, y - 3, 100, 4, 'F');
    
    // Progresso (Normalizado)
    const larguraTotal = 100;
    const porc = Math.min(Math.max((valor - min) / (max - min), 0), 1);
    doc.setFillColor(...verdeMedio);
    doc.rect(40, y - 3, porc * larguraTotal, 4, 'F');

    // Marcador do Ideal
    const posIdeal = ((ideal - min) / (max - min)) * larguraTotal;
    doc.setDrawColor(34, 197, 94);
    doc.line(40 + posIdeal, y - 4, 40 + posIdeal, y + 2);

    doc.text(`${valor}`, 145, y);
    doc.setFontSize(7);
    doc.setTextColor(...stone400);
    doc.text(`(Ideal: ${ideal})`, 160, y);
  };

  drawBar(125, 'pH', phAtual, 4, 7, 6.0);
  drawBar(135, 'Saturação (V%)', vAtual, 0, 100, 70);

  // --- TABELA DE DADOS ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...stone600);
  doc.text('Detalhamento das Amostras', 14, 155);

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
    startY: 160,
    head: [['Camada', 'pH', 'SMP', 'M.O.%', 'V%', 'm%', 'Al']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 37, 36], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: stone600 },
    alternateRowStyles: { fillColor: [250, 250, 249] },
    margin: { left: 14, right: 14 }
  });

  // --- ALERTAS ---
  if (resultado.alertas && resultado.alertas.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 180;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(14, finalY + 10, 182, 20, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('Notas Técnicas:', 20, finalY + 17);
    
    doc.setFont('helvetica', 'normal');
    doc.text(resultado.alertas[0].mensagem, 20, finalY + 23, { maxWidth: 170 });
  }

  // --- RODAPÉ ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(7);
  doc.setTextColor(...stone400);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`IbIFerti Agronomia - Ibirubá/RS | Documento gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}`, 14, 285);
    doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
  }

  doc.save(nomeArquivo);
};