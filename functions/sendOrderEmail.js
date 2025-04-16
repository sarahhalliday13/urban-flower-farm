const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const cors = require('cors')({ 
  origin: ['https://buttonsflowerfarm-8a54d.web.app', 'http://localhost:3000'], 
  credentials: true 
});
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Email configuration
const BUTTONS_EMAIL = 'Buttonsflowerfarm@gmail.com';
const ADMIN_EMAIL = 'sarah.halliday@gmail.com'; // Backup email

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
console.log('API Key status:', apiKey ? 'Found (length: ' + apiKey.length + ')' : 'Not found');
sgMail.setApiKey(apiKey);

exports.sendOrderEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send({ error: 'Method Not Allowed' });
    }

    try {
      const order = req.body;
      console.log(`Triggered email for order ${order.id} at ${new Date().toISOString()}`);
      console.log('Processing order email:', {
        orderId: order.id,
        customer: order.customer?.email,
        itemCount: order.items?.length,
        total: order.total
      });

      // Validate required fields
      if (!order.customer || !order.customer.email || !order.items) {
        return res.status(400).send({ 
          success: false,
          error: 'Missing required order information' 
        });
      }

      // Check if email has already been sent for this order
      try {
        const orderRef = admin.database().ref(`orders/${order.id}`);
        const orderSnapshot = await orderRef.once('value');
        const orderData = orderSnapshot.val();
        
        if (orderData && orderData.emailSent === true) {
          console.log(`Email already sent for order ${order.id}, skipping send`);
          return res.status(200).send({
            success: true,
            message: 'Email already sent for this order',
            alreadySent: true
          });
        }
      } catch (dbError) {
        console.error(`Error checking email status for order ${order.id}:`, dbError);
        // Continue with sending if we can't check - better to potentially send twice than not at all
      }

      // Send email to customer
      const customerEmail = {
        to: order.customer.email,
        from: BUTTONS_EMAIL,
        subject: `Order Confirmation - ${order.id}`,
        html: generateCustomerEmailTemplate(order)
      };

      // Send email to Buttons - send to both emails for redundancy
      const buttonsEmail = {
        to: [BUTTONS_EMAIL, ADMIN_EMAIL],
        from: BUTTONS_EMAIL,
        subject: `New Order Received - ${order.id}`,
        html: generateButtonsEmailTemplate(order)
      };

      console.log(`Sending order confirmation emails for ${order.id}...`);
      const results = await Promise.all([
        sgMail.send(customerEmail),
        sgMail.send(buttonsEmail)
      ]);
      
      // Log the SendGrid responses with message IDs
      console.log(`SendGrid response for ${order.id} (customer):`, 
        results[0]?.[0]?.statusCode, 
        results[0]?.[0]?.headers?.['x-message-id']
      );
      console.log(`SendGrid response for ${order.id} (admin):`, 
        results[1]?.[0]?.statusCode, 
        results[1]?.[0]?.headers?.['x-message-id']
      );
      
      // Mark the order as having sent email
      try {
        const orderRef = admin.database().ref(`orders/${order.id}`);
        await orderRef.update({
          emailSent: true,
          emailSentTimestamp: Date.now(),
          emailMessageIds: [
            results[0]?.[0]?.headers?.['x-message-id'],
            results[1]?.[0]?.headers?.['x-message-id']
          ]
        });
        console.log(`Updated order ${order.id} with emailSent flag`);
      } catch (updateError) {
        console.error(`Error updating emailSent flag for order ${order.id}:`, updateError);
      }
      
      return res.status(200).send({ 
        success: true,
        message: 'Order confirmation emails sent successfully' 
      });
    } catch (error) {
      console.error('Error sending order confirmation emails:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return res.status(500).send({ 
        success: false,
        error: 'Failed to send order confirmation emails',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// Email template functions
function generateCustomerEmailTemplate(order) {
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #4a7c59;">Thank You for Your Order!</h2>
      <p>Dear ${order.customer.firstName},</p>
      <p>We've received your order and are excited to prepare it for you. Here are your order details:</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">Order Information</h3>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      </div>
      
      <h3 style="color: #4a7c59;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #eee;">Quantity</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">$${parseFloat(order.total).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${order.customer.notes ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #4a7c59; margin-top: 0;">Your Notes</h3>
          <p>${order.customer.notes}</p>
        </div>
      ` : ''}

      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">Payment Information</h3>
        <p>Please complete your payment using one of the following methods:</p>
        <ul>
          <li><strong>Cash:</strong> Available for in-person pickup</li>
          <li><strong>E-Transfer:</strong> Send to ${BUTTONS_EMAIL}</li>
        </ul>
        <p>Please include your order number (${order.id}) in the payment notes.</p>
      </div>

      <p>We will confirm your pickup date and time by text message to <strong>${order.customer.phone}</strong>.</p>

      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>The Buttons Flower Farm Team</p>
    </div>
  `;
}

function generateButtonsEmailTemplate(order) {
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #4a7c59;">New Order Received!</h2>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">Order Information</h3>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">Customer Information</h3>
        <p><strong>Name:</strong> ${order.customer.firstName} ${order.customer.lastName}</p>
        <p><strong>Email:</strong> ${order.customer.email}</p>
        <p><strong>Phone:</strong> ${order.customer.phone}</p>
      </div>
      
      <h3 style="color: #4a7c59;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #eee;">Quantity</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">$${parseFloat(order.total).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${order.customer.notes ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #4a7c59; margin-top: 0;">Customer Notes</h3>
          <p>${order.customer.notes}</p>
        </div>
      ` : ''}
    </div>
  `;
} 