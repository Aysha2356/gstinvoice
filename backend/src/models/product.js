const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  hsnSac: { type: DataTypes.STRING },
  rate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  sgstPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  cgstPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  unit: { type: DataTypes.STRING, defaultValue: 'pcs' },
});

module.exports = Product;