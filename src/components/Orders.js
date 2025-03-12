import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user email is stored in localStorage
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setUserEmail(storedEmail);
      setEmailInput(storedEmail);
      loadOrders(storedEmail);
    } else {
      setLoading(false);
    }
  }, []);

  const loadOrders = (email) => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      
      // Filter orders by email
      const userOrders = allOrders.filter(
        order => order.customer.email.toLowerCase() === email.toLowerCase()
      );
      
      // Sort by date (newest first)
      userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setOrders(userOrders);
      setUserEmail(email);
      localStorage.setItem('userEmail', email);
      setError('');
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(emailInput)) {
      setError('Please enter a valid email address');
      return;
    }
    
    loadOrders(emailInput);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  const toggleOrderDetails = (orderId) => {
    setActiveOrder(activeOrder === orderId ? null : orderId);
  };

  return (
    <div className="orders-container">
      <h1>My Orders</h1>
      
      {!userEmail ? (
        <div className="email-lookup-form">
          <p>Please enter your email address to view your orders:</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Email address"
                className={error ? 'error' : ''}
              />
              {error && <span className="error-message">{error}</span>}
            </div>
            <button type="submit" className="lookup-btn">Find My Orders</button>
          </form>
        </div>
      ) : (
        <>
          <div className="user-info">
            <p>Showing orders for: <strong>{userEmail}</strong></p>
            <button 
              onClick={() => {
                setUserEmail('');
                setEmailInput('');
                localStorage.removeItem('userEmail');
              }}
              className="change-email-btn"
            >
              Change Email
            </button>
          </div>
          
          {loading ? (
            <div className="loading">Loading your orders...</div>
          ) : orders.length === 0 ? (
            <div className="no-orders">
              <p>No orders found for this email address.</p>
              <button 
                onClick={() => navigate('/shop')} 
                className="shop-now-btn"
              >
                Shop Now
              </button>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.id} className="order-card">
                  <div 
                    className="order-header" 
                    onClick={() => toggleOrderDetails(order.id)}
                  >
                    <div className="order-summary">
                      <h3>Order #{order.id}</h3>
                      <p className="order-date">{formatDate(order.date)}</p>
                    </div>
                    <div className="order-meta">
                      <span className={`order-status ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                      <span className="order-total">${order.total.toFixed(2)}</span>
                      <span className="toggle-icon">
                        {activeOrder === order.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  
                  {activeOrder === order.id && (
                    <div className="order-details">
                      <div className="order-items">
                        <h4>Items</h4>
                        <table className="items-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Price</th>
                              <th>Quantity</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map(item => (
                              <tr key={item.id}>
                                <td data-label="Product">{item.name}</td>
                                <td data-label="Price">${parseFloat(item.price).toFixed(2)}</td>
                                <td data-label="Quantity">{item.quantity}</td>
                                <td data-label="Total">${(item.price * item.quantity).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="order-info-grid">
                        <div className="customer-info">
                          <h4>Customer Information</h4>
                          <p><strong>Name:</strong> {order.customer.name || 'Not provided'}</p>
                          <p><strong>Email:</strong> {order.customer.email}</p>
                          {order.customer.phone && order.customer.phone !== 'Not provided' && (
                            <p><strong>Phone:</strong> {order.customer.phone}</p>
                          )}
                        </div>
                        
                        {(order.customer.address || order.customer.city || order.customer.postalCode) && (
                          <div className="shipping-info">
                            <h4>Shipping Address</h4>
                            {order.customer.address && <p>{order.customer.address}</p>}
                            {(order.customer.city || order.customer.postalCode) && (
                              <p>
                                {order.customer.city}{order.customer.city && order.customer.postalCode ? ', ' : ''}
                                {order.customer.postalCode}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {order.notes && (
                          <div className="order-notes">
                            <h4>Order Notes</h4>
                            <p>{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      <div className="orders-actions">
        <button 
          onClick={() => navigate('/shop')} 
          className="back-to-shop"
        >
          Back to Shop
        </button>
      </div>
    </div>
  );
};

export default Orders; 