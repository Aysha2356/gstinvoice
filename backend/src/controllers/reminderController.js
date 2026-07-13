const OpenAI = require('openai');
const { Invoice, Client, User } = require('../models');

const useGroq = Boolean(process.env.GROQ_API_KEY);
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey,
  ...(useGroq ? { baseURL: 'https://api.groq.com/openai/v1' } : {}),
});

// Drafts a polite payment-reminder email for an overdue/unpaid invoice using Groq or OpenAI.
exports.draftReminder = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.invoiceId, userId: req.userId },
      include: [{ model: Client }],
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const user = await User.findByPk(req.userId);
    const daysOverdue = Math.max(
      0,
      Math.ceil((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    );

    const prompt = `Write a short, polite, professional payment reminder email.
Sender (my business): ${user.companyName || user.name}
Recipient (client): ${invoice.Client?.name || 'Customer'}
Invoice number: ${invoice.invoiceNumber}
Invoice total: ₹${invoice.total}
Due date: ${invoice.dueDate}
Days overdue: ${daysOverdue}
Tone: friendly but firm, no guilt-tripping, one short paragraph plus a one-line closing with a clear ask to pay by a new short deadline.
Output only the email body text, no subject line, no placeholders like [Your Name] left unresolved — sign off using the sender name above.`;

    if (!apiKey) {
      return res.status(500).json({
        message: 'No GROQ_API_KEY or OPENAI_API_KEY configured',
      });
    }

    const model = useGroq
      ? process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
      : process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
    });

    const draft = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!draft) {
      return res.status(502).json({ message: 'Received empty draft from model' });
    }

    res.json({ draft, daysOverdue, invoiceNumber: invoice.invoiceNumber });
  } catch (err) {
    res.status(500).json({ message: 'Failed to draft reminder', error: err.message });
  }
};