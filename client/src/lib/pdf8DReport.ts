import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DefectData {
  id: number;
  docNumber?: string | null;
  supplier?: string | null;
  model?: string | null;
  pn?: string | null;
  material?: string | null;
  description?: string | null;
  symptom?: string | null;
  cause?: string | null;
  correctiveAction?: string | null;
  area?: string | null;
  client?: string | null;
  mg?: string | null;
  openDate?: string | null;
  targetDate?: string | null;
  dateDisposition?: string | null;
  dateTechAnalysis?: string | null;
  dateRootCause?: string | null;
  dateCorrectiveAction?: string | null;
  dateValidation?: string | null;
  status?: string | null;
  step?: string;
  currentResponsible?: string;
  agingTotal?: number;
  agingByStep?: number;
  bucketAging?: string;
  system?: string | null;
}

interface Comment {
  userName: string;
  content: string;
  createdAt: string | Date;
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  uploadedByName: string;
  createdAt: string | Date;
}

interface AuditLog {
  action: string;
  details: string;
  userName: string;
  createdAt: string | Date;
}

export interface PDF8DReportData {
  defect: DefectData;
  comments?: Comment[];
  attachments?: Attachment[];
  auditLogs?: AuditLog[];
}

const COLORS = {
  primary: [15, 23, 42] as [number, number, number],       // slate-900
  secondary: [71, 85, 105] as [number, number, number],    // slate-500
  accent: [14, 165, 233] as [number, number, number],      // sky-500
  success: [16, 185, 129] as [number, number, number],     // emerald-500
  warning: [245, 158, 11] as [number, number, number],     // amber-500
  danger: [239, 68, 68] as [number, number, number],       // red-500
  lightBg: [248, 250, 252] as [number, number, number],    // slate-50
  border: [226, 232, 240] as [number, number, number],     // slate-200
  white: [255, 255, 255] as [number, number, number],
};

function getStatusColor(status?: string | null): [number, number, number] {
  switch (status) {
    case 'CLOSED': return COLORS.success;
    case 'DELAYED': return COLORS.danger;
    case 'WAITING': return COLORS.warning;
    default: return COLORS.accent;
  }
}

function formatDate(date?: string | Date | null): string {
  if (!date) return '-';
  if (typeof date === 'string') return date;
  return new Date(date).toLocaleDateString('pt-BR');
}

