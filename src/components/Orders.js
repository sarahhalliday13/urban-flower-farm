import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../services/firebase';
import '../styles/Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [firebaseUnavailable, setFirebaseUnavailable] = useState(false);
  const navigate = useNavigate();
  
  // Add mounted ref to prevent state updates after unmounting
  const isMountedRef = useRef(true);

  // Add cleanup for the mounted ref when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sample data for demonstration - only used as fallback
  const createSampleOrders = () => {
    // Check if we already have orders in localStorage
    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    if (existingOrders.length > 0) {
      console.log('Found existing orders in localStorage, not creating samples');
      return null;
    }
    
    console.log('No existing orders found, creating sample orders');
    const sampleEmail = 'customer@example.com';
    
    // Create sample orders for demo purposes
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
    
    // Store sample orders only if no real orders exist
    localStorage.setItem('orders', JSON.stringify(sampleOrders));
    console.log('SAMPLE ORDERS ADDED TO LOCALSTORAGE - REFRESH THE PAGE TO SEE THEM');
    
    // Set the sample email in localStorage for easy testing
    localStorage.setItem('userEmail', sampleEmail);
    return sampleEmail;
  };

  useEffect(() => {
    // Check if user email is stored in localStorage
    let storedEmail = localStorage.getItem('userEmail');
    
    if (storedEmail) {
      setUserEmail(storedEmail);
      setEmailInput(storedEmail);
      loadOrders(storedEmail);
    } else {
      // Only create sample orders if no user email exists
      const sampleEmail = createSampleOrders();
      if (sampleEmail) {
        storedEmail = sampleEmail;
        setUserEmail(sampleEmail);
        setEmailInput(sampleEmail);
        loadOrders(sampleEmail);
      } else {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }
  }, []);

  const loadOrders = async (email) => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      // First attempt to get orders from Firebase
      console.log('Attempting to fetch orders from Firebase');
      let allOrders = [];
      
      try {
        allOrders = await getOrders();
        console.log('Successfully fetched orders from Firebase:', allOrders.length);
        
        if (isMountedRef.current) {
          setFirebaseUnavailable(false);
        }
        
        // Cache the orders in localStorage for offline access
        localStorage.setItem('orders', JSON.stringify(allOrders));
      } catch (firebaseError) {
        console.error('Error fetching orders from Firebase:', firebaseError);
        
        if (isMountedRef.current) {
          setFirebaseUnavailable(true);
        }
        
        // Fallback to localStorage if Firebase fails
        console.log('Falling back to localStorage for orders');
        allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      }
      
      // Filter orders by email
      const userOrders = allOrders.filter(
        order => {
          // Handle different customer object structures
          const orderEmail = order.customer?.email || (order.customer?.firstName ? `${order.customer.firstName}.${order.customer.lastName}@example.com` : null);
          
          // Ensure email is a string before comparing
          return orderEmail && typeof orderEmail === 'string' && 
                 email && typeof email === 'string' && 
                 orderEmail.toLowerCase() === email.toLowerCase();
        }
      );
      
      console.log(`Found ${userOrders.length} orders for email: ${email}`);
      
      // Sort by date (newest first)
      userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      if (isMountedRef.current) {
        setOrders(userOrders);
        setUserEmail(email);
        localStorage.setItem('userEmail', email);
        setError('');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      
      if (isMountedRef.current) {
        setError('Failed to load orders. Please try again.');
        setOrders([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
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
    // Ensure status is a string before calling toLowerCase
    if (!status || typeof status !== 'string') {
      return 'status-pending'; // Default status class if status is not valid
    }

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
      
      {firebaseUnavailable && (
        <div className="firebase-warning">
          <p><span role="img" aria-label="Warning">⚠️</span> Could not connect to the database. Showing locally stored orders.</p>
        </div>
      )}
      
      {userEmail ? (
        <div className="orders-header">
          <div className="user-info">
            <p>Showing orders for: <span className="email-display">{userEmail}</span></p>
            <div>
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
          </div>
        </div>
      ) : (
        <div className="email-entry">
          <p>Enter your email to view your orders:</p>
          <form onSubmit={handleSubmit}>
            <div className="email-form">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <button type="submit">View Orders</button>
            </div>
          </form>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading your orders...</p>
        </div>
      ) : userEmail && orders.length === 0 ? (
        <div className="no-orders">
          <p>You don't have any orders yet.</p>
          <p>Orders placed on our website will appear here.</p>
          <button 
            onClick={() => navigate('/shop')}
            className="shop-now-btn"
          >
            Shop Now
          </button>
        </div>
      ) : userEmail ? (
        <div className="orders-list">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <React.Fragment key={order.id}>
                  <tr 
                    className={`order-row ${activeOrder === order.id ? 'active' : ''}`}
                    onClick={() => toggleOrderDetails(order.id)}
                  >
                    <td data-label="Order ID">#{order.id}</td>
                    <td data-label="Date">{formatDate(order.date)}</td>
                    <td data-label="Total">${parseFloat(order.total).toFixed(2)}</td>
                    <td data-label="Status">
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
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
                      <td colSpan="5">
                        <div className="order-details">
                          <div className="order-info">
                            <h3>Order Details</h3>
                            <p><strong>Order ID:</strong> #{order.id}</p>
                            <p><strong>Date:</strong> {formatDate(order.date)}</p>
                            <p><strong>Status:</strong> {order.status || 'Pending'}</p>
                            {order.notes && (
                              <div className="order-notes">
                                <p><strong>Notes:</strong> {order.notes}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="item-list">
                            <h3>Items</h3>
                            <table className="items-table">
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  <th>Price</th>
                                  <th>Quantity</th>
                                  <th>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items && Array.isArray(order.items) ? order.items.map(item => (
                                  <tr key={item.id || `item-${Math.random()}`}>
                                    <td data-label="Item">{item.name}</td>
                                    <td data-label="Price">${parseFloat(item.price || 0).toFixed(2)}</td>
                                    <td data-label="Quantity">{item.quantity || 1}</td>
                                    <td data-label="Subtotal">${parseFloat((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan="4">No items available</td>
                                  </tr>
                                )}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan="3" className="total-label">Sub-total:</td>
                                  <td className="total-amount">${parseFloat(order.subtotal || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td colSpan="3" className="total-label">GST (5%):</td>
                                  <td className="total-amount">${parseFloat(order.gst || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td colSpan="3" className="total-label">PST (7%):</td>
                                  <td className="total-amount">${parseFloat(order.pst || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td colSpan="3" className="total-label"><strong>Total:</strong></td>
                                  <td className="total-amount"><strong>${parseFloat(order.total || 0).toFixed(2)}</strong></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          
                          <div className="customer-info">
                            <h3>Customer Information</h3>
                            {order.customer ? (
                              <>
                                <p><strong>Name:</strong> {order.customer.name || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Not provided'}</p>
                                <p><strong>Email:</strong> {order.customer.email || 'Not provided'}</p>
                                <p><strong>Phone:</strong> {order.customer.phone || 'Not provided'}</p>
                                <p><strong>Address:</strong> {[
                                  order.customer.address,
                                  order.customer.city,
                                  order.customer.postalCode
                                ].filter(Boolean).join(', ') || 'Not provided'}</p>
                              </>
                            ) : (
                              <p>No customer information available</p>
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
      ) : null}
    </div>
  );
};

export default Orders; 