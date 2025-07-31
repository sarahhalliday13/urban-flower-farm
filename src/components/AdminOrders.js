import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminOrders.css';
import { useToast } from '../context/ToastContext';
import { useOrders } from './orders/OrderContext';

const AdminOrders = () => {
  const navigate = useNavigate();
  const { 
    filteredOrders,
    loading, 
    filter, 
    setFilter,
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    sendInvoiceEmail, 
    orderEmailStatus 
  } = useOrders();
  const { addToast } = useToast();

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  const viewInvoice = (orderId) => navigate(`/invoice/${orderId}`);

  const handleEmailInvoice = async (order) => {
    if (!order?.customer?.email) {
      addToast('Customer email is required to send invoice', 'error');
      return;
    }
    await sendInvoiceEmail(order);
    if (orderEmailStatus.success) addToast('Invoice email sent successfully', 'success');
    if (orderEmailStatus.error) addToast(`Failed to send invoice email: ${orderEmailStatus.error}`, 'error');
  };

  return (
    <div className="admin-orders-container">
      <div className="admin-header">
        <h1>Order Management</h1>
        <div className="header-controls">
          <div className="search-section">
            <input 
              type="text" 
              placeholder="Search by name, email, order ID, or notes" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-section">
            <div className="date-filters">
              <input
                type="date"
                value={dateRange.start || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="date-input"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.end || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="date-input"
              />
            </div>

            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="status-select"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.date ? formatDate(order.date) : 'Unknown'}</td>
                <td>{order.customer?.name || 'No name'}</td>
                <td>{order.status}</td>
                <td>${order.total?.toFixed(2) || '0.00'}</td>
                <td>
                  <div className="invoice-buttons">
                    <button 
                      className="view-invoice-button"
                      onClick={() => viewInvoice(order.id)}
                    >
                      View & Print Invoice
                    </button>
                    <button 
                      className="email-invoice-btn"
                      onClick={() => handleEmailInvoice(order)}
                      disabled={!order.customer?.email || orderEmailStatus.loading}
                    >
                      {orderEmailStatus.loading ? 'Sending...' : 'Email Invoice'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminOrders;
