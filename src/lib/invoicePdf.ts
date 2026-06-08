export interface InvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  username: string;
  email: string | null;
  planLabel: string;
  amount: string;
  status: string;
  subscriptionId?: string | null;
  paymentId?: string | null;
  simulated?: boolean;
}

function escapePdfText(value: string): string {
  // Type1 PDF fonts only support WinAnsi — strip/replace unsupported chars.
  const ascii = value
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Minimal single-page PDF (no external deps) — fast to generate on the server. */
export function buildInvoicePdf(data: InvoiceData): Buffer {
  const lines: Array<{ text: string; size: number; bold?: boolean }> = [
    { text: 'GetPGN', size: 20, bold: true },
    { text: 'Tax Invoice / Receipt', size: 11 },
    { text: '', size: 10 },
    { text: `Invoice #${data.invoiceNumber}`, size: 11, bold: true },
    { text: `Date: ${data.issuedAt}`, size: 10 },
    { text: '', size: 10 },
    { text: 'Bill to', size: 10, bold: true },
    { text: data.username, size: 11 },
    ...(data.email ? [{ text: data.email, size: 10 }] : []),
    { text: '', size: 10 },
    { text: 'Description', size: 10, bold: true },
    { text: data.planLabel, size: 11 },
    { text: `Amount: ${data.amount}`, size: 11, bold: true },
    { text: `Status: ${data.status}`, size: 10 },
    ...(data.subscriptionId
      ? [{ text: `Subscription: ${data.subscriptionId}`, size: 9 }]
      : []),
    ...(data.paymentId ? [{ text: `Payment: ${data.paymentId}`, size: 9 }] : []),
    { text: '', size: 10 },
    { text: 'Payment processed by Razorpay', size: 9 },
    { text: 'https://getpgn.in · support@getpgn.in', size: 9 },
  ];

  if (data.simulated) {
    lines.push({ text: 'DEV SIMULATION — NOT A REAL TAX INVOICE', size: 10, bold: true });
  }

  let y = 780;
  const contentParts: string[] = [];

  for (const line of lines) {
    if (line.text === '') {
      y -= 10;
      continue;
    }
    const font = line.bold ? '/F2' : '/F1';
    const size = line.size;
    contentParts.push(
      `BT ${font} ${size} Tf 48 ${y} Td (${escapePdfText(line.text)}) Tj ET`,
    );
    y -= size + 8;
  }

  const contentStream = contentParts.join('\n');
  const contentLength = Buffer.byteLength(contentStream, 'utf8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
