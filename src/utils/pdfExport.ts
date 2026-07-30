import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Convenio } from '../types';

interface PDFExportOptions {
  convenios: Convenio[];
  filters: {
    searchQuery?: string;
    filterStatus?: string;
    filterPlan?: string;
    filterFacultad?: string;
  };
}

export function generateConveniosPDF({ convenios, filters }: PDFExportOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Currency Formatter
  const formatCOP = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '$ 0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Status helper
  const getStatusText = (c: Convenio) => {
    if (c.fecha_suspension && !c.fecha_reinicio) return 'SUSPENDIDO';
    const effectiveDate = c.fecha_terminacion_prorroga || c.fecha_terminacion_ampliacion || c.fecha_terminacion;
    if (effectiveDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(effectiveDate);
      expDate.setHours(0, 0, 0, 0);
      if (expDate < today) return 'VENCIDO';
      
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 90) return 'CERCA A VENCER';
    }
    return 'VIGENTE';
  };

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('GESTOR DE CONVENIOS - REPORTE EJECUTIVO', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generado: ${dateStr}`, 283, 12, { align: 'right' });
  doc.text(`Total registros: ${convenios.length}`, 283, 17, { align: 'right' });

  let y = 28;

  // Active Filters Box
  const activeFilters = [];
  if (filters.searchQuery?.trim()) activeFilters.push(`Búsqueda: "${filters.searchQuery.trim()}"`);
  if (filters.filterStatus && filters.filterStatus !== 'all') {
    const mapStatus: Record<string, string> = {
      active: 'Activos / Vigentes',
      alert: 'Con Alertas Activas',
      expired: 'Vencidos',
      suspended: 'Suspendidos'
    };
    activeFilters.push(`Estado: ${mapStatus[filters.filterStatus] || filters.filterStatus}`);
  }
  if (filters.filterPlan) activeFilters.push(`Plan: ${filters.filterPlan}`);
  if (filters.filterFacultad) activeFilters.push(`Facultad: ${filters.filterFacultad}`);

  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(14, y, 269, 14, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('FILTROS APLICADOS EN EL REPORTE:', 18, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const filterText = activeFilters.length > 0 ? activeFilters.join('  |  ') : 'Sin filtros (Todos los convenios)';
  doc.text(filterText, 18, y + 10.5);

  y += 18;

  // Financial & Executive Summary Cards
  const totalValue = convenios.reduce((acc, c) => acc + (c.valor || 0), 0);
  const totalVigentes = convenios.filter(c => getStatusText(c) === 'VIGENTE').length;
  const totalProximos = convenios.filter(c => getStatusText(c) === 'CERCA A VENCER').length;
  const totalVencidos = convenios.filter(c => getStatusText(c) === 'VENCIDO').length;
  const totalSuspendidos = convenios.filter(c => getStatusText(c) === 'SUSPENDIDO').length;

  const cardWidth = 51;
  const cardHeight = 16;
  const cardsData = [
    { label: 'CONVENIOS', value: `${convenios.length}`, sub: 'Registros listados', bg: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] },
    { label: 'MONTO TOTAL', value: formatCOP(totalValue), sub: 'Suma financiada', bg: [236, 253, 245], border: [167, 243, 208], text: [4, 120, 87] },
    { label: 'VIGENTES', value: `${totalVigentes}`, sub: 'En ejecución normal', bg: [240, 253, 244], border: [187, 247, 208], text: [21, 128, 61] },
    { label: 'PRÓXIMOS A VENCER', value: `${totalProximos}`, sub: 'Menos de 90 días', bg: [255, 251, 235], border: [253, 230, 138], text: [180, 83, 9] },
    { label: 'VENCIDOS / SUSP.', value: `${totalVencidos + totalSuspendidos}`, sub: `${totalVencidos} vencidos, ${totalSuspendidos} susp.`, bg: [254, 242, 242], border: [254, 202, 202], text: [185, 28, 28] },
  ];

  cardsData.forEach((card, idx) => {
    const x = 14 + idx * (cardWidth + 3.5);
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(card.text[0], card.text[1], card.text[2]);
    doc.text(card.label, x + 3, y + 4.5);

    doc.setFontSize(10);
    doc.text(card.value, x + 3, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.sub, x + 3, y + 14);
  });

  y += cardHeight + 6;

  // Main Table Columns & Data
  const tableColumns = [
    { header: 'Código', dataKey: 'codigo' },
    { header: 'No. Contrato', dataKey: 'no_convenio' },
    { header: 'Título del Proyecto', dataKey: 'titulo' },
    { header: 'Facultad / Tipología', dataKey: 'facultad' },
    { header: 'Investigador Principal', dataKey: 'investigador' },
    { header: 'Valor Financiado', dataKey: 'valor' },
    { header: 'F. Inicio', dataKey: 'f_inicio' },
    { header: 'F. Vencimiento Efectivo', dataKey: 'f_vencimiento' },
    { header: 'Estado', dataKey: 'estado' },
  ];

  const tableData = convenios.map((c) => {
    const effectiveDate = c.fecha_terminacion_prorroga || c.fecha_terminacion_ampliacion || c.fecha_terminacion || 'N/A';
    const status = getStatusText(c);

    let vType = '';
    if (c.fecha_terminacion_prorroga) vType = ' (Prórroga)';
    else if (c.fecha_terminacion_ampliacion) vType = ' (Ampliación)';

    return {
      codigo: c.codigo || '-',
      no_convenio: c.no_convenio || '-',
      titulo: c.titulo_proyecto || '-',
      facultad: `${c.facultad || 'Sin Facultad'}\n${c.tipologia ? `[${c.tipologia}]` : ''}`,
      investigador: c.investigador_principal ? `${c.investigador_principal}\n${c.correo_investigador || ''}` : '-',
      valor: formatCOP(c.valor),
      f_inicio: c.fecha_inicio || '-',
      f_vencimiento: `${effectiveDate}${vType}`,
      estado: status,
    };
  });

  autoTable(doc, {
    startY: y,
    head: [tableColumns.map(col => col.header)],
    body: tableData.map(row => [
      row.codigo,
      row.no_convenio,
      row.titulo,
      row.facultad,
      row.investigador,
      row.valor,
      row.f_inicio,
      row.f_vencimiento,
      row.estado,
    ]),
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' }, // Código
      1: { cellWidth: 24 }, // No Contrato
      2: { cellWidth: 65 }, // Título
      3: { cellWidth: 38 }, // Facultad
      4: { cellWidth: 40 }, // Investigador
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }, // Valor
      6: { cellWidth: 20, halign: 'center' }, // Inicio
      7: { cellWidth: 26, halign: 'center' }, // Vencimiento
      8: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }, // Estado
    },
    didParseCell: (data) => {
      // Highlight status column
      if (data.section === 'body' && data.column.index === 8) {
        const text = String(data.cell.raw);
        if (text === 'SUSPENDIDO') {
          data.cell.styles.textColor = [161, 98, 7]; // Yellow-700
          data.cell.styles.fillColor = [254, 249, 195];
        } else if (text === 'VENCIDO') {
          data.cell.styles.textColor = [185, 28, 28]; // Red-700
          data.cell.styles.fillColor = [254, 226, 226];
        } else if (text === 'CERCA A VENCER') {
          data.cell.styles.textColor = [180, 83, 9]; // Amber-700
          data.cell.styles.fillColor = [254, 243, 199];
        } else if (text === 'VIGENTE') {
          data.cell.styles.textColor = [21, 128, 61]; // Green-700
          data.cell.styles.fillColor = [220, 252, 231];
        }
      }
    },
    didDrawPage: (data) => {
      // Page Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${currentPage} de ${totalPages} - Sistema Gestor de Convenios`,
        14,
        202
      );
      doc.text(
        'Documento generado para fiscalización y control administrativo interno.',
        283,
        202,
        { align: 'right' }
      );
    },
  });

  // Save the PDF file
  const fileName = `Informe_Convenios_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
