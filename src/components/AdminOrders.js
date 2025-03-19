import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateInventory, getOrders, updateOrderStatus as updateFirebaseOrderStatus } from '../services/firebase';
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

  const loadOrders = async () => {
    setLoading(true);
    try {
      // First try to load from Firebase
      const firebaseOrders = await getOrders();
      
      if (firebaseOrders && firebaseOrders.length > 0) {
        // Process orders to ensure they have consistent format
        const processedOrders = firebaseOrders.map(order => {
          // Create a name field for backwards compatibility with the existing code
          if (order.customer && (order.customer.firstName || order.customer.lastName)) {
            return {
              ...order,
              customer: {
                ...order.customer,
                // Add a name field that combines firstName and lastName
                name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
              }
            };
          }
          return order;
        });
        
        setOrders(processedOrders);
      } else {
        // Fallback to localStorage if no orders in Firebase
        console.log('No orders found in Firebase, falling back to localStorage');
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        
        // Process local orders as well for consistency
        const processedLocalOrders = localOrders.map(order => {
          if (order.customer && (order.customer.firstName || order.customer.lastName)) {
            return {
              ...order,
              customer: {
                ...order.customer,
                name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
              }
            };
          }
          return order;
        });
        
        // Sort by date (newest first)
        processedLocalOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setOrders(processedLocalOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      
      // Fallback to localStorage if Firebase fails
      try {
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        // Process local orders for consistency
        const processedLocalOrders = localOrders.map(order => {
          if (order.customer && (order.customer.firstName || order.customer.lastName)) {
            return {
              ...order,
              customer: {
                ...order.customer,
                name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
              }
            };
          }
          return order;
        });
        
        processedLocalOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        setOrders(processedLocalOrders);
      } catch (localError) {
        console.error('Error loading orders from localStorage:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Update in Firebase first
      await updateFirebaseOrderStatus(orderId, newStatus);
      
      // Then update local state and localStorage
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      
      // Also update localStorage for fallback
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const updatedLocalOrders = localOrders.map(order => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      });
      localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));
    } catch (error) {
      console.error('Error updating order status:', error);
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
      
      // Update inventory for each item in the order
      const updateResults = [];
      for (const item of order.items) {
        const plantId = item.id;
        // Get current inventory to calculate new stock level
        const inventoryData = JSON.parse(localStorage.getItem('plantInventory') || '{}');
        const currentInventory = inventoryData[plantId] || { currentStock: 0 };
        const newStock = Math.max(0, currentInventory.currentStock - item.quantity);
        
        // Update the inventory
        const result = await updateInventory(plantId, {
          currentStock: newStock,
          status: newStock > 0 ? 'In Stock' : 'Out of Stock',
          notes: `Updated after order ${orderId}`
        });
        
        updateResults.push(result);
      }
      
      // If all updates were successful
      const allSuccessful = updateResults.every(result => result && result.success);
      
      if (allSuccessful) {
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
    // Ensure the order has required fields to prevent errors
    if (!order || !order.customer) return false;
    
    // Add defaults for missing fields to prevent errors
    const safeOrder = {
      ...order,
      status: order.status || 'Processing',
      customer: {
        ...order.customer,
        name: order.customer.name || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'No name provided',
        email: order.customer.email || 'Not provided'
      },
      id: order.id || 'Unknown'
    };
    
    // Filter by status
    if (filter !== 'all' && safeOrder.status.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }
    
    // Filter by search term (customer name, email, or order ID)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const customerName = safeOrder.customer.name.toLowerCase();
      const email = safeOrder.customer.email.toLowerCase();
      const orderId = safeOrder.id.toLowerCase();
      
      return customerName.includes(searchLower) || 
             email.includes(searchLower) || 
             orderId.includes(searchLower);
    }
    
    return true;
  });

  return (
    <div className="admin-orders-container">
      <div className="admin-header">
        <h1>Order Management</h1>
        <div className="header-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, email, or order ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="status-filter">
            <span>Status:</span>
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
      </div>
      
      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="no-orders">No orders found</div>
      ) : (
        <div className="orders-list">
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
                <React.Fragment key={order.id}>
                  <tr onClick={() => toggleOrderDetails(order.id)}>
                    <td data-label="Order">
                      <span className="order-id">#{order.id || 'Unknown'}</span>
                    </td>
                    <td data-label="Date">
                      <span className="order-date">{order.date ? formatDate(order.date) : 'Unknown'}</span>
                    </td>
                    <td data-label="Customer">
                      <span className="customer-name">
                        {order.customer?.name || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'No name provided'}
                      </span>
                      <span className="customer-email">{order.customer?.email || 'No email'}</span>
                    </td>
                    <td data-label="Status">
                      <span className={`order-status ${getStatusClass(order.status || 'Pending')}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td data-label="Total">
                      <span className="order-total">${typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2)}</span>
                    </td>
                    <td data-label="Actions">
                      <button 
                        className="view-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOrderDetails(order.id);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                  {activeOrder === order.id && (
                    <tr className="details-row">
                      <td colSpan="6" style={{ padding: 0, border: 'none' }}>
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
                            
                            {order.notes && (
                              <div className="order-notes">
                                <h4>Order Notes</h4>
                                <p>{order.notes}</p>
                              </div>
                            )}
                            
                            <div className="status-management">
                              <h4>Status Management</h4>
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
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
          onClick={() => navigate('/admin')} 
          className="back-to-admin"
        >
          Back to Admin Dashboard
        </button>
        <button 
          onClick={() => navigate('/inventory')} 
          className="back-to-inventory"
        >
          Go to Inventory
        </button>
      </div>
    </div>
  );
};

export default AdminOrders;