import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from './OrderContext';
import OrderItemsTable from './OrderItemsTable';
import Invoice from '../Invoice';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import PlantSelector from './PlantSelector';
import { useToast } from '../../context/ToastContext';

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
  
  // Refs for autosave
  const itemsRef = useRef(items);
  itemsRef.current = items;
  
  useEffect(() => {
    // Load order details from Firebase
    const loadOrderDetails = async () => {
      setIsLoading(true);
      try {
        // Ensure db is available, if not, get it from firebase.js
        if (!db) {
          console.warn("DB not available from context, attempting to import directly");
          try {
            const firebaseModule = await import('../../services/firebase');
            const firebaseDb = firebaseModule.db;
            
            if (!firebaseDb) {
              throw new Error("Failed to initialize Firestore instance");
            }
            
            console.log("Successfully imported db from firebase.js");
            
            // Use the imported db to get the order document
            const orderDoc = await getDoc(doc(firebaseDb, 'orders', orderId));
            
            if (orderDoc.exists()) {
              const orderData = orderDoc.data();
              
              // Initialize order details
              setOrderData({
                id: orderId,
                customerEmail: orderData.customerEmail || '',
                customerName: orderData.customerName || '',
                customerPhone: orderData.customerPhone || '',
                orderDate: orderData.orderDate ? new Date(orderData.orderDate) : new Date(),
                orderStatus: orderData.orderStatus || 'pending',
                shippingAddress: orderData.shippingAddress || '',
                notes: orderData.notes || '',
                paymentMethod: orderData.paymentMethod || 'card',
                total: orderData.total || '0.00'
              });
              
              // Initialize items with freebie status
              if (orderData.items && Array.isArray(orderData.items)) {
                setItems(orderData.items.map(item => ({
                  ...item,
                  isFreebie: item.isFreebie || false
                })));
              }
            }
          } catch (importError) {
            console.error("Failed to import firebase db:", importError);
            toast.error("Failed to connect to database");
          }
        } else {
          // Use the db from context
          const orderDoc = await getDoc(doc(db, 'orders', orderId));
          
          if (orderDoc.exists()) {
            const orderData = orderDoc.data();
            
            // Initialize order details
            setOrderData({
              id: orderId,
              customerEmail: orderData.customerEmail || '',
              customerName: orderData.customerName || '',
              customerPhone: orderData.customerPhone || '',
              orderDate: orderData.orderDate ? new Date(orderData.orderDate) : new Date(),
              orderStatus: orderData.orderStatus || 'pending',
              shippingAddress: orderData.shippingAddress || '',
              notes: orderData.notes || '',
              paymentMethod: orderData.paymentMethod || 'card',
              total: orderData.total || '0.00'
            });
            
            // Initialize items with freebie status
            if (orderData.items && Array.isArray(orderData.items)) {
              setItems(orderData.items.map(item => ({
                ...item,
                isFreebie: item.isFreebie || false
              })));
            }
          }
        }
      } catch (error) {
        console.error("Error loading order:", error);
        toast.error("Failed to load order details");
      }
      setIsLoading(false);
    };
    
    loadOrderDetails();
  }, [orderId, db]);
  
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
    let firebaseDb = db; // Use db from context by default
    
    try {
      // Calculate the correct total excluding freebies
      const calculatedTotal = items.reduce((sum, item) => {
        if (item.isFreebie) return sum;
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        return sum + (price * quantity);
      }, 0).toFixed(2);
      
      console.log("Saving order with total:", calculatedTotal);
      
      // Check if db is available, if not try to import it
      if (!firebaseDb) {
        console.warn("DB not available from context in handleSaveOrder, attempting to import directly");
        try {
          const firebaseModule = await import('../../services/firebase');
          firebaseDb = firebaseModule.db;
          
          if (!firebaseDb) {
            throw new Error("Failed to initialize Firestore instance");
          }
          
          console.log("Successfully imported db from firebase.js for order saving");
        } catch (importError) {
          console.error("Failed to import firebase db:", importError);
          throw new Error("Database connection could not be established");
        }
      }
      
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
      
      // Log the exact path and data being sent
      console.log(`Updating document in 'orders/${orderId}'`);
      
      try {
        // Update the order document using the available db instance
        await updateDoc(doc(firebaseDb, 'orders', orderId), updateData);
        
        console.log("Order saved successfully");
        toast.success("Order updated successfully");
        addToast("Order updated successfully", "success");
        
        // If status changed to completed, show confirmation modal
        if (orderData.orderStatus === 'completed' && orderStatusRef.current !== 'completed') {
          setShowConfirmModal(true);
        } else {
          closeModal();
        }
      } catch (firebaseError) {
        console.error("Firebase error:", firebaseError);
        throw new Error(`Firebase error: ${firebaseError.message}`);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // More specific error message based on the error type
      let errorMessage = "Failed to save order changes";
      
      if (error.code === 'permission-denied') {
        errorMessage = "Permission denied: You don't have access to update this order";
      } else if (error.code === 'not-found') {
        errorMessage = "Order not found in database";
      } else if (error.message && error.message.includes('network')) {
        errorMessage = "Network error: Check your internet connection";
      }
      
      toast.error(errorMessage);
      addToast(errorMessage, "error");
    }
    setSaveInProgress(false);
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