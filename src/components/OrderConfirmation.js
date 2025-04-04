import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/OrderConfirmation.css';

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const [confirmationData, setConfirmationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailFailed, setEmailFailed] = useState(false);

  useEffect(() => {
    // Check if there was an email failure flag
    const emailSendFailed = localStorage.getItem('emailSendFailed') === 'true';
    setEmailFailed(emailSendFailed);
    
    // Clear the flag so it doesn't persist
    if (emailSendFailed) {
      localStorage.removeItem('emailSendFailed');
    }
    
    // Retrieve order confirmation data from localStorage
    const storedConfirmation = localStorage.getItem('lastOrderConfirmation');
    const latestOrderId = localStorage.getItem('latestOrderId');
    
    if (!storedConfirmation && !latestOrderId) {
      // If no confirmation data, redirect to shop
      console.log('No confirmation data found, redirecting to shop');
      navigate('/shop');
      return;
    }

    try {
      if (storedConfirmation) {
        const data = JSON.parse(storedConfirmation);
        setConfirmationData(data);
        console.log('Loaded confirmation data from lastOrderConfirmation:', data);
        
        // Check if email failed from confirmation data
        if (data.emailSent === false) {
          setEmailFailed(true);
        }
      } else if (latestOrderId) {
        // Try to find the order in localStorage
        const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const foundOrder = allOrders.find(order => order.id === latestOrderId);
        
        if (foundOrder) {
          // Convert order data to confirmation format
          const data = {
            orderId: foundOrder.id,
            customerEmail: foundOrder.customer.email,
            items: foundOrder.items,
            totalAmount: foundOrder.total,
            date: foundOrder.date,
            emailSent: foundOrder._metadata?.emailSent
          };
          setConfirmationData(data);
          console.log('Loaded confirmation data from orders:', data);
          
          // Check if email failed from metadata
          if (foundOrder._metadata?.emailSent === false) {
            setEmailFailed(true);
          }
        } else {
          throw new Error('Order not found');
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading confirmation data:', error);
      navigate('/shop');
    }
  }, [navigate]);

  if (loading || !confirmationData) {
    return (
      <div className="confirmation-loading">
        <p>Loading order confirmation...</p>
      </div>
    );
  }

  // Calculate order summary
  const formatCurrency = (amount) => {
    return typeof amount === 'number' 
      ? `$${amount.toFixed(2)}` 
      : `$${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="order-confirmation">
      <div className="confirmation-icon">
        <span role="img" aria-label="Order Complete">
          <i className="fas fa-check-circle"></i>
        </span>
      </div>
      <h3>Thank You For Your Order!</h3>
      
      {/* Order Summary Section */}
      <div className="order-summary">
        <h4>Order Summary</h4>
        <p className="order-number">Order #: {confirmationData.orderId}</p>
        
        {confirmationData.items && confirmationData.items.length > 0 ? (
          <div className="order-items">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {confirmationData.items.map((item, index) => (
                  <tr key={`${item.id}-${index}`}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3"><strong>Total</strong></td>
                  <td><strong>{formatCurrency(confirmationData.totalAmount)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p>No items in this order.</p>
        )}
      </div>
      
      <p>
        Your order has been received and will be processed shortly.
      </p>
      
      {emailFailed ? (
        <div className="email-error-notice">
          <p><strong>IMPORTANT: The email service is currently unavailable.</strong></p>
          <p>Your order has been successfully received and processed, but we're having technical difficulties with our email service.</p>
          <p>Please save or take a screenshot of your order details for your records.</p>
          <p>Your order (#: {confirmationData.orderId}) is still in our system and can be viewed anytime in the "My Orders" section.</p>
        </div>
      ) : (
        <p>
          You will receive a confirmation email with your order details.
        </p>
      )}
      
      <p className="spam-notice">
        <strong>Please check your spam folder if you don't see the email.</strong>
      </p>
      <div className="confirmation-buttons">
        <button 
          className="btn-primary"
          onClick={() => navigate('/orders')}
        >
          View My Orders
        </button>
        <button
          className="btn-primary"
          onClick={() => navigate('/shop')}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmation; 