/**
 * Updated April 2, 2025 - Fixed initialization issue for email functions
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize express app
const sendEmailApp = express();
const sendOrderEmailApp = express();
const sendContactEmailApp = express();

// Use CORS middleware for all apps
sendEmailApp.use(cors({ origin: true }));
sendEmailApp.use(express.json());
sendOrderEmailApp.use(cors({ origin: true }));
sendOrderEmailApp.use(express.json());
sendContactEmailApp.use(cors({ origin: true }));
sendContactEmailApp.use(express.json());

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
  let orderSaved = false;
  let emailsSent = false;
  let orderId = null;

  try {
    const order = req.body;
    orderId = order.id;
    logger.info('Processing order email:', order);

    if (!apiKeyConfigured) {
      throw new Error('SendGrid API key is not configured');
    }

    // Check what fields might be missing and log them
    const missingFields = [];
    if (!order.customer) missingFields.push('customer');
    else if (!order.customer.email) missingFields.push('customer.email');
    if (!order.items) missingFields.push('items');
    
    // Log detailed information about missing fields
    if (missingFields.length > 0) {
      logger.error('Order validation failed, missing fields:', {
        missingFields,
        orderData: order
      });
      
      // Try to use a more lenient approach - construct missing pieces if possible
      if (!order.customer) {
        order.customer = { email: 'buttonsflowerfarm@gmail.com' };
        logger.info('Created fallback customer object');
      } else if (!order.customer.email) {
        order.customer.email = 'buttonsflowerfarm@gmail.com';
        logger.info('Added fallback email to customer');
      }
      
      if (!order.items) {
        order.items = [];
        logger.info('Created empty items array');
      }
    }

    // Make sure order has all required fields
    const validatedOrder = {
      ...order,
      id: order.id || `manual-${Date.now()}`,
      date: order.date || new Date().toISOString(),
      status: order.status || 'pending',
      total: order.total || calculateTotal(order.items)
    };

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
  sendOrderEmailApp._router.handle(Object.assign({}, req, {url: '/', originalUrl: '/'}), res);
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

// Export the functions
exports.sendEmail = onRequest(sendEmailApp);
exports.sendOrderEmail = onRequest(sendOrderEmailApp);
exports.sendContactEmail = onRequest(sendContactEmailApp);

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
