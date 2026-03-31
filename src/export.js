import * as XLSX from 'xlsx';

/**
 * Export a single document extraction to Excel (.xlsx)
 */
export function exportToExcel(doc) {
  const e = doc.extraction;
  if (!e) return;

  const wsData = [
    ["INVOICE SUMMARY"],
    [],
    ["Vendor", e.vendor],
    ["Invoice #", e.invoiceNumber],
    ["Date", e.date],
    ["Due Date", e.dueDate],
    ["Currency", e.currency],
    ["Category", e.category],
    [],
    ["Subtotal", e.subtotal],
    ["Tax", e.tax],
    ["Total", e.total],
    [],
    [],
    ["LINE ITEMS"],
    ["Description", "Qty", "Unit Price", "Amount"],
    ...e.lineItems.map((li) => [li.description, li.qty, li.unitPrice, li.amount]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 36 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoice Data");
  XLSX.writeFile(wb, `DocPull_${e.invoiceNumber || "export"}.xlsx`);
}

/**
 * Export a single document extraction to CSV
 */
export function exportToCSV(doc) {
  const e = doc.extraction;
  if (!e) return;

  let csv = "Field,Value\n";
  csv += `Vendor,"${e.vendor}"\n`;
  csv += `Invoice Number,"${e.invoiceNumber}"\n`;
  csv += `Date,"${e.date}"\n`;
  csv += `Due Date,"${e.dueDate}"\n`;
  csv += `Subtotal,"${e.subtotal}"\n`;
  csv += `Tax,"${e.tax}"\n`;
  csv += `Total,"${e.total}"\n`;
  csv += `Currency,"${e.currency}"\n`;
  csv += `Category,"${e.category}"\n`;
  csv += "\nLine Items\n";
  csv += "Description,Qty,Unit Price,Amount\n";
  e.lineItems.forEach((li) => {
    csv += `"${li.description}",${li.qty},${li.unitPrice},${li.amount}\n`;
  });

  downloadBlob(csv, `DocPull_${e.invoiceNumber || "export"}.csv`, "text/csv");
}

/**
 * Export all completed documents to a single Excel file
 */
export function exportAllToExcel(documents) {
  const completed = documents.filter((d) => d.status === "completed" && d.extraction);
  if (completed.length === 0) return;

  // Summary sheet
  const summaryData = [
    ["DocPull Batch Export", "", "", "", "", "", "", "", "", ""],
    [`Generated: ${new Date().toLocaleString()}`, "", "", "", "", "", "", "", "", ""],
    [`Documents: ${completed.length}`, "", "", "", "", "", "", "", "", ""],
    [],
    ["Source File", "Vendor", "Invoice #", "Date", "Due Date", "Subtotal", "Tax", "Total", "Currency", "Category"],
    ...completed.map((d) => {
      const e = d.extraction;
      return [d.fileName, e.vendor, e.invoiceNumber, e.date, e.dueDate, e.subtotal, e.tax, e.total, e.currency, e.category];
    }),
    [],
    ["", "", "", "", "TOTALS",
      completed.reduce((s, d) => s + d.extraction.subtotal, 0),
      completed.reduce((s, d) => s + d.extraction.tax, 0),
      completed.reduce((s, d) => s + d.extraction.total, 0),
      "", ""
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  ws['!cols'] = [
    { wch: 28 }, { wch: 26 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "All Invoices");

  // Add individual sheets for each document
  completed.forEach((d, i) => {
    const e = d.extraction;
    const data = [
      ["Vendor", e.vendor],
      ["Invoice #", e.invoiceNumber],
      ["Date", e.date],
      ["Total", e.total],
      [],
      ["Description", "Qty", "Unit Price", "Amount"],
      ...e.lineItems.map((li) => [li.description, li.qty, li.unitPrice, li.amount]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const name = (e.invoiceNumber || `Doc_${i + 1}`).substring(0, 28);
    XLSX.utils.book_append_sheet(wb, sheet, name);
  });

  XLSX.writeFile(wb, `DocPull_Batch_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
