import React from 'react';
import { useOrders } from './OrderContext';

/**
 * EmailStatusCell - Provides email resend functionality and status
 * @param {Object} props - Component props
 * @param {Object} props.order - The order object
 */
const EmailStatusCell = ({ order }) => {
  const { sendOrderEmail, emailSending } = useOrders();

  const handleSendEmail = () => {
    sendOrderEmail(order);
  };

  // Format the timestamp if it exists
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="email-management">
      {order.emailSent ? (
        <div className="email-status">
          <span className="email-sent-indicator">✓</span>
          <span className="email-sent-text">
            Email sent
            {order.emailSentTimestamp && (
              <span className="email-timestamp"> on {formatTimestamp(order.emailSentTimestamp)}</span>
            )}
          </span>
          <button 
            className="email-resend-btn"
            onClick={handleSendEmail}
            disabled={emailSending[order.id]}
          >
            {emailSending[order.id] ? 'Sending...' : 'Resend'}
          </button>
        </div>
      ) : (
        <button 
          className="email-send-btn"
          onClick={handleSendEmail}
          disabled={emailSending[order.id]}
        >
          {emailSending[order.id] ? 'Sending...' : 'Send Order Email'}
        </button>
      )}
    </div>
  );
};

export default EmailStatusCell;
