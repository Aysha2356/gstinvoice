const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const INK = '#091413';
const NAVY = '#285A48';
const PLUM = '#408A71';
const MINT = '#B0E4CC';
const CORAL = '#F1F7D4';

// Resolves a stored logoUrl (e.g. "/uploads/logos/company-logo-123.png")
// to a real filesystem path so pdfkit's doc.image() can read it.
// pdfGenerator.js lives at backend/src/utils, so ../../uploads
// points to backend/uploads — same base folder multer saves into.
function resolveLogoPath(logoUrl) {
  if (!logoUrl) return null;
  const relative = logoUrl.replace(/^\/?uploads[\\/]/, '');
  const fullPath = path.join(__dirname, '../../uploads', relative);
  return fs.existsSync(fullPath) ? fullPath : null;
}

// Returns a Buffer containing the rendered invoice PDF.
function generateInvoicePdf(invoice, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header — logo (if uploaded) sits top-left, title shifts right to make room
    const logoPath = resolveLogoPath(user?.logoUrl);
    const titleX = logoPath ? 110 : 50;

    if (logoPath) {
      try {
        doc.image(logoPath, 50, 40, { width: 50, height: 50, fit: [50, 50] });
      } catch (e) {
        // Corrupt/unreadable image file — fall back to no logo rather than crash the PDF
      }
    }

    doc.fillColor(INK).fontSize(22).font('Helvetica-Bold').text('TAX INVOICE', titleX, 45);
    doc.fontSize(10).fillColor(PLUM).font('Helvetica').text(invoice.invoiceNumber, titleX, doc.y);

    doc.moveUp(2);
    doc.fontSize(9).fillColor(PLUM).text('Invoice date', 400, doc.y, { width: 145, align: 'right' });
    doc.fillColor(INK).fontSize(10).text(String(invoice.invoiceDate), 400, doc.y, { width: 145, align: 'right' });
    doc.fontSize(9).fillColor(PLUM).text('Due date', 400, doc.y + 4, { width: 145, align: 'right' });
    doc.fillColor(INK).fontSize(10).text(String(invoice.dueDate), 400, doc.y, { width: 145, align: 'right' });

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(INK).lineWidth(1.5).stroke();
    doc.moveDown(1);

    // From / Bill To — two independent columns.
    // FIX: pdfkit's doc.y is a single shared cursor, so writing two side-by-side
    // columns in sequence means whichever column is written LAST determines doc.y —
    // even if the OTHER column was taller. That caused the table to sit too close
    // to a short "Bill To" block while ignoring a taller "From" block (or vice versa).
    // We now track each column's bottom Y separately and take the max before continuing.
    const topY = doc.y;

    doc.fontSize(9).fillColor(PLUM).text('From', 50, topY);
    doc.fontSize(11).fillColor(INK).font('Helvetica-Bold').text(user?.companyName || user?.name || '', 50, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(PLUM);
    if (user?.companyGSTIN) doc.text(`GSTIN: ${user.companyGSTIN}`, 50);
    if (user?.companyAddress) doc.text(user.companyAddress, 50);
    if (user?.city || user?.state) doc.text([user.city, user.state].filter(Boolean).join(', '), 50);
    const leftBottomY = doc.y;

    doc.fontSize(9).fillColor(PLUM).text('Bill To', 320, topY, { width: 225 });
    doc.fontSize(11).fillColor(INK).font('Helvetica-Bold').text(invoice.Client?.name || '—', 320, doc.y, { width: 225 });
    doc.font('Helvetica').fontSize(9).fillColor(PLUM);
    if (invoice.Client?.gstin) doc.text(`GSTIN: ${invoice.Client.gstin}`, 320, doc.y, { width: 225 });
    if (invoice.Client?.address) doc.text(invoice.Client.address, 320, doc.y, { width: 225 });
    if (invoice.Client?.city || invoice.Client?.state) {
      doc.text([invoice.Client.city, invoice.Client.state].filter(Boolean).join(', '), 320, doc.y, { width: 225 });
    }
    const rightBottomY = doc.y;

    // Whichever column ended up taller wins — this guarantees consistent
    // spacing before "Place of supply" / the items table regardless of
    // whether the client has a short or long address, or no client at all.
    doc.y = Math.max(leftBottomY, rightBottomY);

    doc.moveDown(2);
    if (invoice.placeOfSupply) {
      doc.fontSize(9).fillColor(PLUM).text(`Place of supply: ${invoice.placeOfSupply}`, 50);
      doc.moveDown(0.5);
    }

    // Items table
    const tableTop = doc.y + 6;
    const cols = [
      { label: 'Item', x: 50, w: 150 },
      { label: 'HSN/SAC', x: 200, w: 60 },
      { label: 'Qty', x: 260, w: 35 },
      { label: 'Rate', x: 295, w: 55 },
      { label: 'SGST', x: 350, w: 50 },
      { label: 'CGST', x: 400, w: 50 },
      { label: 'Amount', x: 450, w: 95 },
    ];

    doc.rect(50, tableTop, 495, 20).fill(NAVY);
    doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
    cols.forEach((c) => doc.text(c.label.toUpperCase(), c.x + 4, tableTop + 6, { width: c.w - 8 }));

    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(9);
    (invoice.items || []).forEach((it, idx) => {
      const rowH = 22;
      if (idx % 2 === 1) doc.rect(50, y, 495, rowH).fill('#eaf6ee');
      doc.fillColor(INK);
      doc.text(it.description || '', cols[0].x + 4, y + 6, { width: cols[0].w - 8 });
      doc.text(it.hsnSac || '', cols[1].x + 4, y + 6, { width: cols[1].w - 8 });
      doc.text(String(it.qty), cols[2].x + 4, y + 6, { width: cols[2].w - 8 });
      doc.text(Number(it.rate).toFixed(2), cols[3].x + 4, y + 6, { width: cols[3].w - 8 });
      doc.text(`${it.sgstPct}%`, cols[4].x + 4, y + 6, { width: cols[4].w - 8 });
      doc.text(`${it.cgstPct}%`, cols[5].x + 4, y + 6, { width: cols[5].w - 8 });
      doc.text(`₹${Number(it.amount).toFixed(2)}`, cols[6].x + 4, y + 6, { width: cols[6].w - 8, align: 'right' });
      y += rowH;
    });

    doc.moveTo(50, y).lineTo(545, y).strokeColor('#d8ead9').lineWidth(1).stroke();
    y += 14;

    // Totals
    const totalsX = 350;
    const line = (label, value) => {
      doc.fontSize(9).fillColor(PLUM).text(label, totalsX, y, { width: 100 });
      doc.fillColor(INK).text(`₹${Number(value).toFixed(2)}`, totalsX + 100, y, { width: 95, align: 'right' });
      y += 16;
    };
    line('Subtotal', invoice.subtotal);
    line('SGST', invoice.sgstTotal);
    line('CGST', invoice.cgstTotal);
    if (Number(invoice.cessTotal) > 0) line('Cess', invoice.cessTotal);

    doc.rect(totalsX, y, 195, 28).fill(CORAL);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12);
    doc.text('TOTAL', totalsX + 10, y + 8, { width: 90 });
    doc.text(`₹${Number(invoice.total).toFixed(2)}`, totalsX + 90, y + 8, { width: 95, align: 'right' });
    y += 50;

    if (invoice.notes) {
      doc.font('Helvetica').fontSize(9).fillColor(PLUM).text('Notes', 50, y);
      doc.fillColor(INK).text(invoice.notes, 50, doc.y + 2, { width: 495 });
      y = doc.y + 14;
    }
    if (invoice.terms) {
      doc.font('Helvetica').fontSize(9).fillColor(PLUM).text('Terms & Conditions', 50, y);
      doc.fillColor(INK);
      let termsY = doc.y + 2;
      // Split on newlines first; if the whole thing arrived as one line
      // (e.g. "-Point one. -Point two."), also split on " -" as a fallback
      // so each condition renders as its own bullet instead of one paragraph.
      let termLines = invoice.terms
        .split(/\r?\n/)
        .flatMap((line) => line.split(/(?<=\.)\s*-\s*/))
        .map((line) => line.trim())
        .filter(Boolean);

      termLines.forEach((line) => {
        const bulletText = line.replace(/^-+\s*/, '');
        doc.fontSize(9).text(`•  ${bulletText}`, 50, termsY, { width: 495 });
        termsY = doc.y + 3;
      });
    }

    doc.end();
  });
}

module.exports = { generateInvoicePdf };