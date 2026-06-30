// One-off script: `npm run db:sync` creates/updates all tables from the models.
require('dotenv').config();
const { sequelize } = require('./models');

(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to sync database:', err);
    process.exit(1);
  }
})();
