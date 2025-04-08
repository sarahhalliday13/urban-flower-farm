import React from 'react';
import { useOrders } from './OrderContext';

/**
 * EmailStatusCell - Displays email status and provides resend functionality
 * @param {Object} props - Component props
 * @param {Object} props.order - The order object
 */
const EmailStatusCell = ({ order }) => {
  const { sendOrderEmail, emailSending } = useOrders();

  // Get email status from localStorage
  const getEmailStatus = () => {
    try {
      // Check manualEmails in localStorage
      const manualEmails = JSON.parse(localStorage.getItem('manualEmails') || '[]');
      const orderEmail = manualEmails.find(email => email.orderId === order.id);
      
      if (orderEmail) {
        if (orderEmail.status === 'sent') {
          return <span className="email-status sent">Sent manually</span>;
        } else {
          return <span className="email-status pending">Pending - needs to be sent</span>;
        }
      }
      
      // If order has emailSent property
      if (order.emailSent) {
        return <span className="email-status sent">Email sent</span>;
      }
      
      // If no manual email record
      return <span className="email-status unknown">Unknown</span>;
    } catch (error) {
      console.error('Error checking email status:', error);
      return <span className="email-status error">Error checking status</span>;
    }
  };

  const handleSendEmail = () => {
    sendOrderEmail(order);
  };

  return (
    <div className="email-management">
      <h4>Email Status</h4>
      <div className="email-status-wrapper">
        {getEmailStatus()}
        <button 
          className="email-send-btn"
          onClick={handleSendEmail}
          disabled={emailSending[order.id]}
        >
          {emailSending[order.id] ? 'Sending...' : 'Send/Resend Email'}
        </button>
      </div>
    </div>
  );
};

export default EmailStatusCell;
