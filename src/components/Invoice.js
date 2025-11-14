import React, { useRef } from 'react';
import '../styles/Invoice.css';
import { toast } from 'react-hot-toast';
import { sendInvoiceEmail } from '../services/invoiceService';

// Add a function to generate invoice HTML that can be exported
export const generateInvoiceHTML = (order) => {
  if (!order) return '';
  
  // Format currency with $ sign and 2 decimal places
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  // Format date function
  const formatDate = (dateString) => {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return new Date().toLocaleDateString();
    }
  };
  
  // Create line items HTML
  const itemsHTML = order.items?.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name || item.title}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.isFreebie ? '<span style="text-decoration: line-through; color: #999;">$' + formatCurrency(item.price) + '</span>' : '$' + formatCurrency(item.price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.isFreebie ? '<span style="color: #4caf50; font-weight: bold;">FREE</span>' : '$' + formatCurrency(item.quantity * item.price)}</td>
    </tr>
  `).join('') || '';
  
  // Calculate subtotal from items, excluding freebies
  const subtotal = order.subtotal || order.items?.reduce((sum, item) => {
    if (item.isFreebie) return sum;
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity, 10) || 0;
    return sum + (price * quantity);
  }, 0) || 0;

  // Get discount first
  const discount = order.discount && parseFloat(order.discount.amount) > 0 ? parseFloat(order.discount.amount) : 0;

  // Calculate taxes on subtotal AFTER discount (always recalculate, ignore stored values)
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const gst = subtotalAfterDiscount * 0.05;
  const pst = subtotalAfterDiscount * 0.07;
  const total = subtotalAfterDiscount + gst + pst;
  
  // Generate full invoice HTML using table-based layout for better email client compatibility
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${order.id}</title>
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
                      <!-- Invoice Info Right -->
                      <td width="50%" class="stack-column-center" style="vertical-align: top; text-align: right;">
                        <h2 style="color: #2c5530; margin-top: 0; margin-bottom: 15px; font-size: 24px;">INVOICE</h2>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Order #:</strong> ${order.id}</p>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${formatDate(order.date)}</p>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>Status:</strong> ${order.status || 'Processing'}</p>
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
                        <p style="margin: 5px 0; font-size: 14px;">${order.customer?.name || 'Customer'}</p>
                        <p style="margin: 5px 0; font-size: 14px;">Email: buttonsflowerfarm@telus.net</p>
                        ${order.customer?.phone ? `<p style="margin: 5px 0; font-size: 14px;">Phone: ${order.customer.phone}</p>` : ''}
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
                      ${itemsHTML}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="3" style="padding: 10px; text-align: right; border-top: 2px solid #ddd; font-weight: bold;">Sub-total</td>
                        <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">$${formatCurrency(subtotal)}</td>
                      </tr>
                      ${discount > 0 ? `
                      <tr>
                        <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold; color: #28a745;">Discount${order.discount.reason ? ` (${order.discount.reason})` : ''}</td>
                        <td style="padding: 10px; text-align: right; color: #28a745;">-$${formatCurrency(discount)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td colspan="3" style="padding: 10px; text-align: right;">GST (5%)</td>
                        <td style="padding: 10px; text-align: right;">$${formatCurrency(gst)}</td>
                      </tr>
                      <tr>
                        <td colspan="3" style="padding: 10px; text-align: right;">PST (7%)</td>
                        <td style="padding: 10px; text-align: right;">$${formatCurrency(pst)}</td>
                      </tr>
                      <tr>
                        <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold; font-size: 16px; color: #2c5530;">Total</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 16px; color: #2c5530;">$${formatCurrency(total)}</td>
                      </tr>
                    </tfoot>
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
                        <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px; font-size: 18px;">Note About Your Order</h3>
                        <div style="background-color: white; padding: 12px; border-radius: 4px; margin: 0; font-size: 14px; line-height: 1.6;">${order.customerNote}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              <!-- Notes Section (if available) -->
              ${order.notes ? `
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; background-color: #f9f9f9; border-radius: 4px;">
                    <tr>
                      <td style="padding: 15px;">
                        <h3 style="color: #2c5530; margin-top: 0; margin-bottom: 10px; font-size: 18px;">Order Notes</h3>
                        <p style="margin: 0; font-size: 14px; font-style: italic;">${order.notes}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              <!-- Payment Information -->
              <tr>
                <td style="padding: 0 30px 20px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-radius: 4px;">
                    <tr>
                      <td style="padding: 20px; text-align: center;">
                        <h3 style="color: #2c5530; margin: 0 0 10px 0; font-size: 18px;">Payment Information</h3>
                        <p style="margin: 0 0 15px 0; font-size: 14px;">Please complete your payment using one of the following methods:</p>
                        <p style="margin: 5px 0; font-size: 14px;">
                          <strong>Cash:</strong> Available for in-person pickup
                        </p>
                        <p style="margin: 5px 0 15px 0; font-size: 14px;">
                          <strong>E-Transfer:</strong> Send to buttonsflowerfarm@telus.net
                        </p>
                        <p style="margin: 0; font-size: 14px;">Please include your order number (${order.id}) in the payment notes.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Thank you message -->
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
};

/**
 * Invoice component that displays order details in a printable format
 * @param {Object} props - The component props
 * @param {Object} props.order - The order object to display
 * @param {string} props.type - The type of invoice display ('print' or other)
 * @param {string} props.invoiceType - Whether this is a 'preliminary' or 'final' invoice
 * @param {boolean} props.standalone - Whether this is a standalone invoice page (allows email regardless of sent status)
 */
const Invoice = ({ order, type = 'print', invoiceType = 'final', standalone = false, itemFilter = 'all' }) => {
  const invoiceContainerRef = useRef(null);

  // Guard against missing order data
  if (!order) {
    return <div className="invoice-error">Order data is missing or invalid</div>;
  }

  // Filter items based on itemFilter parameter and inventoryStatus
  const filterItems = (items) => {
    if (!items || !Array.isArray(items)) return [];

    if (itemFilter === 'instock') {
      return items.filter(item => {
        const status = (item.inventoryStatus || 'In Stock').toLowerCase();
        return status === 'in stock';
      });
    }
    if (itemFilter === 'preorder') {
      return items.filter(item => {
        const status = (item.inventoryStatus || 'In Stock').toLowerCase();
        return status === 'pre-order' || status === 'coming soon';
      });
    }

    return items; // 'all'
  };

  // Determine if discount should be applied to this invoice based on discount.applyTo setting
  const shouldApplyDiscount = () => {
    if (!order.discount || !order.discount.amount || parseFloat(order.discount.amount) <= 0) {
      return false;
    }

    const applyTo = order.discount.applyTo || 'all';

    // 'all' - only show on full invoice
    if (applyTo === 'all') {
      return itemFilter === 'all';
    }

    // 'instock' - only show on in stock invoice
    if (applyTo === 'instock') {
      return itemFilter === 'instock' || itemFilter === 'all';
    }

    // 'preorder' - only show on pre-order invoice
    if (applyTo === 'preorder') {
      return itemFilter === 'preorder' || itemFilter === 'all';
    }

    // 'split' - show proportionally on all invoices
    if (applyTo === 'split') {
      return true;
    }

    return false;
  };

  // Calculate the discount amount to apply based on applyTo setting
  const getApplicableDiscount = () => {
    if (!shouldApplyDiscount()) {
      return 0;
    }

    const discountAmount = parseFloat(order.discount.amount);
    const applyTo = order.discount.applyTo || 'all';

    // For 'split', calculate proportional discount
    if (applyTo === 'split' && itemFilter !== 'all') {
      const fullSubtotal = calculateSubtotal(order.items || []);
      const filteredSubtotal = calculateSubtotal(filterItems(order.items || []));

      if (fullSubtotal === 0) return 0;

      // Proportional discount = (filtered subtotal / full subtotal) * total discount
      return (filteredSubtotal / fullSubtotal) * discountAmount;
    }

    // For other cases, return full discount amount
    return discountAmount;
  };

  const formatDate = (dateString) => {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date unavailable';
    }
  };

  const formatCurrency = (amount) => {
    try {
      return parseFloat(amount || 0).toFixed(2);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '0.00';
    }
  };

  // Get the appropriate version of the order for this invoice
  const getOrderVersion = () => {
    // If this is a final invoice or there are no versions, use current data
    if (!order.versions || order.versions.length === 0 || invoiceType === 'final') {
      return order;
    }
    
    // For preliminary invoice, use the latest version
    const latestVersion = order.versions[order.versions.length - 1];
    return {
      ...order,
      items: latestVersion.items,
      total: latestVersion.total,
      versionNumber: latestVersion.versionNumber,
      versionDate: latestVersion.timestamp
    };
  };
  
  const orderVersion = getOrderVersion();

  // Calculate subtotal from items, excluding freebies
  const calculateSubtotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      if (item.isFreebie) return sum;
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      return sum + (price * quantity);
    }, 0);
  };

  // Function to handle sending invoice email
  const handleSendInvoiceEmail = async () => {
    if (!order?.customer?.email) {
      toast.error('Customer email is required to send invoice');
      return;
    }
    
    try {
      const result = await sendInvoiceEmail(order, standalone);
      
      if (result?.success) {
        toast.success('Invoice email sent successfully!');
      } else {
        toast.error(`Failed to send invoice email: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Email service is not available');
    }
  };

  // Check if the email button should be disabled
  const isEmailButtonDisabled = () => {
    return !order?.customer?.email;
  };

  // Get email button text
  const getEmailButtonText = () => {
    return 'Email Invoice';
  };

  // Generate invoice number with suffix based on filter
  const getInvoiceNumber = () => {
    if (itemFilter === 'instock') {
      return `${order.id}-A`;
    }
    if (itemFilter === 'preorder') {
      return `${order.id}-B`;
    }
    return order.id;
  };

  // Get invoice title based on filter
  const getInvoiceTitle = () => {
    if (itemFilter === 'instock') {
      return 'INVOICE (In Stock Items)';
    }
    if (itemFilter === 'preorder') {
      return 'INVOICE (Pre-Order Items)';
    }
    return 'INVOICE';
  };

  return (
    <div className={`invoice-container ${type}`} ref={invoiceContainerRef}>
      <div className="invoice-header">
        <div className="invoice-logo">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5"
            alt="Buttons Urban Flower Farm"
            className="invoice-logo-image"
          />
        </div>
        <div className="invoice-info">
          <h2>{getInvoiceTitle()}</h2>
          <p><strong>Invoice #:</strong> {getInvoiceNumber()}</p>
          <p><strong>Date:</strong> {formatDate(order.date)}</p>
          <p><strong>Status:</strong> {order.status}</p>
          {orderVersion.versionNumber && (
            <p><strong>Version:</strong> {orderVersion.versionNumber}</p>
          )}
        </div>
      </div>

      <div className="invoice-addresses">
        <div className="invoice-to" style={{ textAlign: 'left' }}>
          <h3 style={{ textAlign: 'left' }}>To</h3>
          <p>{order.customer?.name || 'Customer'}</p>
          <p>Email: {order.customer?.email || 'Not provided'}</p>
          {order.customer?.phone && order.customer.phone !== 'Not provided' && (
            <p>Phone: {order.customer.phone}</p>
          )}
        </div>
        <div className="invoice-from" style={{ textAlign: 'left' }}>
          <h3 style={{ textAlign: 'left' }}>From</h3>
          <p>Buttons Urban Flower Farm</p>
          <p>Email: buttonsflowerfarm@telus.net</p>
        </div>
      </div>

      <div className="invoice-items">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Item</th>
              <th style={{ textAlign: 'center' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filterItems(orderVersion.items || []).map((item, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'left' }}>{item.name || 'Product'}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity || 0}</td>
                <td style={{ textAlign: 'right' }}>
                  {item.isFreebie ? (
                    <span style={{ textDecoration: 'line-through', color: '#999' }}>
                      ${formatCurrency(item.price)}
                    </span>
                  ) : (
                    `$${formatCurrency(item.price)}`
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {item.isFreebie ? (
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>FREE</span>
                  ) : (
                    `$${formatCurrency(item.price * item.quantity)}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="total-label" style={{ textAlign: 'right' }}>Sub-total</td>
              <td className="total-amount" style={{ textAlign: 'right' }}>${formatCurrency(calculateSubtotal(filterItems(orderVersion.items)))}</td>
            </tr>
            {shouldApplyDiscount() && (
              <tr>
                <td colSpan="3" className="discount-label" style={{ textAlign: 'right' }}>Discount{order.discount.reason ? ` (${order.discount.reason})` : ''}</td>
                <td className="discount-amount" style={{ textAlign: 'right' }}>-${formatCurrency(getApplicableDiscount())}</td>
              </tr>
            )}
            <tr>
              <td colSpan="3" className="total-label" style={{ textAlign: 'right' }}>GST (5%)</td>
              <td className="total-amount" style={{ textAlign: 'right' }}>${formatCurrency(Math.max(0, calculateSubtotal(filterItems(orderVersion.items)) - getApplicableDiscount()) * 0.05)}</td>
            </tr>
            <tr>
              <td colSpan="3" className="total-label" style={{ textAlign: 'right' }}>PST (7%)</td>
              <td className="total-amount" style={{ textAlign: 'right' }}>${formatCurrency(Math.max(0, calculateSubtotal(filterItems(orderVersion.items)) - getApplicableDiscount()) * 0.07)}</td>
            </tr>
            <tr>
              <td colSpan="3" className="final-total-label" style={{ textAlign: 'right' }}>Total</td>
              <td className="final-total-amount" style={{ textAlign: 'right' }}>
                ${formatCurrency(
                  (() => {
                    const sub = calculateSubtotal(filterItems(orderVersion.items));
                    const disc = getApplicableDiscount();
                    const subtotalAfterDiscount = Math.max(0, sub - disc);
                    const gst = subtotalAfterDiscount * 0.05;
                    const pst = subtotalAfterDiscount * 0.07;
                    return subtotalAfterDiscount + gst + pst;
                  })()
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.customerNote && (
        <div className="customer-note-invoice" style={{
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h3 style={{color: '#856404', margin: '0 0 10px 0', fontSize: '1.1rem'}}>Note About Your Order</h3>
          <div style={{
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            {order.customerNote}
          </div>
        </div>
      )}

      {order.notes && (
        <div className="invoice-notes">
          <h3>Order Notes</h3>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="invoice-payment">
        <h3>Payment Information</h3>
        {order.payment && order.payment.method ? (
          <div className="payment-details">
            <p><strong>Payment Method:</strong> {order.payment.method.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}</p>
            {order.payment.timing && (
              <p><strong>Payment Timing:</strong> {order.payment.timing.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}</p>
            )}
          </div>
        ) : (
          <>
            <p>Please complete your payment using one of the following methods:</p>
            <ul>
              <li><strong>Cash:</strong> Available for in-person pickup</li>
              <li><strong>E-Transfer:</strong> Send to buttonsflowerfarm@telus.net</li>
            </ul>
            <p>Please include your order number ({order.id}) in the payment notes.</p>
          </>
        )}
      </div>

      <div className="thank-you-message">
        Thanks for supporting our local farm! We appreciate your business and hope you enjoy your flowers.
      </div>

      {type === 'print' && (
        <div className="print-controls">
          <button 
            onClick={() => {
              // Wait a moment to ensure the invoice content is fully rendered
              setTimeout(() => {
                // Clean printing approach - forces single page
                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                  toast.error('Please allow pop-ups to print the invoice');
                  return;
                }
                
                // Only proceed if we have the invoice container reference
                if (!invoiceContainerRef.current) {
                  toast.error('Error: Invoice content not ready for printing');
                  return;
                }
                
                // Create a clean document with just the invoice, using ref instead of querySelector
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Invoice #${order.id}</title>
                      <style>
                        body { margin: 0; padding: 0.5in; font-family: Arial, sans-serif; }
                        .invoice-container { max-width: 7.5in; margin: 0 auto; }
                        .preliminary-mark { 
                          position: absolute;
                          top: 40%;
                          left: 0;
                          width: 100%;
                          text-align: center;
                          font-size: 3rem;
                          transform: rotate(-45deg);
                          color: rgba(220, 53, 69, 0.2);
                          font-weight: bold;
                          text-transform: uppercase;
                          pointer-events: none;
                          z-index: 100;
                        }
                        
                        /* Main container styles */
                        .invoice-container { box-shadow: none; padding: 0; }
                        
                        /* Header with logo and invoice info */
                        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 2rem; border-bottom: 2px solid #2c5530; padding-bottom: 1rem; }
                        .invoice-logo-image { max-width: 130px; height: auto; display: block; }
                        .invoice-info { text-align: right; }
                        .invoice-info h2 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.5rem; }
                        .invoice-info p { margin: 0.25rem 0; font-size: 0.9rem; }
                        .invoice-preliminary-note { color: #dc3545; font-style: italic; margin-top: 0.5rem !important; }
                        
                        /* From/To section - with To on left, From on right */
                        .invoice-addresses { display: flex; justify-content: space-between; margin-bottom: 2rem; }
                        .invoice-from, .invoice-to { width: 48%; }
                        .invoice-to { margin-right: 10px; }
                        .invoice-from { margin-left: 10px; }
                        .invoice-from h3, .invoice-to h3 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
                        .invoice-from p, .invoice-to p { margin: 0.25rem 0; font-size: 0.9rem; }
                        
                        /* Thank you message */
                        .thank-you-message { text-align: center; color: #2c5530; font-style: italic; margin: 15px 0 30px 0; padding: 15px; border-top: 1px solid #eee; border-bottom: 1px solid #eee; font-size: 16px; font-weight: 500; background-color: #f9f9f9; border-radius: 4px; }
                        
                        /* Items table */
                        .invoice-items { margin-bottom: 2rem; }
                        .invoice-items table { width: 100%; border-collapse: collapse; }
                        .invoice-items th { background-color: #f5f5f5; padding: 0.75rem; text-align: left; font-weight: 600; font-size: 0.9rem; border-bottom: 2px solid #ddd; }
                        .invoice-items td { padding: 0.75rem; border-bottom: 1px solid #eee; font-size: 0.9rem; text-align: left; }
                        .invoice-items td:nth-child(2), .invoice-items td:nth-child(3), .invoice-items td:nth-child(4) { text-align: right; }
                        .invoice-items tfoot td { border-top: 2px solid #ddd; font-weight: bold; }
                        .total-label, .discount-label, .final-total-label { text-align: right; font-weight: bold; }
                        .discount-label, .discount-amount { color: #28a745; }
                        .final-total-label, .final-total-amount { font-size: 1.1rem; color: #2c5530; }
                        
                        /* Notes and payment */
                        .invoice-notes { margin-bottom: 2rem; padding: 1rem; background-color: #f9f9f9; border-radius: 4px; }
                        .invoice-notes h3 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.1rem; }
                        .invoice-notes p { margin: 0; font-size: 0.9rem; font-style: italic; }
                        .invoice-payment { margin-bottom: 2rem; padding: 1rem; background-color: #f5f5f5; border-radius: 4px; }
                        .invoice-payment h3 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.1rem; }
                        .invoice-payment p { margin: 0.5rem 0; font-size: 0.9rem; }
                        .invoice-payment ul { margin: 0.5rem 0; padding-left: 0; list-style-type: none; }
                        .invoice-payment li { margin: 0.25rem 0; font-size: 0.9rem; }
                        .payment-details { font-size: 0.9rem; }
                        
                        /* Hide elements that shouldn't be printed */
                        .print-controls { display: none !important; }
                        .invoice-page-header { display: none !important; }
                        .back-button { display: none !important; }
                      </style>
                    </head>
                    <body>
                      ${invoiceContainerRef.current.outerHTML}
                    </body>
                  </html>
                `);
                
                printWindow.document.close();
                printWindow.focus();
                
                // Print after a delay to ensure content is loaded
                setTimeout(() => {
                  printWindow.print();
                  // Close window after print dialog is closed
                  setTimeout(() => {
                    printWindow.close();
                  }, 500);
                }, 200);
              }, 100); // Let DOM settle before extracting content
            }} 
            className="print-button"
          >
            Print Invoice
          </button>
          
          <button 
            onClick={handleSendInvoiceEmail}
            disabled={isEmailButtonDisabled()}
            className="email-invoice-button"
          >
            {getEmailButtonText()}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(Invoice); // Add memoization to prevent unnecessary rerenders 