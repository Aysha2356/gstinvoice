const { Op } = require('sequelize');
const { Product } = require('../models');

exports.list = async (req, res) => {
  const { search = '' } = req.query;
  const where = { userId: req.userId };
  if (search) where.name = { [Op.like]: `%${search}%` };
  const products = await Product.findAll({ where, order: [['name', 'ASC']] });
  res.json(products);
};

exports.create = async (req, res) => {
  const { name, hsnSac, rate, sgstPct, cgstPct, unit } = req.body;
  if (!name) return res.status(400).json({ message: 'Product name is required' });
  const product = await Product.create({ name, hsnSac, rate, sgstPct, cgstPct, unit, userId: req.userId });
  res.status(201).json(product);
};

exports.update = async (req, res) => {
  const product = await Product.findOne({ where: { id: req.params.id, userId: req.userId } });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await product.update(req.body);
  res.json(product);
};

exports.remove = async (req, res) => {
  const product = await Product.findOne({ where: { id: req.params.id, userId: req.userId } });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await product.destroy();
  res.json({ message: 'Product deleted' });
};