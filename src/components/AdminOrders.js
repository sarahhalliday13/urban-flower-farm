import React, { useState, useEffect } from 'react';
import { getOrders } from '../services/firebase';

// Ultra simplified AdminOrders component with minimal functionality
// No external dependencies, pure inline styles
const AdminOrdersSimple = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simple fetch function with error handling
  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      // Get orders from Firebase
      const orderData = await getOrders();
      
      // Sort by date (newest first)
      const sortedOrders = Array.isArray(orderData) 
        ? [...orderData].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        : [];
      
      setOrders(sortedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load orders on mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  // Simple wrapper style
  const wrapperStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    boxSizing: 'border-box'
  };

  // Header row style
  const headerRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  };

  // Title style
  const titleStyle = {
    fontSize: '24px',
    margin: 0
  };

  // Refresh button style
  const buttonStyle = {
    padding: '8px 16px',
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500'
  };

  // Loading/empty state container style
  const messageContainerStyle = {
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px'
  };

  // Table container style
  const tableContainerStyle = {
    overflowX: 'auto'
  };

  // Table style
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderRadius: '4px'
  };

  // Table header cell style
  const thStyle = {
    textAlign: 'left',
    padding: '12px 15px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f8f9fa'
  };

  // Table row style
  const trStyle = {
    borderBottom: '1px solid #eee'
  };

  // Table cell style
  const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee'
  };

  // Status badge base style
  const badgeBaseStyle = {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  // Status badge style variants
  const getBadgeStyle = (status) => {
    const statusLower = (status || 'pending').toLowerCase();
    
    // Status badge styles (similar to original)
    const pendingStyle = { backgroundColor: '#FFF3CD', color: '#856404' };
    const processingStyle = { backgroundColor: '#D1ECF1', color: '#0C5460' };
    const shippedStyle = { backgroundColor: '#D4EDDA', color: '#155724' };
    const completedStyle = { backgroundColor: '#D4EDDA', color: '#155724' };
    const cancelledStyle = { backgroundColor: '#F8D7DA', color: '#721C24' };
    const defaultStyle = { backgroundColor: '#E2E3E5', color: '#383D41' };
    
    switch(statusLower) {
      case 'pending': return pendingStyle;
      case 'processing': return processingStyle;
      case 'shipped': return shippedStyle;
      case 'completed': return completedStyle;
      case 'cancelled': return cancelledStyle;
      default: return defaultStyle;
    }
  };

  // Email style
  const emailStyle = {
    fontSize: '0.85em',
    color: '#666'
  };

  // Render the component
  return (
    <div style={wrapperStyle}>
      <div style={headerRowStyle}>
        <h1 style={titleStyle}>Order Management</h1>
        <button 
          onClick={fetchOrders}
          style={buttonStyle}
        >
          Refresh Orders
        </button>
      </div>

      {loading ? (
        <div style={messageContainerStyle}>
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div style={messageContainerStyle}>
          No orders found
        </div>
      ) : (
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Order ID</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id || Math.random()} style={trStyle}>
                  <td style={tdStyle}>{order.id || 'Unknown'}</td>
                  <td style={tdStyle}>{formatDate(order.date)}</td>
                  <td style={tdStyle}>
                    <div>
                      {order.customer?.name || 
                       `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`}
                    </div>
                    {order.customer?.email && (
                      <div style={emailStyle}>
                        {order.customer.email}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{...badgeBaseStyle, ...getBadgeStyle(order.status)}}>
                      {order.status || 'Pending'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    ${parseFloat(order.total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersSimple;
