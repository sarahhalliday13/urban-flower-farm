const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const cors = require('cors')({ 
  origin: ['https://buttonsflowerfarm-8a54d.web.app', 'https://urban-flower-farm-staging.web.app', 'http://localhost:3000'], 
  credentials: true 
});
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Email configuration
const BUTTONS_EMAIL = 'order@buttonsflowerfarm.ca';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
console.log('API Key status:', apiKey ? 'Found (length: ' + apiKey.length + ')' : 'Not found');
sgMail.setApiKey(apiKey);

// Export a handler function to be used with Express
exports.handler = async (req, res) => {
  // Compatible with both direct function call and express router
  try {
    const incomingOrder = req.body || {};
    console.log('🔥 Incoming order object:', JSON.stringify(incomingOrder, null, 2));
    console.log('🔥 Received isInvoiceEmail flag:', incomingOrder?.isInvoiceEmail);

    const isInvoiceEmail = incomingOrder.isInvoiceEmail === true;
    // Add support for forceResend flag
    const forceResend = incomingOrder.forceResend === true;
    console.log('🔥 Final determined isInvoiceEmail:', isInvoiceEmail);
    console.log('🔥 Force resend flag:', forceResend);

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

    // Only check emailSent flag for order confirmation emails, not for invoice emails or when forceResend is true
    if (!isInvoiceEmail && !forceResend) {
      try {
        const orderRef = admin.database().ref(`orders/${order.id}`);
        const orderSnapshot = await orderRef.once('value');
        const orderData = orderSnapshot.val();
        
        if (orderData && orderData.emailSent === true) {
          console.log(`⛔️ Order email already sent, skipping`);
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
      to: [order.customer.email, 'buttonsflowerfarm@gmail.com'],
      from: BUTTONS_EMAIL,
      replyTo: BUTTONS_EMAIL,
      subject: subject,
      html: isInvoiceEmail
        ? generateInvoiceEmailTemplate(order)
        : generateCustomerEmailTemplate(order)
    };

    // Build admin email ONLY for non-invoice
    let adminEmail;
    if (!isInvoiceEmail) {
      adminEmail = {
        to: BUTTONS_EMAIL,
        from: BUTTONS_EMAIL,
        replyTo: BUTTONS_EMAIL,
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
        console.log(`✅ Email status and timestamp saved for order ${order.id}`);
      } catch (updateError) {
        console.error(`❌ Failed to save email status for order ${order.id}`, updateError);
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
        console.log(`✅ Invoice email status and timestamp saved for order ${order.id}`);
      } catch (updateError) {
        console.error(`❌ Failed to save invoice email status for order ${order.id}`, updateError);
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
};

// Export for direct function use
exports.sendOrderEmail = functions.https.onRequest((req, res) => {
  // Apply CORS middleware with our settings explicitly
  cors(req, res, async () => {
    // Handle preflight OPTIONS requests explicitly
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }
    
    // For actual requests, forward to the handler
    return exports.handler(req, res);
  });
});

// Email template functions - now with isInvoice parameter
function generateCustomerEmailTemplate(order, isInvoice = false) {
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  const formatDate = (dateString) => {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return new Date().toLocaleDateString();
    }
  };

  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${formatCurrency(item.price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${formatCurrency(item.quantity * item.price)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${order.id}</title>
      <style type="text/css">
        /* Base styles */
        body, table, td, div, p, a { font-family: Arial, Helvetica, sans-serif; }
        body { margin: 0; padding: 0; width: 100% !important; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        .ReadMsgBody { width: 100%; }
        .ExternalClass { width: 100%; }
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
        
        /* Responsive styles */
        @media screen and (max-width: 600px) {
          .email-container { width: 100% !important; }
          .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
          .stack-column, .stack-column-center { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
          .stack-column-center { text-align: center !important; }
          .center-on-mobile { text-align: center !important; }
          .hide-on-mobile { display: none !important; max-height: 0 !important; overflow: hidden !important; }
          .mobile-padding { padding-left: 10px !important; padding-right: 10px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f7f7f7;">
      <!-- Wrapper table for compatibility -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f7f7;">
        <tr>
          <td align="center" valign="top">
            <!-- Container Table -->
            <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <!-- Header with Logo & Title -->
              <tr>
                <td style="padding: 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 2px solid #2c5530; padding-bottom: 20px;">
                    <tr>
                      <!-- Logo Left -->
                      <td width="50%" class="stack-column-center" style="vertical-align: top;">
                        <img src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5" 
                             width="160" height="auto" alt="Buttons Urban Flower Farm" 
                             style="margin: 0; display: block; max-width: 160px;">
                      </td>
                      <!-- Order Info Right -->
                      <td width="50%" class="stack-column-center" style="vertical-align: top; text-align: right;">
                        <h2 style="color: #2c5530; margin-top: 0; margin-bottom: 15px; font-size: 24px;">ORDER CONFIRMATION</h2>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Order #:</strong> ${order.id}</p>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${formatDate(order.date)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Thank You Message -->
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 0;">
                        <h2 style="color: #2c5530; margin-top: 0; margin-bottom: 15px; font-size: 24px;">Thank You for Your Order!</h2>
                        <p style="margin: 5px 0; font-size: 16px;">Dear ${order.customer.firstName || order.customer.name || 'Customer'},</p>
                        <p style="margin: 10px 0; font-size: 16px;">We've received your order and are excited to prepare it for you. Here are your order details:</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- From/To Section -->
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                    <tr>
                      <!-- To Info Left -->
                      <td width="48%" class="stack-column" valign="top" style="padding-right: 20px;">
                        <h3 style="color: #2c5530; margin-top: 0; margin-bottom: 10px; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 5px;">To</h3>
                        <p style="margin: 5px 0; font-size: 14px;">${order.customer.firstName} ${order.customer.lastName}</p>
                        <p style="margin: 5px 0; font-size: 14px;">Email: ${order.customer.email}</p>
                        ${order.customer.phone ? `<p style="margin: 5px 0; font-size: 14px;">Phone: ${order.customer.phone}</p>` : ''}
                      </td>
                      <!-- From Info Right -->
                      <td width="48%" class="stack-column" valign="top" style="padding-left: 4%;">
                        <h3 style="color: #2c5530; margin-top: 0; margin-bottom: 10px; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 5px;">From</h3>
                        <p style="margin: 5px 0; font-size: 14px;">Buttons Urban Flower Farm</p>
                        <p style="margin: 5px 0; font-size: 14px;">Email: order@buttonsflowerfarm.ca</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Items Table -->
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th style="background-color: #f9f9f9; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 14px;">Item</th>
                        <th style="background-color: #f9f9f9; padding: 10px; text-align: center; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 14px;">Quantity</th>
                        <th style="background-color: #f9f9f9; padding: 10px; text-align: right; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 14px;">Price</th>
                        <th style="background-color: #f9f9f9; padding: 10px; text-align: right; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 14px;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsList}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="3" style="padding: 10px; text-align: right; border-top: 2px solid #ddd; font-weight: bold;">Total</td>
                        <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd; font-weight: bold; color: #2c5530;">$${formatCurrency(order.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </td>
              </tr>

              ${order.customer.notes ? `
              <!-- Customer Notes Section -->
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; background-color: #f9f9f9; border-radius: 4px; border-left: 5px solid #27ae60;">
                    <tr>
                      <td style="padding: 15px;">
                        <h3 style="color: #27ae60; margin-top: 0; margin-bottom: 10px; font-size: 18px;">Your Pickup Request</h3>
                        <p style="margin: 0; font-size: 14px; font-style: italic;">${order.customer.notes}</p>
                        <p style="margin-top: 15px; font-size: 14px;">We will confirm your pickup date and time by text message to <strong>${order.customer.phone}</strong>.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              <!-- Payment Information -->
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; background-color: #f8f8f8; border-radius: 4px;">
                    <tr>
                      <td style="padding: 15px;">
                        <h3 style="color: #2c5530; margin-top: 0; margin-bottom: 10px; font-size: 18px;">Payment Information</h3>
                        <p style="margin: 5px 0; font-size: 14px;">Please complete your payment using one of the following methods:</p>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 10px 0;">
                          <tr>
                            <td style="padding: 5px 0; font-size: 14px;"><strong>Cash:</strong> Available for in-person pickup</td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; font-size: 14px;"><strong>E-Transfer:</strong> Send to buttonsflowerfarm@gmail.com</td>
                          </tr>
                        </table>
                        <p style="margin: 5px 0; font-size: 14px;">Please include your order number (${order.id} <img src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.appspot.com/o/assets%2Fcopy-icon.png?alt=media" width="16" height="16" alt="Copy" style="vertical-align: middle; cursor: pointer;" />) in the payment notes.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Pickup Confirmation Message - Removed from here and moved to the notes box -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding: 0;">
                        <p style="margin: 5px 0; font-size: 14px;">If you have any questions, please don't hesitate to contact us.</p>
                        <p style="margin: 15px 0 5px 0; font-size: 14px;">Best regards,<br>The Buttons Flower Farm Team</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Thank You Message -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-left: 4px solid #2c5530;">
                    <tr>
                      <td style="padding: 15px; font-size: 16px; font-style: italic; color: #2c5530;">
                        Thanks for supporting our local farm! We appreciate your business and hope you enjoy your flowers.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 5px solid #27ae60; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #27ae60; margin-top: 0;">IMPORTANT: Your Pickup Request</h3>
          <p style="margin-bottom: 0;">${order.customer.notes}</p>
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
          <p>Email: invoice@buttonsflowerfarm.ca</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Export the function for testing
exports.generateInvoiceEmailTemplate = generateInvoiceEmailTemplate; 