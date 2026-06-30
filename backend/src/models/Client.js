const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Client = sequelize.define('Client', {
  name: { type: DataTypes.STRING, allowNull: false },
  gstin: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
});

module.exports = Client;