export function generate8DReport(data: PDF8DReportData): void {
  const { defect, comments = [], attachments = [], auditLogs = [] } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ===== HEADER =====
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('QTrack System', margin, 15);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório 8D — ${defect.docNumber || 'N/A'}`, margin, 24);
  
  doc.setFontSize(8);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, margin, 31);
  
  // Status badge
  const statusColor = getStatusColor(defect.status);
  const statusText = defect.status || 'ONGOING';
  const statusWidth = doc.getTextWidth(statusText) + 10;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - margin - statusWidth, 10, statusWidth, 8, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, pageWidth - margin - statusWidth / 2, 15.5, { align: 'center' });
  
  y = 45;

  // ===== SECTION: DEFECT INFO =====
  function drawSectionTitle(title: string, icon?: string) {
    if (y > 260) { doc.addPage(); y = margin; }
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, y, 3, 8, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon ? icon + ' ' : ''}${title}`, margin + 6, y + 6);
    y += 12;
  }

  function drawInfoRow(label: string, value: string, colStart: number, colWidth: number) {
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, colStart, y);
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(value || '-', colStart, y + 5);
  }

  drawSectionTitle('Informações do Defeito');
  
  // Row 1
  const col1 = margin;
  const col2 = margin + contentWidth * 0.25;
  const col3 = margin + contentWidth * 0.5;
  const col4 = margin + contentWidth * 0.75;
  
  drawInfoRow('DOC Nº', defect.docNumber || '-', col1, contentWidth * 0.25);
  drawInfoRow('Fornecedor', defect.supplier || '-', col2, contentWidth * 0.25);
  drawInfoRow('Modelo', defect.model || '-', col3, contentWidth * 0.25);
  drawInfoRow('Status', defect.status || 'ONGOING', col4, contentWidth * 0.25);
  y += 12;

  // Row 2
  drawInfoRow('Part Number', defect.pn || '-', col1, contentWidth * 0.25);
  drawInfoRow('Material', defect.material || '-', col2, contentWidth * 0.25);
  drawInfoRow('Cliente', defect.client || '-', col3, contentWidth * 0.25);
  drawInfoRow('MG', defect.mg || '-', col4, contentWidth * 0.25);
  y += 12;

  // Row 3
  drawInfoRow('Área/Sistema', defect.area || defect.system || '-', col1, contentWidth * 0.25);
  drawInfoRow('Etapa Atual', defect.step || '-', col2, contentWidth * 0.25);
  drawInfoRow('Responsável', defect.currentResponsible || '-', col3, contentWidth * 0.25);
  drawInfoRow('Aging Total', `${defect.agingTotal || 0} dias`, col4, contentWidth * 0.25);
  y += 12;

  // Description
  if (defect.description) {
    drawInfoRow('Descrição', '', col1, contentWidth);
    y += 1;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(defect.description, contentWidth);
    doc.text(descLines, col1, y);
    y += descLines.length * 4 + 4;
  }

  // Symptom
  if (defect.symptom) {
    drawInfoRow('Sintoma', '', col1, contentWidth);
    y += 1;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const symptomLines = doc.splitTextToSize(defect.symptom, contentWidth);
    doc.text(symptomLines, col1, y);
    y += symptomLines.length * 4 + 4;
  }

  y += 5;

  // ===== SECTION: 8D TIMELINE =====
  drawSectionTitle('Linha do Tempo 8D');

  const steps = [
    { name: 'Abertura', date: defect.openDate },
    { name: 'Disposição', date: defect.dateDisposition },
    { name: 'Análise Técnica', date: defect.dateTechAnalysis },
    { name: 'Causa Raiz', date: defect.dateRootCause },
    { name: 'Ação Corretiva', date: defect.dateCorrectiveAction },
    { name: 'Validação', date: defect.dateValidation },
  ];

  autoTable(doc, {
    startY: y,
    head: [['Etapa', 'Data', 'Status']],
    body: steps.map(s => [
      s.name,
      formatDate(s.date),
      s.date ? '✓ Concluída' : '○ Pendente',
    ]),
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.lightBg,
    },
    columnStyles: {
      2: {
        fontStyle: 'bold',
      },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const text = data.cell.raw as string;
        if (text.startsWith('✓')) {
          data.cell.styles.textColor = COLORS.success;
        } else {
          data.cell.styles.textColor = COLORS.secondary;
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ===== SECTION: ROOT CAUSE =====
  if (defect.cause) {
    drawSectionTitle('Análise de Causa Raiz (D4)');
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const causeLines = doc.splitTextToSize(defect.cause, contentWidth - 10);
    doc.text(causeLines, margin + 5, y + 6);
    y += Math.max(20, causeLines.length * 4 + 10) + 5;
  }

  // ===== SECTION: CORRECTIVE ACTION =====
  if (defect.correctiveAction) {
    drawSectionTitle('Ação Corretiva (D6)');
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const actionLines = doc.splitTextToSize(defect.correctiveAction, contentWidth - 10);
    doc.text(actionLines, margin + 5, y + 6);
    y += Math.max(20, actionLines.length * 4 + 10) + 5;
  }

  // ===== SECTION: COMMENTS =====
  if (comments.length > 0) {
    if (y > 230) { doc.addPage(); y = margin; }
    drawSectionTitle('Comentários');
    
    autoTable(doc, {
      startY: y,
      head: [['Autor', 'Comentário', 'Data']],
      body: comments.map(c => [
        c.userName,
        c.content,
        formatDate(c.createdAt),
      ]),
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: COLORS.lightBg,
      },
      columnStyles: {
        1: { cellWidth: 'auto' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===== SECTION: AUDIT LOG =====
  if (auditLogs.length > 0) {
    if (y > 230) { doc.addPage(); y = margin; }
    drawSectionTitle('Histórico de Alterações');
    
    autoTable(doc, {
      startY: y,
      head: [['Ação', 'Detalhes', 'Usuário', 'Data']],
      body: auditLogs.slice(0, 15).map(a => [
        a.action,
        a.details.substring(0, 80) + (a.details.length > 80 ? '...' : ''),
        a.userName,
        formatDate(a.createdAt),
      ]),
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        lineColor: COLORS.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: COLORS.lightBg,
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===== FOOTER on each page =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Footer line
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
    // Footer text
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('QTrack System — Relatório 8D', margin, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // Save
  const fileName = `8D_Report_${defect.docNumber || defect.id}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
