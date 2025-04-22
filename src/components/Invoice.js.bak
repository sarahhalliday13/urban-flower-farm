import React, { useRef, useEffect } from 'react';
import '../styles/Invoice.css';
import { useOrders } from './orders/OrderContext';

/**
 * Invoice component that displays order details in a printable format
 * @param {Object} props - The component props
 * @param {Object} props.order - The order object to display
 * @param {string} props.type - The type of invoice display ('print' or other)
 * @param {string} props.invoiceType - Whether this is a 'preliminary' or 'final' invoice
 */
const Invoice = ({ order, type = 'print', invoiceType = 'final' }) => {
  const { sendInvoiceEmail, emailSending } = useOrders();
  const invoiceContainerRef = useRef(null);
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount).toFixed(2);
  };
  
  // NOTE: The preliminary watermark functionality is temporarily disabled
  // but keeping this commented for future reference
  // const isPreliminary = invoiceType === 'preliminary' || 
  //   (order.versions && order.versions.length > 0 && !order.isFinalized);

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
          <h2>INVOICE</h2>
          <p><strong>Order #:</strong> {order.id}</p>
          <p><strong>Date:</strong> {formatDate(order.date)}</p>
          <p><strong>Status:</strong> {order.status}</p>
          {orderVersion.versionNumber && (
            <p><strong>Version:</strong> {orderVersion.versionNumber}</p>
          )}
        </div>
      </div>

      <div className="invoice-addresses">
        <div className="invoice-from">
          <h3>From</h3>
          <p>Buttons Urban Flower Farm</p>
          <p>Email: buttonsflowerfarm@gmail.com</p>
        </div>
        <div className="invoice-to">
          <h3>To</h3>
          <p>{order.customer.name}</p>
          <p>Email: {order.customer.email}</p>
          {order.customer.phone && order.customer.phone !== 'Not provided' && (
            <p>Phone: {order.customer.phone}</p>
          )}
        </div>
      </div>

      <div className="invoice-items">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orderVersion.items.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="total-label">Subtotal</td>
              <td className="total-amount">${formatCurrency(orderVersion.total)}</td>
            </tr>
            {order.discount && parseFloat(order.discount.amount) > 0 && (
              <tr>
                <td colSpan="3" className="discount-label">Discount{order.discount.reason ? ` (${order.discount.reason})` : ''}</td>
                <td className="discount-amount">-${formatCurrency(order.discount.amount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan="3" className="final-total-label">Total</td>
              <td className="final-total-amount">
                ${formatCurrency(
                  order.discount && parseFloat(order.discount.amount) > 0
                    ? Math.max(0, orderVersion.total - parseFloat(order.discount.amount))
                    : orderVersion.total
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

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
              <li><strong>E-Transfer:</strong> Send to buttonsflowerfarm@gmail.com</li>
            </ul>
            <p>Please include your order number ({order.id}) in the payment notes.</p>
          </>
        )}
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
                  alert('Please allow pop-ups to print the invoice');
                  return;
                }
                
                // Only proceed if we have the invoice container reference
                if (!invoiceContainerRef.current) {
                  alert('Error: Invoice content not ready for printing');
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
                        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 2rem; border-bottom: 2px solid #2c5530; padding-bottom: 1rem; }
                        .invoice-logo-image { max-width: 200px; height: auto; display: block; }
                        .invoice-info { text-align: right; }
                        .invoice-info h2 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.5rem; }
                        .invoice-info p { margin: 0.25rem 0; font-size: 0.9rem; }
                        .invoice-preliminary-note { color: #dc3545; font-style: italic; margin-top: 0.5rem !important; }
                        .invoice-addresses { display: flex; justify-content: space-between; margin-bottom: 2rem; }
                        .invoice-from, .invoice-to { width: 48%; }
                        .invoice-from h3, .invoice-to h3 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
                        .invoice-from p, .invoice-to p { margin: 0.25rem 0; font-size: 0.9rem; }
                        .invoice-items { margin-bottom: 2rem; }
                        .invoice-items table { width: 100%; border-collapse: collapse; }
                        .invoice-items th { background-color: #f5f5f5; padding: 0.75rem; text-align: left; font-weight: 600; font-size: 0.9rem; border-bottom: 2px solid #ddd; }
                        .invoice-items td { padding: 0.75rem; border-bottom: 1px solid #eee; font-size: 0.9rem; text-align: left; }
                        .invoice-items td:nth-child(2), .invoice-items td:nth-child(3), .invoice-items td:nth-child(4) { text-align: right; }
                        .invoice-items tfoot td { border-top: 2px solid #ddd; font-weight: bold; }
                        .total-label, .discount-label, .final-total-label { text-align: right; font-weight: bold; }
                        .discount-label, .discount-amount { color: #28a745; }
                        .final-total-label, .final-total-amount { font-size: 1.1rem; color: #2c5530; }
                        .invoice-notes { margin-bottom: 2rem; padding: 1rem; background-color: #f9f9f9; border-radius: 4px; }
                        .invoice-notes h3 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.1rem; }
                        .invoice-notes p { margin: 0; font-size: 0.9rem; font-style: italic; }
                        .invoice-payment { margin-bottom: 2rem; padding: 1rem; background-color: #f5f5f5; border-radius: 4px; }
                        .invoice-payment h3 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.1rem; }
                        .invoice-payment p { margin: 0.5rem 0; font-size: 0.9rem; }
                        .invoice-payment ul { margin: 0.5rem 0; padding-left: 0; list-style-type: none; }
                        .invoice-payment li { margin: 0.25rem 0; font-size: 0.9rem; }
                        .payment-details { font-size: 0.9rem; }
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
            onClick={() => sendInvoiceEmail(order)}
            disabled={emailSending[order.id] || !order.customer.email || order.customer.email === 'Not provided'}
            className="email-button"
          >
            {emailSending[order.id] ? 'Sending...' : 'Email Invoice'}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(Invoice); // Add memoization to prevent unnecessary rerenders 