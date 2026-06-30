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
    page: Number(page),
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(count / limit)),
  });
};

// GET single invoice
exports.getOne = async (req, res) => {
  const invoice = await Invoice.findOne({
    where: { id: req.params.id, userId: req.userId },
    include: [{ model: Client }, { model: InvoiceItem, as: 'items' }],
  });

  if (!invoice)
    return res.status(404).json({ message: 'Invoice not found' });

  res.json(invoice);
};

// CREATE invoice
exports.create = async (req, res) => {
  try {
    const {
      clientId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      placeOfSupply,
      notes,
      terms,
      items,
    } = req.body;

    if (!invoiceNumber || !invoiceDate || !dueDate || !items?.length) {
      return res.status(400).json({
        message: 'invoiceNumber, dates and at least one item are required',
      });
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

    const user = await User.findByPk(req.userId);
    if (user) await user.increment('lastInvoiceSeq', { by: 1 });

    const full = await Invoice.findByPk(invoice.id, {
      include: [{ model: Client }, { model: InvoiceItem, as: 'items' }],
    });

    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to create invoice',
      error: err.message,
    });
  }
};

// UPDATE invoice
exports.update = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!invoice)
      return res.status(404).json({ message: 'Invoice not found' });

    const {
      clientId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      placeOfSupply,
      notes,
      terms,
      items,
      status,
    } = req.body;

    let totals = null;

    if (items?.length) {
      totals = calcInvoiceTotals(items);

      await InvoiceItem.destroy({
        where: { invoiceId: invoice.id },
      });

      await InvoiceItem.bulkCreate(
        totals.items.map((it) => ({
          ...it,
          invoiceId: invoice.id,
        }))
      );
    }

    await invoice.update({
      clientId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      placeOfSupply,
      notes,
      terms,
      status: status || invoice.status,
      ...(totals && {
        subtotal: totals.subtotal,
        sgstTotal: totals.sgstTotal,
        cgstTotal: totals.cgstTotal,
        cessTotal: totals.cessTotal,
        total: totals.total,
      }),
    });

    const full = await Invoice.findByPk(invoice.id, {
      include: [{ model: Client }, { model: InvoiceItem, as: 'items' }],
    });

    res.json(full);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update invoice',
      error: err.message,
    });
  }
};

// DELETE invoice
exports.remove = async (req, res) => {
  const invoice = await Invoice.findOne({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!invoice)
    return res.status(404).json({ message: 'Invoice not found' });

  await invoice.destroy();

  res.json({ message: 'Invoice deleted' });
};

/* =========================================================
   ❌ DUPLICATE FEATURE FULLY REMOVED (INTENTIONALLY DELETED)
   ========================================================= */

// PDF download
exports.downloadPdf = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [{ model: Client }, { model: InvoiceItem, as: 'items' }],
    });

    if (!invoice)
      return res.status(404).json({ message: 'Invoice not found' });

    const user = await User.findByPk(req.userId);

    const pdfBuffer = await generateInvoicePdf(invoice, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to generate PDF',
      error: err.message,
    });
  }
};

// EMAIL invoice
exports.sendByEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [{ model: Client }, { model: InvoiceItem, as: 'items' }],
    });

    if (!invoice)
      return res.status(404).json({ message: 'Invoice not found' });

    if (!invoice.Client?.email) {
      return res.status(400).json({
        message: 'This client has no email address saved',
      });
    }

    const user = await User.findByPk(req.userId);

    const pdfBuffer = await generateInvoicePdf(invoice, user);

    await sendMail({
      to: invoice.Client.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${user.companyName || user.name}`,
      text: `Hi ${invoice.Client.name},\n\nInvoice ${invoice.invoiceNumber} for ₹${invoice.total}.`,
      html: `<p>Hi ${invoice.Client.name},</p>
             <p>Invoice <b>${invoice.invoiceNumber}</b> for ₹${invoice.total}</p>`,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (invoice.status === 'draft') {
      await invoice.update({ status: 'sent' });
    }

    res.json({ message: 'Invoice emailed successfully' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to send invoice email',
      error: err.message,
    });
  }
};

// DASHBOARD STATS
exports.dashboardStats = async (req, res) => {
  const invoices = await Invoice.findAll({
    where: { userId: req.userId },
  });

  const today = new Date();

  let totalBilled = 0,
    totalPaid = 0,
    totalOverdue = 0,
    totalOutstanding = 0,
    overdueCount = 0;

  invoices.forEach((inv) => {
    const total = Number(inv.total);
    totalBilled += total;

    if (inv.status === 'paid') {
      totalPaid += total;
    } else {
      totalOutstanding += total;

      if (new Date(inv.dueDate) < today) {
        totalOverdue += total;
        overdueCount++;
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

function round2(n) {
  return Math.round(n * 100) / 100;
}