import React, { useState, useEffect } from 'react';
import { getOrders } from '../services/firebase';
import '../styles/AdminOrders.css';

// Ultra simple AdminOrders component with minimal functionality
const AdminOrdersSimple = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrders() {
    setLoading(true);
    try {
      const orderData = await getOrders();
      const sortedOrders = [...(orderData || [])].sort((a, b) => 
        new Date(b.date || 0) - new Date(a.date || 0)
      );
      setOrders(sortedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  return (
    <div style={{
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1 style={{ 
          fontSize: '24px',
          margin: 0
        }}>
          Order Management
        </h1>
        <button 
          onClick={handleRefresh}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0f9ff',
            color: '#0369a1',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Refresh Orders
        </button>
      </div>

      {loading ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          No orders found
        </div>
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
                    <div>
                      {order.customer?.name || 
                       `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`}
                    </div>
                    {order.customer?.email && (
                      <div style={{ fontSize: '0.85em', color: '#666' }}>
                        {order.customer.email}
                      </div>
                    )}
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

// Helper function to get status color - matching the production colors
const getStatusColor = (status) => {
  const statusLower = status.toLowerCase();
  
  switch(statusLower) {
    case 'pending':
      return { backgroundColor: '#fcd34d', color: '#92400e' };
    case 'processing':
      return { backgroundColor: '#93c5fd', color: '#1e40af' };
    case 'shipped':
      return { backgroundColor: '#a7f3d0', color: '#065f46' };
    case 'completed':
      return { backgroundColor: '#bbf7d0', color: '#166534' };
    case 'cancelled':
      return { backgroundColor: '#fca5a5', color: '#991b1b' };
    default:
      return { backgroundColor: '#e2e3e5', color: '#383d41' };
  }
};

export default AdminOrdersSimple;
