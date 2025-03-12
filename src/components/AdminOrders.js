import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateInventoryAfterOrder } from '../services/sheets';
import Invoice from './Invoice';
import '../styles/AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryUpdateStatus, setInventoryUpdateStatus] = useState({});
  const [showInvoice, setShowInvoice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      
      // Sort by date (newest first)
      allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = (orderId, newStatus) => {
    try {
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  const updateInventoryForOrder = async (orderId) => {
    // Set status to updating
    setInventoryUpdateStatus(prev => ({
      ...prev,
      [orderId]: 'updating'
    }));
    
    try {
      // Find the order
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      
      console.log(`AdminOrders - Updating inventory for order ${orderId} with items:`, order.items);
      
      // Check localStorage before updating
      try {
        const storedInventory = localStorage.getItem('plantInventory');
        console.log("AdminOrders - Current localStorage inventory before update:", 
          storedInventory ? JSON.parse(storedInventory) : "None");
      } catch (e) {
        console.error("AdminOrders - Error reading localStorage before update:", e);
      }
      
      // Call the updateInventoryAfterOrder function
      const result = await updateInventoryAfterOrder(order.items);
      console.log(`AdminOrders - Update inventory result:`, result);
      
      if (result.success) {
        // Check localStorage after updating
        try {
          const storedInventory = localStorage.getItem('plantInventory');
          console.log("AdminOrders - Current localStorage inventory after update:", 
            storedInventory ? JSON.parse(storedInventory) : "None");
        } catch (e) {
          console.error("AdminOrders - Error reading localStorage after update:", e);
        }
        
        // Set status to success
        setInventoryUpdateStatus(prev => ({
          ...prev,
          [orderId]: 'success'
        }));
        
        // Clear success status after 3 seconds
        setTimeout(() => {
          setInventoryUpdateStatus(prev => ({
            ...prev,
            [orderId]: null
          }));
        }, 3000);
        
        // Update the order's inventory status
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              inventoryUpdated: true
            };
          }
          return o;
        }));
        
        // Save updated orders to localStorage
        try {
          localStorage.setItem('orders', JSON.stringify(orders));
          console.log("AdminOrders - Updated orders saved to localStorage");
        } catch (e) {
          console.error("AdminOrders - Error saving orders to localStorage:", e);
        }
        
        // Show success message
        alert('Inventory has been updated successfully!');
        
        // Refresh the orders list
        console.log("AdminOrders - Refreshing orders list after inventory update");
        loadOrders();
      } else {
        throw new Error('Some inventory updates failed');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      
      // Set status to error
      setInventoryUpdateStatus(prev => ({
        ...prev,
        [orderId]: 'error'
      }));
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setInventoryUpdateStatus(prev => ({
          ...prev,
          [orderId]: null
        }));
      }, 3000);
      
      throw error;
    }
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

  const viewInvoice = (orderId) => {
    setShowInvoice(orderId);
  };

  const closeInvoice = () => {
    setShowInvoice(null);
  };

  const sendInvoiceEmail = (order) => {
    // In a real app, this would send an API request to send the email
    // For now, we'll just show an alert
    alert(`Invoice email sent to ${order.customer.email}`);
  };

  const filteredOrders = orders.filter(order => {
    // Filter by status
    if (filter !== 'all' && order.status.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }
    
    // Filter by search term (customer name, email, or order ID)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const customerName = `${order.customer.name || 'No name provided'}`.toLowerCase();
      const email = order.customer.email.toLowerCase();
      const orderId = order.id.toLowerCase();
      
      return customerName.includes(searchLower) || 
             email.includes(searchLower) || 
             orderId.includes(searchLower);
    }
    
    return true;
  });

  return (
    <div className="admin-orders-container">
      <h1>Order Management</h1>
      
      <div className="admin-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or order ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <label>Filter by status:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
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
      
      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="no-orders">
          <p>No orders found matching your criteria.</p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map(order => (
            <div key={order.id} className="order-card">
              <div 
                className="order-header" 
                onClick={() => toggleOrderDetails(order.id)}
              >
                <div className="order-summary">
                  <h3>Order #{order.id}</h3>
                  <p className="order-date">{formatDate(order.date)}</p>
                  <p className="customer-name">
                    {order.customer.name || 'No name provided'} ({order.customer.email})
                  </p>
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
                  
                  <div className="order-actions">
                    <h4>Order Actions</h4>
                    <div className="action-buttons">
                      <div className="status-section">
                        <h5>Update Order Status</h5>
                        <div className="status-buttons">
                          <button 
                            className={`status-btn pending ${order.status.toLowerCase() === 'pending' ? 'active' : ''}`}
                            onClick={() => updateOrderStatus(order.id, 'Pending')}
                          >
                            Pending
                          </button>
                          <button 
                            className={`status-btn processing ${order.status.toLowerCase() === 'processing' ? 'active' : ''}`}
                            onClick={() => updateOrderStatus(order.id, 'Processing')}
                          >
                            Processing
                          </button>
                          <button 
                            className={`status-btn shipped ${order.status.toLowerCase() === 'shipped' ? 'active' : ''}`}
                            onClick={() => updateOrderStatus(order.id, 'Shipped')}
                          >
                            Shipped
                          </button>
                          <button 
                            className={`status-btn completed ${order.status.toLowerCase() === 'completed' ? 'active' : ''}`}
                            onClick={() => updateOrderStatus(order.id, 'Completed')}
                          >
                            Completed
                          </button>
                          <button 
                            className={`status-btn cancelled ${order.status.toLowerCase() === 'cancelled' ? 'active' : ''}`}
                            onClick={() => updateOrderStatus(order.id, 'Cancelled')}
                          >
                            Cancelled
                          </button>
                        </div>
                      </div>
                      
                      <div className="inventory-section">
                        <h5>Inventory Management</h5>
                        <button 
                          className={`inventory-update-btn ${inventoryUpdateStatus[order.id] || ''}`}
                          onClick={() => updateInventoryForOrder(order.id)}
                          disabled={inventoryUpdateStatus[order.id] === 'updating'}
                        >
                          {inventoryUpdateStatus[order.id] === 'updating' ? 'Updating...' : 
                           inventoryUpdateStatus[order.id] === 'success' ? 'Updated!' : 
                           inventoryUpdateStatus[order.id] === 'error' ? 'Failed - Try Again' : 
                           'Update Inventory'}
                        </button>
                        <p className="inventory-note">
                          This will reduce stock levels for all items in this order.
                        </p>
                      </div>

                      <div className="invoice-section">
                        <h5>Invoice Options</h5>
                        <div className="invoice-buttons">
                          <button 
                            className="view-invoice-btn"
                            onClick={() => viewInvoice(order.id)}
                          >
                            View & Print Invoice
                          </button>
                          <button 
                            className="email-invoice-btn"
                            onClick={() => sendInvoiceEmail(order)}
                            disabled={!order.customer.email || order.customer.email === 'Not provided'}
                          >
                            Email Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showInvoice && (
        <div className="invoice-modal">
          <div className="invoice-modal-content">
            <button className="close-invoice" onClick={closeInvoice}>×</button>
            <Invoice order={orders.find(order => order.id === showInvoice)} type="print" />
          </div>
        </div>
      )}
      
      <div className="admin-actions">
        <button 
          onClick={() => navigate('/inventory')} 
          className="back-to-inventory"
        >
          Back to Inventory
        </button>
      </div>
    </div>
  );
};

export default AdminOrders; 