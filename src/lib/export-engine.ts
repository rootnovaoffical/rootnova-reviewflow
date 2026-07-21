import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { ReportData, ExportFormat } from './types';

interface ExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    companyName?: string;
  };
}

function defaultFilename(report: ReportData, ext: string): string {
  const slug = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-${date}.${ext}`;
}

export function exportReport(report: ReportData, format: ExportFormat, options: ExportOptions = {}): void {
  switch (format) {
    case 'pdf': exportToPDF(report, options); break;
    case 'excel': exportToExcel(report, options); break;
    case 'csv': exportToCSV(report, options); break;
    case 'json': exportToJSON(report, options); break;
    case 'print': exportToPrint(report, options); break;
  }
}

export function exportMultipleFormats(report: ReportData, formats: ExportFormat[], options: ExportOptions = {}): void {
  formats.forEach((f) => exportReport(report, f, options));
}

// ---- PDF ----
function exportToPDF(report: ReportData, options: ExportOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title ?? report.title, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text(`Period: ${new Date(report.dateRange.start).toLocaleDateString()} — ${new Date(report.dateRange.end).toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Metrics table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Metrics', 14, y);
  y += 4;

  const metricRows = Object.entries(report.metrics).map(([key, val]) => [
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    typeof val === 'number' ? val.toFixed(2) : String(val ?? 'N/A'),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: metricRows,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Charts data
  const chartEntries = Object.entries(report.charts);
  if (chartEntries.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Chart Data', 14, y);
    y += 4;

    for (const [, chartData] of chartEntries) {
      if (Array.isArray(chartData) && chartData.length > 0) {
        const rows = chartData.map((row: Record<string, unknown>) =>
          Object.values(row).map((v) => typeof v === 'number' ? v.toFixed(2) : String(v ?? ''))
        );
        const headers = Object.keys(chartData[0] as Record<string, unknown>).map((h) =>
          h.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        );
        autoTable(doc, {
          startY: y,
          head: [headers],
          body: rows,
          theme: 'grid',
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
        if (y > 250) { doc.addPage(); y = 20; }
      }
    }
  }

  // AI Summary
  if (report.aiSummary) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Executive Summary', 14, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(report.aiSummary.summary, pageWidth - 28);
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 5 + 4;

    if (report.aiSummary.insights.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Key Insights:', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      report.aiSummary.insights.forEach((insight) => {
        const lines = doc.splitTextToSize(`• ${insight}`, pageWidth - 28);
        doc.text(lines, 16, y);
        y += lines.length * 5;
      });
      y += 3;
    }

    if (report.aiSummary.recommendations.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendations:', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      report.aiSummary.recommendations.forEach((rec) => {
        const lines = doc.splitTextToSize(`• ${rec}`, pageWidth - 28);
        doc.text(lines, 16, y);
        y += lines.length * 5;
      });
      y += 3;
    }

    if (report.aiSummary.riskAlerts.length > 0) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text('Risk Alerts:', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      report.aiSummary.riskAlerts.forEach((alert) => {
        const lines = doc.splitTextToSize(`⚠ ${alert}`, pageWidth - 28);
        doc.text(lines, 16, y);
        y += lines.length * 5;
      });
      doc.setTextColor(0, 0, 0);
    }
  }

  doc.save(options.filename ?? defaultFilename(report, 'pdf'));
}

// ---- Excel ----
function exportToExcel(report: ReportData, options: ExportOptions): void {
  const wb = XLSX.utils.book_new();

  // Metrics sheet
  const metricRows = Object.entries(report.metrics).map(([key, val]) => ({
    Metric: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    Value: typeof val === 'number' ? Number(val.toFixed(2)) : String(val ?? 'N/A'),
  }));
  const wsMetrics = XLSX.utils.json_to_sheet(metricRows);
  XLSX.utils.book_append_sheet(wb, wsMetrics, 'Metrics');

  // Chart data sheets
  Object.entries(report.charts).forEach(([name, data]) => {
    if (Array.isArray(data) && data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data as Record<string, unknown>[]);
      const sheetName = name.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });

  // AI Summary sheet
  if (report.aiSummary) {
    const aiRows = [
      { Section: 'Summary', Content: report.aiSummary.summary },
      ...report.aiSummary.insights.map((i) => ({ Section: 'Insight', Content: i })),
      ...report.aiSummary.recommendations.map((r) => ({ Section: 'Recommendation', Content: r })),
      ...report.aiSummary.riskAlerts.map((a) => ({ Section: 'Risk Alert', Content: a })),
      { Section: 'Forecast', Content: report.aiSummary.forecast },
      { Section: 'Confidence', Content: `${report.aiSummary.confidence.toFixed(1)}%` },
    ];
    const wsAI = XLSX.utils.json_to_sheet(aiRows);
    XLSX.utils.book_append_sheet(wb, wsAI, 'AI Summary');
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, options.filename ?? defaultFilename(report, 'xlsx'));
}

