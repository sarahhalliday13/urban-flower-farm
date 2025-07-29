const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Email templates and sending function for order confirmations
 */

/**
 * Generates the HTML template for customer order confirmation emails
 * @param {Object} order - The order data
 * @return {string} The generated HTML template
 */
function generateCustomerEmailTemplate(order) {
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
                        <p style="margin: 5px 0; font-size: 14px;">Email: buttonsflowerfarm@telus.net</p>
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

              <!-- Pickup Instructions - Moved to top priority position -->
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; background-color: #f8f8f8; border-radius: 4px; border-left: 5px solid #2c5530;">
                    <tr>
                      <td style="padding: 15px;">
                        <h3 style="color: #2c5530; margin-top: 0; margin-bottom: 10px; font-size: 18px;">📍 Pickup Location & Instructions</h3>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Farm Address:</strong> 349 9th Street East, North Vancouver</p>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Requested Pickup:</strong> ${order.customer.pickupRequest || order.customer.notes}</p>
                        <p style="margin: 10px 0 5px 0; font-size: 14px;">Important Notes:</p>
                        <ul style="margin: 5px 0; padding-left: 20px; font-size: 14px;">
                          <li style="margin: 5px 0;">We will text you at <strong>${order.customer.phone}</strong> to confirm your pickup date and time.</li>
                          <li style="margin: 5px 0;">If you need to make changes to your pickup time after confirmation, please text us.</li>
                        </ul>
                      </td>
                    </tr>
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
                            <td style="padding: 5px 0; font-size: 14px;"><strong>E-Transfer:</strong> Send to buttonsflowerfarm@telus.net</td>
                          </tr>
                        </table>
                        <p style="margin: 5px 0; font-size: 14px;">Please include your order number (${order.id}) in the payment notes.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Contact Info -->
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

/**
 * Generates the HTML template for admin order notification emails
 * @param {Object} order - The order data
 * @return {string} The generated HTML template
 */
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
      
      <!-- Pickup Details - Moved to top -->
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #2c5530;">
        <h3 style="color: #2c5530; margin-top: 0;">📍 Pickup Details</h3>
        <p style="margin: 5px 0;"><strong>Customer Phone:</strong> ${order.customer.phone}</p>
        <p style="margin: 5px 0;"><strong>Requested Pickup:</strong> ${order.customer.pickupRequest || order.customer.notes}</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> 349 9th Street East, North Vancouver</p>
      </div>
      
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
          <h3 style="color: #27ae60; margin-top: 0;">IMPORTANT: Customer Pickup Request</h3>
          <p style="margin-bottom: 0;">${order.customer.notes}</p>
        </div>
      ` : ''}
    </div>
  `;
}

// Export the Cloud Function
exports.sendOrderEmail = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const orderData = req.body;
    console.log("📦 Received order data:", orderData.id);

    // Validate customer email
    if (!orderData.customer?.email) {
      throw new Error("Customer email is required");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "buttonsflowerfarm@telus.net",
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    await transporter.verify();
    console.log("✅ SMTP connection successful");

    const customerEmailHtml = generateCustomerEmailTemplate(orderData);
    const buttonsEmailHtml = generateButtonsEmailTemplate(orderData);

    // Send customer confirmation email to the customer's email address
    const customerInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: orderData.customer.email, // Send to customer's email
      subject: `Order Confirmation - ${orderData.id}`,
      html: customerEmailHtml, // Use customer template
    });

    console.log("✅ Customer confirmation email sent to", orderData.customer.email, ":", customerInfo.messageId);

    // Send business notification to the business email
    const buttonsInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: "buttonsflowerfarm@telus.net", // Send to business email
      subject: `New Order Received - ${orderData.id}`,
      html: buttonsEmailHtml, // Use business template
    });

    console.log("✅ Business notification email sent:", buttonsInfo.messageId);

    res.status(200).json({
      success: true,
      message: "Emails sent successfully",
      customerEmailId: customerInfo.messageId,
      buttonsEmailId: buttonsInfo.messageId,
    });

  } catch (error) {
    console.error("❌ Error sending emails:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}); 