import React, { useState, useEffect } from 'react';
import { getOrders } from '../services/firebase';
import '../styles/AdminOrders.css';

// Ultra simple AdminOrders component with minimal functionality
const AdminOrdersSimple = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const orderData = await getOrders();
        setOrders(orderData || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div style={{
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ 
        marginBottom: '20px', 
        fontSize: '24px',
        textAlign: 'left' 
      }}>
        Order Management
      </h1>

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: '4px'
          }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Order ID</th>
                <th style={tableHeaderStyle}>Date</th>
                <th style={tableHeaderStyle}>Customer</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={tableRowStyle}>
                  <td style={tableCellStyle}>{order.id}</td>
                  <td style={tableCellStyle}>{formatDate(order.date)}</td>
                  <td style={tableCellStyle}>
                    {order.customer?.name || 
                     `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`}
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      ...statusStyle,
                      ...getStatusColor(order.status || 'Pending')
                    }}>
                      {order.status || 'Pending'}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
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

// Inline styles
const tableHeaderStyle = {
  textAlign: 'left',
  padding: '12px 15px',
  borderBottom: '1px solid #ddd',
  backgroundColor: '#f8f9fa'
};

const tableRowStyle = {
  borderBottom: '1px solid #eee'
};

const tableCellStyle = {
  padding: '12px 15px',
  borderBottom: '1px solid #eee'
};

const statusStyle = {
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: '500'
};

// Helper function to get status color
const getStatusColor = (status) => {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'pending') {
    return { backgroundColor: '#fff3cd', color: '#856404' };
  } else if (statusLower === 'processing') {
    return { backgroundColor: '#d1ecf1', color: '#0c5460' };
  } else if (statusLower === 'shipped') {
    return { backgroundColor: '#d4edda', color: '#155724' };
  } else if (statusLower === 'completed') {
    return { backgroundColor: '#d4edda', color: '#155724' };
  } else if (statusLower === 'cancelled') {
    return { backgroundColor: '#f8d7da', color: '#721c24' };
  }
  
  return { backgroundColor: '#e2e3e5', color: '#383d41' };
};

export default AdminOrdersSimple;