// ---- CSV ----
function exportToCSV(report: ReportData, options: ExportOptions): void {
  const lines: string[] = [];
  lines.push(`# ${options.title ?? report.title}`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Period: ${report.dateRange.start} to ${report.dateRange.end}`);
  lines.push('');
  lines.push('## Metrics');
  lines.push('Metric,Value');
  Object.entries(report.metrics).forEach(([key, val]) => {
    lines.push(`"${key.replace(/_/g, ' ')}","${typeof val === 'number' ? val.toFixed(2) : String(val ?? 'N/A')}"`);
  });
  lines.push('');

  Object.entries(report.charts).forEach(([name, data]) => {
    if (Array.isArray(data) && data.length > 0) {
      lines.push(`## ${name}`);
      const headers = Object.keys(data[0] as Record<string, unknown>);
      lines.push(headers.join(','));
      data.forEach((row: Record<string, unknown>) => {
        lines.push(headers.map((h) => `"${String(row[h] ?? '')}"`).join(','));
      });
      lines.push('');
    }
  });

  if (report.aiSummary) {
    lines.push('## AI Summary');
    lines.push(`Summary,"${report.aiSummary.summary}"`);
    report.aiSummary.insights.forEach((i) => lines.push(`Insight,"${i}"`));
    report.aiSummary.recommendations.forEach((r) => lines.push(`Recommendation,"${r}"`));
    report.aiSummary.riskAlerts.forEach((a) => lines.push(`Risk Alert,"${a}"`));
    lines.push(`Forecast,"${report.aiSummary.forecast}"`);
    lines.push(`Confidence,${report.aiSummary.confidence.toFixed(1)}%`);
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, options.filename ?? defaultFilename(report, 'csv'));
}

// ---- JSON ----
function exportToJSON(report: ReportData, options: ExportOptions): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  saveAs(blob, options.filename ?? defaultFilename(report, 'json'));
}

// ---- Print ----
function exportToPrint(report: ReportData, options: ExportOptions): void {
  const win = window.open('', '_blank');
  if (!win) return;
  const html = buildPrintHTML(report, options);
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

function buildPrintHTML(report: ReportData, options: ExportOptions): string {
  const metricsRows = Object.entries(report.metrics).map(([key, val]) =>
    `<tr><td class="label">${key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</td><td class="value">${typeof val === 'number' ? val.toFixed(2) : String(val ?? 'N/A')}</td></tr>`
  ).join('');

  const chartSections = Object.entries(report.charts).map(([name, data]) => {
    if (!Array.isArray(data) || data.length === 0) return '';
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const headerHtml = headers.map((h) => `<th>${h.replace(/_/g, ' ')}</th>`).join('');
    const rows = (data as Record<string, unknown>[]).map((row) =>
      `<tr>${headers.map((h) => `<td>${String(row[h] ?? '')}</td>`).join('')}</tr>`
    ).join('');
    return `<h3>${name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h3><table><thead><tr>${headerHtml}</tr></thead><tbody>${rows}</tbody></table>`;
  }).join('');

  const aiSection = report.aiSummary ? `
    <div class="ai-section">
      <h2>AI Executive Summary</h2>
      <p class="ai-summary-text">${report.aiSummary.summary}</p>
      ${report.aiSummary.insights.length ? `<h3>Key Insights</h3><ul>${report.aiSummary.insights.map((i) => `<li>${i}</li>`).join('')}</ul>` : ''}
      ${report.aiSummary.recommendations.length ? `<h3>Recommendations</h3><ul>${report.aiSummary.recommendations.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
      ${report.aiSummary.riskAlerts.length ? `<h3 class="risk">Risk Alerts</h3><ul class="risk-list">${report.aiSummary.riskAlerts.map((a) => `<li>⚠ ${a}</li>`).join('')}</ul>` : ''}
      <p class="forecast"><strong>Forecast:</strong> ${report.aiSummary.forecast}</p>
      <p class="confidence"><strong>Confidence:</strong> ${report.aiSummary.confidence.toFixed(1)}%</p>
    </div>` : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${options.title ?? report.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; }
  h1 { font-size: 28px; text-align: center; margin-bottom: 8px; }
  .meta { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 24px; }
  h2 { font-size: 18px; margin: 24px 0 12px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 16px 0 8px; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #3b82f6; color: white; padding: 8px 12px; text-align: left; font-size: 12px; }
  td { padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .label { font-weight: 600; color: #475569; }
  .ai-section { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-top: 24px; }
  .ai-summary-text { font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
  .ai-section ul { padding-left: 20px; margin-bottom: 12px; }
  .ai-section li { font-size: 12px; line-height: 1.5; margin-bottom: 4px; }
  .risk { color: #dc2626; }
  .risk-list li { color: #dc2626; }
  .forecast, .confidence { font-size: 12px; margin-top: 8px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>${options.title ?? report.title}</h1>
<div class="meta">Generated: ${new Date().toLocaleString()}<br>Period: ${new Date(report.dateRange.start).toLocaleDateString()} — ${new Date(report.dateRange.end).toLocaleDateString()}</div>
<h2>Key Metrics</h2>
<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${metricsRows}</tbody></table>
${chartSections ? `<h2>Chart Data</h2>${chartSections}` : ''}
${aiSection}
</body></html>`;
}
