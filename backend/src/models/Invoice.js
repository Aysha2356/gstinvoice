const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  invoiceNumber: { type: DataTypes.STRING, allowNull: false },
  invoiceDate: { type: DataTypes.DATEONLY, allowNull: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  placeOfSupply: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  terms: { type: DataTypes.TEXT },
  subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  sgstTotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cgstTotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cessTotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue'),
    defaultValue: 'draft',
  },
});

module.exports = Invoice;
