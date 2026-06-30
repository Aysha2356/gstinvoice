const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes from your routes directory
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reminderRoutes = require('./routes/reminderRoutes');

const app = express();

// Global Middleware Configuration
app.use(cors());                          // Allows your React frontend (localhost:5173) to communicate with this API
app.use(express.json());                  // Parses incoming JSON request bodies (like form inputs)
app.use(express.urlencoded({ extended: true }));

// Serve company logos statically from the uploads directory
app.use('/uploads/logos', express.static(path.join(__dirname, '../uploads/logos')));

// Base Health Check Route (Verify API status at http://localhost:5000/api/health)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    message: 'InvoiceFlow API is running smoothly and ready for traffic.' 
  });
});

// API Routes Mapping
app.use('/api/auth', authRoutes);         // Handles registration, login, and token checks
app.use('/api/clients', clientRoutes);     // Handles client tracking, search, and pagination
app.use('/api/invoices', invoiceRoutes);   // Handles multi-line GST calculations and saves
app.use('/api/reminders', reminderRoutes); // Handles OpenAI gpt-4o-mini reminder drafting

// Catch-All 404 Route for unmatched API requests
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: true, message: 'API endpoint not found.' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('An unexpected server error occurred:', err.stack);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;