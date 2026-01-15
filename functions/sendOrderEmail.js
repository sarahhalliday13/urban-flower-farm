const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Email templates and sending function for order confirmations
 */

// Helper functions for calculating totals
function calculateSubtotal(order) {
  if (order.items && Array.isArray(order.items)) {
    return order.items.reduce((sum, item) => {
      // Skip freebies from subtotal calculation
      if (item.isFreebie) return sum;
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
  }
  // Fallback: if no items, try to calculate from total + discount
  return parseFloat(order.total || 0) + parseFloat(order.discount?.amount || 0);
}

function calculateFinalTotal(order) {
  const subtotal = calculateSubtotal(order);
  const discount = parseFloat(order.discount?.amount || 0);
  return Math.max(0, subtotal - discount);
}

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
      return new Date(dateString).toLocalDateString(undefined, options);
    } catch (error) {
      return new Date().toLocaleDateString();
    }
  };

  // Separate items by inventory status (In Stock vs Pre-Order)
  const instockItems = order.items.filter(item => {
    const status = (item.inventoryStatus || 'In Stock').toLowerCase();
    return status === 'in stock';
  });
  const preorderItems = order.items.filter(item => {
    const status = (item.inventoryStatus || 'In Stock').toLowerCase();
    return status === 'pre-order' || status === 'coming soon';
  });

  const hasMixedInvoicing = instockItems.length > 0 && preorderItems.length > 0;

  // Function to generate item rows
  const generateItemRow = (item) => {
    // Determine inventory status
    const status = item.inventoryStatus || 'In Stock';

    // Get badge styling based on status
    const getBadgeStyle = (status) => {
      switch(status) {
        case 'Pre-Order':
          return 'background-color: #e3f2fd; color: #1976d2; border: 1px solid #1976d2;';
        case 'Coming Soon':
          return 'background-color: #fff3e0; color: #f57c00; border: 1px solid #f57c00;';
        case 'In Stock':
        default:
          return 'background-color: #e8f5e9; color: #2e7d32; border: 1px solid #2e7d32;';
      }
    };

    const statusBadge = `<span style="${getBadgeStyle(status)} padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px; display: inline-block;">${status}</span>`;
    const nameDisplay = `${item.name} ${statusBadge}`;

    const priceDisplay = item.isFreebie ?
      `<span style="text-decoration: line-through; color: #999;">$${formatCurrency(item.price)}</span>` :
      `$${formatCurrency(item.price)}`;
    const totalDisplay = item.isFreebie ?
      `<span style="color: #4caf50; font-weight: bold;">FREE</span>` :
      `$${formatCurrency(item.quantity * item.price)}`;

    return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${nameDisplay}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${priceDisplay}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${totalDisplay}</td>
    </tr>
  `;
  };

  // Generate items list with section headers
  let itemsList = '';

  if (hasMixedInvoicing) {
    // Add "READY FOR PICKUP" header
    itemsList += `
    <tr>
      <td colspan="4" style="padding: 12px 8px 8px; font-weight: bold; background-color: #f5f5f5; border-top: 2px solid #ddd;">READY FOR PICKUP</td>
    </tr>`;
    itemsList += instockItems.map(generateItemRow).join('');

    // Add "PRE-ORDER" header
    itemsList += `
    <tr>
      <td colspan="4" style="padding: 12px 8px 8px; font-weight: bold; background-color: #f5f5f5; border-top: 2px solid #ddd; color: #1976d2;">PRE-ORDER</td>
    </tr>`;
    itemsList += preorderItems.map(generateItemRow).join('');
  } else {
    // No mixed invoicing, just list all items
    itemsList = order.items.map(generateItemRow).join('');
  }

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

              <!-- Customer Note Section (if available) -->
              ${order.customerNote ? `
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px; font-size: 18px;">📝 Note About Your Order</h3>
                        <div style="background-color: white; padding: 12px; border-radius: 4px; margin: 0; font-size: 14px; line-height: 1.6;">${order.customerNote}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

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
                          <li style="margin: 5px 0;">For items that are in stock, we will text you at <strong>${order.customer.phone}</strong> to confirm your pickup date and time.</li>
                          <li style="margin: 5px 0;">If you need to make changes to your pickup time after confirmation, please text us.</li>
                          ${hasMixedInvoicing ? '<li style="margin: 5px 0;">We will notify you when Pre-Order items arrive at the farm</li>' : ''}
                        </ul>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>


              <!-- Payment Note -->
              <tr>
                <td style="padding: 0 30px 20px 30px;">
                  <p style="margin: 0; font-size: 14px; color: #666;">This is your order summary. A separate invoice will be sent for payment.</p>
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
  // Separate items by invoice status (same as customer email)
  const invoiceNowItems = order.items.filter(item => !item.isFreebie && (item.invoiceNow !== false));
  const invoiceLaterItems = order.items.filter(item => !item.isFreebie && (item.invoiceNow === false));
  const hasMixedInvoicing = invoiceNowItems.length > 0 && invoiceLaterItems.length > 0;

  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}${item.invoiceNow === false ? ' <span style="color: #3498db;">(Pre-Order)</span>' : ''}</td>
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
            <td colspan="3" style="padding: 10px; text-align: right;">Sub-total:</td>
            <td style="padding: 10px; text-align: right;">$${parseFloat(order.subtotal || calculateSubtotal(order)).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;">GST (5%):</td>
            <td style="padding: 10px; text-align: right;">$${parseFloat(order.gst || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;">PST (7%):</td>
            <td style="padding: 10px; text-align: right;">$${parseFloat(order.pst || 0).toFixed(2)}</td>
          </tr>
          ${order.discount && order.discount.amount > 0 ? `
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;">Discount${order.discount.reason ? ` (${order.discount.reason})` : ''}:</td>
            <td style="padding: 10px; text-align: right; color: #27ae60;">-$${parseFloat(order.discount.amount).toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">$${parseFloat(order.total || calculateFinalTotal(order)).toFixed(2)}</td>
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

function generateInvoiceEmailTemplate(order, isAdmin = false) {
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

  const itemsList = order.items.map(item => {
    // Check if item has "Coming Soon" status
    const isComingSoon = item.inventoryStatus === 'Coming Soon' || item.status === 'Coming Soon';
    const nameDisplay = isComingSoon ? `${item.name} <span style="color: #f39c12; font-weight: bold;">(Coming Soon)</span>` : item.name;
    
    // Handle freebie display
    const priceDisplay = item.isFreebie ? 
      `<span style="text-decoration: line-through; color: #999;">$${formatCurrency(item.price)}</span>` : 
      `$${formatCurrency(item.price)}`;
    const totalDisplay = item.isFreebie ? 
      `<span style="color: #4caf50; font-weight: bold;">FREE</span>` : 
      `$${formatCurrency(item.quantity * item.price)}`;
    
    return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${nameDisplay}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${priceDisplay}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${totalDisplay}</td>
    </tr>
  `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice - ${order.id}</title>
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
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f7f7;">
        <tr>
          <td align="center" valign="top">
            <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 2px solid #2c5530; padding-bottom: 20px;">
                    <tr>
                      <td width="50%" class="stack-column-center" style="vertical-align: top;">
                        <img src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5" 
                             width="160" height="auto" alt="Buttons Urban Flower Farm" 
                             style="margin: 0; display: block; max-width: 160px;">
                      </td>
                      <td width="50%" class="stack-column-center" style="vertical-align: top; text-align: right;">
                        <h2 style="color: #2c5530; margin-top: 0; margin-bottom: 15px; font-size: 24px;">INVOICE</h2>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Order #:</strong> ${order.id}</p>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${formatDate(order.date)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                    <tr>
                      <td width="48%" class="stack-column" valign="top" style="padding-right: 20px;">
                        <h3 style="color: #2c5530; margin-top: 0; margin-bottom: 10px; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 5px;">To</h3>
                        <p style="margin: 5px 0; font-size: 14px;">${order.customer.firstName} ${order.customer.lastName}</p>
                        <p style="margin: 5px 0; font-size: 14px;">Email: ${order.customer.email}</p>
                        ${order.customer.phone ? `<p style="margin: 5px 0; font-size: 14px;">Phone: ${order.customer.phone}</p>` : ''}
                      </td>
                      <td width="48%" class="stack-column" valign="top" style="padding-left: 4%;">
                        <h3 style="color: #2c5530; margin-top: 0; margin-bottom: 10px; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 5px;">From</h3>
                        <p style="margin: 5px 0; font-size: 14px;">Buttons Urban Flower Farm</p>
                        <p style="margin: 5px 0; font-size: 14px;">Email: buttonsflowerfarm@telus.net</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Customer Note Section (if available) -->
              ${order.customerNote ? `
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
                    <tr>
                      <td style="padding: 20px;">
                        <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px; font-size: 18px;">📝 Note About Your Order</h3>
                        <div style="background-color: white; padding: 12px; border-radius: 4px; margin: 0; font-size: 14px; line-height: 1.6;">${order.customerNote}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

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
                      ${hasMixedInvoicing ? `
                        <!-- Split Invoicing -->
                        <tr>
                          <td colspan="4" style="padding: 15px 10px 10px; text-align: center; background-color: #f8f8f8; border-top: 2px solid #ddd;">
                            <strong style="color: #2c5530; font-size: 16px;">READY FOR PICKUP (In Stock)</strong>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right;">Sub-total:</td>
                          <td style="padding: 10px; text-align: right;">$${formatCurrency(invoiceNowItems.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</td>
                        </tr>
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right;">GST (5%):</td>
                          <td style="padding: 10px; text-align: right;">$${formatCurrency(invoiceNowItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.05)}</td>
                        </tr>
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right;">PST (7%):</td>
                          <td style="padding: 10px; text-align: right;">$${formatCurrency(invoiceNowItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.07)}</td>
                        </tr>
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right; border-top: 2px solid #ddd; font-weight: bold; background-color: #e8f5e9;">
                            <strong style="color: #2c5530;">INVOICE TOTAL:</strong>
                          </td>
                          <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd; font-weight: bold; color: #2c5530; background-color: #e8f5e9; font-size: 16px;">
                            <strong>$${formatCurrency(invoiceNowItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.12)}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="4" style="padding: 10px; text-align: center; font-size: 14px; font-style: italic; color: #666; background-color: #f9f9f9;">
                            This is your order summary. A separate invoice will be sent for payment.
                          </td>
                        </tr>
                        <tr><td colspan="4" style="padding: 10px;"></td></tr>
                        <tr>
                          <td colspan="4" style="padding: 15px 10px 10px; text-align: center; background-color: #f8f8f8; border-top: 2px solid #ddd;">
                            <strong style="color: #3498db; font-size: 16px;">PRE-ORDER (Invoice on Delivery)</strong>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right;">Sub-total:</td>
                          <td style="padding: 10px; text-align: right;">$${formatCurrency(invoiceLaterItems.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</td>
                        </tr>
                        <tr>
                          <td colspan="4" style="padding: 10px; text-align: center; font-size: 13px; font-style: italic; color: #666;">Will be invoiced when ready</td>
                        </tr>
                      ` : `
                        <!-- Standard Single Invoice -->
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right; border-top: 1px solid #eee;">Sub-total</td>
                          <td style="padding: 10px; text-align: right; border-top: 1px solid #eee;">$${formatCurrency(order.subtotal || calculateSubtotal(order))}</td>
                        </tr>
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right;">GST (5%):</td>
                          <td style="padding: 10px; text-align: right;">$${formatCurrency(order.gst || 0)}</td>
                        </tr>
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right;">PST (7%):</td>
                          <td style="padding: 10px; text-align: right;">$${formatCurrency(order.pst || 0)}</td>
                        </tr>
                        ${order.discount && order.discount.amount > 0 ? `
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right;">Discount${order.discount.reason ? ` (${order.discount.reason})` : ''}:</td>
                          <td style="padding: 10px; text-align: right; color: #27ae60;">-$${formatCurrency(order.discount.amount)}</td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td colspan="3" style="padding: 10px; text-align: right; border-top: 2px solid #ddd; font-weight: bold;">Total</td>
                          <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd; font-weight: bold; color: #2c5530;">$${formatCurrency(order.total || calculateFinalTotal(order))}</td>
                        </tr>
                      `}
                    </tfoot>
                  </table>
                </td>
              </tr>

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

              ${!isAdmin ? `
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-left: 4px solid #2c5530;">
                    <tr>
                      <td style="padding: 15px; font-size: 16px; font-style: italic; color: #2c5530;">
                        Thanks for supporting our local farm! We appreciate your business.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Export the Cloud Function
exports.sendOrderEmail = functions.https.onRequest(async (req, res) => {
  try {
    // Set CORS headers for all requests
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
      return;
    }
    const orderData = req.body;
    console.log("📦 Received order data:", orderData.id);

    // Validate customer email
    if (!orderData.customer?.email) {
      throw new Error("Customer email is required");
    }

    // Create transporter with Telus SMTP settings
    // Try .env first (local), then fall back to Firebase config (production)
    const envPassword = process.env.TELUS_PASSWORD;
    const configPassword = functions.config().email?.telus_password;
    const emailPassword = envPassword || configPassword || '';

    console.log('🔐 Password sources:', {
      hasEnvPassword: !!envPassword,
      hasConfigPassword: !!configPassword,
      finalPasswordLength: emailPassword?.length
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.telus.net",
      port: 587,
      secure: false,
      auth: {
        user: "buttonsflowerfarm@telus.net",
        pass: emailPassword,
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    const customerEmailHtml = generateCustomerEmailTemplate(orderData);
    const buttonsEmailHtml = generateButtonsEmailTemplate(orderData);

    // Send customer confirmation email
    const customerInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: orderData.customer.email,
      subject: `Order Confirmation - ${orderData.id}`,
      html: customerEmailHtml,
    });

    console.log("✅ Customer confirmation email sent to", orderData.customer.email, ":", customerInfo.messageId);

    // Send business notification
    const buttonsInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: "buttonsflowerfarm@telus.net",
      subject: `New Order Received - ${orderData.id}`,
      html: buttonsEmailHtml,
    });

    console.log("✅ Business notification email sent:", buttonsInfo.messageId);

    // Update email status in database
    try {
      const orderRef = admin.database().ref(`orders/${orderData.id}`);
      await orderRef.update({
        emailSent: true,
        emailSentTimestamp: Date.now(),
        lastEmailId: customerInfo.messageId
      });
      console.log(`✅ Updated order ${orderData.id} with email status`);
    } catch (updateError) {
      console.error(`❌ Error updating email status for order ${orderData.id}:`, updateError);
    }

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
  } catch (outerError) {
    // Ensure CORS headers are set even if there's an error
    res.set('Access-Control-Allow-Origin', '*');
    console.error("❌ Unexpected error:", outerError);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}); 

// Export template functions for testing
exports.generateCustomerEmailTemplate = generateCustomerEmailTemplate;
exports.generateButtonsEmailTemplate = generateButtonsEmailTemplate;
exports.generateInvoiceEmailTemplate = generateInvoiceEmailTemplate; 