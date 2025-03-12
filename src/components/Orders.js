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

  // Sample data for demonstration
  const createSampleOrders = () => {
    const sampleEmail = 'customer@example.com';
    
    // Force create sample orders regardless of what's in localStorage
    const sampleOrders = [
      {
        id: 'ORD-2023-001',
        date: new Date(2023, 5, 15).toISOString(),
        status: 'Completed',
        total: 78.50,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          {
            id: 'PLT-001',
            name: 'Lavender - French',
            price: 12.50,
            quantity: 3
          },
          {
            id: 'PLT-002',
            name: 'Sunflower - Giant',
            price: 8.00,
            quantity: 2
          },
          {
            id: 'PLT-003',
            name: 'Rose - Climbing',
            price: 25.00,
            quantity: 1
          }
        ],
        notes: 'Please leave the package by the side gate if no one is home.'
      },
      {
        id: 'ORD-2023-002',
        date: new Date(2023, 6, 22).toISOString(),
        status: 'Shipped',
        total: 45.75,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          {
            id: 'PLT-004',
            name: 'Dahlia - Mixed Colors',
            price: 15.25,
            quantity: 3
          }
        ],
        notes: 'Birthday gift for mom, please include a note saying "Happy Birthday!"'
      },
      {
        id: 'ORD-2023-003',
        date: new Date().toISOString(),
        status: 'Processing',
        total: 120.00,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          {
            id: 'PLT-005',
            name: 'Garden Starter Kit - Vegetables',
            price: 45.00,
            quantity: 1
          },
          {
            id: 'PLT-006',
            name: 'Herb Collection - Culinary',
            price: 35.00,
            quantity: 1
          },
          {
            id: 'PLT-007',
            name: 'Soil - Premium Organic',
            price: 20.00,
            quantity: 2
          }
        ],
        notes: 'Starting a new garden, would appreciate any tips for beginners!'
      },
      {
        id: 'ORD-2023-004',
        date: new Date(2023, 4, 5).toISOString(),
        status: 'Cancelled',
        total: 65.25,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          {
            id: 'PLT-008',
            name: 'Tulip Bulbs - Spring Mix',
            price: 18.75,
            quantity: 2
          },
          {
            id: 'PLT-009',
            name: 'Garden Tools - Basic Set',
            price: 27.75,
            quantity: 1
          }
        ],
        notes: 'Order cancelled due to items being out of season. Customer requested a refund.'
      },
      {
        id: 'ORD-2023-005',
        date: new Date(2023, 7, 10).toISOString(),
        status: 'Pending',
        total: 32.50,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          {
            id: 'PLT-010',
            name: 'Succulent Collection - Small',
            price: 32.50,
            quantity: 1
          }
        ],
        notes: 'Please deliver on a weekday between 9am and 5pm.'
      }
    ];
    
    // Always set the sample orders
    localStorage.setItem('orders', JSON.stringify(sampleOrders));
    console.log('SAMPLE ORDERS ADDED TO LOCALSTORAGE - REFRESH THE PAGE TO SEE THEM');
    
    // Set the sample email in localStorage for easy testing
    localStorage.setItem('userEmail', sampleEmail);
    return sampleEmail;
  };

  useEffect(() => {
    // Check if user email is stored in localStorage
    let storedEmail = localStorage.getItem('userEmail');
    
    // Always create sample orders
    const sampleEmail = createSampleOrders();
    if (sampleEmail) {
      storedEmail = sampleEmail;
    }
    
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

  // Force create sample orders and reload
  const forceSampleOrders = () => {
    // Clear existing orders
    localStorage.removeItem('orders');
    localStorage.removeItem('userEmail');
    
    // Create and set sample email
    const sampleEmail = 'customer@example.com';
    localStorage.setItem('userEmail', sampleEmail);
    
    // Create sample orders
    const sampleOrders = [
      {
        id: 'ORD-2023-001',
        date: new Date(2023, 5, 15).toISOString(),
        status: 'Completed',
        total: 78.50,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          { id: 'PLT-001', name: 'Lavender - French', price: 12.50, quantity: 3 },
          { id: 'PLT-002', name: 'Sunflower - Giant', price: 8.00, quantity: 2 },
          { id: 'PLT-003', name: 'Rose - Climbing', price: 25.00, quantity: 1 }
        ],
        notes: 'Please leave the package by the side gate if no one is home.'
      },
      {
        id: 'ORD-2023-002',
        date: new Date(2023, 6, 22).toISOString(),
        status: 'Shipped',
        total: 45.75,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          { id: 'PLT-004', name: 'Dahlia - Mixed Colors', price: 15.25, quantity: 3 }
        ],
        notes: 'Birthday gift for mom, please include a note saying "Happy Birthday!"'
      },
      {
        id: 'ORD-2023-003',
        date: new Date().toISOString(),
        status: 'Processing',
        total: 120.00,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          { id: 'PLT-005', name: 'Garden Starter Kit - Vegetables', price: 45.00, quantity: 1 },
          { id: 'PLT-006', name: 'Herb Collection - Culinary', price: 35.00, quantity: 1 },
          { id: 'PLT-007', name: 'Soil - Premium Organic', price: 20.00, quantity: 2 }
        ],
        notes: 'Starting a new garden, would appreciate any tips for beginners!'
      },
      {
        id: 'ORD-2023-004',
        date: new Date(2023, 4, 5).toISOString(),
        status: 'Cancelled',
        total: 65.25,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          { id: 'PLT-008', name: 'Tulip Bulbs - Spring Mix', price: 18.75, quantity: 2 },
          { id: 'PLT-009', name: 'Garden Tools - Basic Set', price: 27.75, quantity: 1 }
        ],
        notes: 'Order cancelled due to items being out of season. Customer requested a refund.'
      },
      {
        id: 'ORD-2023-005',
        date: new Date(2023, 7, 10).toISOString(),
        status: 'Pending',
        total: 32.50,
        customer: {
          name: 'Jane Smith',
          email: sampleEmail,
          phone: '555-123-4567',
          address: '123 Garden Lane',
          city: 'Flowertown',
          postalCode: 'F1W 2R3'
        },
        items: [
          { id: 'PLT-010', name: 'Succulent Collection - Small', price: 32.50, quantity: 1 }
        ],
        notes: 'Please deliver on a weekday between 9am and 5pm.'
      }
    ];
    
    // Save to localStorage
    localStorage.setItem('orders', JSON.stringify(sampleOrders));
    console.log('Sample orders added to localStorage');
    
    // Set email and reload orders
    setUserEmail(sampleEmail);
    setEmailInput(sampleEmail);
    loadOrders(sampleEmail);
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
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              onClick={forceSampleOrders}
              style={{
                padding: '10px 15px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Load Sample Orders (For Testing)
            </button>
          </div>
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
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <React.Fragment key={order.id}>
                      <tr onClick={() => toggleOrderDetails(order.id)}>
                        <td data-label="Order">
                          <span className="order-id">#{order.id}</span>
                        </td>
                        <td data-label="Date">
                          <span className="order-date">{formatDate(order.date)}</span>
                        </td>
                        <td data-label="Status">
                          <span className={`order-status ${getStatusClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td data-label="Total">
                          <span className="order-total">${order.total.toFixed(2)}</span>
                        </td>
                        <td data-label="Actions">
                          <button 
                            className="view-details-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOrderDetails(order.id);
                            }}
                          >
                            {activeOrder === order.id ? 'Hide Details' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                      {activeOrder === order.id && (
                        <tr className="details-row">
                          <td colSpan="5" style={{ padding: 0, border: 'none' }}>
                            <div className="order-details">
                              <div className="order-details-header">
                                <h3>Order Details #{order.id}</h3>
                                <button 
                                  className="close-details-btn"
                                  onClick={() => setActiveOrder(null)}
                                >
                                  ×
                                </button>
                              </div>
                              
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
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