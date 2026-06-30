const { Op } = require('sequelize');
const { Invoice, InvoiceItem, Client, User } = require('../models');
const { calcInvoiceTotals } = require('../utils/invoiceCalc');
const { generateInvoicePdf } = require('../utils/pdfGenerator');
const { sendMail } = require('../utils/mailer');

// GET /api/invoices?search=&status=&page=&pageSize=
exports.list = async (req, res) => {
  const { search = '', status = '', page = 1, pageSize = 10 } = req.query;
  const limit = Math.max(1, Math.min(100, Number(pageSize) || 10));
  const offset = (Math.max(1, Number(page) || 1) - 1) * limit;

  const where = { userId: req.userId };
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { invoiceNumber: { [Op.like]: `%${search}%` } },
      { '$Client.name$': { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Invoice.findAndCountAll({
    where,
    include: [{ model: Client }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    subQuery: false,
  });

  res.json({
    invoices: rows,
    total: count,
    page: Number(page) || 1,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(count / limit)),
  });
};

exports.getOne = async (req, res) => {
  const invoice = await Invoice.findOne({
    where: { id: req.params.id, userId: req.userId },
    include: [{ model: Client }, { model: InvoiceItem, as: 'items' }],
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json(invoice);
};

exports.create = async (req, res) => {
  try {
    const { clientId, invoiceNumber, invoiceDate, dueDate, placeOfSupply, notes, terms, items } = req.body;
    if (!invoiceNumber || !invoiceDate || !dueDate || !items?.length) {
      return res.status(400).json({ message: 'invoiceNumber, dates and at least one item are required' });
    }

    const totals = calcInvoiceTotals(items);

    const invoice = await Invoice.create({
      userId: req.userId,
      clientId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      placeOfSupply,
      notes,
      terms,
      subtotal: totals.subtotal,
      sgstTotal: totals.sgstTotal,
      cgstTotal: totals.cgstTotal,
      cessTotal: totals.cessTotal,
      total: totals.total,
      status: 'draft',
    });

    await InvoiceItem.bulkCreate(
      totals.items.map((it) => ({ ...it, invoiceId: invoice.id }))
    );

    // Bump the user's invoice sequence counter so future auto-suggestions move forward.
    const user = await User.findByPk(req.userId);
    if (user) await user.increment('lastInvoiceSeq', { by: 1 });

    const full = await Invoice.findByPk(invoice.id, { include: [{ model: Client }, { model: InvoiceItem, as: 'items' }] });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create invoice', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const { clientId, invoiceNumber, invoiceDate, dueDate, placeOfSupply, notes, terms, items, status } = req.body;

    let totals = null;
    if (items?.length) {
      totals = calcInvoiceTotals(items);
      await InvoiceItem.destroy({ where: { invoiceId: invoice.id } });
      await InvoiceItem.bulkCreate(totals.items.map((it) => ({ ...it, invoiceId: invoice.id })));
    }

    await invoice.update({
      clientId, invoiceNumber, invoiceDate, dueDate, placeOfSupply, notes, terms,
      status: status || invoice.status,
      ...(totals && {
        subtotal: totals.subtotal,
        sgstTotal: totals.sgstTotal,
        cgstTotal: totals.cgstTotal,
        cessTotal: totals.cessTotal,
        total: totals.total,
      }),
    });

    const full = await Invoice.findByPk(invoice.id, { include: [{ model: Client }, { model: InvoiceItem, as: 'items' }] });
    res.json(full);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update invoice', error: err.message });
  }
};

exports.remove = async (req, res) => {
  const invoice = await Invoice.findOne({ where: { id: req.params.id, userId: req.userId } });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  await invoice.destroy();
  res.json({ message: 'Invoice deleted' });
};

// POST /api/invoices/:id/duplicate — clones an invoice as a new draft with today's dates.
exports.duplicate = async (req, res) => {
  try {
    const source = await Invoice.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [{ model: InvoiceItem, as: 'items' }],
    });
    if (!source) return res.status(404).json({ message: 'Invoice not found' });

    const user = await User.findByPk(req.userId);
    const prefix = user?.invoicePrefix || 'INV-';
    const nextSeq = (user?.lastInvoiceSeq || 0) + 1;
    const newNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    const today = new Date().toISOString().slice(0, 10);

    const clone = await Invoice.create({
      userId: req.userId,
      clientId: source.clientId,
      invoiceNumber: newNumber,
      invoiceDate: today,
      dueDate: today,
      placeOfSupply: source.placeOfSupply,
      notes: source.notes,
      terms: source.terms,
      subtotal: source.subtotal,
      sgstTotal: source.sgstTotal,
      cgstTotal: source.cgstTotal,
      cessTotal: source.cessTotal,
      total: source.total,
      status: 'draft',
    });

    await InvoiceItem.bulkCreate(
      source.items.map((it) => ({
        description: it.description, hsnSac: it.hsnSac, qty: it.qty, rate: it.rate,
        sgstPct: it.sgstPct, cgstPct: it.cgstPct, cessPct: it.cessPct, amount: it.amount,
        invoiceId: clone.id,
      }))
    );

    if (user) await user.increment('lastInvoiceSeq', { by: 1 });

    const full = await Invoice.findByPk(clone.id, { include: [{ model: Client }, { model: InvoiceItem, as: 'items' }] });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ message: 'Failed to duplicate invoice', error: err.message });
  }
};

