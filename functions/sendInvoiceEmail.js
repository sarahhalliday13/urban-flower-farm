const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const cors = require('cors')({ 
  origin: ['https://buttonsflowerfarm-8a54d.web.app', 'https://urban-flower-farm-staging.web.app', 'http://localhost:3000'], 
  credentials: true 
});

// Initialize Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Load the SendGrid API key from environment
const SENDGRID_API_KEY = functions.config().sendgrid?.key || process.env.SENDGRID_API_KEY;
sgMail.setApiKey(SENDGRID_API_KEY);

// Email configuration
const BUTTONS_EMAIL = 'order@buttonsflowerfarm.ca';

// Internal function for sending invoice emails
const sendInvoiceEmailInternal = async (orderData) => {
  console.log('📨 INVOICE INTERNAL - Starting with data:', JSON.stringify(orderData, null, 2));
  
  try {
    // Validate required fields with detailed error messages
    if (!orderData) {
      console.error('📨 INVOICE INTERNAL ERROR - No order data provided');
      return {
        success: false,
        message: 'No order data provided'
      };
    }
    
    if (!orderData.id) {
      console.error('📨 INVOICE INTERNAL ERROR - Missing order ID');
      return {
        success: false,
        message: 'Missing order ID'
      };
    }
    
    if (!orderData.customer) {
      console.error('📨 INVOICE INTERNAL ERROR - Missing customer data for order:', orderData.id);
      return {
        success: false,
        message: 'Missing customer data'
      };
    }
    
    if (!orderData.customer.email) {
      console.error('📨 INVOICE INTERNAL ERROR - Missing customer email for order:', orderData.id);
      return {
        success: false,
        message: 'Missing customer email'
      };
    }

    console.log(`📨 INVOICE INTERNAL - Processing invoice email for order ${orderData.id} to ${orderData.customer.email}`);

    // Check if invoice has already been sent
    let orderFromDb = null;
    let orderRef = null;
    
    try {
      const db = admin.database();
      orderRef = db.ref(`orders/${orderData.id}`);
      const orderSnapshot = await orderRef.once('value');
      
      if (orderSnapshot.exists()) {
        orderFromDb = orderSnapshot.val();
        
        if (orderFromDb.invoiceEmailSent === true) {
          console.log(`📨 INVOICE INTERNAL - Invoice email already sent for order ${orderData.id}`);
          return {
            success: true,
            message: 'Invoice email already sent for this order',
            alreadySent: true
          };
        }
      } else {
        console.log(`📨 INVOICE INTERNAL - Order ${orderData.id} not found in database, continuing with email send`);
      }
    } catch (dbError) {
      console.error('📨 INVOICE INTERNAL ERROR - Database error:', dbError);
      // Continue with email send even if database check fails
    }

    // Generate email content with fallbacks for missing data
    const emailHtml = orderData.invoiceHtml || `
      <h2>Invoice for Order #${orderData.id}</h2>
      <p>Thank you for your order from Button's Flower Farm.</p>
      <p>Please find your invoice details below.</p>
      
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #eee;">
        <h3>Order Summary</h3>
        <p>Order ID: ${orderData.id}</p>
        <p>Total: $${(orderData.total || 0).toFixed(2)}</p>
      </div>
      
      <p>If you have any questions about your invoice, please contact us at ${BUTTONS_EMAIL}.</p>
    `;
    
    // Define email parameters with fallbacks
    const msg = {
      to: orderData.customer.email,
      from: {
        email: 'invoice@buttonsflowerfarm.ca',
        name: "Button's Flower Farm"
      },
      replyTo: 'invoice@buttonsflowerfarm.ca',
      subject: `Invoice for Your Button's Flower Farm Order #${orderData.id}`,
      html: emailHtml,
    };

    console.log('📨 INVOICE INTERNAL - Sending email with SendGrid');

    // Try to send email with proper error handling
    let sendgridResponse = null;
    try {
      sendgridResponse = await sgMail.send(msg);
      console.log('📨 INVOICE INTERNAL - SendGrid response:', JSON.stringify(sendgridResponse, null, 2));
    } catch (emailError) {
      console.error('📨 INVOICE INTERNAL ERROR - SendGrid error:', emailError);
      return {
        success: false,
        message: `Failed to send email: ${emailError.message || 'Unknown SendGrid error'}`
      };
    }

    // Try to update database, but don't fail if it doesn't work
    if (orderRef) {
      try {
        await orderRef.update({
          invoiceEmailSent: true,
          invoiceEmailSentDate: Date.now()
        });
        console.log(`📨 INVOICE INTERNAL - Updated order ${orderData.id} with invoiceEmailSent flag`);
      } catch (updateError) {
        console.error('📨 INVOICE INTERNAL ERROR - Failed to update database:', updateError);
        // Continue even if database update fails
      }
    }

    console.log(`📨 INVOICE INTERNAL SUCCESS - Invoice email sent for order ${orderData.id}`);
    
    // Always return a structured success response
    return {
      success: true,
      message: 'Invoice email sent successfully'
    };
  } catch (error) {
    // Catch all other errors and return structured error response
    console.error('📨 INVOICE INTERNAL CRITICAL ERROR:', error);
    return {
      success: false,
      message: error.message || 'Unknown error occurred while sending invoice email'
    };
  }
};

// HTTP Request version (existing)
exports.sendInvoiceEmail = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Please use POST.',
        });
      }

      // Extract order data from request body
      const orderData = req.body;
      
      // Use internal function
      const result = await sendInvoiceEmailInternal(orderData);
      
      // Return success response
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in HTTP invoice email endpoint:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send invoice email',
        details: error.message || 'Unknown error occurred',
      });
    }
  });
});

// Export the internal function for callable use
exports.sendInvoiceEmailInternal = sendInvoiceEmailInternal;

// Helper function to generate the HTML email template
function generateInvoiceEmailTemplate(orderData) {
  const { id, customer, items, total, subtotal, taxes, notes, orderDate } = orderData;
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'object' && timestamp.toDate ? 
      timestamp.toDate() : 
      new Date(timestamp);
    return date.toLocaleDateString('en-CA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };
  
  // Generate the items table HTML
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.quantity * item.price)}</td>
    </tr>
  `).join('');
  
  // Create the full HTML email
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 20px; }
        .logo { max-width: 150px; height: auto; }
        h1 { color: #4a6741; }
        .invoice-details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f5f5f5; text-align: left; padding: 10px; }
        .totals { text-align: right; }
        .footer { margin-top: 30px; font-size: 0.9em; color: #777; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Invoice from Button's Flower Farm</h1>
        <p>Order #${id}</p>
        <p>Date: ${formatDate(orderDate)}</p>
      </div>
      
      <div class="invoice-details">
        <h2>Customer Information</h2>
        <p><strong>Name:</strong> ${customer.firstName} ${customer.lastName}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
      </div>
      
      <h2>Order Details</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align: right; padding: 8px;"><strong>Subtotal:</strong></td>
            <td style="text-align: right; padding: 8px;">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right; padding: 8px;"><strong>Taxes:</strong></td>
            <td style="text-align: right; padding: 8px;">${formatCurrency(taxes)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right; padding: 8px;"><strong>Total:</strong></td>
            <td style="text-align: right; padding: 8px; font-weight: bold;">${formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
      
      ${notes ? `<div><h2>Notes</h2><p>${notes}</p></div>` : ''}
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Button's Flower Farm</p>
        <p>Email: info@buttonsflowerfarm.ca | Website: buttonsflowerfarm.ca</p>
      </div>
    </body>
    </html>
  `;
} 