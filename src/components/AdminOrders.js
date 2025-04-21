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
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [emailSending, setEmailSending] = useState({});
  const { addToast } = useToast();
  const { sendInvoiceEmail, orderEmailStatus } = useOrders();

  useEffect(() => {
    loadOrders();

    // Add real-time refresh when orders are created
    window.addEventListener('orderCreated', handleOrderCreated);
    
    return () => {
      window.removeEventListener('orderCreated', handleOrderCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOrderCreated = () => {
    console.log('Order created event detected, refreshing orders...');
    loadOrders();
  };
  
  const handleRefresh = () => {
    console.log('Manually refreshing orders...');
    // Set loading to true to show loading indicator
    setLoading(true);
    
    // Force a fresh fetch from Firebase
    getOrders()
      .then(firebaseOrders => {
        console.log(`Refreshed ${firebaseOrders.length} orders from Firebase`);
        
        // Process orders for consistent format
        const processedOrders = firebaseOrders.map(order => {
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
        processedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update state and localStorage
        setOrders(processedOrders);
        localStorage.setItem('orders', JSON.stringify(processedOrders));
        addToast('Orders refreshed successfully', 'success');
        
        // Check for any pending orders that need emails
        const pendingOrders = processedOrders.filter(order => 
          order.status?.toLowerCase() === 'pending' && !order.emailSent
        );
        
        if (pendingOrders.length > 0) {
          console.log(`Found ${pendingOrders.length} pending orders without confirmation emails`);
          pendingOrders.forEach(async (order) => {
            try {
              const result = await sendOrderConfirmationEmails(order);
              
              if (result.success) {
                console.log(`Successfully sent confirmation email for order ${order.id}`);
                // Mark the order as having sent an email
                updateOrderStatus(order.id, order.status, true);
              } else {
                console.error(`Failed to send confirmation email for order ${order.id}:`, result.message);
              }
            } catch (error) {
              console.error(`Error sending confirmation email for order ${order.id}:`, error);
            }
          });
        }
      })
      .catch(error => {
        console.error('Error refreshing orders:', error);
        addToast('Failed to refresh orders', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      // First try to load from Firebase
      console.log('Loading orders from Firebase...');
      const firebaseOrders = await getOrders();
      
      console.log(`Found ${firebaseOrders.length} orders in Firebase`);

      // When Firebase load succeeds, use it as the source of truth
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
      
      // Sort by date (newest first)
      processedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setOrders(processedOrders);
      console.log(`Successfully loaded ${processedOrders.length} total orders from Firebase`);
      
      // Update localStorage with the Firebase data for offline access
      localStorage.setItem('orders', JSON.stringify(processedOrders));
    } catch (error) {
      console.error('Error loading orders from Firebase:', error);
      
      // Fallback to localStorage if Firebase fails
      try {
        console.log('Firebase failed, falling back to localStorage');
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
        console.log(`Loaded ${processedLocalOrders.length} orders from localStorage`);
      } catch (localError) {
        console.error('Error loading orders from localStorage:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, emailSent = false) => {
    try {
      // Get the order details before updating
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        return;
      }

      // Update the order object to include the emailSent flag
      const updatedOrderData = { 
        status: newStatus,
        ...(emailSent ? { emailSent: true } : {})
      };

      // Update in Firebase first
      await updateFirebaseOrderStatus(orderId, updatedOrderData);
      
      // If the order is being cancelled, restore the inventory
      if (newStatus.toLowerCase() === 'cancelled') {
        try {
          // Restore inventory for each item in the order
          for (const item of order.items) {
            await updateInventory(item.id, {
              currentStock: (item.inventory?.currentStock || 0) + item.quantity,
              lastUpdated: new Date().toISOString()
            });
          }
        } catch (inventoryError) {
          console.error('Error restoring inventory:', inventoryError);
          // Continue with order status update even if inventory restoration fails
        }
      }
      
      // Then update local state and localStorage
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { 
            ...order, 
            status: newStatus,
            ...(emailSent ? { emailSent: true } : {})
          };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      
      // Also update localStorage for fallback
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const updatedLocalOrders = localOrders.map(order => {
        if (order.id === orderId) {
          return { 
            ...order, 
            status: newStatus,
            ...(emailSent ? { emailSent: true } : {})
          };
        }
        return order;
      });
      localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));
    } catch (error) {
      console.error('Error updating order status:', error);
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
    navigate(`/invoice/${orderId}`);
  };

  const sendOrderEmail = async (order) => {
    if (emailSending[order.id]) return; // Prevent double-sending
    
    // Set sending state for this order
    setEmailSending(prev => ({ ...prev, [order.id]: true }));
    
    try {
      const result = await sendOrderConfirmationEmails(order);
      
      if (result.success) {
        addToast("Email sent successfully!", "success");
        
        // Mark this order as having sent an email in localStorage
        const manualEmails = JSON.parse(localStorage.getItem('manualEmails') || '[]');
        const updatedEmails = manualEmails.map(email => {
          if (email.orderId === order.id) {
            return { ...email, status: 'sent', sentDate: new Date().toISOString() };
          }
          return email;
        });
        localStorage.setItem('manualEmails', JSON.stringify(updatedEmails));
        
        // Update orders in state to reflect email was sent
        const updatedOrders = orders.map(o => {
          if (o.id === order.id) {
            return { ...o, emailSent: true };
          }
          return o;
        });
        setOrders(updatedOrders);
        
      } else {
        addToast("Failed to send email: " + (result.message || "Unknown error"), "error");
      }
    } catch (error) {
      console.error(`Error sending email for order ${order.id}:`, error);
      addToast("Error sending email: " + error.message, "error");
    } finally {
      // Clear sending state
      setEmailSending(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    if (newStatus.toLowerCase() === 'cancelled') {
      // Show confirmation dialog for cancellation
      setShowCancelConfirm(orderId);
      setPendingStatusUpdate(newStatus);
    } else {
      // For other status updates, proceed directly
      await updateOrderStatus(orderId, newStatus);
    }
  };

  const confirmCancelOrder = async () => {
    if (showCancelConfirm && pendingStatusUpdate) {
      await updateOrderStatus(showCancelConfirm, pendingStatusUpdate);
      setShowCancelConfirm(null);
      setPendingStatusUpdate(null);
    }
  };

  const handleEmailInvoice = async (order) => {
    if (!order || !order.customer || !order.customer.email) {
      addToast('Customer email is required to send an invoice', 'error');
      return;
    }
    
    // Use the new callable function from OrderContext
    await sendInvoiceEmail(order);
    
    // Show toast based on the result from OrderContext
    if (orderEmailStatus.success) {
      addToast('Invoice email sent successfully', 'success');
    } else if (orderEmailStatus.error) {
      addToast(`Failed to send invoice email: ${orderEmailStatus.error}`, 'error');
    }
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
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search by name, email, or order ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="search-clear-btn" 
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div className="status-filter">
            <span>Status:</span>
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
          <button 
            className="refresh-button" 
            onClick={handleRefresh} 
            title="Refresh Orders"
          >
            <span role="img" aria-label="Refresh">🔄</span> Refresh
          </button>
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
                                    <td data-label="Total">${(parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan="3" data-label="Order Total">Order Total</td>
                                  <td data-label="Total">
                                    ${(() => {
                                      const storedTotal = parseFloat(order.total);
                                      // If stored total is valid and not exactly 150, use it
                                      if (!isNaN(storedTotal) && storedTotal !== 150) {
                                        return storedTotal.toFixed(2);
                                      }
                                      // Otherwise calculate from items
                                      const calculatedTotal = order.items.reduce((sum, item) => {
                                        const price = parseFloat(item.price) || 0;
                                        const quantity = parseInt(item.quantity, 10) || 0;
                                        return sum + (price * quantity);
                                      }, 0);
                                      return calculatedTotal.toFixed(2);
                                    })()}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          
                          <div className="order-info-grid">
                            <div className="customer-info">
                              <h4>Customer Information</h4>
                              <p><strong>Name:</strong> {order.customer.name || 'Not provided'}</p>
                              <p><strong>Email:</strong> <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></p>
                              {order.customer.phone && order.customer.phone !== 'Not provided' && (
                                <p><strong>Phone:</strong> <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></p>
                              )}
                            </div>
                            
                            <div className="status-management">
                              <h4>Status Management</h4>
                              <div className="status-buttons">
                                <button 
                                  className={`status-btn pending ${order.status.toLowerCase() === 'pending' ? 'active' : ''}`}
                                  onClick={() => handleStatusUpdate(order.id, 'Pending')}
                                >
                                  Pending
                                </button>
                                <button 
                                  className={`status-btn processing ${order.status.toLowerCase() === 'processing' ? 'active' : ''}`}
                                  onClick={() => handleStatusUpdate(order.id, 'Processing')}
                                >
                                  Processing
                                </button>
                                <button 
                                  className={`status-btn shipped ${order.status.toLowerCase() === 'shipped' ? 'active' : ''}`}
                                  onClick={() => handleStatusUpdate(order.id, 'Shipped')}
                                >
                                  Shipped
                                </button>
                                <button 
                                  className={`status-btn completed ${order.status.toLowerCase() === 'completed' ? 'active' : ''}`}
                                  onClick={() => handleStatusUpdate(order.id, 'Completed')}
                                >
                                  Completed
                                </button>
                                <button 
                                  className={`status-btn cancelled ${order.status.toLowerCase() === 'cancelled' ? 'active' : ''}`}
                                  onClick={() => handleStatusUpdate(order.id, 'Cancelled')}
                                >
                                  Cancelled
                                </button>
                              </div>
                            </div>
                            
                            <div className="email-management">
                              <h4>Email Management</h4>
                              <p>
                                <strong>Email Status:</strong>{" "}
                                {(() => {
                                  // Check manualEmails in localStorage
                                  const manualEmails = JSON.parse(localStorage.getItem('manualEmails') || '[]');
                                  const orderEmail = manualEmails.find(email => email.orderId === order.id);
                                  
                                  if (orderEmail) {
                                    if (orderEmail.status === 'sent') {
                                      return <span className="email-status sent">Sent manually</span>;
                                    } else {
                                      return <span className="email-status pending">Pending - needs to be sent</span>;
                                    }
                                  }
                                  
                                  // If no manual email record
                                  return <span className="email-status unknown">Unknown</span>;
                                })()}
                              </p>
                              <button 
                                className="email-send-btn"
                                onClick={() => sendOrderEmail(order)}
                                disabled={emailSending[order.id]}
                              >
                                {emailSending[order.id] ? 'Sending...' : 'Send/Resend Confirmation Email'}
                              </button>
                            </div>
                            
                            {order.notes && (
                              <div className="order-notes">
                                <h4>Order Notes</h4>
                                <p>{order.notes}</p>
                              </div>
                            )}
                            
                            <div className="invoice-section">
                              <h4>Invoice Options</h4>
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
                                  disabled={!order.customer.email || order.customer.email === 'Not provided' || orderEmailStatus.loading}
                                >
                                  {orderEmailStatus.loading ? 'Sending...' : 'Email Invoice'}
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
      
      {showCancelConfirm && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Confirm Order Cancellation</h3>
            <p>Are you sure you want to cancel this order? This will:</p>
            <ul>
              <li>Mark the order as cancelled</li>
              <li>Restore inventory for all items</li>
            </ul>
            <div className="confirmation-buttons">
              <button 
                className="confirm-btn"
                onClick={confirmCancelOrder}
              >
                Yes, Cancel Order
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowCancelConfirm(null);
                  setPendingStatusUpdate(null);
                }}
              >
                No, Keep Order
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingStatusUpdate && (
        <div className="status-update-notification">
          Updating order status...
        </div>
      )}
    </div>
  );
};

export default AdminOrders;