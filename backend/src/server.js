require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reminderRoutes = require('./routes/reminderRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
//app.use('/api/reminders', reminderRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

const PORT = Number(process.env.PORT || 5000);

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is busy. Trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server failed to start:', err.message);
      process.exit(1);
    }
  });
};

sequelize
  .authenticate()
  .then(() => {
    console.log('✅ MySQL connected');
    startServer(PORT);
  })
  .catch((err) => {
    console.error('❌ Could not connect to MySQL:', err.message);
    process.exit(1);
  });
