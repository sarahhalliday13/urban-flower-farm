import React, { useState, useEffect } from 'react';
import { getOrders, updateOrderStatus as updateFirebaseOrderStatus, updateInventory } from '../services/firebase';
import { sendOrderConfirmationEmails } from '../services/emailService';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminOrders.css';
import { useToast } from '../context/ToastContext';
import { useOrders } from './orders/OrderContext';

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { sendInvoiceEmail, orderEmailStatus } = useOrders();
  const { addToast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const firebaseOrders = await getOrders();
      const processedOrders = firebaseOrders.map(order => ({
        ...order,
        customer: {
          ...order.customer,
          name: order.customer?.name || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()
        }
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setOrders(processedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredOrders = orders.filter(order => {
    if (!order || !order.customer) return false;
    const search = searchTerm.toLowerCase();
    return (
      (filter === 'all' || order.status?.toLowerCase() === filter) &&
      (order.customer.name?.toLowerCase().includes(search) ||
      order.customer.email?.toLowerCase().includes(search) ||
      order.id?.toLowerCase().includes(search))
    );
  });

  return (
    <div className="admin-orders-container">
      <div className="admin-header">
        <h1>Order Management</h1>
        <div className="header-controls">
          <input 
            type="text" 
            placeholder="Search by name, email, or order ID" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="status-select"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
