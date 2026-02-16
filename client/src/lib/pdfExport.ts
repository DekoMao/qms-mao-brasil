import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DefectData {
  id: number;
  docNumber: string;
  openDate: string;
  supplier: string | null;
  model: string | null;
  customer: string | null;
  pn: string | null;
  material: string | null;
  symptom: string | null;
  description: string | null;
  cause: string | null;
  correctiveActions: string | null;
  mg: string | null;
  defectsSeverity: string | null;
  category: string | null;
  detection: string | null;
  rate: string | null;
  qty: number | null;
  step: string;
  status: string;
  currentResponsible: string;
  agingTotal: number;
  agingByStep: number;
  daysLate: number;
  bucketAging: string;
  owner: string | null;
  targetDate: string | null;
  trackingProgress: string | null;
  supplyFeedback: string | null;
  statusSupplyFB: string | null;
  dateDisposition: string | null;
  dateTechAnalysis: string | null;
  dateRootCause: string | null;
  dateCorrectiveAction: string | null;
  dateValidation: string | null;
  checkSolution: boolean;
  qcrNumber: string | null;
  occurrence: string | null;
}

interface CommentData {
  userName: string | null;
  content: string;
  createdAt: string | Date;
}

interface AttachmentData {
  fileName: string;
  mimeType: string | null;
  createdAt: string | Date;
}

