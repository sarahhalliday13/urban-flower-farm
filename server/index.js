const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables first
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Log environment variables (without exposing the full API key)
console.log('Environment loaded from root:', path.resolve(__dirname, '../.env'));
console.log('Environment loaded from server:', path.resolve(__dirname, '.env'));
console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
console.log('REACT_APP_SENDGRID_API_KEY exists:', !!process.env.REACT_APP_SENDGRID_API_KEY);
if (process.env.SENDGRID_API_KEY) {
  console.log('SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY.length);
  console.log('SENDGRID_API_KEY starts with SG:', process.env.SENDGRID_API_KEY.startsWith('SG.'));
}

// Now require routes after environment variables are loaded
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-netlify-app.netlify.app']
    : ['http://localhost:3000', 'http://localhost:3007', 'http://localhost:61638'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/email', emailRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 