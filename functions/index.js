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

// Initialize SendGrid with API key from environment variables
let apiKeyConfigured = false;
try {
  // First try to get API key from Firebase config
  let apiKey = null;
  
  try {
    // Try to get from Firebase config
    apiKey = functions.config().sendgrid?.api_key;
    if (apiKey) {
      logger.info('Using SendGrid API key from Firebase config');
      apiKeyConfigured = true;
    }
  } catch (configError) {
    logger.error('Error accessing Firebase config:', configError);
  }
  
  // If not in Firebase config, try environment variables (for local development)
  if (!apiKey) {
    apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      logger.info('Using SendGrid API key from environment variables');
      apiKeyConfigured = true;
    }
  }
  
  if (!apiKey) {
    logger.error('SendGrid API key is not defined in Firebase config or environment variables');
  } else {
    // Set the API key
    sgMail.setApiKey(apiKey);
    logger.info('SendGrid API key set successfully');
  }
} catch (error) {
  logger.error('Error initializing SendGrid:', error);
}

const BUTTONS_EMAIL = 'buttonsflowerfarm@gmail.com';

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
  
  let emailsSent = false;
  let orderSaved = false;
  let orderId = null;
  
  try {
    // Get order data from request
    const orderData = req.body;
    
    // Validate order data structure
    if (!orderData || typeof orderData !== 'object') {
      logger.error('Invalid order data: not an object');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid order data format',
        details: 'Order data must be a valid JSON object'
      });
    }
    
    // *** FOR TESTING ONLY ***
    // Check if this is a test request (has test:true flag) and bypass actual email sending
    const isTestMode = orderData.test === true;
    if (isTestMode) {
      logger.info('Test mode detected, returning success without sending emails');
      return res.status(200).json({
        success: true,
        test: true,
        message: 'Test mode: This would normally send an order confirmation email',
        orderData: orderData
      });
    }
    
    // Extract orderId or generate a new one
    orderId = orderData.id || orderData.orderId || `manual-${Date.now()}`;
    logger.info('Processing order email:', { orderId });
    
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
    
    // Recalculate total if not provided or items have changed
    if (!orderData.total && validatedOrder.items.length > 0) {
      validatedOrder.total = calculateTotal(validatedOrder.items);
    }

    // Log validation results
    logger.info('Order validated:', { 
      orderId: validatedOrder.id,
      customerEmail: validatedOrder.customer.email,
      itemCount: validatedOrder.items.length,
      total: validatedOrder.total
    });

    if (!apiKeyConfigured) {
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
    logger.error('Error processing order:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      orderId
    });
    res.status(500).json({ 
      success: false,
      orderSaved,
      emailsSent,
      error: 'Failed to process order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
