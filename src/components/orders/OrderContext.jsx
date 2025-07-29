import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getOrders, updateOrderStatus as updateFirebaseOrderStatus, updateInventory, updateOrder, getOrder } from '../../services/firebase';
import { sendOrderConfirmationEmails } from '../../services/emailService';
import { sendInvoiceEmail as invoiceEmailService } from '../../services/invoiceService';
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
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showInvoice, setShowInvoice] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [emailSending, setEmailSending] = useState({});
  const { addToast } = useToast();
  const [orderEmailStatus, setOrderEmailStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  // Helper to safely convert status to lowercase
  const statusToLowerCase = useCallback((status) => {
    if (!status) return 'pending';
    if (typeof status === 'object' && status.label) {
      return status.label.toLowerCase();
    }
    if (typeof status === 'string') {
      // Normalize common status variations
      const normalized = status.toLowerCase().trim();
      switch (normalized) {
        case 'pending':
        case 'processing':
        case 'shipped':
        case 'completed':
        case 'cancelled':
          return normalized;
        default:
          return 'pending';
      }
    }
    return 'pending';
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
        // Normalize customer data
        const processedOrder = {
          ...order,
          customer: {
            ...order.customer,
            name: order.customer?.name || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
            email: order.customer?.email || '',
            phone: order.customer?.phone || order.customerPhone || '' // Normalize phone field
          }
        };

        // Clean up legacy phone field if it exists
        if ('customerPhone' in processedOrder) {
          delete processedOrder.customerPhone;
        }

        return processedOrder;
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
  const refreshOrders = useCallback((silent = false) => {
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
        
        // Only show toast if not in silent mode
        if (!silent) {
          addToast('Orders refreshed successfully', 'success');
        }
        
        // Check for any pending orders that need emails
        checkPendingEmails(processedOrders);
      })
      .catch(error => {
        console.error('Error refreshing orders:', error);
        // Only show toast if not in silent mode
        if (!silent) {
          addToast('Failed to refresh orders', 'error');
        }
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
        return false;
      }

      // Update in Firebase first
      const success = await updateFirebaseOrderStatus(orderId, newStatus);
      if (!success) {
        console.error('Failed to update order status in Firebase');
        return false;
      }
      
      // Then update local state and localStorage
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { 
            ...order, 
            status: newStatus,
            lastUpdated: new Date().toISOString(),
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
            lastUpdated: new Date().toISOString(),
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
  }, [orders]);

  // Send order confirmation email
  const sendOrderEmail = useCallback(async (order) => {
    if (emailSending[order.id]) return { success: false, message: 'Email already sending' }; 
    
    // Check if email has already been sent
    if (order.emailSent) {
      console.log(`Order ${order.id} already has emailSent flag, but admin manually requested resend`);
      // We still allow admins to manually resend if needed, but we log it
    }
    
    console.log(`Admin triggered email for order ${order.id} at ${new Date().toISOString()}`);
    
    // Set sending state for this order
    setEmailSending(prev => ({ ...prev, [order.id]: true }));
    
    try {
      // Explicitly set forceResend when order.emailSent is true
      const result = await sendOrderConfirmationEmails({
        ...order,
        forceResend: order.emailSent === true
      });
      
      if (result.success) {
        // Always show success toast for admin-triggered emails, even if previously sent
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
        
        try {
          // Fetch the updated order data from Firebase to get the correct timestamp
          console.log(`Fetching fresh order data for ${order.id} after email sent`);
          const updatedOrderData = await getOrder(order.id);
          
          if (updatedOrderData) {
            // Update orders in state with the fresh data from Firebase
            const updatedOrders = orders.map(o => {
              if (o.id === order.id) {
                return { 
                  ...o, 
                  ...updatedOrderData,
                  emailSent: true,
                  // Use the timestamp from Firebase if available, or fallback to current time
                  emailSentTimestamp: updatedOrderData.emailSentTimestamp || Date.now()
                };
              }
              return o;
            });
            setOrders(updatedOrders);
            console.log(`Updated order data with fresh data from Firebase including timestamp: ${updatedOrderData.emailSentTimestamp}`);
          } else {
            // Fallback to local update if Firebase fetch fails
            const updatedOrders = orders.map(o => {
              if (o.id === order.id) {
                return { 
                  ...o, 
                  emailSent: true,
                  emailSentTimestamp: Date.now() // Fallback timestamp
                };
              }
              return o;
            });
            setOrders(updatedOrders);
            console.log(`Fallback: Updated order with local timestamp`);
          }
        } catch (fetchError) {
          console.error(`Error fetching updated order data: ${fetchError}`);
          // Still update local state as fallback
          const updatedOrders = orders.map(o => {
            if (o.id === order.id) {
              return { 
                ...o, 
                emailSent: true,
                emailSentTimestamp: Date.now() // Fallback timestamp
              };
            }
            return o;
          });
          setOrders(updatedOrders);
          console.log(`Error fallback: Updated order with local timestamp`);
        }
        
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

  // Update the existing sendInvoiceEmail function to use the renamed import
  const sendInvoiceEmail = async (order, isStandalone = false) => {
    console.log("📧 ORDER CONTEXT - Starting invoice email process for order:", order?.id, "isStandalone:", isStandalone);
    
    if (!order) {
      console.error('📧 ORDER CONTEXT ERROR - No order provided to sendInvoiceEmail');
      setOrderEmailStatus({
        loading: false,
        success: false,
        error: 'No order data provided'
      });
      return;
    }

    // Log the customer email to help debug
    console.log("📧 ORDER CONTEXT - Customer email:", order.customer?.email || "MISSING EMAIL");
    
    // Validate order has required properties
    if (!order.customer || !order.customer.email) {
      console.error('📧 ORDER CONTEXT ERROR - Order missing customer email:', order);
      setOrderEmailStatus({
        loading: false,
        success: false,
        error: 'Customer email is required'
      });
      return;
    }

    // Skip the invoiceEmailSent check when standalone is true
    if (!isStandalone && order.invoiceEmailSent === true) {
      console.log("📧 ORDER CONTEXT - Invoice already sent for order:", order.id);
      setOrderEmailStatus({
        loading: false,
        success: true,
        error: null
      });
      return { success: true, message: 'Invoice email already sent' };
    }

    setOrderEmailStatus({
      loading: true,
      success: false,
      error: null
    });

    try {
      // Use the new invoiceService with Firebase callable
      console.log("📧 ORDER CONTEXT - Calling invoiceService.sendInvoiceEmail");
      
      // Add isStandalone flag to order data
      const orderWithFlag = {
        ...order,
        isStandalone: isStandalone
      };
      
      const result = await invoiceEmailService(orderWithFlag);
      
      console.log("📧 ORDER CONTEXT - Invoice email result:", result);
      
      if (result.success) {
        console.log('📧 ORDER CONTEXT SUCCESS - Invoice email sent via callable function');
        
        try {
          // Fetch the updated order data from Firebase to get the correct timestamp
          console.log(`📧 Fetching fresh order data for ${order.id} after invoice email sent`);
          const updatedOrderData = await getOrder(order.id);
          
          if (updatedOrderData) {
            // Update local state to reflect the email was sent with fresh data
            const updatedOrders = orders.map(o => {
              if (o.id === order.id) {
                return { 
                  ...o, 
                  ...updatedOrderData,
                  invoiceEmailSent: true,
                  // Use the timestamp from Firebase if available, or fallback to current time
                  invoiceEmailSentTimestamp: updatedOrderData.invoiceEmailSentTimestamp || Date.now()
                };
              }
              return o;
            });
            setOrders(updatedOrders);
            console.log(`📧 Updated order with fresh data including timestamp: ${updatedOrderData.invoiceEmailSentTimestamp}`);
          } else {
            // Fallback to local update if Firebase fetch fails
            const updatedOrders = orders.map(o => {
              if (o.id === order.id) {
                return { 
                  ...o, 
                  invoiceEmailSent: true,
                  invoiceEmailSentTimestamp: Date.now() // Fallback timestamp
                };
              }
              return o;
            });
            setOrders(updatedOrders);
            console.log(`📧 Fallback: Updated order with local timestamp for invoice`);
          }
        } catch (fetchError) {
          console.error(`📧 Error fetching updated order data after invoice: ${fetchError}`);
          // Still update local state as fallback
          const updatedOrders = orders.map(o => {
            if (o.id === order.id) {
              return { 
                ...o, 
                invoiceEmailSent: true,
                invoiceEmailSentTimestamp: Date.now() // Fallback timestamp
              };
            }
            return o;
          });
          setOrders(updatedOrders);
          console.log(`📧 Error fallback: Updated order with local timestamp for invoice`);
        }
        
        setOrderEmailStatus({
          loading: false,
          success: true,
          error: null
        });
      } else {
        console.error('📧 ORDER CONTEXT ERROR - Service returned failure:', result.message);
        throw new Error(result.message || 'Failed to send invoice email');
      }
    } catch (error) {
      console.error('📧 ORDER CONTEXT ERROR - Error sending invoice email:', error?.message || error);
      console.error('📧 ORDER CONTEXT ERROR - Full error object:', error);
      setOrderEmailStatus({
        loading: false,
        success: false,
        error: error?.message || 'Failed to send invoice email'
      });
    }
  };

  /**
   * Update the discount for an order
   * @param {string} orderId - The ID of the order to update
   * @param {Object} discountData - The discount data (amount, reason, type)
   */
  const updateOrderDiscount = useCallback(async (orderId, discountData) => {
    try {
      // Get the current order
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        return false;
      }

      // Calculate the subtotal from items
      const subtotal = order.items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        return sum + (price * quantity);
      }, 0);
      
      // Calculate the new total by subtracting discount from subtotal
      const discountAmount = parseFloat(discountData.amount) || 0;
      const newTotal = Math.max(0, subtotal - discountAmount); // Ensure total doesn't go negative

      // Update order with new discount and total
      const updatedOrderData = {
        ...order,
        discount: discountData,
        subtotal: subtotal,
        total: newTotal, // This is now correctly calculated from subtotal - discount
        lastUpdated: new Date().toISOString()
      };

      // Update in Firebase
      const success = await updateOrder(orderId, updatedOrderData);
      if (!success) {
        console.error('Failed to update order discount in Firebase');
        return false;
      }

      // Update local state
      const updatedOrders = orders.map(o => {
        if (o.id === orderId) {
          return updatedOrderData;
        }
        return o;
      });
      setOrders(updatedOrders);

      // Update localStorage
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const updatedLocalOrders = localOrders.map(o => {
        if (o.id === orderId) {
          return updatedOrderData;
        }
        return o;
      });
      localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));

      return true;
    } catch (error) {
      console.error('Error updating order discount:', error);
      return false;
    }
  }, [orders]);
  
  /**
   * Update the payment method for an order
   * @param {string} orderId - The ID of the order to update
   * @param {Object} paymentData - The payment data (method, timing, updatedAt)
   */
  const updateOrderPayment = useCallback(async (orderId, paymentData) => {
    if (!orderId) {
      console.error('Invalid order ID');
      addToast('Error updating payment: Invalid order ID', 'error');
      return false;
    }
    
    // Validate payment data
    if (!paymentData || !paymentData.method) {
      console.error('Invalid payment data');
      addToast('Please select a payment method', 'error');
      return false;
    }
    
    try {
      // Update in Firebase 
      await updateOrder(orderId, { payment: paymentData });
      
      // Update in local state
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { ...order, payment: paymentData };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      
      // Update in localStorage
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const updatedLocalOrders = localOrders.map(order => {
        if (order.id === orderId) {
          return { ...order, payment: paymentData };
        }
        return order;
      });
      localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));
      
      addToast('Payment information updated successfully', 'success');
      return true;
    } catch (error) {
      console.error('Error updating payment information:', error);
      addToast('Error updating payment information', 'error');
      return false;
    }
  }, [orders, addToast]);

  /**
   * Update order items and maintain version history
   * @param {string} orderId - The ID of the order to update
   * @param {Array} newItems - The new array of order items
   * @param {boolean} finalize - Whether to mark this update as a final version
   * @returns {Promise<boolean>} - Whether the update was successful
   */
  const updateOrderItems = useCallback(async (orderId, newItems, finalize = false) => {
    console.log("updateOrderItems called with:", { orderId, itemsCount: newItems.length, finalize });
    
    if (!orderId) {
      console.error('Invalid order ID');
      addToast('Error updating order: Invalid order ID', 'error');
      return false;
    }
    
    // Validate items data
    if (!Array.isArray(newItems) || newItems.length === 0) {
      console.error('Invalid items data');
      addToast('Order must contain at least one item', 'error');
      return false;
    }
    
    try {
      // Find the existing order
      const existingOrder = orders.find(order => order.id === orderId);
      if (!existingOrder) {
        console.error('Order not found:', orderId);
        addToast('Error: Order not found', 'error');
        return false;
      }
      
      console.log("Existing order found:", existingOrder.id);
      
      // Calculate new order total
      const newTotal = newItems.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        return sum + (price * quantity);
      }, 0);
      
      // Create version history array if it doesn't exist
      const orderVersions = existingOrder.versions || [];
      
      // Add current version to history if this is the first edit
      if (orderVersions.length === 0) {
        orderVersions.push({
          items: [...existingOrder.items],
          total: existingOrder.total,
          versionNumber: 1,
          timestamp: existingOrder.date || new Date().toISOString(),
          isPreliminary: true,
          changeReason: 'Initial order'
        });
      }
      
      // Add new version
      orderVersions.push({
        items: [...newItems],
        total: newTotal,
        versionNumber: orderVersions.length + 1,
        timestamp: new Date().toISOString(),
        isPreliminary: !finalize,
        changeReason: finalize ? 'Final order' : 'Order updated at pickup'
      });
      
      // Prepare update data
      const updateData = {
        items: newItems,
        total: newTotal,
        versions: orderVersions,
        isFinalized: finalize,
        lastModified: new Date().toISOString()
      };
      
      console.log("Updating order with data:", updateData);
      
      // Update in Firebase 
      await updateOrder(orderId, updateData);
      
      // Update in local state
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { ...order, ...updateData };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      
      // Update in localStorage
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const updatedLocalOrders = localOrders.map(order => {
        if (order.id === orderId) {
          return { ...order, ...updateData };
        }
        return order;
      });
      localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));
      
      addToast(finalize ? 'Order finalized successfully' : 'Order items updated successfully', 'success');
      console.log("Order update completed successfully");
      return true;
    } catch (error) {
      console.error('Error updating order items:', error);
      addToast('Error updating order items', 'error');
      return false;
    }
  }, [orders, addToast]);
  
  /**
   * Finalize an order after editing
   * @param {string} orderId - The ID of the order to finalize
   * @returns {Promise<boolean>} - Whether the finalization was successful
   */
  const finalizeOrder = useCallback(async (orderId) => {
    console.log("finalizeOrder called with orderId:", orderId);
    
    if (!orderId) {
      console.error('Invalid order ID');
      addToast('Error finalizing order: Invalid order ID', 'error');
      return false;
    }
    
    try {
      // Find the existing order
      const existingOrder = orders.find(order => order.id === orderId);
      if (!existingOrder) {
        console.error('Order not found:', orderId);
        addToast('Error: Order not found', 'error');
        return false;
      }
      
      // If order is already finalized, do nothing
      if (existingOrder.isFinalized) {
        addToast('Order is already finalized', 'info');
        return true;
      }
      
      console.log("Finalizing order:", existingOrder.id);
      
      // Process items to ensure consistent freebie property
      const processedItems = existingOrder.items.map(item => ({
        ...item,
        // Ensure isFreebie is a boolean
        isFreebie: !!item.isFreebie,
        // Ensure quantity is a number
        quantity: parseInt(item.quantity, 10) || 1,
        // Ensure price is valid
        price: parseFloat(item.price) || 0
      }));
      
      // Calculate total properly, excluding freebies
      const calculatedTotal = processedItems.reduce((sum, item) => {
        if (item.isFreebie) return sum;
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        return sum + (price * quantity);
      }, 0).toFixed(2);
      
      // Update finalized status in Firebase
      await updateOrder(orderId, { 
        isFinalized: true,
        finalizedAt: new Date().toISOString(),
        items: processedItems,
        total: calculatedTotal
      });
      
      // Update in local state
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { 
            ...order, 
            isFinalized: true,
            finalizedAt: new Date().toISOString(),
            items: processedItems,
            total: calculatedTotal
          };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      
      // Update in localStorage
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const updatedLocalOrders = localOrders.map(order => {
        if (order.id === orderId) {
          return { 
            ...order, 
            isFinalized: true,
            finalizedAt: new Date().toISOString(),
            items: processedItems,
            total: calculatedTotal
          };
        }
        return order;
      });
      localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));
      
      addToast('Order finalized successfully', 'success');
      console.log("Order finalization completed successfully");
      return true;
    } catch (error) {
      console.error('Error finalizing order:', error);
      addToast('Error finalizing order', 'error');
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
    // Ensure newStatus is a string
    const statusString = typeof newStatus === 'object' && newStatus.label 
      ? newStatus.label 
      : String(newStatus);

    if (isStatusCancelled(statusString)) {
      // Show confirmation dialog for cancellation
      setShowCancelConfirm(orderId);
      setPendingStatusUpdate(statusString);
      return false;
    } else {
      // For other status updates, proceed directly
      return updateOrderStatus(orderId, statusString);
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
    // Define archived statuses
    const archivedStatuses = ['completed', 'cancelled'];

    // Calculate status counts first
    const statusCounts = orders.reduce((acc, order) => {
      const status = statusToLowerCase(order?.status || 'pending');
      acc[status] = (acc[status] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    }, {});

    const filteredOrders = orders.filter(order => {
      // Ensure the order has required fields to prevent errors
      if (!order || !order.customer) return false;
      
      // Add defaults for missing fields to prevent errors
      const safeOrder = {
        ...order,
        status: order.status || 'pending', // Ensure new orders default to pending
        customer: {
          ...order.customer,
          name: order.customer.name || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'No name provided',
          email: order.customer.email || 'Not provided',
          phone: order.customer.phone || order.customerPhone || '' // Support both phone field formats
        },
        id: order.id || 'Unknown',
        notes: order.notes || '' // Ensure notes field exists
      };
      
      // Filter by status (case insensitive)
      const orderStatus = statusToLowerCase(safeOrder.status);
      
      if (filter === 'all') {
        // When 'all' is selected, exclude archived orders
        return !archivedStatuses.includes(orderStatus);
      } else if (filter === 'archived') {
        // When 'archived' is selected, show only completed and cancelled orders
        return archivedStatuses.includes(orderStatus);
      } else if (filter !== orderStatus) {
        return false;
      }
      
      // Filter by date range if set
      if (dateRange.start || dateRange.end) {
        const orderDate = new Date(safeOrder.date);
        if (dateRange.start && new Date(dateRange.start) > orderDate) return false;
        if (dateRange.end && new Date(dateRange.end) < orderDate) return false;
      }
      
      // Enhanced search matching (case insensitive, partial matches)
      if (searchTerm) {
        const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
        const searchableFields = [
          safeOrder.customer.name.toLowerCase(),
          safeOrder.customer.email.toLowerCase(),
          safeOrder.id.toLowerCase(),
          (safeOrder.notes || '').toLowerCase(),
          (safeOrder.customer.phone || '').toLowerCase()
        ].filter(Boolean); // Remove empty strings
        
        // All search terms must match at least one field
        return searchTerms.every(term => 
          searchableFields.some(field => field.includes(term))
        );
      }
      
      return true;
    });

    return {
      orders: filteredOrders,
      statusCounts
    };
  }, [orders, filter, searchTerm, dateRange, statusToLowerCase]);

  // Format date for display
  const formatDate = useCallback((dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }, []);

  // Get CSS class for status
  const getStatusClass = useCallback((status) => {
    // Get the status string in a consistent format
    const normalizedStatus = (() => {
      if (!status) return 'pending';
      if (typeof status === 'string') return status.toLowerCase();
      if (typeof status === 'object' && status.label) return status.label.toLowerCase();
      return 'pending';
    })();

    switch (normalizedStatus) {
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
  }, []);

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
    filteredOrders: getFilteredOrders().orders,
    statusCounts: getFilteredOrders().statusCounts,
    refreshOrders,
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
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
    updateOrderPayment,
    updateOrderItems: updateOrderItems,
    finalizeOrder: finalizeOrder,
    statusToLowerCase,
    updateOrder,
    sendInvoiceEmail,
    orderEmailStatus,
    setOrderEmailStatus,
  };

  console.log("OrderContext providing:", {
    updateOrderItemsType: typeof updateOrderItems, 
    finalizeOrderType: typeof finalizeOrder,
    updateOrderType: typeof updateOrder,
    ordersCount: orders.length
  });

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

export default OrderContext;
