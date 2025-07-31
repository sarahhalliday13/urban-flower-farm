import React, { useState, useEffect } from 'react';
import { useOrders } from './OrderContext';

/**
 * EmailQueueBanner - Displays a warning banner when there are pending emails
 * Retrieves the pending emails from localStorage and provides buttons for manual sending
 */
const EmailQueueBanner = () => {
  const [pendingEmails, setPendingEmails] = useState([]);
  const { sendOrderEmail, orders } = useOrders();

  // Load pending emails from localStorage
  useEffect(() => {
    try {
      const manualEmails = JSON.parse(localStorage.getItem('manualEmails') || '[]');
      setPendingEmails(manualEmails.filter(email => email.status === 'pending'));
    } catch (error) {
      console.error('Error loading pending emails:', error);
      setPendingEmails([]);
    }
  }, [orders]); // Reload when orders change

  // If no pending emails, don't render the banner
  if (pendingEmails.length === 0) {
    return null;
  }

  const handleSendEmail = (email) => {
    // Find the corresponding order
    const order = orders.find(o => o.id === email.orderId);
    if (order) {
      sendOrderEmail(order);
    } else {
      console.error(`Order not found for email: ${email.orderId}`);
    }
  };

  return (
    <div className="pending-emails-alert">
      <h2><span role="img" aria-label="Warning">⚠️</span> Pending Order Emails</h2>
      <p>{pendingEmails.length} order confirmation {pendingEmails.length === 1 ? 'email' : 'emails'} need to be sent manually</p>
      
      <div className="pending-emails-list">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingEmails.slice(0, 5).map((email, index) => (
              <tr key={index}>
                <td>{email.orderId}</td>
                <td>{email.customerName || 'Unknown'}</td>
                <td>{email.customerEmail}</td>
                <td>{new Date(email.date).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="email-action-btn"
                    onClick={() => handleSendEmail(email)}
                  >
                    Send Email
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {pendingEmails.length > 5 && (
          <p className="view-all-link">
            +{pendingEmails.length - 5} more pending emails
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailQueueBanner;
