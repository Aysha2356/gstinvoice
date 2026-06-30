const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InvoiceItem = sequelize.define('InvoiceItem', {
  description: { type: DataTypes.STRING, allowNull: false },
  hsnSac: { type: DataTypes.STRING },
  qty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
  rate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  sgstPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  cgstPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  cessPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
});

module.exports = InvoiceItem;
