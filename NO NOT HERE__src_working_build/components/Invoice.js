import React from 'react';
import '../styles/Invoice.css';

const Invoice = ({ order, type = 'print' }) => {
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount).toFixed(2);
  };

  return (
    <div className={`invoice-container ${type}`}>
      <div className="invoice-header">
        <div className="invoice-logo">
          <h1>Buttons Urban Flower Farm</h1>
        </div>
        <div className="invoice-info">
          <h2>INVOICE</h2>
          <p><strong>Order #:</strong> {order.id}</p>
          <p><strong>Date:</strong> {formatDate(order.date)}</p>
          <p><strong>Status:</strong> {order.status}</p>
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
            {order.items.map((item, index) => (
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
              <td colSpan="3" className="total-label">Total</td>
              <td className="total-amount">${formatCurrency(order.total)}</td>
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
        <p>Please complete your payment using one of the following methods:</p>
        <ul>
          <li><strong>Cash:</strong> Available for in-person pickup</li>
          <li><strong>E-Transfer:</strong> Send to buttonsflowerfarm@gmail.com</li>
        </ul>
        <p>Please include your order number ({order.id}) in the payment notes.</p>
      </div>

      {type === 'print' && (
        <div className="print-controls">
          <button onClick={() => {
            // Clean printing approach - forces single page
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
              alert('Please allow pop-ups to print the invoice');
              return;
            }
            
            // Create a clean document with just the invoice
            printWindow.document.write(`
              <html>
                <head>
                  <title>Invoice #${order.id}</title>
                  <style>
                    body { margin: 0; padding: 0.5in; font-family: Arial, sans-serif; }
                    .invoice-container { max-width: 7.5in; margin: 0 auto; }
                    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 2rem; border-bottom: 2px solid #2c5530; padding-bottom: 1rem; }
                    .invoice-logo h1 { color: #2c5530; margin: 0; font-size: 1.8rem; }
                    .invoice-info { text-align: right; }
                    .invoice-info h2 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.5rem; }
                    .invoice-info p { margin: 0.25rem 0; font-size: 0.9rem; }
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
                    .total-label { text-align: right; font-weight: bold; }
                    .total-amount { font-weight: bold; color: #2c5530; }
                    .invoice-notes { margin-bottom: 2rem; padding: 1rem; background-color: #f9f9f9; border-radius: 4px; }
                    .invoice-notes h3 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.1rem; }
                    .invoice-notes p { margin: 0; font-size: 0.9rem; font-style: italic; }
                    .invoice-payment { margin-bottom: 2rem; padding: 1rem; background-color: #f5f5f5; border-radius: 4px; }
                    .invoice-payment h3 { color: #2c5530; margin: 0 0 0.5rem 0; font-size: 1.1rem; }
                    .invoice-payment p { margin: 0.5rem 0; font-size: 0.9rem; }
                    .invoice-payment ul { margin: 0.5rem 0; padding-left: 0; list-style-type: none; }
                    .invoice-payment li { margin: 0.25rem 0; font-size: 0.9rem; }
                  </style>
                </head>
                <body>
                  ${document.querySelector('.invoice-container').outerHTML}
                </body>
              </html>
            `);
            
            printWindow.document.close();
            printWindow.focus();
            
            // Print after a short delay to ensure content is loaded
            setTimeout(() => {
              printWindow.print();
              // Close window after print dialog is closed
              setTimeout(() => {
                printWindow.close();
              }, 500);
            }, 500);
          }} className="print-button">Print Invoice</button>
        </div>
      )}
    </div>
  );
};

export default Invoice; 