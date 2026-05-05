import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  detectarRestricaoMonitoramento,
  resolverSistemaEfetivo,
  type CalagemResultado,
  type EntradaCalagem,
} from '../schemas/calagemSchema';

interface GerarPDFParams {
  dadosEntrada: EntradaCalagem;
  resultado: CalagemResultado;
  localizacao?: {
    uf?: string;
    cidade?: string;
  };
}

function formatarNumero(
  valor: number | undefined,
  casas = 2,
  sufixo = ''
): string {
  if (valor === undefined || Number.isNaN(valor)) {
    return '—';
  }

  return `${valor.toFixed(casas).replace('.', ',')}${sufixo}`;
}

function formatarBooleano(valor: boolean | undefined): string {
  if (valor === undefined) {
    return '—';
  }

  return valor ? 'Sim' : 'Não';
}

function formatarSistemaManejo(valor: string): string {
  switch (valor) {
    case 'CONVENCIONAL':
      return 'Convencional';
    case 'PD_IMPLANTACAO':
      return 'Plantio Direto — Implantação';
    case 'PD_CONSOLIDADO':
      return 'Plantio Direto — Consolidado';
    case 'PD_COM_RESTRICAO':
      return 'Plantio Direto — Com Restrição';
    default:
      return valor;
  }
}

function construirNomeArquivo(identificacao?: string): string {
  if (!identificacao) {
    return 'laudo-ibiferti-calagem.pdf';
  }

  const slug = identificacao
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `laudo-${slug || 'ibiferti-calagem'}.pdf`;
}

