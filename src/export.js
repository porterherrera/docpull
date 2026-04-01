import * as XLSX from 'xlsx';

/**
 * Format a number as currency string for display
 */
function fmt(val) {
  const n = Number(val);
  if (isNaN(n)) return val || '';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Apply currency number format to specific cells in a worksheet
 */
function applyCurrencyFormat(ws, cells) {
  const currencyFmt = '$#,##0.00';
  cells.forEach((ref) => {
    if (ws[ref]) {
      ws[ref].z = currencyFmt;
    }
  });
}

/**
 * Export a single document extraction to Excel (.xlsx)
 */
export function exportToExcel(doc) {
  const e = doc.extraction;
  if (!e) return;

  const billTo = e.billTo || {};
  const lineItems = e.lineItems || [];

  const wsData = [
    ["INVOICE SUMMARY"],
    [],
    ["Vendor", e.vendor || ''],
    ["Invoice #", e.invoiceNumber || ''],
    ["Date", e.date || ''],
    ["Due Date", e.dueDate || ''],
    ["PO Number", e.poNumber || ''],
    ["Currency", e.currency || 'USD'],
    ["Category", e.category || ''],
    [],
    ["BILL TO"],
    ["Name", billTo.name || ''],
    ["Address", billTo.address || ''],
    [],
    ["FINANCIAL SUMMARY"],
    ["Subtotal", fmt(e.subtotal)],
    ["Tax", fmt(e.tax)],
    ["Total", fmt(e.total)],
    [],
    [],
    ["LINE ITEMS"],
    ["#", "Description", "Qty", "Unit Price", "Amount"],
    ...lineItems.map((li, i) => [
      i + 1,
      li.description || '',
      li.quantity || li.qty || 1,
      fmt(li.unitPrice || li.unit_price || 0),
      fmt(li.amount || 0),
    ]),
    [],
    ["", "", "", "TOTAL", fmt(e.total)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set generous column widths
  ws['!cols'] = [
    { wch: 6 },   // #
    { wch: 56 },  // Description — wide enough for full text
    { wch: 8 },   // Qty
    { wch: 16 },  // Unit Price
    { wch: 16 },  // Amount
  ];

  // Merge the header row across all columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },  // INVOICE SUMMARY
    { s: { r: 10, c: 0 }, e: { r: 10, c: 4 } }, // BILL TO
    { s: { r: 14, c: 0 }, e: { r: 14, c: 4 } }, // FINANCIAL SUMMARY
    { s: { r: 20, c: 0 }, e: { r: 20, c: 4 } }, // LINE ITEMS
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoice Data");
  XLSX.writeFile(wb, `DocumentPull_${e.invoiceNumber || "export"}.xlsx`);
}

/**
 * Export a single document extraction to CSV
 */
export function exportToCSV(doc) {
  const e = doc.extraction;
  if (!e) return;

  const billTo = e.billTo || {};
  const lineItems = e.lineItems || [];

  let csv = "Field,Value\n";
  csv += `Vendor,"${e.vendor || ''}"\n`;
  csv += `Invoice Number,"${e.invoiceNumber || ''}"\n`;
  csv += `Date,"${e.date || ''}"\n`;
  csv += `Due Date,"${e.dueDate || ''}"\n`;
  csv += `PO Number,"${e.poNumber || ''}"\n`;
  csv += `Currency,"${e.currency || 'USD'}"\n`;
  csv += `Category,"${e.category || ''}"\n`;
  csv += `Bill To Name,"${billTo.name || ''}"\n`;
  csv += `Bill To Address,"${billTo.address || ''}"\n`;
  csv += `Subtotal,"${fmt(e.subtotal)}"\n`;
  csv += `Tax,"${fmt(e.tax)}"\n`;
  csv += `Total,"${fmt(e.total)}"\n`;
  csv += "\nLine Items\n";
  csv += "#,Description,Qty,Unit Price,Amount\n";
  lineItems.forEach((li, i) => {
    csv += `${i + 1},"${li.description || ''}",${li.quantity || li.qty || 1},"${fmt(li.unitPrice || li.unit_price || 0)}","${fmt(li.amount || 0)}"\n`;
  });

  downloadBlob(csv, `DocumentPull_${e.invoiceNumber || "export"}.csv`, "text/csv");
}

/**
 * Export all completed documents to a single Excel file
 */
export function exportAllToExcel(documents) {
  const completed = documents.filter((d) => d.status === "completed" && d.extraction);
  if (completed.length === 0) return;

  // Summary sheet
  const summaryData = [
    ["DOCUMENTPULL — BATCH EXPORT"],
    [`Generated: ${new Date().toLocaleString()}`],
    [`Documents: ${completed.length}`],
    [],
    ["Source File", "Vendor", "Invoice #", "Date", "Due Date", "PO Number", "Subtotal", "Tax", "Total", "Currency", "Category"],
    ...completed.map((d) => {
      const e = d.extraction;
      return [
        d.fileName,
        e.vendor || '',
        e.invoiceNumber || '',
        e.date || '',
        e.dueDate || '',
        e.poNumber || '',
        fmt(e.subtotal),
        fmt(e.tax),
        fmt(e.total),
        e.currency || 'USD',
        e.category || '',
      ];
    }),
    [],
    ["", "", "", "", "", "TOTALS",
      fmt(completed.reduce((s, d) => s + Number(d.extraction.subtotal || 0), 0)),
      fmt(completed.reduce((s, d) => s + Number(d.extraction.tax || 0), 0)),
      fmt(completed.reduce((s, d) => s + Number(d.extraction.total || 0), 0)),
      "", ""
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  ws['!cols'] = [
    { wch: 36 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "All Invoices");

  // Add individual sheets for each document
  completed.forEach((d, i) => {
    const e = d.extraction;
    const billTo = e.billTo || {};
    const lineItems = e.lineItems || [];
    const data = [
      ["Vendor", e.vendor || ''],
      ["Invoice #", e.invoiceNumber || ''],
      ["Date", e.date || ''],
      ["Due Date", e.dueDate || ''],
      ["PO Number", e.poNumber || ''],
      ["Bill To", billTo.name || ''],
      ["", billTo.address || ''],
      [],
      ["Subtotal", fmt(e.subtotal)],
      ["Tax", fmt(e.tax)],
      ["Total", fmt(e.total)],
      [],
      ["#", "Description", "Qty", "Unit Price", "Amount"],
      ...lineItems.map((li, j) => [
        j + 1,
        li.description || '',
        li.quantity || li.qty || 1,
        fmt(li.unitPrice || li.unit_price || 0),
        fmt(li.amount || 0),
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [
      { wch: 6 }, { wch: 56 }, { wch: 8 }, { wch: 16 }, { wch: 16 },
    ];
    const name = (e.invoiceNumber || `Doc_${i + 1}`).substring(0, 28);
    XLSX.utils.book_append_sheet(wb, sheet, name);
  });

  XLSX.writeFile(wb, `DocumentPull_Batch_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
