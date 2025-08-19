/**
 * Updated April 2, 2025 - Fixed initialization issue for email functions
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Updated to use firebase-functions v4
const functions = require('firebase-functions');
const logger = functions.logger; // Use built-in functions logger
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const corsLib = require('cors');
const { v4: uuidv4 } = require('uuid');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { simpleContactFunction } = require('./simplifiedContact');
const { sendContactEmail } = require('./sendContactEmail');
const { directContactEmail } = require('./simple-contact-email');

// Import our email functions directly - CRITICAL: use destructuring syntax to get the actual function
const sendOrderEmailFunction = require('./sendOrderEmail');
const invoiceEmailModule = require('./sendInvoiceEmail');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Create the main Express app
const app = express();

// Setup CORS for all routes (staging + prod + localhost)
const allowedOrigins = [
  'https://buttonsflowerfarm-8a54d.web.app',
  'https://urban-flower-farm-staging.web.app',
  'http://localhost:3000',
  'http://localhost:4000'  // Add port 4000 since that's what we're using
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers']
}));

// Parse JSON
app.use(express.json());

// Configure email settings
const BUTTONS_EMAIL = 'buttonsflowerfarm@telus.net';

// Create transporter with Gmail SMTP settings
const createTransporter = async () => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: BUTTONS_EMAIL,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP connection successful");
    return transporter;
  } catch (error) {
    console.error("❌ SMTP connection failed:", error);
    throw error;
  }
};

// Health check endpoints - CRITICAL for container healthcheck
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'API service is running',
    timestamp: new Date().toISOString()
  });
});

// Add a debug endpoint that always succeeds
app.post('/debug', (req, res) => {
  console.log('📊 DEBUG ENDPOINT CALLED with payload:', JSON.stringify(req.body, null, 2));
  
  // Always return success
  res.status(200).json({
    success: true,
    debug: true,
    message: 'Debug endpoint successful',
    receivedPayload: req.body,
    note: 'This endpoint always succeeds and does not attempt to send real emails'
  });
});

// General email endpoint
app.post('/', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    logger.info('Received email request:', { to, subject });
    
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required fields');
    }

    const transporter = await createTransporter();

    const msg = {
      to,
      from: BUTTONS_EMAIL,
      subject,
      text: text || html,
      html: html || text,
    };

    const result = await transporter.sendMail(msg);
    logger.info('General email sent successfully:', result.messageId);
    
    res.status(200).json({ success: true, messageId: result.messageId });
  } catch (error) {
    logger.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Keep the old route for backward compatibility
app.post('/send-email', (req, res) => {
  app._router.handle(Object.assign({}, req, {url: '/', originalUrl: '/'}), res);
});

// Move the debug endpoint here
app.get('/debug', (req, res) => {
  // Simple debug check endpoint
  console.log('🔍 Debug check endpoint called');
  res.status(200).json({
    success: true,
    message: 'Debug endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Add a debug endpoint for testing email structure
app.post('/debug-email', (req, res) => {
  console.log('📊 DEBUG EMAIL ENDPOINT CALLED with payload:', JSON.stringify(req.body, null, 2));
  
  // Always return success
  res.status(200).json({
    success: true,
    debug: true,
    message: 'Debug email endpoint successful',
    receivedPayload: req.body,
    note: 'This endpoint validates email data without sending actual emails'
  });
});

// Explicit OPTIONS handler for the old route path too
app.options('/send-order-email', (req, res) => {
  // Force 204 No Content response with CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.set('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).send('');
});

// Contact form email endpoint
app.post('/sendContactEmail', async (req, res) => {
  // Forward the request to the contact email handler
  try {
    await sendContactEmail.handler(req, res);
  } catch (error) {
    console.error('Error in sendContactEmail route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process contact email request',
      message: error.message
    });
  }
});

// Keep the old route for backward compatibility
app.post('/send-contact-email', (req, res) => {
  app._router.handle(Object.assign({}, req, {url: '/', originalUrl: '/'}), res);
});

// Helper function to calculate total
function calculateTotal(items) {
  if (!Array.isArray(items)) return 0;
  
  return items.reduce((sum, item) => {
    // Skip freebies from total calculation
    if (item.isFreebie) return sum;
    
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity, 10) || 0;
    return sum + (price * quantity);
  }, 0).toFixed(2);
}

// Functions to handle order notes
function getOrderNotes(order) {
  // VERY IMPORTANT: Check all possible places where notes could be stored
  // This is critical for customers who provide pickup dates/times
  
  // Log all possible note locations
  logger.info('Checking for notes in order data', {
    orderNotesDirectly: order.notes,
    customerNotes: order.customer?.notes,
    orderData: order
  });
  
  // Try to get notes from all possible locations
  if (order.notes) {
    logger.info('Found notes directly on order object', { notes: order.notes });
    return order.notes;
  } else if (order.customer && order.customer.notes) {
    logger.info('Found notes in customer object', { notes: order.customer.notes });
    return order.customer.notes;
  } else {
    logger.warn('No notes found in order data', { orderId: order.id });
    return '';
  }
}

// Create the express app for image upload with CORS
const uploadImageApp = express();
uploadImageApp.use(cors({ 
  origin: ['https://buttonsflowerfarm-8a54d.web.app', 'https://urban-flower-farm-staging.web.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 3600
}));

// Add a simple test endpoint to verify the function is accessible
uploadImageApp.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Upload function is available' });
});

// Handle image uploads - placeholder until we create a proper handler
uploadImageApp.post('/uploadImage', (req, res) => {
  // Set CORS headers manually to ensure they're present
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', '*');
  }
  
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // For now, just return success
  res.status(200).json({ 
    success: true, 
    message: 'Upload endpoint is working, but actual upload functionality is under maintenance',
    url: 'https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fplaceholder.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739',
    path: 'images/placeholder.jpg'
  });
});

// Handle OPTIONS preflight request
uploadImageApp.options('*', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://buttonsflowerfarm-8a54d.web.app', 'https://urban-flower-farm-staging.web.app', 'http://localhost:3000'];
  
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', '*');
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).send('');
});

// Export the API
exports.api = functions.region('us-central1').https.onRequest(app);

// Export the uploadImage function
exports.uploadImage = functions.region('us-central1').https.onRequest(uploadImageApp);

// Export sendOrderEmail directly with simplified CORS
exports.sendOrderEmail = functions.https.onRequest(async (req, res) => {
  // Set CORS headers for all requests
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');
  res.set('Access-Control-Max-Age', '3600');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Forward to the actual function
  return sendOrderEmailFunction.sendOrderEmail(req, res);
});

// Export sendInvoiceEmail function
exports.sendInvoiceEmail = invoiceEmailModule.sendInvoiceEmail;

// Export other functions
exports.simpleContactFunction = simpleContactFunction;
exports.directContactEmail = directContactEmail;