export function gerarPDFRelatorio({
  dadosEntrada,
  resultado,
  localizacao,
}: GerarPDFParams): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const verdeEscuro = [21, 128, 61] as const;
  const verdeMedio = [34, 197, 94] as const;
  const verdeClaro = [240, 253, 244] as const;
  const stone900 = [28, 25, 23] as const;
  const stone700 = [68, 64, 60] as const;
  const stone500 = [120, 113, 108] as const;
  const stone300 = [214, 211, 209] as const;
  const laranja = [194, 65, 12] as const;
  const laranjaClaro = [255, 237, 213] as const;
  const azul = [30, 64, 175] as const;
  const azulClaro = [219, 234, 254] as const;

  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina = doc.internal.pageSize.getHeight();
  const margemEsquerda = 14;
  const margemDireita = 14;
  const larguraUtil = larguraPagina - margemEsquerda - margemDireita;
  const sistemaEfetivo = resolverSistemaEfetivo(dadosEntrada);
  const restricao10_20 = detectarRestricaoMonitoramento(dadosEntrada.monitoramento);
  const nomeArquivo = construirNomeArquivo(dadosEntrada.identificacao);
  const dataEmissao = new Date().toLocaleDateString('pt-BR');

  doc.setFillColor(...verdeMedio);
  doc.rect(0, 0, 6, 48, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...verdeEscuro);
  doc.text('IbIFerti', margemEsquerda, 18);

  doc.setFontSize(10);
  doc.setTextColor(...stone500);
  doc.text('RELATÓRIO DE RECOMENDAÇÃO DE CALAGEM', margemEsquerda, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...stone700);
  doc.text(`Emissão: ${dataEmissao}`, larguraPagina - margemDireita, 18, {
    align: 'right',
  });

  if (dadosEntrada.identificacao) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Identificação: ${dadosEntrada.identificacao}`, margemEsquerda, 36);
  }

  doc.setDrawColor(...stone300);
  doc.line(margemEsquerda, 42, larguraPagina - margemDireita, 42);

  const tituloPrincipal = resultado.aplicar_calcario
    ? 'Recomendação calculada'
    : 'Aplicação não recomendada';

  doc.setFillColor(...verdeClaro);
  doc.setDrawColor(...verdeMedio);
  doc.roundedRect(margemEsquerda, 50, larguraUtil, 34, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...verdeEscuro);
  doc.text(tituloPrincipal.toUpperCase(), margemEsquerda + 8, 60);

  if (resultado.aplicar_calcario) {
    doc.setFontSize(28);
    doc.text(formatarNumero(resultado.NC_ajustada, 2), margemEsquerda + 8, 76);
    doc.setFontSize(12);
    doc.text('t/ha', margemEsquerda + 40, 76);
  } else {
    doc.setFontSize(18);
    doc.text('SEM DOSE RECOMENDADA', margemEsquerda + 8, 74);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...stone700);
  doc.text(
    `Método: ${resultado.metodo_calc_roteado}`,
    margemEsquerda + 92,
    62
  );
  doc.text(
    `Modo: ${resultado.modo_aplicacao}`,
    margemEsquerda + 92,
    69
  );
  doc.text(
    `Sistema efetivo: ${formatarSistemaManejo(sistemaEfetivo)}`,
    margemEsquerda + 92,
    76
  );

  autoTable(doc, {
    startY: 92,
    theme: 'grid',
    margin: { left: margemEsquerda, right: margemDireita },
    head: [['Contexto do formulário', 'Valor']],
    body: [
      ['UF', localizacao?.uf || '—'],
      ['Cidade', localizacao?.cidade || '—'],
      ['Sistema selecionado', formatarSistemaManejo(dadosEntrada.sistema_manejo)],
      ['Primeira calagem', formatarBooleano(dadosEntrada.primeira_calagem)],
      ['pH em água', formatarNumero(dadosEntrada.pH_agua, 2)],
      ['SMP', formatarNumero(dadosEntrada.SMP, 2)],
      ['PRNT (%)', formatarNumero(dadosEntrada.PRNT, 2)],
      ['Sistema efetivo no cálculo', formatarSistemaManejo(sistemaEfetivo)],
      ['Fluxo com restrição 10–20 cm', formatarBooleano(restricao10_20)],
    ],
    headStyles: {
      fillColor: [...stone900],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [...stone700],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249],
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });

  const ultimaTabela = (doc as jsPDF & {
    lastAutoTable?: { finalY: number };
  }).lastAutoTable;
  let cursorY = (ultimaTabela?.finalY ?? 120) + 8;

  const linhasEntradaSoloBrutas: Array<[string, string]> = [
    ['V atual (%)', formatarNumero(dadosEntrada.V_atual, 2)],
    ['CTC pH7 (cmolc/dm³)', formatarNumero(dadosEntrada.CTC_pH7, 2)],
    ['Al_sat (%)', formatarNumero(dadosEntrada.Al_sat, 2)],
    ['MO (%)', formatarNumero(dadosEntrada.MO, 2)],
    ['Al_trocável (cmolc/dm³)', formatarNumero(dadosEntrada.Al_trocavel, 2)],
    [
      'Superficial em campo natural',
      formatarBooleano(dadosEntrada.opcao_superficial_campo_natural),
    ],
    ['SMP 10–20 cm', formatarNumero(dadosEntrada.SMP_10_20, 2)],
  ];
  const linhasEntradaSolo = linhasEntradaSoloBrutas.filter(
    ([, valor]) => valor !== '—'
  );

  if (linhasEntradaSolo.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      theme: 'striped',
      margin: { left: margemEsquerda, right: margemDireita },
      head: [['Dados complementares informados', 'Valor']],
      body: linhasEntradaSolo,
      headStyles: {
        fillColor: [...azul],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [...stone700],
      },
      alternateRowStyles: {
        fillColor: [...azulClaro],
      },
      columnStyles: {
        0: { cellWidth: 90, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
    });

    cursorY = (((doc as jsPDF & {
      lastAutoTable?: { finalY: number };
    }).lastAutoTable?.finalY) ?? cursorY) + 8;
  }

  if (dadosEntrada.monitoramento) {
    autoTable(doc, {
      startY: cursorY,
      theme: 'striped',
      margin: { left: margemEsquerda, right: margemDireita },
      head: [['Monitoramento 10–20 cm', 'Valor']],
      body: [
        [
          'pH em água 10–20 cm',
          formatarNumero(dadosEntrada.monitoramento.pH_agua_10_20, 2),
        ],
        [
          'Al_sat 10–20 cm (%)',
          formatarNumero(dadosEntrada.monitoramento.Al_sat_10_20, 2),
        ],
        [
          'P abaixo do crítico',
          formatarBooleano(
            dadosEntrada.monitoramento.disponibilidade_P_10_20_abaixo_critico
          ),
        ],
        [
          'Compactação restringindo raiz',
          formatarBooleano(
            dadosEntrada.monitoramento.compactacao_restringindo_raiz
          ),
        ],
        [
          'Produtividade abaixo da média',
          formatarBooleano(dadosEntrada.monitoramento.produtividade_abaixo_media),
        ],
      ],
      headStyles: {
        fillColor: [...stone900],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [...stone700],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 249],
      },
      columnStyles: {
        0: { cellWidth: 90, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
    });

    cursorY = (((doc as jsPDF & {
      lastAutoTable?: { finalY: number };
    }).lastAutoTable?.finalY) ?? cursorY) + 8;
  }

  autoTable(doc, {
    startY: cursorY,
    theme: 'grid',
    margin: { left: margemEsquerda, right: margemDireita },
    head: [['Resultado agronômico', 'Valor']],
    body: [
      ['Aplicar calcário', formatarBooleano(resultado.aplicar_calcario)],
      ['NC base (t/ha)', formatarNumero(resultado.NC_base, 2)],
      ['NC final (t/ha)', formatarNumero(resultado.NC_final, 2)],
      ['NC ajustada (t/ha)', formatarNumero(resultado.NC_ajustada, 2)],
      ['NC SMP (t/ha)', formatarNumero(resultado.NC_smp, 2)],
      ['NC VB (t/ha)', formatarNumero(resultado.NC_vb, 2)],
      ['Fator de manejo', formatarNumero(resultado.fator_manejo, 2)],
      ['Método roteado', resultado.metodo_calc_roteado],
      ['Modo de aplicação', resultado.modo_aplicacao],
      [
        'Profundidade recomendada',
        resultado.profundidade_cm ? `${resultado.profundidade_cm} cm` : '—',
      ],
      ['Ação requerida', resultado.acao_requerida || '—'],
    ],
    headStyles: {
      fillColor: [...verdeEscuro],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [...stone700],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249],
    },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });

  cursorY = (((doc as jsPDF & {
    lastAutoTable?: { finalY: number };
  }).lastAutoTable?.finalY) ?? cursorY) + 10;

  if (resultado.nota_tecnica) {
    doc.setFillColor(...azulClaro);
    doc.setDrawColor(...azul);
    const notaLinhas = doc.splitTextToSize(resultado.nota_tecnica, larguraUtil - 12);
    const alturaBloco = 10 + notaLinhas.length * 5;

    doc.roundedRect(margemEsquerda, cursorY, larguraUtil, alturaBloco, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...azul);
    doc.text('Nota Técnica', margemEsquerda + 6, cursorY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...stone700);
    doc.text(notaLinhas, margemEsquerda + 6, cursorY + 13);

    cursorY += alturaBloco + 8;
  }

  if (resultado.alertas.length > 0) {
    doc.setFillColor(...laranjaClaro);
    doc.setDrawColor(...laranja);
    const alertasLinhas = resultado.alertas.flatMap((alerta) =>
      doc.splitTextToSize(`• ${alerta}`, larguraUtil - 12)
    );
    const alturaBloco = 10 + alertasLinhas.length * 5;

    doc.roundedRect(margemEsquerda, cursorY, larguraUtil, alturaBloco, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...laranja);
    doc.text('Alertas e observações', margemEsquerda + 6, cursorY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...stone700);
    doc.text(alertasLinhas, margemEsquerda + 6, cursorY + 13);
  }

  const totalPaginas = doc.getNumberOfPages();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...stone500);

  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina);
    doc.text(
      `IbIFerti | Documento gerado eletronicamente em ${dataEmissao}`,
      margemEsquerda,
      alturaPagina - 8
    );
    doc.text(
      `Página ${pagina} de ${totalPaginas}`,
      larguraPagina - margemDireita,
      alturaPagina - 8,
      { align: 'right' }
    );
  }

  doc.save(nomeArquivo);
}
