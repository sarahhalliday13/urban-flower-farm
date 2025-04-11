import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from './OrderContext';
import OrderItemsTable from './OrderItemsTable';
import Invoice from '../Invoice';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import PlantSelector from './PlantSelector';
import { useToast } from '../../context/ToastContext';
import { updateOrder } from '../../services/firebase';
// Direct imports from firebase/database as fallback
import { getDatabase, ref, update } from 'firebase/database';

/**
 * OrderEditor - Component for editing an existing order
 * Enhanced with improved layout, searchable dropdown, and better UX
 */
const OrderEditor = ({ orderId, closeModal }) => {
  console.log("OrderEditor mounted with orderId:", orderId);
  
  const { 
    db,
    orders, 
    setOrders, 
    createEmptyOrder, 
    saveOrder, 
    deleteOrder,
    updateItemQuantity,
    removeItemFromOrder,
    addItemToOrder,
    finalizeOrder 
  } = useOrders();
  
  const { addToast } = useToast();
  const { orderStatusRef } = useOrders();
  
  console.log("Orders from context:", orders);
  console.log("finalizeOrder function:", typeof finalizeOrder);
  
  // Get current order
  const currentOrder = orders.find(order => order.id === orderId);
  const [items, setItems] = useState(currentOrder?.items || []);
  const [orderData, setOrderData] = useState(currentOrder || {});
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Create a local version of updateOrder as fallback
  const localUpdateOrder = async (orderId, orderData) => {
    console.log("Using local fallback updateOrder function");
    try {
      const database = getDatabase();
      const orderRef = ref(database, `orders/${orderId}`);
      await update(orderRef, orderData);
      console.log(`Order ${orderId} updated successfully via local fallback`);
      return true;
    } catch (error) {
      console.error('Error updating order via local fallback:', error);
      return false;
    }
  };
  
  // Refs for autosave
  const itemsRef = useRef(items);
  itemsRef.current = items;
  
  useEffect(() => {
    // Load order details from Firebase
    const loadOrderDetails = async () => {
      setIsLoading(true);
      try {
        // Use the orders from context or fetch if needed
        const orderDetails = orders.find(order => order.id === orderId);
        
        if (orderDetails) {
          // Initialize order details from context
          setOrderData({
            id: orderId,
            customerEmail: orderDetails.customerEmail || '',
            customerName: orderDetails.customerName || '',
            customerPhone: orderDetails.customerPhone || '',
            orderDate: orderDetails.orderDate ? new Date(orderDetails.orderDate) : new Date(),
            orderStatus: orderDetails.orderStatus || 'pending',
            shippingAddress: orderDetails.shippingAddress || '',
            notes: orderDetails.notes || '',
            paymentMethod: orderDetails.paymentMethod || 'card',
            total: orderDetails.total || '0.00'
          });
          
          // Initialize items with freebie status
          if (orderDetails.items && Array.isArray(orderDetails.items)) {
            setItems(orderDetails.items.map(item => ({
              ...item,
              isFreebie: item.isFreebie || false
            })));
          }
        } else {
          // If order isn't in context, show error
          console.error("Order not found in context");
          toast.error("Order not found");
        }
      } catch (error) {
        console.error("Error loading order:", error);
        toast.error("Failed to load order details");
      }
      setIsLoading(false);
    };
    
    loadOrderDetails();
  }, [orderId, orders]);
  
  // Auto-save changes every 30 seconds if there are changes
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (itemsRef.current.length > 0) {
        const draftKey = `orderDraft_${orderId}`;
        const timestamp = new Date().toISOString();
        
        try {
          localStorage.setItem(draftKey, JSON.stringify({
            items: itemsRef.current,
            timestamp
          }));
          setLastAutoSave(timestamp);
        } catch (e) {
          console.error('Error saving draft order:', e);
        }
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [orderId]);
  
  // Update item quantity
  const handleUpdateQuantity = (itemId, newQuantity) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };
  
  // Remove item from order
  const handleRemoveItem = (itemId) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };
  
  // Add new item to the order
  const handleAddItem = (item) => {
      const newItem = {
      ...item,
      quantity: 1,
      id: uuidv4(),
      isFreebie: false
    };
      setItems(prevItems => [...prevItems, newItem]);
  };
  
  // Toggle item freebie status
  const handleToggleFreebie = (itemId, isFreebie) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, isFreebie } 
          : item
      )
    );
  };
  
  // Save order changes to Firebase
  const handleSaveOrder = async () => {
    setSaveInProgress(true);
    
    try {
      // Calculate the correct total excluding freebies
      const calculatedTotal = items.reduce((sum, item) => {
        if (item.isFreebie) return sum;
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        return sum + (price * quantity);
      }, 0).toFixed(2);
      
      console.log("Saving order with total:", calculatedTotal);
      
      // Verify orderId is valid
      if (!orderId) {
        console.error("Order ID is invalid:", orderId);
        throw new Error("Invalid Order ID");
      }
      
      // Prepare the update object
      const updateData = {
        ...orderData,
        items,
        total: calculatedTotal,
        updatedAt: new Date().toISOString()
      };
      
      // Log the update
      console.log(`Updating order: ${orderId}`);
      
      // Check updateOrder type
      console.log("updateOrder type:", typeof updateOrder); // Should be: function
      
      try {
        // Try to use the imported updateOrder first, fall back to local implementation if it fails
        let success = false;
        
        try {
          // First attempt with the imported updateOrder
          if (typeof updateOrder === 'function') {
            success = await updateOrder(orderId, updateData);
            console.log("Used imported updateOrder function with result:", success);
          } else {
            console.warn("Imported updateOrder is not a function, using fallback");
            throw new Error("updateOrder is not a function");
          }
        } catch (importError) {
          console.warn("Imported updateOrder failed:", importError);
          // Use local fallback as a last resort
          success = await localUpdateOrder(orderId, updateData);
          console.log("Used local fallback updateOrder with result:", success);
        }
        
        if (success) {
          console.log("Order saved successfully");
          addToast?.("Order updated successfully", "success");
          
          // If status changed to completed, show confirmation modal
          if (orderData.orderStatus === 'completed' && orderStatusRef.current !== 'completed') {
            setShowConfirmModal(true);
          } else {
            closeModal();
          }
        } else {
          throw new Error("Firebase returned false success status");
        }
      } catch (firebaseError) {
        console.error("Firebase error:", firebaseError);
        throw firebaseError;
      }
    } catch (error) {
      console.error("Error updating order:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
    
      let errorMessage = "Failed to save order changes";
    
      if (error?.code === 'permission-denied') {
        errorMessage = "Permission denied: You don't have access to update this order";
      } else if (error?.code === 'not-found') {
        errorMessage = "Order not found in database";
      } else if (error?.message?.toLowerCase().includes('network')) {
        errorMessage = "Network error: Check your internet connection";
      }
    
      addToast?.(errorMessage, "error");
    }    
    setSaveInProgress(false);
    return false; // Add fallback return for clarity
  };
  
  // Calculate if any items have missing price data
  const hasMissingPrices = items.some(item => 
    !item.price || isNaN(parseFloat(item.price)) || parseFloat(item.price) === 0
  );
  
  // Format price for display, handling missing prices
  const formatPrice = (price) => {
    if (!price || isNaN(parseFloat(price))) {
      return '0.00';
    }
    return parseFloat(price).toFixed(2);
  };
  
  // Helper function to safely format values for display
  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };
  
  // If the order is not found, show an error
  if (!currentOrder) {
    return (
      <div className="order-editor">
        <div className="editor-header">
          <h2>Order Not Found</h2>
          <button className="close-editor-btn" onClick={closeModal}>×</button>
        </div>
        <p>The selected order could not be found.</p>
      </div>
    );
  }
  
  // If still loading, show a loading message
  if (isLoading) {
    return (
      <div className="order-editor">
        <div className="editor-header">
          <h2>Loading Order Editor...</h2>
          <button className="close-editor-btn" onClick={closeModal}>×</button>
        </div>
        <p>Loading order details...</p>
      </div>
    );
  }
  
  // If showing finalized invoice preview, render it
  if (showConfirmModal) {
    return (
      <div className="order-editor">
        <div className="editor-header">
          <h2>Order #{formatValue(orderId)} Finalized</h2>
          <button className="close-editor-btn" onClick={closeModal}>×</button>
        </div>
        <div className="finalized-message">
          <p>This order has been finalized. Here is the final invoice:</p>
          <div className="invoice-preview-container">
            <Invoice 
              order={{
                ...currentOrder,
                items,
                isFinalized: true,
                total: items.reduce((sum, item) => {
                  if (item.isFreebie) return sum;
                  const price = parseFloat(item.price) || 0;
                  const quantity = parseInt(item.quantity, 10) || 0;
                  return sum + (price * quantity);
                }, 0)
              }} 
              type="print" 
              invoiceType="final" 
            />
          </div>
          <button className="close-preview-btn" onClick={closeModal}>
            Close and Return to Orders
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="order-editor">
      <div className="editor-header">
        <div className="editor-header-content">
          <h2>Edit Order #{formatValue(orderId)}</h2>
          <div className="order-metadata">
            <span className="order-status-pill">{formatValue(orderData.orderStatus)}</span>
            <span className="order-date">{new Date(orderData.orderDate || new Date()).toLocaleDateString()}</span>
            <span className="customer-name">{formatValue(orderData.customerName)}</span>
          </div>
        </div>
        <button className="close-editor-btn" onClick={closeModal}>×</button>
      </div>
      
      <div className="editor-content">
        <div className="editor-grid">
          {/* Left Column - Order Items */}
          <div className="editor-column">
            <div className="editor-card">
              <h3>Current Items</h3>
              <OrderItemsTable 
                items={items} 
                total={orderData.total}
                editable={true}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onToggleFreebie={handleToggleFreebie}
              />
              
              {hasMissingPrices && (
                <div className="price-warning">
                  <i className="warning-icon">⚠️</i>
                  <span>Some items are missing price information. They'll be calculated as $0.00.</span>
                </div>
              )}
              
              {lastAutoSave && (
                <div className="autosave-indicator">
                  <span>Auto-saved: {new Date(lastAutoSave).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Add Items + Actions */}
          <div className="editor-column">
            <div className="editor-card">
              <h3>Add Items</h3>
              
              <div className="add-item-section">
                <PlantSelector onAddItem={handleAddItem} />
              </div>
            </div>
            
            <div className="editor-card">
              <h3>Review & Save</h3>
              <p className="order-summary">
                Total Items: {items.length}
                <br />
                Order Total: ${items.reduce((sum, item) => {
                  if (item.isFreebie) return sum;
                  const price = parseFloat(item.price) || 0;
                  const quantity = parseInt(item.quantity, 10) || 0;
                  return sum + (price * quantity);
                }, 0).toFixed(2)}
              </p>

              <div className="editor-actions">
                <button 
                  className="save-changes-btn"
                  onClick={handleSaveOrder}
                  disabled={items.length === 0 || saveInProgress}
                >
                  {saveInProgress ? 'Saving...' : 'Save Changes (Keep Editable)'}
                </button>
                
                <button 
                  className="finalize-order-btn"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={items.length === 0 || saveInProgress}
                >
                  {saveInProgress ? 'Finalizing...' : 'Finalize Order'}
                </button>
                
                <button 
                  className="cancel-edit-btn"
                  onClick={closeModal}
                  disabled={saveInProgress}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Finalize Confirmation Modal */}
      {showConfirmModal && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Confirm Order Finalization</h3>
            <p>Are you sure you want to finalize this order?</p>
            <p>Once finalized, the order cannot be edited further. All details will be locked.</p>
            
            <div className="confirmation-summary">
              <p><strong>Order ID:</strong> {formatValue(orderId)}</p>
              <p><strong>Customer:</strong> {formatValue(orderData.customerName)}</p>
              <p><strong>Items:</strong> {items.length}</p>
              <p><strong>Total:</strong> ${items.reduce((sum, item) => {
                if (item.isFreebie) return sum;
                const price = parseFloat(item.price) || 0;
                const quantity = parseInt(item.quantity, 10) || 0;
                return sum + (price * quantity);
              }, 0).toFixed(2)}</p>
            </div>
            
            <div className="confirmation-buttons">
              <button 
                className="confirm-finalize-btn"
                onClick={handleSaveOrder}
                disabled={saveInProgress}
              >
                {saveInProgress ? 'Finalizing...' : 'Yes, Finalize Order'}
              </button>
              <button 
                className="cancel-finalize-btn"
                onClick={() => setShowConfirmModal(false)}
                disabled={saveInProgress}
              >
                No, Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderEditor; 