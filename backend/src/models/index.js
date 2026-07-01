const sequelize = require('../config/db');
const User = require('./User');
const Client = require('./Client');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const Product = require('./Product'); // ✅ added new model

User.hasMany(Client, { foreignKey: 'userId', onDelete: 'CASCADE' });
Client.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Invoice, { foreignKey: 'userId', onDelete: 'CASCADE' });
Invoice.belongsTo(User, { foreignKey: 'userId' });

Client.hasMany(Invoice, { foreignKey: 'clientId' });
Invoice.belongsTo(Client, { foreignKey: 'clientId' });

Invoice.hasMany(InvoiceItem, { 
  foreignKey: 'invoiceId', 
  onDelete: 'CASCADE', 
  as: 'items' 
});
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

// ✅ NEW RELATION ADDED
User.hasMany(Product, { foreignKey: 'userId', onDelete: 'CASCADE' });
Product.belongsTo(User, { foreignKey: 'userId' });

module.exports = { 
  sequelize, 
  User, 
  Client, 
  Invoice, 
  InvoiceItem,
  Product // ✅ exported new model
};