const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const { sendMail } = require('../utils/mailer');

function signToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, companyName, companyGSTIN, companyAddress, city, state } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashed,
      companyName, companyGSTIN, companyAddress, city, state,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

exports.me = async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: sanitize(user) });
};

// Full settings update: company profile + invoice numbering prefix
exports.updateCompany = async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const { companyName, companyGSTIN, companyAddress, city, state, logoUrl, invoicePrefix } = req.body;
  await user.update({
    companyName, companyGSTIN, companyAddress, city, state,
    ...(logoUrl !== undefined && { logoUrl }),
    ...(invoicePrefix !== undefined && invoicePrefix !== '' && { invoicePrefix }),
  });
  res.json({ user: sanitize(user) });
};

// POST /api/auth/logo  (multipart/form-data, field name "logo")
exports.uploadLogo = async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const base = process.env.APP_BASE_URL || 'http://localhost:5000';
  const logoUrl = `${base}/uploads/logos/${req.file.filename}`;
  await user.update({ logoUrl });
  res.json({ user: sanitize(user) });
};

// Returns the next auto-suggested invoice number, e.g. "INV-004", without consuming it.
exports.nextInvoiceNumber = async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const prefix = user.invoicePrefix || 'INV-';
  const nextSeq = (user.lastInvoiceSeq || 0) + 1;
  const padded = String(nextSeq).padStart(3, '0');
  res.json({ invoiceNumber: `${prefix}${padded}` });
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    // Always respond the same way so we don't leak which emails are registered.
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    await user.update({ resetToken: token, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) });

    const resetUrl = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/reset-password/${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your InvoiceFlow password',
        text: `Reset your password using this link (valid 1 hour): ${resetUrl}`,
        html: `<p>Click below to reset your password (valid 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (mailErr) {
      // Don't fail the request just because SMTP isn't configured in dev;
      // log so the developer can still grab the link manually while testing.
      console.warn('  Could not send reset email:', mailErr.message, '\n   Reset link:', resetUrl);
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not process request', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });

    const user = await User.findOne({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await user.update({ password: hashed, resetToken: null, resetTokenExpiry: null });
    res.json({ message: 'Password updated. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not reset password', error: err.message });
  }
};

function sanitize(user) {
  const {
    id, name, email, companyName, companyGSTIN, companyAddress,
    city, state, logoUrl, invoicePrefix, lastInvoiceSeq,
  } = user;
  return { id, name, email, companyName, companyGSTIN, companyAddress, city, state, logoUrl, invoicePrefix, lastInvoiceSeq };
}
