const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(apiKey);

const BUTTONS_EMAIL = 'buttonsflowerfarm@gmail.com';

exports.handler = async function(event, context) {
  console.log('Netlify function triggered - Starting email process');
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('Environment:', process.env.NODE_ENV);
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const order = JSON.parse(event.body);
    console.log('Order received:', order);

    // Prepare a simple test email first
    const testEmail = {
      to: BUTTONS_EMAIL,
      from: BUTTONS_EMAIL, // Must be the verified sender
      subject: 'Test Email from Netlify Function',
      text: 'This is a test email to verify SendGrid configuration.',
      html: '<p>This is a test email to verify SendGrid configuration.</p>'
    };

    console.log('Attempting to send test email...');
    try {
      const testResult = await sgMail.send(testEmail);
      console.log('Test email sent successfully:', testResult);
    } catch (testError) {
      console.error('Test email failed:', {
        message: testError.message,
        response: testError.response?.body,
        code: testError.code
      });
      throw testError;
    }

    // If test email succeeds, send the actual order emails
    const customerEmail = {
      to: order.customer.email,
      from: BUTTONS_EMAIL,
      subject: `Order Confirmation - ${order.id}`,
      html: generateCustomerEmailTemplate(order)
    };

    const buttonsEmail = {
      to: BUTTONS_EMAIL,
      from: BUTTONS_EMAIL,
      subject: `New Order Received - ${order.id}`,
      html: generateButtonsEmailTemplate(order)
    };

    console.log('Sending customer and business emails...');
    await Promise.all([
      sgMail.send(customerEmail),
      sgMail.send(buttonsEmail)
    ]);

    console.log('All emails sent successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Emails sent successfully' })
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      response: error.response?.body,
      code: error.code,
      stack: error.stack
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send emails',
        details: error.message,
        response: error.response?.body,
        code: error.code
      })
    };
  }
};

function generateCustomerEmailTemplate(order) {
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

      ${order.notes ? `
        <h3>Order Notes</h3>
        <p>${order.notes}</p>
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
}

function generateButtonsEmailTemplate(order) {
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

      ${order.notes ? `
        <h3>Customer Notes</h3>
        <p>${order.notes}</p>
      ` : ''}
    </div>
  `;
} 