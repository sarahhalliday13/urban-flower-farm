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
      const incomingOrder = req.body || {};
      console.log('🔥 Incoming order object:', JSON.stringify(incomingOrder, null, 2));
      console.log('🔥 Received isInvoiceEmail flag:', incomingOrder?.isInvoiceEmail);

      const isInvoiceEmail = incomingOrder.isInvoiceEmail === true;
      console.log('🔥 Final determined isInvoiceEmail:', isInvoiceEmail);

      const order = incomingOrder;

      // Save to database ONLY if not an invoice
      if (!isInvoiceEmail && !order.isTestInvoice) {
        try {
          const orderRef = admin.database().ref(`orders/${order.id}`);
          await orderRef.set(order);
          console.log(`Order ${order.id} saved to database`);
        } catch (saveError) {
          console.error(`Error saving order ${order.id}:`, saveError);
        }
      } else {
        console.log(`Skipping database save for invoice email or test order: ${order.id}`);
      }      

      // Only check emailSent flag for order confirmation emails, not for invoice emails
      if (!isInvoiceEmail) {
        try {
          const orderRef = admin.database().ref(`orders/${order.id}`);
          const orderSnapshot = await orderRef.once('value');
          const orderData = orderSnapshot.val();
          
          if (orderData && orderData.emailSent === true) {
            console.log(`Order confirmation email already sent for order ${order.id}, skipping send`);
            return res.status(200).send({
              success: true,
              message: 'Order confirmation email already sent for this order',
              alreadySent: true
            });
          }
        } catch (dbError) {
          console.error(`Error checking email status for order ${order.id}:`, dbError);
          // Continue with sending if we can't check - better to potentially send twice than not at all
        }
      }

      // Determine subject based on invoice flag
      const subject = isInvoiceEmail
        ? `Invoice for Order - ${order.id}`
        : `Order Confirmation - ${order.id}`;
        
      console.log('⚠️ SUBJECT CHOSEN:', subject);
      console.log('⚠️ TEMPLATE TYPE:', isInvoiceEmail ? 'INVOICE TEMPLATE' : 'ORDER CONFIRMATION TEMPLATE');

      // Build customer email
      const customerEmail = {
        to: order.customer.email,
        from: BUTTONS_EMAIL,
        subject: subject,
        html: isInvoiceEmail
          ? generateInvoiceEmailTemplate(order)
          : generateCustomerEmailTemplate(order)
      };

      // Build admin email ONLY for non-invoice
      let adminEmail;
      if (!isInvoiceEmail) {
        adminEmail = {
          to: [BUTTONS_EMAIL, ADMIN_EMAIL],
          from: BUTTONS_EMAIL,
          subject: `New Order Received - ${order.id}`,
          html: generateButtonsEmailTemplate(order)
        };
      }

      // Log the exact email payloads before sending
      console.log("📧 Customer Email Payload:", {
        to: customerEmail.to,
        from: customerEmail.from,
        subject: customerEmail.subject,
        htmlLength: customerEmail.html?.length || 0
      });
      
      if (adminEmail) {
        console.log("📧 Admin Email Payload:", {
          to: adminEmail.to,
          from: adminEmail.from,
          subject: adminEmail.subject,
          htmlLength: adminEmail.html?.length || 0
        });
      }
      
      // Now send emails
      console.log(`Sending ${isInvoiceEmail ? 'invoice' : 'order confirmation'} emails for ${order.id}...`);
      
      const sendEmailPromises = [];
      sendEmailPromises.push(sgMail.send(customerEmail));
      
      if (adminEmail) {
        sendEmailPromises.push(sgMail.send(adminEmail));
      }
      
      // Await all sends
      const results = await Promise.all(sendEmailPromises);
      
      // Log the SendGrid responses with message IDs
      console.log(`SendGrid response for ${order.id} (customer):`, 
        results[0]?.[0]?.statusCode, 
        results[0]?.[0]?.headers?.['x-message-id']
      );
      
      if (!isInvoiceEmail) {
        console.log(`SendGrid response for ${order.id} (admin):`, 
          results[1]?.[0]?.statusCode, 
          results[1]?.[0]?.headers?.['x-message-id']
        );
      }
      
      // For regular order confirmation emails, update the emailSent flag in the database
      if (!isInvoiceEmail) {
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
      } else {
        // For invoice emails, update a separate invoiceEmailSent property
        try {
          const orderRef = admin.database().ref(`orders/${order.id}`);
          await orderRef.update({
            invoiceEmailSent: true,
            invoiceEmailSentTimestamp: Date.now(),
            invoiceEmailMessageIds: [
              results[0]?.[0]?.headers?.['x-message-id']
            ]
          });
          console.log(`Updated order ${order.id} with invoiceEmailSent flag`);
        } catch (updateError) {
          console.error(`Error updating invoiceEmailSent flag for order ${order.id}:`, updateError);
        }
      }

      return res.status(200).send({ 
        success: true,
        message: `${isInvoiceEmail ? 'Invoice' : 'Order confirmation'} emails sent successfully`
      });

    } catch (error) {
      console.error('❌ Error sending emails:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return res.status(500).send({ 
        success: false,
        error: 'Failed to send emails',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// (template functions below stay unchanged - you already have them correctly)

// Email template functions - now with isInvoice parameter
function generateCustomerEmailTemplate(order, isInvoice = false) {
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

function generateButtonsEmailTemplate(order, isInvoice = false) {
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

// Add new function for invoice email template
function generateInvoiceEmailTemplate(order, isAdmin = false) {
  // Extract needed data from order
  const { id, items = [], total, customer = {}, date } = order;
  const formattedDate = new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Format items for display in the email
  const itemsList = items.map(item => {
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2)}</td>
      </tr>
    `;
  }).join('');
  
  // Customize greeting based on whether this is for admin or customer
  const greeting = isAdmin 
    ? `<p>An invoice has been sent to ${customer.email} for order #${id}.</p>` 
    : `<p>Dear ${customer.name || customer.firstName || 'Customer'},</p>
       <p>Please find your invoice for order #${id} below.</p>`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice for Order - ${id}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; padding: 20px; background-color: #f5f5f5; }
        .header img { max-width: 200px; }
        .content { padding: 20px; }
        .footer { text-align: center; font-size: 12px; color: #777; padding: 20px; background-color: #f5f5f5; }
        .invoice-details { margin-bottom: 20px; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .invoice-table th { background-color: #f5f5f5; text-align: left; padding: 10px; }
        .invoice-total { font-weight: bold; text-align: right; }
        .button { display: inline-block; padding: 10px 20px; background-color: #2c5530; color: white; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5" alt="Buttons Urban Flower Farm">
          <h1>Invoice</h1>
        </div>
        
        <div class="content">
          ${greeting}
          
          <div class="invoice-details">
            <p><strong>Order #:</strong> ${id}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Customer:</strong> ${customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Not provided'}</p>
            <p><strong>Email:</strong> ${customer.email || 'Not provided'}</p>
          </div>
          
          <h2>Order Summary</h2>
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="invoice-total">Total</td>
                <td style="text-align: right; font-weight: bold;">$${parseFloat(total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <h2>Payment Information</h2>
          <p>Please complete your payment using one of the following methods:</p>
          <ul>
            <li><strong>Cash:</strong> Available for in-person pickup</li>
            <li><strong>E-Transfer:</strong> Send to buttonsflowerfarm@gmail.com</li>
          </ul>
          <p>Please include your order number (${id}) in the payment notes.</p>
          
          ${isAdmin ? '' : `
            <p style="text-align: center; margin-top: 30px;">
              <a href="https://urban-flower-farm-staging.web.app/orders/${id}" class="button">View Order Online</a>
            </p>
          `}
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Buttons Urban Flower Farm</p>
          <p>Email: buttonsflowerfarm@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Export the function for testing
exports.generateInvoiceEmailTemplate = generateInvoiceEmailTemplate; 