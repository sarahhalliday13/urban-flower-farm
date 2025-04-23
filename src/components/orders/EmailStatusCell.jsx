import React from 'react';
import { useOrders } from './OrderContext';
import './EmailStatusCell.css';

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

  // Format the timestamp to show readable date and time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    try {
      // Handle timestamp as number (Date.now())
      const date = new Date(parseInt(timestamp, 10) || timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp format:', timestamp);
        return 'Invalid date';
      }
      
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Date error';
    }
  };

  return (
    <div className="email-management">
      {order.emailSent ? (
        <div className="email-status">
          <div>
            <span className="email-sent-indicator">✓</span>
            <span className="email-sent-text">Email sent</span>
          </div>
          {order.emailSentTimestamp && (
            <div className="email-timestamp">
              Sent on <strong>{formatTimestamp(order.emailSentTimestamp)}</strong>
            </div>
          )}
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
