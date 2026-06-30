const { Op } = require('sequelize');
const { Client } = require('../models');

// GET /api/clients?search=&page=&pageSize=
exports.list = async (req, res) => {
  const { search = '', page, pageSize } = req.query;

  const where = { userId: req.userId };
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { gstin: { [Op.like]: `%${search}%` } },
    ];
  }

  // Backwards compatible: if no page/pageSize given, return the full plain array
  // (so older frontend code that does res.data.map(...) keeps working).
  if (!page && !pageSize) {
    const clients = await Client.findAll({ where, order: [['createdAt', 'DESC']] });
    return res.json(clients);
  }

  const limit = Math.max(1, Math.min(100, Number(pageSize) || 10));
  const offset = (Math.max(1, Number(page) || 1) - 1) * limit;

  const { rows, count } = await Client.findAndCountAll({
    where, order: [['createdAt', 'DESC']], limit, offset,
  });

  res.json({
    clients: rows,
    total: count,
    page: Number(page) || 1,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(count / limit)),
  });
};

exports.create = async (req, res) => {
  const { name, gstin, address, city, state, email } = req.body;
  if (!name) return res.status(400).json({ message: 'Client name is required' });
  const client = await Client.create({ name, gstin, address, city, state, email, userId: req.userId });
  res.status(201).json(client);
};

exports.update = async (req, res) => {
  const client = await Client.findOne({ where: { id: req.params.id, userId: req.userId } });
  if (!client) return res.status(404).json({ message: 'Client not found' });
  await client.update(req.body);
  res.json(client);
};

exports.remove = async (req, res) => {
  const client = await Client.findOne({ where: { id: req.params.id, userId: req.userId } });
  if (!client) return res.status(404).json({ message: 'Client not found' });
  await client.destroy();
  res.json({ message: 'Client deleted' });
};
