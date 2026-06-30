const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false }, // bcrypt hash
  companyName: { type: DataTypes.STRING },
  companyGSTIN: { type: DataTypes.STRING },
  companyAddress: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  logoUrl: { type: DataTypes.STRING },
  resetToken: { type: DataTypes.STRING },
  resetTokenExpiry: { type: DataTypes.DATE },
  invoicePrefix: { type: DataTypes.STRING, defaultValue: 'INV-' },
  lastInvoiceSeq: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = User;