export function generateDefect8DReport(
  defect: DefectData,
  comments: CommentData[] = [],
  attachments: AttachmentData[] = [],
  lang: 'pt-BR' | 'en' = 'pt-BR'
) {
  const doc = new jsPDF();
  const isPt = lang === 'pt-BR';
  
  const primaryColor: [number, number, number] = [15, 23, 42]; // slate-900
  const accentColor: [number, number, number] = [59, 130, 246]; // blue-500
  const dangerColor: [number, number, number] = [239, 68, 68]; // red-500
  
  let yPos = 15;
  
  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('QTrack System', 15, 15);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(isPt ? 'Relatório 8D' : '8D Report', 15, 23);
  
  doc.setFontSize(9);
  doc.text(`DOC: ${defect.docNumber}`, 15, 30);
  doc.text(
    `${isPt ? 'Gerado em' : 'Generated at'}: ${new Date().toLocaleDateString(lang)}`,
    210 - 15, 30, { align: 'right' }
  );
  
  yPos = 42;
  
  // Section helper
  const addSection = (title: string) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 15;
    }
    doc.setFillColor(...accentColor);
    doc.rect(15, yPos, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 18, yPos + 5);
    yPos += 12;
    doc.setTextColor(0, 0, 0);
  };
  
  // Key-value row helper
  const addRow = (label: string, value: string | null | undefined, options?: { danger?: boolean }) => {
    if (yPos > 275) {
      doc.addPage();
      yPos = 15;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 18, yPos);
    doc.setFont('helvetica', 'normal');
    if (options?.danger) {
      doc.setTextColor(...dangerColor);
    }
    const val = value || '-';
    const lines = doc.splitTextToSize(val, 120);
    doc.text(lines, 65, yPos);
    if (options?.danger) {
      doc.setTextColor(0, 0, 0);
    }
    yPos += Math.max(6, lines.length * 5);
  };
  
  // ===== 1. Defect Information =====
  addSection(isPt ? '1. INFORMAÇÕES DO DEFEITO' : '1. DEFECT INFORMATION');
  addRow(isPt ? 'DOC Nº' : 'DOC #', defect.docNumber);
  addRow(isPt ? 'Data Abertura' : 'Open Date', defect.openDate);
  addRow(isPt ? 'Fornecedor' : 'Supplier', defect.supplier);
  addRow(isPt ? 'Modelo' : 'Model', defect.model);
  addRow(isPt ? 'Cliente' : 'Customer', defect.customer);
  addRow('PN', defect.pn);
  addRow(isPt ? 'Material' : 'Material', defect.material);
  addRow('MG', defect.mg);
  addRow(isPt ? 'Severidade' : 'Severity', defect.defectsSeverity);
  addRow(isPt ? 'Categoria' : 'Category', defect.category);
  
  yPos += 3;
  
  // ===== 2. Defect Description =====
  addSection(isPt ? '2. DESCRIÇÃO DO DEFEITO' : '2. DEFECT DESCRIPTION');
  addRow(isPt ? 'Sintoma' : 'Symptom', defect.symptom);
  addRow(isPt ? 'Detecção' : 'Detection', defect.detection);
  addRow(isPt ? 'Descrição' : 'Description', defect.description);
  addRow(isPt ? 'Quantidade' : 'Quantity', defect.qty?.toString());
  addRow(isPt ? 'Taxa' : 'Rate', defect.rate);
  
  yPos += 3;
  
  // ===== 3. Current Status =====
  addSection(isPt ? '3. STATUS ATUAL' : '3. CURRENT STATUS');
  addRow('Status', defect.status, { danger: defect.status === 'DELAYED' });
  addRow(isPt ? 'Etapa' : 'Step', defect.step);
  addRow(isPt ? 'Responsável' : 'Responsible', defect.currentResponsible);
  addRow('Aging Total', `${defect.agingTotal} ${isPt ? 'dias' : 'days'}`);
  addRow(isPt ? 'Aging na Etapa' : 'Step Aging', `${defect.agingByStep} ${isPt ? 'dias' : 'days'}`);
  addRow(isPt ? 'Dias Atrasado' : 'Days Late', 
    defect.daysLate > 0 ? `${defect.daysLate} ${isPt ? 'dias' : 'days'}` : '-',
    { danger: defect.daysLate > 0 }
  );
  addRow(isPt ? 'Faixa Aging' : 'Aging Bucket', defect.bucketAging);
  addRow(isPt ? 'Proprietário' : 'Owner', defect.owner);
  addRow(isPt ? 'Data Alvo' : 'Target Date', defect.targetDate);
  
  yPos += 3;
  
  // ===== 4. 8D Timeline =====
  addSection(isPt ? '4. LINHA DO TEMPO 8D' : '4. 8D TIMELINE');
  
  const timelineData = [
    [isPt ? 'Disposição' : 'Disposition', defect.dateDisposition || '-'],
    [isPt ? 'Análise Técnica' : 'Technical Analysis', defect.dateTechAnalysis || '-'],
    [isPt ? 'Causa Raiz' : 'Root Cause', defect.dateRootCause || '-'],
    [isPt ? 'Ação Corretiva' : 'Corrective Action', defect.dateCorrectiveAction || '-'],
    [isPt ? 'Validação' : 'Validation', defect.dateValidation || '-'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [[isPt ? 'Etapa' : 'Step', isPt ? 'Data' : 'Date']],
    body: timelineData,
    margin: { left: 18, right: 18 },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'grid',
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 8;
  
  // ===== 5. Root Cause Analysis =====
  addSection(isPt ? '5. ANÁLISE DE CAUSA RAIZ' : '5. ROOT CAUSE ANALYSIS');
  addRow(isPt ? 'Causa' : 'Cause', defect.cause);
  
  yPos += 3;
  
  // ===== 6. Corrective Actions =====
  addSection(isPt ? '6. AÇÕES CORRETIVAS' : '6. CORRECTIVE ACTIONS');
  addRow(isPt ? 'Ações' : 'Actions', defect.correctiveActions);
  addRow(isPt ? 'Progresso' : 'Progress', defect.trackingProgress);
  addRow(isPt ? 'Feedback Fornecedor' : 'Supplier Feedback', defect.supplyFeedback);
  addRow(isPt ? 'Status Feedback' : 'Feedback Status', defect.statusSupplyFB);
  addRow(isPt ? 'Solução Verificada' : 'Solution Verified', defect.checkSolution ? (isPt ? 'Sim' : 'Yes') : (isPt ? 'Não' : 'No'));
  addRow('QCR', defect.qcrNumber);
  
  yPos += 3;
  
  // ===== 7. Comments =====
  if (comments.length > 0) {
    addSection(isPt ? '7. COMENTÁRIOS' : '7. COMMENTS');
    
    const commentRows = comments.map(c => [
      c.userName || '-',
      c.content,
      new Date(c.createdAt).toLocaleDateString(lang),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [[isPt ? 'Autor' : 'Author', isPt ? 'Comentário' : 'Comment', isPt ? 'Data' : 'Date']],
      body: commentRows,
      margin: { left: 18, right: 18 },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      columnStyles: { 1: { cellWidth: 100 } },
      theme: 'grid',
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }
  
  // ===== 8. Attachments =====
  if (attachments.length > 0) {
    addSection(isPt ? '8. ANEXOS' : '8. ATTACHMENTS');
    
    const attachmentRows = attachments.map(a => [
      a.fileName,
      a.mimeType || '-',
      new Date(a.createdAt).toLocaleDateString(lang),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [[isPt ? 'Arquivo' : 'File', isPt ? 'Tipo' : 'Type', isPt ? 'Data' : 'Date']],
      body: attachmentRows,
      margin: { left: 18, right: 18 },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      theme: 'grid',
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }
  
  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `QTrack System - ${isPt ? 'Relatório 8D' : '8D Report'} - ${defect.docNumber} - ${isPt ? 'Página' : 'Page'} ${i}/${pageCount}`,
      105, 290, { align: 'center' }
    );
  }
  
  // Save
  doc.save(`8D_Report_${defect.docNumber}.pdf`);
}