// GET /api/invoices/:id/pdf — streams a generated PDF
exports.downloadPdf = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [{ model: Client }, { model: InvoiceItem, as: 'items' }],
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const user = await User.findByPk(req.userId);

    const pdfBuffer = await generateInvoicePdf(invoice, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
  }
};

// POST /api/invoices/:id/send — emails the invoice PDF to the client, marks status "sent"
exports.sendByEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [{ model: Client }, { model: InvoiceItem, as: 'items' }],
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!invoice.Client?.email) {
      return res.status(400).json({ message: 'This client has no email address saved' });
    }

    const user = await User.findByPk(req.userId);
    const pdfBuffer = await generateInvoicePdf(invoice, user);

    await sendMail({
      to: invoice.Client.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${user.companyName || user.name}`,
      text: `Hi ${invoice.Client.name},\n\nPlease find attached invoice ${invoice.invoiceNumber} for ₹${invoice.total}, due ${invoice.dueDate}.\n\n${invoice.notes || ''}`,
      html: `<p>Hi ${invoice.Client.name},</p><p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for <strong>₹${invoice.total}</strong>, due ${invoice.dueDate}.</p><p>${invoice.notes || ''}</p>`,
      attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer }],
    });

    if (invoice.status === 'draft') await invoice.update({ status: 'sent' });

    res.json({ message: 'Invoice emailed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send invoice email', error: err.message });
  }
};

exports.dashboardStats = async (req, res) => {
  const invoices = await Invoice.findAll({ where: { userId: req.userId } });
  const today = new Date();

  let totalBilled = 0, totalPaid = 0, totalOverdue = 0, totalOutstanding = 0;
  let overdueCount = 0;

  invoices.forEach((inv) => {
    const total = Number(inv.total);
    totalBilled += total;
    if (inv.status === 'paid') {
      totalPaid += total;
    } else {
      totalOutstanding += total;
      if (new Date(inv.dueDate) < today && inv.status !== 'paid') {
        totalOverdue += total;
        overdueCount += 1;
      }
    }
  });

  res.json({
    invoiceCount: invoices.length,
    totalBilled: round2(totalBilled),
    totalPaid: round2(totalPaid),
    totalOutstanding: round2(totalOutstanding),
    totalOverdue: round2(totalOverdue),
    overdueCount,
  });
};

function round2(n) { return Math.round(n * 100) / 100; }
