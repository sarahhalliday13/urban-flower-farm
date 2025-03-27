const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');

const BUTTONS_EMAIL = 'buttonsflowerfarm@gmail.com';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY || process.env.REACT_APP_SENDGRID_API_KEY;
console.log('Email route - API Key length:', apiKey ? apiKey.length : 0);
console.log('Email route - API Key starts with SG:', apiKey ? apiKey.startsWith('SG.') : false);
console.log('Email route - SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
console.log('Email route - REACT_APP_SENDGRID_API_KEY exists:', !!process.env.REACT_APP_SENDGRID_API_KEY);

if (apiKey) {
  sgMail.setApiKey(apiKey);
  console.log('SendGrid initialized with API key');
} else {
  console.error('SendGrid API key is missing in email route');
}

// Contact form endpoint
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    console.log('Received contact form submission:', { name, email, phone, subject, message });

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In development, send directly using SendGrid
    if (!apiKey) {
      console.error('SendGrid API key is missing in contact form handler');
      return res.status(500).json({ error: 'SendGrid API key is not configured' });
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

    console.log('Attempting to send email with SendGrid...');
    const result = await sgMail.send(msg);
    console.log('SendGrid response:', result);

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', {
      message: error.message,
      response: error.response?.body,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Order confirmation endpoint
router.post('/order', async (req, res) => {
  try {
    const order = req.body;
    console.log('Received order confirmation request:', order);

    // Validate required fields
    if (!order.customer || !order.customer.email || !order.items) {
      return res.status(400).json({ error: 'Missing required order information' });
    }

    // Send email to customer
    const customerEmail = {
      to: order.customer.email,
      from: BUTTONS_EMAIL,
      subject: `Order Confirmation - ${order.id}`,
      html: generateCustomerEmailTemplate(order)
    };

    // Send email to Buttons
    const buttonsEmail = {
      to: BUTTONS_EMAIL,
      from: BUTTONS_EMAIL,
      subject: `New Order Received - ${order.id}`,
      html: generateButtonsEmailTemplate(order)
    };

    console.log('Attempting to send order confirmation emails...');
    await Promise.all([
      sgMail.send(customerEmail),
      sgMail.send(buttonsEmail)
    ]);
    console.log('Order confirmation emails sent successfully');

    res.json({ message: 'Order confirmation emails sent successfully' });
  } catch (error) {
    console.error('Error sending order confirmation emails:', {
      message: error.message,
      response: error.response?.body,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to send order confirmation emails',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Email template functions
const generateCustomerEmailTemplate = (order) => {
  const itemsList = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${parseFloat(item.price).toFixed(2)}</td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">Thank You for Your Order!</h2>
      <p>Dear ${order.customer.firstName},</p>
      <p>We've received your order and are excited to prepare it for you. Here are your order details:</p>
      
      <h3>Order Information</h3>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      
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
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px;"><strong>$${parseFloat(order.total).toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>

      ${order.customer.notes ? `
        <h3>Order Notes</h3>
        <p>${order.customer.notes}</p>
      ` : ''}

      <h3>Payment Information</h3>
      <p>Please complete your payment using one of the following methods:</p>
      <ul>
        <li><strong>Cash:</strong> Available for in-person pickup</li>
        <li><strong>E-Transfer:</strong> Send to ${BUTTONS_EMAIL}</li>
      </ul>
      <p>Please include your order number (${order.id}) in the payment notes.</p>

      <p>We will confirm your pickup date and time by text message to <strong>${order.customer.phone}</strong>.</p>

      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>The Buttons Flower Farm Team</p>
    </div>
  `;
};

const generateButtonsEmailTemplate = (order) => {
  const itemsList = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${parseFloat(item.price).toFixed(2)}</td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">New Order Received!</h2>
      
      <h3>Order Information</h3>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${order.customer.firstName} ${order.customer.lastName}</p>
      <p><strong>Email:</strong> ${order.customer.email}</p>
      <p><strong>Phone:</strong> ${order.customer.phone}</p>
      
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
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px;"><strong>$${parseFloat(order.total).toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>

      ${order.customer.notes ? `
        <h3>Customer Notes</h3>
        <p>${order.customer.notes}</p>
      ` : ''}
    </div>
  `;
};

module.exports = router; 