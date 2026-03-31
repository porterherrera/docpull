// ============================================================
// Mock AI Extraction Engine
// Replace this module with real AI API calls (Claude Vision,
// GPT-4 Vision, etc.) when connecting to a backend.
// ============================================================

const SAMPLE_EXTRACTIONS = [
  {
    vendor: "Amazon Web Services",
    invoiceNumber: "INV-2026-00418",
    date: "2026-03-15",
    dueDate: "2026-04-14",
    subtotal: 1247.50,
    tax: 112.28,
    total: 1359.78,
    currency: "USD",
    category: "Cloud Services",
    lineItems: [
      { description: "EC2 Instance (m5.xlarge) — 720 hrs", qty: 1, unitPrice: 892.80, amount: 892.80 },
      { description: "S3 Storage — 500 GB", qty: 1, unitPrice: 11.50, amount: 11.50 },
      { description: "Data Transfer — 1.2 TB", qty: 1, unitPrice: 108.00, amount: 108.00 },
      { description: "CloudFront CDN", qty: 1, unitPrice: 235.20, amount: 235.20 },
    ],
    confidence: 98,
  },
  {
    vendor: "Office Depot",
    invoiceNumber: "OD-9928374",
    date: "2026-03-22",
    dueDate: "2026-04-21",
    subtotal: 284.97,
    tax: 22.80,
    total: 307.77,
    currency: "USD",
    category: "Office Supplies",
    lineItems: [
      { description: "HP 61XL Ink Cartridge (Black)", qty: 3, unitPrice: 34.99, amount: 104.97 },
      { description: "Copy Paper (10-ream case)", qty: 2, unitPrice: 54.99, amount: 109.98 },
      { description: "Staples Standard (5000ct)", qty: 2, unitPrice: 7.99, amount: 15.98 },
      { description: "Legal Pads Yellow (12-pack)", qty: 3, unitPrice: 17.99, amount: 53.97 },
      { description: "Ballpoint Pens (24-pack)", qty: 1, unitPrice: 0.07, amount: 0.07 },
    ],
    confidence: 96,
  },
  {
    vendor: "FedEx",
    invoiceNumber: "FX-20260328-1192",
    date: "2026-03-28",
    dueDate: "2026-04-27",
    subtotal: 67.45,
    tax: 5.40,
    total: 72.85,
    currency: "USD",
    category: "Shipping",
    lineItems: [
      { description: "Priority Overnight — 2.4 lbs", qty: 1, unitPrice: 42.50, amount: 42.50 },
      { description: "Fuel Surcharge", qty: 1, unitPrice: 6.38, amount: 6.38 },
      { description: "Residential Delivery Fee", qty: 1, unitPrice: 5.30, amount: 5.30 },
      { description: "Declared Value Charge", qty: 1, unitPrice: 13.27, amount: 13.27 },
    ],
    confidence: 99,
  },
  {
    vendor: "Staples Business Advantage",
    invoiceNumber: "SBA-441827",
    date: "2026-03-10",
    dueDate: "2026-04-09",
    subtotal: 523.40,
    tax: 41.87,
    total: 565.27,
    currency: "USD",
    category: "Office Supplies",
    lineItems: [
      { description: "Brother TN-760 Toner (High Yield)", qty: 2, unitPrice: 79.99, amount: 159.98 },
      { description: "Ergonomic Keyboard", qty: 1, unitPrice: 129.99, amount: 129.99 },
      { description: "Monitor Stand Riser", qty: 2, unitPrice: 44.99, amount: 89.98 },
      { description: "USB-C Hub 7-Port", qty: 1, unitPrice: 59.99, amount: 59.99 },
      { description: "Cable Management Kit", qty: 3, unitPrice: 27.82, amount: 83.46 },
    ],
    confidence: 97,
  },
  {
    vendor: "Home Depot Pro",
    invoiceNumber: "HDP-2026-09281",
    date: "2026-03-05",
    dueDate: "2026-04-04",
    subtotal: 1842.15,
    tax: 147.37,
    total: 1989.52,
    currency: "USD",
    category: "Building Materials",
    lineItems: [
      { description: "2x4 Lumber (8ft) — Bundle of 50", qty: 1, unitPrice: 287.50, amount: 287.50 },
      { description: "Plywood 3/4\" (4x8 sheets)", qty: 12, unitPrice: 62.99, amount: 755.88 },
      { description: "Concrete Mix 80lb Bags", qty: 20, unitPrice: 7.49, amount: 149.80 },
      { description: "Roofing Shingles (bundle)", qty: 8, unitPrice: 42.99, amount: 343.92 },
      { description: "Construction Adhesive (28oz)", qty: 6, unitPrice: 8.99, amount: 53.94 },
      { description: "Deck Screws 3\" (5lb box)", qty: 4, unitPrice: 62.78, amount: 251.11 },
    ],
    confidence: 95,
  },
];

/**
 * Simulate AI extraction from a file.
 * In production, this would send the file to your backend API
 * which calls Claude Vision or similar to extract structured data.
 */
export function extractDocument(fileName) {
  const idx = Math.floor(Math.random() * SAMPLE_EXTRACTIONS.length);
  return {
    ...SAMPLE_EXTRACTIONS[idx],
    id: crypto.randomUUID(),
    sourceFile: fileName,
  };
}

/**
 * Simulate processing delay (1.5-3s per document).
 * In production, this would be the actual API call time.
 */
export function processDocument(file) {
  return new Promise((resolve) => {
    const delay = 1500 + Math.random() * 1500;
    setTimeout(() => {
      resolve(extractDocument(file.name));
    }, delay);
  });
}
