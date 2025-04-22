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
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const corsLib = require('cors');
const { v4: uuidv4 } = require('uuid');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { simpleContactFunction } = require('./simplifiedContact');
const { sendContactEmail } = require('./sendContactEmail');
const { directContactEmail } = require('./simple-contact-email');

// Import our email functions directly - CRITICAL: use destructuring syntax to get the actual function
const { sendOrderEmail } = require('./sendOrderEmail');
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
  'http://localhost:3000'
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
}));

// Parse JSON
app.use(express.json());

// Configure SendGrid
let apiKeyConfigured = false;
const BUTTONS_EMAIL = 'buttonsflowerfarm@gmail.com';

try {
  // Try to get API key from Firebase config (production)
  const sendgridConfig = functions.config().sendgrid;
  if (sendgridConfig && sendgridConfig.api_key) {
    sgMail.setApiKey(sendgridConfig.api_key);
    console.log('API Key status: Found (length: ' + sendgridConfig.api_key.length + ')');
    console.log('SendGrid API initialized');
    apiKeyConfigured = true;
  } else {
    // Try environment variable (development)
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      console.log('API Key status: Found from env (length: ' + apiKey.length + ')');
      console.log('SendGrid API initialized from environment');
      apiKeyConfigured = true;
    } else {
      console.error('API Key status: MISSING - SendGrid will not work!');
      // TEMPORARY DEBUG FIX - Set a fake API key for testing routes
      sgMail.setApiKey('SG.fakeKeyForTestingPurposesOnly');
      console.warn('TESTING MODE: Using fake API key for route testing only');
      apiKeyConfigured = true; // Enable for testing routes only
    }
  }
} catch (error) {
  console.error('Error configuring SendGrid:', error.message);
}

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
    
    if (!apiKeyConfigured) {
      throw new Error('SendGrid API key is not configured');
    }
    
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required fields');
    }

    const msg = {
      to,
      from: BUTTONS_EMAIL,
      subject,
      text: text || html,
      html: html || text,
    };

    await sgMail.send(msg);
    logger.info('General email sent successfully');
    
    res.status(200).json({ success: true });
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

// Email template functions
function generateCustomerEmailTemplate(order) {
  // Ensure items exists and is an array
  const items = Array.isArray(order.items) ? order.items : [];
  
  const itemsList = items.map(item => {
    // Handle potential missing values
    const name = item.name || 'Item';
    const quantity = item.quantity || 1;
    const price = parseFloat(item.price) || 0;
    
    return `
    <tr>
      <td>${name}</td>
      <td>${quantity}</td>
      <td>$${price.toFixed(2)}</td>
      <td>$${(price * quantity).toFixed(2)}</td>
    </tr>
    `;
  }).join('');

  // Ensure customer exists
  const customer = order.customer || {};
  const firstName = customer.firstName || 'Customer';
  const lastName = customer.lastName || '';
  const email = customer.email || 'N/A';
  const phone = customer.phone || 'N/A';

  // VERY IMPORTANT: Get notes from all possible locations
  const notes = getOrderNotes(order);

  // Ensure total is a number
  const total = parseFloat(order.total) || 0;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">Thank You for Your Order!</h2>
      <p>Dear ${firstName},</p>
      <p>We've received your order and are excited to prepare it for you. Here are your order details:</p>
      
      <h3>Order Information</h3>
      <p><strong>Order ID:</strong> ${order.id}</p>
      
      ${notes ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 5px solid #27ae60; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #27ae60; margin-top: 0;">IMPORTANT: Your Pickup Request</h3>
          <p style="margin-bottom: 0;">${notes}</p>
        </div>
      ` : ''}
      
      <h3>Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: left;">Quantity</th>
            <th style="padding: 10px; text-align: left;">Price</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList || '<tr><td colspan="4">No items</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px;"><strong>$${total.toFixed(2)}</strong></td>
          </tr>
 
      </table>

      <h3>Payment Information</h3>
      <p>Please complete your payment using one of the following methods:</p>
      <ul>
        <li><strong>Cash:</strong> Available for in-person pickup</li>
        <li><strong>E-Transfer:</strong> Send to ${BUTTONS_EMAIL}</li>
      </ul>
      <p>Please include your order number (${order.id}) in the payment notes.</p>

      <p>We will confirm your pickup date and time by text message to <strong>${phone}</strong>.</p>

      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>The Buttons Flower Farm Team</p>
    </div>
  `;
}

function generateButtonsEmailTemplate(order) {
  // Ensure items exists and is an array
  const items = Array.isArray(order.items) ? order.items : [];
  
  const itemsList = items.map(item => {
    // Handle potential missing values
    const name = item.name || 'Item';
    const quantity = item.quantity || 1;
    const price = parseFloat(item.price) || 0;
    
    return `
    <tr>
      <td>${name}</td>
      <td>${quantity}</td>
      <td>$${price.toFixed(2)}</td>
      <td>$${(price * quantity).toFixed(2)}</td>
    </tr>
    `;
  }).join('');

  // Ensure customer exists
  const customer = order.customer || {};
  const firstName = customer.firstName || 'Customer';
  const lastName = customer.lastName || '';
  const email = customer.email || 'N/A';
  const phone = customer.phone || 'N/A';

  // VERY IMPORTANT: Get notes from all possible locations
  const notes = getOrderNotes(order);

  // Ensure total is a number
  const total = parseFloat(order.total) || 0;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">New Order Received!</h2>
      
      ${notes ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 5px solid #e74c3c; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #e74c3c; margin-top: 0;">⚠️ IMPORTANT: Customer Notes/Pickup Request</h3>
          <p style="margin-bottom: 0;">${notes}</p>
        </div>
      ` : ''}
      
      <h3>Order Information</h3>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${new Date(order.date || new Date()).toLocaleDateString()}</p>
      
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      
      <h3>Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: left;">Quantity</th>
            <th style="padding: 10px; text-align: left;">Price</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList || '<tr><td colspan="4">No items</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px;"><strong>$${total.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
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

// Export sendOrderEmail directly, letting it handle its own CORS
exports.sendOrderEmail = sendOrderEmail;

// Export sendInvoiceEmail function
exports.sendInvoiceEmail = invoiceEmailModule.sendInvoiceEmail;

// Export other functions
exports.simpleContactFunction = simpleContactFunction;
exports.directContactEmail = directContactEmail;
