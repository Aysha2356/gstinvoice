const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// attachments: [{ filename, content (Buffer) }]
async function sendMail({ to, subject, text, html, attachments }) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP is not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS in .env');
  }
  return t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
    attachments,
  });
}

module.exports = { sendMail };
