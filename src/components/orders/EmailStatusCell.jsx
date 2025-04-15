import React from 'react';
import { useOrders } from './OrderContext';

/**
 * EmailStatusCell - Provides email resend functionality
 * @param {Object} props - Component props
 * @param {Object} props.order - The order object
 */
const EmailStatusCell = ({ order }) => {
  const { sendOrderEmail, emailSending } = useOrders();

  const handleSendEmail = () => {
    sendOrderEmail(order);
  };

  return (
    <div className="email-management">
      <button 
        className="email-send-btn"
        onClick={handleSendEmail}
        disabled={emailSending[order.id]}
      >
        {emailSending[order.id] ? 'Sending...' : 'Send Order Email'}
      </button>
    </div>
  );
};

export default EmailStatusCell;
