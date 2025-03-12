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
          <p>Colleen Hutton</p>
          <p>Winnipeg, Manitoba</p>
          <p>Email: colleenhutton@gmail.com</p>
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
          <li><strong>E-Transfer:</strong> Send to colleenhutton@gmail.com</li>
        </ul>
        <p>Please include your order number ({order.id}) in the payment notes.</p>
      </div>

      <div className="invoice-footer">
        <p>Thank you for your business!</p>
        <p>Buttons Urban Flower Farm</p>
        <p>© {new Date().getFullYear()} All Rights Reserved</p>
      </div>

      {type === 'print' && (
        <div className="print-controls">
          <button onClick={() => window.print()} className="print-button">Print Invoice</button>
        </div>
      )}
    </div>
  );
};

export default Invoice; 