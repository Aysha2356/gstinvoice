const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Resolves a stored logoUrl (full URL or relative path) to a real filesystem
// path so pdfkit's doc.image() can read it. pdfGenerator.js lives at
// backend/src/utils, so ../../uploads points to backend/uploads.
function resolveLogoPath(logoUrl) {
  if (!logoUrl) return null;
  const match = logoUrl.match(/uploads[\\/](.+)$/);
  if (!match) return null;
  const fullPath = path.join(__dirname, '../../uploads', match[1]);
  return fs.existsSync(fullPath) ? fullPath : null;
}

// Splits terms/notes text into bullet lines. Handles real newlines first,
// and falls back to splitting on " -" for text stored as one run-on string.
function splitToLines(text) {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/(?<=\.)\s*-\s*/))
    .map((line) => line.replace(/^-+\s*/, '').trim())
    .filter(Boolean);
}

/* =========================================================
   TEMPLATE 1 — CLASSIC (original green/mint design)
   ========================================================= */
function renderClassic(doc, invoice, user, logoPath) {
  const INK = '#091413', NAVY = '#285A48', PLUM = '#408A71', CORAL = '#F1F7D4';

  const titleX = logoPath ? 110 : 50;
  if (logoPath) {
    try { doc.image(logoPath, 50, 40, { width: 50, height: 50, fit: [50, 50] }); } catch (e) {}
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
  doc.y = Math.max(leftBottomY, rightBottomY);

  doc.moveDown(2);
  if (invoice.placeOfSupply) {
    doc.fontSize(9).fillColor(PLUM).text(`Place of supply: ${invoice.placeOfSupply}`, 50);
    doc.moveDown(0.5);
  }

  const tableTop = doc.y + 6;
  const cols = [
    { label: 'Item', x: 50, w: 150 }, { label: 'HSN/SAC', x: 200, w: 60 },
    { label: 'Qty', x: 260, w: 35 }, { label: 'Rate', x: 295, w: 55 },
    { label: 'SGST', x: 350, w: 50 }, { label: 'CGST', x: 400, w: 50 },
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

  writeNotesAndTerms(doc, invoice, 50, y, INK, PLUM);
}

/* =========================================================
   TEMPLATE 2 — MINIMAL (black & white, no fills, thin rules)
   ========================================================= */
function renderMinimal(doc, invoice, user, logoPath) {
  const INK = '#111111', GREY = '#666666', LINE = '#cccccc';

  const titleX = logoPath ? 110 : 50;
  if (logoPath) {
    try { doc.image(logoPath, 50, 45, { width: 45, height: 45, fit: [45, 45] }); } catch (e) {}
  }
  doc.fillColor(INK).fontSize(20).font('Helvetica-Bold').text('INVOICE', titleX, 48);
  doc.fontSize(9).fillColor(GREY).font('Helvetica').text(invoice.invoiceNumber, titleX, doc.y);

  doc.moveUp(2);
  doc.fontSize(8).fillColor(GREY).text('DATE', 420, doc.y, { width: 125, align: 'right' });
  doc.fillColor(INK).fontSize(9).text(String(invoice.invoiceDate), 420, doc.y, { width: 125, align: 'right' });
  doc.fontSize(8).fillColor(GREY).text('DUE', 420, doc.y + 3, { width: 125, align: 'right' });
  doc.fillColor(INK).fontSize(9).text(String(invoice.dueDate), 420, doc.y, { width: 125, align: 'right' });

  doc.moveDown(2.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(LINE).lineWidth(0.75).stroke();
  doc.moveDown(1);

  const topY = doc.y;
  doc.fontSize(8).fillColor(GREY).text('FROM', 50, topY);
  doc.fontSize(10).fillColor(INK).font('Helvetica-Bold').text(user?.companyName || user?.name || '', 50, doc.y);
  doc.font('Helvetica').fontSize(8).fillColor(GREY);
  if (user?.companyGSTIN) doc.text(`GSTIN ${user.companyGSTIN}`, 50);
  if (user?.companyAddress) doc.text(user.companyAddress, 50);
  if (user?.city || user?.state) doc.text([user.city, user.state].filter(Boolean).join(', '), 50);
  const leftBottomY = doc.y;

  doc.fontSize(8).fillColor(GREY).text('BILL TO', 320, topY, { width: 225 });
  doc.fontSize(10).fillColor(INK).font('Helvetica-Bold').text(invoice.Client?.name || '—', 320, doc.y, { width: 225 });
  doc.font('Helvetica').fontSize(8).fillColor(GREY);
  if (invoice.Client?.gstin) doc.text(`GSTIN ${invoice.Client.gstin}`, 320, doc.y, { width: 225 });
  if (invoice.Client?.address) doc.text(invoice.Client.address, 320, doc.y, { width: 225 });
  if (invoice.Client?.city || invoice.Client?.state) {
    doc.text([invoice.Client.city, invoice.Client.state].filter(Boolean).join(', '), 320, doc.y, { width: 225 });
  }
  doc.y = Math.max(leftBottomY, doc.y);

  doc.moveDown(2);
  if (invoice.placeOfSupply) {
    doc.fontSize(8).fillColor(GREY).text(`PLACE OF SUPPLY  ${invoice.placeOfSupply}`, 50);
    doc.moveDown(0.5);
  }

  const tableTop = doc.y + 8;
  const cols = [
    { label: 'Item', x: 50, w: 150 }, { label: 'HSN/SAC', x: 200, w: 60 },
    { label: 'Qty', x: 260, w: 35 }, { label: 'Rate', x: 295, w: 55 },
    { label: 'SGST', x: 350, w: 50 }, { label: 'CGST', x: 400, w: 50 },
    { label: 'Amount', x: 450, w: 95 },
  ];
  doc.fillColor(INK).fontSize(8).font('Helvetica-Bold');
  cols.forEach((c) => doc.text(c.label.toUpperCase(), c.x, tableTop, { width: c.w }));
  doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor(INK).lineWidth(1).stroke();

  let y = tableTop + 20;
  doc.font('Helvetica').fontSize(9);
  (invoice.items || []).forEach((it) => {
    doc.fillColor(INK);
    doc.text(it.description || '', cols[0].x, y, { width: cols[0].w });
    doc.text(it.hsnSac || '', cols[1].x, y, { width: cols[1].w });
    doc.text(String(it.qty), cols[2].x, y, { width: cols[2].w });
    doc.text(Number(it.rate).toFixed(2), cols[3].x, y, { width: cols[3].w });
    doc.text(`${it.sgstPct}%`, cols[4].x, y, { width: cols[4].w });
    doc.text(`${it.cgstPct}%`, cols[5].x, y, { width: cols[5].w });
    doc.text(`₹${Number(it.amount).toFixed(2)}`, cols[6].x, y, { width: cols[6].w, align: 'right' });
    y += 20;
    doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor(LINE).lineWidth(0.5).stroke();
  });

  y += 10;
  const totalsX = 350;
  const line = (label, value, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9).fillColor(bold ? INK : GREY)
      .text(label, totalsX, y, { width: 100 });
    doc.fillColor(INK).text(`₹${Number(value).toFixed(2)}`, totalsX + 100, y, { width: 95, align: 'right' });
    y += bold ? 20 : 16;
  };
  line('Subtotal', invoice.subtotal);
  line('SGST', invoice.sgstTotal);
  line('CGST', invoice.cgstTotal);
  if (Number(invoice.cessTotal) > 0) line('Cess', invoice.cessTotal);
  doc.moveTo(totalsX, y).lineTo(545, y).strokeColor(INK).lineWidth(1).stroke();
  y += 8;
  line('TOTAL', invoice.total, true);
  y += 20;

  writeNotesAndTerms(doc, invoice, 50, y, INK, GREY);
}

/* =========================================================
   TEMPLATE 3 — BOLD MODERN (dark header band, accent totals)
   ========================================================= */
function renderBold(doc, invoice, user, logoPath) {
  const INK = '#141414', DARK = '#1a1a1a', ACCENT = '#E8574A', GREY = '#666666', LIGHT = '#f5f5f5';

  doc.rect(0, 0, 595, 110).fill(DARK);
  if (logoPath) {
    try { doc.image(logoPath, 50, 30, { width: 50, height: 50, fit: [50, 50] }); } catch (e) {}
  }
  const titleX = logoPath ? 112 : 50;
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('INVOICE', titleX, 38);
  doc.fontSize(10).fillColor(ACCENT).font('Helvetica').text(invoice.invoiceNumber, titleX, doc.y + 2);

  doc.fillColor('#ffffff').fontSize(8).text('INVOICE DATE', 400, 40, { width: 145, align: 'right' });
  doc.fontSize(10).text(String(invoice.invoiceDate), 400, doc.y, { width: 145, align: 'right' });
  doc.fontSize(8).fillColor('#ffffff').text('DUE DATE', 400, doc.y + 6, { width: 145, align: 'right' });
  doc.fontSize(10).text(String(invoice.dueDate), 400, doc.y, { width: 145, align: 'right' });

  doc.y = 130;
  const topY = doc.y;
  doc.fontSize(9).fillColor(ACCENT).font('Helvetica-Bold').text('FROM', 50, topY);
  doc.fontSize(11).fillColor(INK).text(user?.companyName || user?.name || '', 50, doc.y);
  doc.font('Helvetica').fontSize(9).fillColor(GREY);
  if (user?.companyGSTIN) doc.text(`GSTIN: ${user.companyGSTIN}`, 50);
  if (user?.companyAddress) doc.text(user.companyAddress, 50);
  if (user?.city || user?.state) doc.text([user.city, user.state].filter(Boolean).join(', '), 50);
  const leftBottomY = doc.y;

  doc.fontSize(9).fillColor(ACCENT).font('Helvetica-Bold').text('BILL TO', 320, topY, { width: 225 });
  doc.fontSize(11).fillColor(INK).text(invoice.Client?.name || '—', 320, doc.y, { width: 225 });
  doc.font('Helvetica').fontSize(9).fillColor(GREY);
  if (invoice.Client?.gstin) doc.text(`GSTIN: ${invoice.Client.gstin}`, 320, doc.y, { width: 225 });
  if (invoice.Client?.address) doc.text(invoice.Client.address, 320, doc.y, { width: 225 });
  if (invoice.Client?.city || invoice.Client?.state) {
    doc.text([invoice.Client.city, invoice.Client.state].filter(Boolean).join(', '), 320, doc.y, { width: 225 });
  }
  doc.y = Math.max(leftBottomY, doc.y);

  doc.moveDown(2);
  if (invoice.placeOfSupply) {
    doc.fontSize(9).fillColor(GREY).text(`Place of supply: ${invoice.placeOfSupply}`, 50);
    doc.moveDown(0.5);
  }

  const tableTop = doc.y + 6;
  const cols = [
    { label: 'Item', x: 50, w: 150 }, { label: 'HSN/SAC', x: 200, w: 60 },
    { label: 'Qty', x: 260, w: 35 }, { label: 'Rate', x: 295, w: 55 },
    { label: 'SGST', x: 350, w: 50 }, { label: 'CGST', x: 400, w: 50 },
    { label: 'Amount', x: 450, w: 95 },
  ];
  doc.rect(50, tableTop, 495, 22).fill(INK);
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  cols.forEach((c) => doc.text(c.label.toUpperCase(), c.x + 4, tableTop + 7, { width: c.w - 8 }));

  let y = tableTop + 22;
  doc.font('Helvetica').fontSize(9);
  (invoice.items || []).forEach((it, idx) => {
    const rowH = 22;
    if (idx % 2 === 1) doc.rect(50, y, 495, rowH).fill(LIGHT);
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
  y += 14;

  const totalsX = 350;
  const line = (label, value) => {
    doc.fontSize(9).fillColor(GREY).text(label, totalsX, y, { width: 100 });
    doc.fillColor(INK).text(`₹${Number(value).toFixed(2)}`, totalsX + 100, y, { width: 95, align: 'right' });
    y += 16;
  };
  line('Subtotal', invoice.subtotal);
  line('SGST', invoice.sgstTotal);
  line('CGST', invoice.cgstTotal);
  if (Number(invoice.cessTotal) > 0) line('Cess', invoice.cessTotal);

  doc.rect(totalsX, y, 195, 30).fill(ACCENT);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
  doc.text('TOTAL', totalsX + 10, y + 9, { width: 90 });
  doc.text(`₹${Number(invoice.total).toFixed(2)}`, totalsX + 90, y + 9, { width: 95, align: 'right' });
  y += 52;

  writeNotesAndTerms(doc, invoice, 50, y, INK, GREY);
}

/* =========================================================
   TEMPLATE 4 — ELEGANT LEDGER (bordered box, serif-style headings)
   ========================================================= */
function renderElegant(doc, invoice, user, logoPath) {
  const INK = '#2b2b2b', GOLD = '#8a6d3b', GREY = '#777777', LINE = '#d9cfae';

  doc.rect(35, 35, 525, 760).strokeColor(LINE).lineWidth(1).stroke();

  const titleX = logoPath ? 120 : 60;
  if (logoPath) {
    try { doc.image(logoPath, 60, 55, { width: 48, height: 48, fit: [48, 48] }); } catch (e) {}
  }
  doc.fillColor(GOLD).fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', titleX, 58);
  doc.fontSize(9).fillColor(GREY).font('Helvetica').text(invoice.invoiceNumber, titleX, doc.y);

  doc.moveUp(2);
  doc.fontSize(8).fillColor(GREY).text('Invoice date', 410, doc.y, { width: 145, align: 'right' });
  doc.fillColor(INK).fontSize(9).text(String(invoice.invoiceDate), 410, doc.y, { width: 145, align: 'right' });
  doc.fontSize(8).fillColor(GREY).text('Due date', 410, doc.y + 4, { width: 145, align: 'right' });
  doc.fillColor(INK).fontSize(9).text(String(invoice.dueDate), 410, doc.y, { width: 145, align: 'right' });

  doc.moveDown(2.5);
  doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(LINE).lineWidth(1).stroke();
  doc.moveDown(1);

  const topY = doc.y;
  doc.fontSize(8).fillColor(GOLD).text('FROM', 60, topY);
  doc.fontSize(10).fillColor(INK).font('Helvetica-Bold').text(user?.companyName || user?.name || '', 60, doc.y);
  doc.font('Helvetica').fontSize(8).fillColor(GREY);
  if (user?.companyGSTIN) doc.text(`GSTIN: ${user.companyGSTIN}`, 60);
  if (user?.companyAddress) doc.text(user.companyAddress, 60);
  if (user?.city || user?.state) doc.text([user.city, user.state].filter(Boolean).join(', '), 60);
  const leftBottomY = doc.y;

  doc.fontSize(8).fillColor(GOLD).text('BILL TO', 320, topY, { width: 215 });
  doc.fontSize(10).fillColor(INK).font('Helvetica-Bold').text(invoice.Client?.name || '—', 320, doc.y, { width: 215 });
  doc.font('Helvetica').fontSize(8).fillColor(GREY);
  if (invoice.Client?.gstin) doc.text(`GSTIN: ${invoice.Client.gstin}`, 320, doc.y, { width: 215 });
  if (invoice.Client?.address) doc.text(invoice.Client.address, 320, doc.y, { width: 215 });
  if (invoice.Client?.city || invoice.Client?.state) {
    doc.text([invoice.Client.city, invoice.Client.state].filter(Boolean).join(', '), 320, doc.y, { width: 215 });
  }
  doc.y = Math.max(leftBottomY, doc.y);

  doc.moveDown(2);
  if (invoice.placeOfSupply) {
    doc.fontSize(8).fillColor(GREY).text(`Place of supply: ${invoice.placeOfSupply}`, 60);
    doc.moveDown(0.5);
  }

  const tableTop = doc.y + 6;
  const cols = [
    { label: 'Item', x: 60, w: 145 }, { label: 'HSN/SAC', x: 205, w: 55 },
    { label: 'Qty', x: 260, w: 32 }, { label: 'Rate', x: 292, w: 50 },
    { label: 'SGST', x: 342, w: 45 }, { label: 'CGST', x: 387, w: 45 },
    { label: 'Amount', x: 432, w: 93 },
  ];
  doc.moveTo(60, tableTop).lineTo(535, tableTop).strokeColor(GOLD).lineWidth(1.25).stroke();
  doc.fillColor(GOLD).fontSize(8).font('Helvetica-Bold');
  cols.forEach((c) => doc.text(c.label.toUpperCase(), c.x, tableTop + 6, { width: c.w }));
  doc.moveTo(60, tableTop + 20).lineTo(535, tableTop + 20).strokeColor(GOLD).lineWidth(1.25).stroke();

  let y = tableTop + 28;
  doc.font('Helvetica').fontSize(9);
  (invoice.items || []).forEach((it) => {
    doc.fillColor(INK);
    doc.text(it.description || '', cols[0].x, y, { width: cols[0].w });
    doc.text(it.hsnSac || '', cols[1].x, y, { width: cols[1].w });
    doc.text(String(it.qty), cols[2].x, y, { width: cols[2].w });
    doc.text(Number(it.rate).toFixed(2), cols[3].x, y, { width: cols[3].w });
    doc.text(`${it.sgstPct}%`, cols[4].x, y, { width: cols[4].w });
    doc.text(`${it.cgstPct}%`, cols[5].x, y, { width: cols[5].w });
    doc.text(`₹${Number(it.amount).toFixed(2)}`, cols[6].x, y, { width: cols[6].w, align: 'right' });
    y += 22;
  });
  doc.moveTo(60, y).lineTo(535, y).strokeColor(LINE).lineWidth(1).stroke();
  y += 14;

  const totalsX = 340;
  const line = (label, value) => {
    doc.fontSize(9).fillColor(GREY).text(label, totalsX, y, { width: 100 });
    doc.fillColor(INK).text(`₹${Number(value).toFixed(2)}`, totalsX + 100, y, { width: 95, align: 'right' });
    y += 16;
  };
  line('Subtotal', invoice.subtotal);
  line('SGST', invoice.sgstTotal);
  line('CGST', invoice.cgstTotal);
  if (Number(invoice.cessTotal) > 0) line('Cess', invoice.cessTotal);
  doc.moveTo(totalsX, y).lineTo(535, y).strokeColor(GOLD).lineWidth(1.25).stroke();
  y += 8;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(GOLD).text('TOTAL', totalsX, y, { width: 100 });
  doc.fillColor(INK).text(`₹${Number(invoice.total).toFixed(2)}`, totalsX + 100, y, { width: 95, align: 'right' });
  y += 40;

  writeNotesAndTerms(doc, invoice, 60, y, INK, GREY);
}

// Shared notes/terms renderer used by all templates
function writeNotesAndTerms(doc, invoice, x, y, inkColor, greyColor) {
  const width = x === 60 ? 475 : 495;
  if (invoice.notes) {
    doc.font('Helvetica').fontSize(9).fillColor(greyColor).text('Notes', x, y);
    doc.fillColor(inkColor).text(invoice.notes, x, doc.y + 2, { width });
    y = doc.y + 14;
  }
  if (invoice.terms) {
    doc.font('Helvetica').fontSize(9).fillColor(greyColor).text('Terms & Conditions', x, y);
    doc.fillColor(inkColor);
    let termsY = doc.y + 2;
    splitToLines(invoice.terms).forEach((line) => {
      doc.fontSize(9).text(`•  ${line}`, x, termsY, { width });
      termsY = doc.y + 3;
    });
  }
}

const TEMPLATES = {
  classic: renderClassic,
  minimal: renderMinimal,
  bold: renderBold,
  elegant: renderElegant,
};

// Returns a Buffer containing the rendered invoice PDF.
// user.pdfTemplate selects the design: 'classic' (default), 'minimal', 'bold', 'elegant'.
function generateInvoicePdf(invoice, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoPath = resolveLogoPath(user?.logoUrl);
    const templateKey = user?.pdfTemplate && TEMPLATES[user.pdfTemplate] ? user.pdfTemplate : 'classic';
    TEMPLATES[templateKey](doc, invoice, user, logoPath);

    doc.end();
  });
}

module.exports = { generateInvoicePdf, TEMPLATES: Object.keys(TEMPLATES) };