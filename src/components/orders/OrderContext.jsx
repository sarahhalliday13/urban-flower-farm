import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getOrders, updateOrderStatus as updateFirebaseOrderStatus, updateInventory, updateOrder } from '../../services/firebase';
import { sendOrderConfirmationEmails } from '../../services/emailService';
import { useToast } from '../../context/ToastContext';

// Create context
const OrderContext = createContext();

// Custom hook to use the order context
export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

// Provider component
export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvoice, setShowInvoice] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [emailSending, setEmailSending] = useState({});
  const { addToast } = useToast();

  // Helper to safely convert status to lowercase
  const statusToLowerCase = useCallback((status) => {
    return status && typeof status === 'string' ? status.toLowerCase() : '';
  }, []);
  
  // Helper to safely check if status is cancelled
  const isStatusCancelled = useCallback((status) => {
    return statusToLowerCase(status) === 'cancelled';
  }, [statusToLowerCase]);

  // Load orders from Firebase with localStorage fallback
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading orders from Firebase...');
      const firebaseOrders = await getOrders();
      
      console.log(`Found ${firebaseOrders.length} orders in Firebase`);

      // Process orders to ensure consistent format
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
  }, []);

  // Refresh orders manually (with UI feedback)
  const refreshOrders = useCallback(() => {
    console.log('Manually refreshing orders...');
    setLoading(true);
    
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
        checkPendingEmails(processedOrders);
      })
      .catch(error => {
        console.error('Error refreshing orders:', error);
        addToast('Failed to refresh orders', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [addToast]);

  // Update order status in Firebase and local state
  const updateOrderStatus = useCallback(async (orderId, newStatus, emailSent = false) => {
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
      if (isStatusCancelled(newStatus)) {
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
      
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  }, [orders, isStatusCancelled]);

  // Send order confirmation email
  const sendOrderEmail = useCallback(async (order) => {
    if (emailSending[order.id]) return { success: false, message: 'Email already sending' }; 
    
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
        
        return { success: true };
      } else {
        addToast("Failed to send email: " + (result.message || "Unknown error"), "error");
        return { success: false, message: result.message || "Failed to send email" };
      }
    } catch (error) {
      console.error(`Error sending email for order ${order.id}:`, error);
      addToast("Error sending email: " + error.message, "error");
      return { success: false, message: error.message };
    } finally {
      // Clear sending state
      setEmailSending(prev => ({ ...prev, [order.id]: false }));
    }
  }, [orders, emailSending, addToast]);

  /**
   * Update the discount for an order
   * @param {string} orderId - The ID of the order to update
   * @param {Object} discountData - The discount data (amount, reason, type)
   */
  const updateOrderDiscount = useCallback(async (orderId, discountData) => {
    try {
      // Validate discount data
      if (typeof discountData.amount !== 'number' || discountData.amount < 0) {
        console.error('Invalid discount amount:', discountData.amount);
        addToast("Invalid discount amount", "error");
        return false;
      }

      // Update in Firebase first
      const success = await updateOrder(orderId, { 
        discount: discountData
      });
      
      if (!success) {
        addToast("Failed to update discount in Firebase", "error");
        return false;
      }
      
      // Then update local state
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { 
            ...order, 
            discount: discountData
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
            discount: discountData
          };
        }
        return order;
      });
      localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));
      
      addToast("Discount updated successfully", "success");
      return true;
    } catch (error) {
      console.error('Error updating order discount:', error);
      addToast("Error updating discount: " + error.message, "error");
      return false;
    }
  }, [orders, addToast]);

  // Check for pending emails that need to be sent
  const checkPendingEmails = useCallback((ordersList) => {
    const pendingOrders = ordersList.filter(order => 
      statusToLowerCase(order.status) === 'pending' && !order.emailSent
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
  }, [updateOrderStatus, statusToLowerCase]);

  // Handle order status update with confirmation for cancellation
  const handleStatusUpdate = useCallback((orderId, newStatus) => {
    if (isStatusCancelled(newStatus)) {
      // Show confirmation dialog for cancellation
      setShowCancelConfirm(orderId);
      setPendingStatusUpdate(newStatus);
      return false;
    } else {
      // For other status updates, proceed directly
      return updateOrderStatus(orderId, newStatus);
    }
  }, [updateOrderStatus, isStatusCancelled]);

  // Confirm cancel order
  const confirmCancelOrder = useCallback(async () => {
    if (showCancelConfirm && pendingStatusUpdate) {
      const success = await updateOrderStatus(showCancelConfirm, pendingStatusUpdate);
      setShowCancelConfirm(null);
      setPendingStatusUpdate(null);
      return success;
    }
    return false;
  }, [showCancelConfirm, pendingStatusUpdate, updateOrderStatus]);

  // Get filtered orders based on search term and status filter
  const getFilteredOrders = useCallback(() => {
    return orders.filter(order => {
      // Ensure the order has required fields to prevent errors
      if (!order || !order.customer) return false;
      
      // Add defaults for missing fields to prevent errors
      const safeOrder = {
        ...order,
        status: order.status || 'Pending',
        customer: {
          ...order.customer,
          name: order.customer.name || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'No name provided',
          email: order.customer.email || 'Not provided'
        },
        id: order.id || 'Unknown'
      };
      
      // Filter by status
      if (filter !== 'all' && statusToLowerCase(safeOrder.status) !== statusToLowerCase(filter)) {
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
  }, [orders, filter, searchTerm, statusToLowerCase]);

  // Format date for display
  const formatDate = useCallback((dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }, []);

  // Get CSS class for status
  const getStatusClass = useCallback((status) => {
    if (!status || typeof status !== 'string') {
      return 'status-pending'; // Default if status is undefined, null, or not a string
    }
    
    switch (statusToLowerCase(status)) {
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
  }, [statusToLowerCase]);

  // Load orders on mount
  useEffect(() => {
    loadOrders();

    // Add real-time refresh when orders are created
    const handleOrderCreated = () => {
      console.log('Order created event detected, refreshing orders...');
      loadOrders();
    };
    
    window.addEventListener('orderCreated', handleOrderCreated);
    
    return () => {
      window.removeEventListener('orderCreated', handleOrderCreated);
    };
  }, [loadOrders]);

  // Return context value
  const contextValue = {
    orders,
    loading,
    activeOrder,
    setActiveOrder,
    filter,
    setFilter,
    filteredOrders: getFilteredOrders(),
    refreshOrders,
    searchTerm,
    setSearchTerm,
    handleStatusUpdate,
    confirmCancelOrder,
    showInvoice,
    setShowInvoice,
    showCancelConfirm,
    setShowCancelConfirm,
    pendingStatusUpdate,
    setPendingStatusUpdate,
    sendOrderEmail,
    emailSending,
    formatDate,
    getStatusClass,
    updateOrderDiscount,
    statusToLowerCase,
  };

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

export default OrderContext;
