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
const { v4: uuidv4 } = require('uuid');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { simpleContactFunction } = require('./simplifiedContact');
const { sendContactEmail } = require('./sendContactEmail');
const { directContactEmail } = require('./simple-contact-email');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

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

// Create Express apps for our endpoints
const sendEmailApp = express();
sendEmailApp.use(cors({ origin: true }));
sendEmailApp.use(express.json()); // v4 requires explicit JSON parser

const sendOrderEmailApp = express();
sendOrderEmailApp.use(cors({ 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));
sendOrderEmailApp.use(express.json()); // v4 requires explicit JSON parser

// CRITICAL: Direct handler for OPTIONS preflight requests - must come BEFORE any routes
// This overrides the cors middleware with a direct implementation
sendOrderEmailApp.options('*', (req, res) => {
  // Force 204 No Content response with CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.set('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).send('');
});

// Add a special debug endpoint that always succeeds
sendOrderEmailApp.post('/debug', (req, res) => {
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

const sendContactEmailApp = express(); 
sendContactEmailApp.use(cors({ origin: true }));
sendContactEmailApp.use(express.json()); // v4 requires explicit JSON parser

// Health check endpoints - CRITICAL for container healthcheck
sendEmailApp.get('/', (req, res) => {
  res.status(200).send('Email service is healthy');
  logger.info('Health check request received and responded to successfully');
});

sendOrderEmailApp.get('/', (req, res) => {
  res.status(200).send('Order email service is healthy');
  logger.info('Order email health check request received and responded to successfully');
});

sendContactEmailApp.get('/', (req, res) => {
  res.status(200).send('Contact email service is healthy');
  logger.info('Contact email health check request received and responded to successfully');
});

// General email endpoint
sendEmailApp.post('/', async (req, res) => {
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
sendEmailApp.post('/send-email', (req, res) => {
  sendEmailApp._router.handle(Object.assign({}, req, {url: '/', originalUrl: '/'}), res);
});

// Order email endpoint
sendOrderEmailApp.post('/', async (req, res) => {
  // Set explicit CORS headers for additional compatibility
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  
  // DEBUG: Log the full request body to understand what we're receiving
  console.log('📦 REQUEST PAYLOAD:', JSON.stringify(req.body, null, 2));
  
  // Early validation with detailed error response
  if (!req.body) {
    console.error('❌ Empty request body received');
    return res.status(400).json({
      success: false,
      error: 'Empty request body',
      message: 'The request payload was empty or invalid'
    });
  }
  
  if (req.body.test === true) {
    console.log('🧪 TEST MODE DETECTED');
    return res.status(200).json({
      success: true,
      test: true,
      message: 'Test mode: This would normally send an order confirmation email',
      receivedPayload: req.body
    });
  }
  
  // Validate customer information
  if (!req.body.customer) {
    console.error('❌ Missing customer object in order');
    return res.status(400).json({
      success: false,
      error: 'Invalid order data',
      detail: 'Missing customer information',
      receivedPayload: req.body
    });
  }
  
  if (!req.body.customer.email) {
    console.error('❌ Missing customer email in order');
    return res.status(400).json({
      success: false,
      error: 'Invalid customer data',
      detail: 'Missing customer email',
      receivedPayload: req.body
    });
  }
  
  let emailsSent = false;
  let orderSaved = false;
  let orderId = null;
  
  try {
    // Get order data from request and log at each step
    const orderData = req.body;
    
    // Log validation to trace the process
    console.log('🔍 Starting order validation process...');
    
    // Extract orderId or generate a new one
    orderId = orderData.id || orderData.orderId || `manual-${Date.now()}`;
    console.log('📝 Using order ID:', orderId);
    
    // Create basic validated order structure with defaults
    const validatedOrder = {
      id: orderId,
      date: orderData.date || new Date().toISOString(),
      status: orderData.status || 'pending',
      total: orderData.total || 0,
      customer: {
        firstName: orderData.customer?.firstName || orderData.customer?.name?.split(' ')[0] || 'Customer',
        lastName: orderData.customer?.lastName || 
                 (orderData.customer?.name?.split(' ').slice(1).join(' ') || ''),
        email: orderData.customer?.email || 'buttonsflowerfarm@gmail.com',
        phone: orderData.customer?.phone || 'N/A',
        notes: orderData.customer?.notes || orderData.notes || ''
      },
      items: Array.isArray(orderData.items) ? orderData.items : []
    };
    
    // Log the validated order for debugging
    console.log('✅ Validated order structure:', JSON.stringify(validatedOrder, null, 2));
    
    // Recalculate total if not provided or items have changed
    if (!orderData.total && validatedOrder.items.length > 0) {
      validatedOrder.total = calculateTotal(validatedOrder.items);
    }
    
    // Check if SendGrid API key is configured
    if (!apiKeyConfigured) {
      console.error('❌ SendGrid API key is not configured');
      throw new Error('SendGrid API key is not configured');
    }
    
    // Server-side save order to database
    try {
      logger.info('Saving order to database from server-side:', validatedOrder.id);
      // Check if order already exists
      const existingOrder = await admin.database().ref(`orders/${validatedOrder.id}`).once('value');
      
      if (existingOrder.exists()) {
        logger.info('Order already exists in database, updating:', validatedOrder.id);
      }
      
      await admin.database().ref(`orders/${validatedOrder.id}`).set({
        ...validatedOrder,
        _serverSaveTimestamp: Date.now(),
        _serverSaved: true
      });
      
      orderSaved = true;
      logger.info('Order saved to database from server-side successfully:', validatedOrder.id);
    } catch (dbError) {
      logger.error('Error saving order to database from server-side:', {
        error: dbError.message,
        orderId: validatedOrder.id,
        stack: dbError.stack
      });
      // Continue with email sending even if database save fails
    }

    // Send email to customer
    const customerEmail = {
      to: validatedOrder.customer.email,
      from: BUTTONS_EMAIL,
      subject: `Order Confirmation - ${validatedOrder.id}`,
      html: generateCustomerEmailTemplate(validatedOrder)
    };

    // Send email to Buttons
    const buttonsEmail = {
      to: BUTTONS_EMAIL,
      from: BUTTONS_EMAIL,
      subject: `New Order Received - ${validatedOrder.id}`,
      html: generateButtonsEmailTemplate(validatedOrder)
    };

    logger.info('Sending order confirmation emails...');
    try {
      await sgMail.send(customerEmail);
      logger.info('Customer confirmation email sent successfully');
      
      await sgMail.send(buttonsEmail);
      logger.info('Admin notification email sent successfully');
      
      emailsSent = true;
    } catch (emailError) {
      logger.error('Error sending confirmation emails:', {
        message: emailError.message,
        response: emailError.response?.body,
        code: emailError.code
      });
      throw emailError; // Re-throw to be caught by the outer catch block
    }
    
    res.status(200).json({ 
      success: true,
      orderSaved,
      emailsSent,
      message: `Order ${orderSaved ? 'saved to database' : 'not saved to database'} and confirmation emails ${emailsSent ? 'sent' : 'not sent'}`
    });
  } catch (error) {
    console.error('❌ Error processing order:', {
      message: error.message,
      stack: error.stack,
      orderId: orderId || 'unknown',
      code: error.code || 'unknown'
    });
    
    // Check for specific error types
    if (error.message && error.message.includes('SendGrid API key')) {
      return res.status(500).json({
        success: false,
        error: 'Email service configuration error',
        detail: 'API key missing or invalid',
        orderSaved,
        emailsSent
      });
    }
    
    if (error.code === 'ECONNREFUSED' || (error.response && error.response.code === 'ECONNREFUSED')) {
      return res.status(500).json({
        success: false,
        error: 'Email service connection error',
        detail: 'Could not connect to email service',
        orderSaved,
        emailsSent
      });
    }
    
    res.status(500).json({ 
      success: false,
      orderSaved,
      emailsSent,
      error: 'Failed to process order',
      message: error.message,
      detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Keep the old route for backward compatibility
sendOrderEmailApp.post('/send-order-email', (req, res) => {
  // Set explicit CORS headers for additional compatibility
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  
  sendOrderEmailApp._router.handle(Object.assign({}, req, {url: '/', originalUrl: '/'}), res);
});

// Move the debug endpoint here
sendOrderEmailApp.get('/debug', (req, res) => {
  // Simple debug check endpoint
  console.log('🔍 Debug check endpoint called');
  res.status(200).json({
    success: true,
    message: 'Debug endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Add a debug endpoint for testing email structure
sendOrderEmailApp.post('/debug-email', (req, res) => {
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
sendOrderEmailApp.options('/send-order-email', (req, res) => {
  // Force 204 No Content response with CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.set('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).send('');
});

// Contact form email endpoint
sendContactEmailApp.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    logger.info('Received contact form submission:', { name, email });

    if (!apiKeyConfigured) {
      throw new Error('SendGrid API key is not configured');
    }

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const msg = {
      to: BUTTONS_EMAIL,
      from: BUTTONS_EMAIL, // Must be verified sender
      replyTo: email,
      subject: subject || `New message from ${name}`,
      text: `
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

Message:
${message}
      `,
      html: `
<h3>New Contact Form Submission</h3>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
<br>
<p><strong>Message:</strong></p>
<p>${message.replace(/\n/g, '<br>')}</p>
      `
    };

    logger.info('Sending contact form email...');
    await sgMail.send(msg);
    logger.info('Contact form email sent successfully');

    res.status(200).json({ 
      success: true,
      message: 'Contact form email sent successfully' 
    });
  } catch (error) {
    logger.error('Error sending contact form email:', {
      message: error.message,
      response: error.response?.body,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to send contact form email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Keep the old route for backward compatibility
sendContactEmailApp.post('/send-contact-email', (req, res) => {
  sendContactEmailApp._router.handle(Object.assign({}, req, {url: '/', originalUrl: '/'}), res);
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
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 3600
}));

// Add a simple test endpoint to verify the function is accessible
uploadImageApp.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Upload function is available' });
});

// Handle image uploads - for now, just return success to test CORS
uploadImageApp.post('/', (req, res) => {
  // Set CORS headers manually to ensure they're present
  res.set('Access-Control-Allow-Origin', '*');
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
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).send('');
});

// Add all the function exports here
// Update exports for firebase-functions v4
exports.sendEmail = functions
  .region('us-central1')
  .https.onRequest(sendEmailApp);

exports.sendOrderEmail = functions
  .region('us-central1')
  .https.onRequest(sendOrderEmailApp);

exports.sendContactEmail = functions
  .region('us-central1')
  .https.onRequest(sendContactEmailApp);

exports.uploadImage = functions
  .region('us-central1')
  .https.onRequest(uploadImageApp);

exports.simpleContactFunction = simpleContactFunction;
exports.directContactEmail = directContactEmail;

// Import sendOrderEmail function
const sendOrderEmail = require('./sendOrderEmail');
const sendInvoiceEmail = require('./sendInvoiceEmail');
exports.sendOrderEmail = sendOrderEmail.sendOrderEmail;
exports.sendInvoiceEmail = sendInvoiceEmail.sendInvoiceEmail;

// Add a callable version of sendInvoiceEmail
exports.sendInvoiceEmailCallable = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    try {
      console.log('Processing callable invoice email request for order:', data?.orderId);
      
      // Validate data
      if (!data || !data.orderId || !data.customerEmail) {
        console.error('Missing required data for invoice email callable:', data);
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Missing required data for invoice email (orderId or customerEmail)'
        );
      }
      
      // Process the order data for sending invoice
      const orderData = {
        id: data.orderId,
        customer: {
          email: data.customerEmail
        },
        invoiceHtml: data.invoiceHtml || null,
        items: data.items || [],
        total: data.total || 0
      };
      
      console.log('Constructed orderData for invoice email:', JSON.stringify(orderData, null, 2));
      
      try {
        // Send the invoice email using the existing implementation
        const result = await sendInvoiceEmail.sendInvoiceEmailInternal(orderData);
        
        // Always return a properly structured response
        return {
          success: true,
          message: 'Invoice email sent successfully',
          details: result || {}
        };
      } catch (invoiceError) {
        console.error('Error in sendInvoiceEmailInternal:', invoiceError);
        
        // Return error to client as a properly structured HttpsError
        throw new functions.https.HttpsError(
          'internal',
          invoiceError.message || 'Failed to send invoice email',
          { details: invoiceError }
        );
      }
    } catch (error) {
      console.error('Error in sendInvoiceEmailCallable:', error);
      
      // If it's already an HttpsError, just rethrow it
      if (error.code && error.message) {
        throw error;
      }
      
      // Otherwise, convert to a proper HttpsError
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Unknown error in invoice email processing',
        { details: error }
      );
    }
  });

// Trigger to send emails when a new order is created
// Commenting out this function to prevent duplicate emails
// exports.sendOrderEmailOnCreate = functions.database.ref('/orders/{orderId}')
//   .onCreate(async (snapshot, context) => {
//     const order = snapshot.val();
//     const orderId = context.params.orderId;
    
//     console.log(`New order created trigger fired for ${orderId} at ${new Date().toISOString()}`);
    
//     // Skip if emailSent is already true
//     if (order.emailSent === true) {
//       console.log(`Order ${orderId} already has emailSent=true, skipping email send`);
//       return null;
//     }
    
//     try {
//       // Use the API key from the config which was already set up in the top of the file
//       if (!apiKeyConfigured) {
//         console.error('SendGrid API key is not configured');
//         return { success: false, error: 'SendGrid API key not configured' };
//       }
      
//       // Email configuration (already defined at the top of the file)
//       // Using consistent capitalization with the rest of the file
//       const BUTTONS_EMAIL = 'Buttonsflowerfarm@gmail.com';
//       const ADMIN_EMAIL = 'sarah.halliday@gmail.com'; // Backup admin email
      
//       // Use the existing template functions
//       const customerEmailContent = generateCustomerEmailTemplate(order);
//       const buttonsEmailContent = generateButtonsEmailTemplate(order);
      
//       // Setup email messages
//       const customerEmail = {
//         to: order.customer.email,
//         from: BUTTONS_EMAIL,
//         subject: `Order Confirmation - ${orderId}`,
//         html: customerEmailContent
//       };
      
//       const buttonsEmail = {
//         to: [BUTTONS_EMAIL, ADMIN_EMAIL],
//         from: BUTTONS_EMAIL,
//         subject: `New Order Received - ${orderId}`,
//         html: buttonsEmailContent
//       };
      
//       console.log(`Sending emails for order ${orderId} from database trigger`);
//       const results = await Promise.all([
//         sgMail.send(customerEmail),
//         sgMail.send(buttonsEmail)
//       ]);
      
//       console.log(`SendGrid response for ${orderId} (trigger - customer):`, 
//         results[0]?.[0]?.statusCode, 
//         results[0]?.[0]?.headers?.['x-message-id']
//       );
      
//       console.log(`SendGrid response for ${orderId} (trigger - admin):`, 
//         results[1]?.[0]?.statusCode, 
//         results[1]?.[0]?.headers?.['x-message-id']
//       );
      
//       // Mark the order as having sent email
//       await snapshot.ref.update({
//         emailSent: true,
//         emailSentTimestamp: Date.now(),
//         emailMessageIds: [
//           results[0]?.[0]?.headers?.['x-message-id'],
//           results[1]?.[0]?.headers?.['x-message-id']
//         ]
//       });
      
//       return { success: true };
//     } catch (error) {
//       console.error(`Error sending email in trigger for order ${orderId}:`, error);
//       if (error.response) {
//         console.error('SendGrid error details:', error.response.body);
//       }
//       return { success: false, error: error.message };
//     }
//   });
