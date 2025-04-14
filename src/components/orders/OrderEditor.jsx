import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from './OrderContext';
import OrderItemsTable from './OrderItemsTable';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import PlantSelector from './PlantSelector';
import { useToast } from '../../context/ToastContext';
import SaveCancelButtons from './SaveCancelButtons';

/**
 * OrderEditor - Component for editing an existing order
 * Ultra simplified version with direct REST API calls
 */
const OrderEditor = ({ orderId, closeModal }) => {
  console.log("OrderEditor mounted with orderId:", orderId);
  
  const { orders } = useOrders();
  const { addToast } = useToast();
  
  // Current order status reference for comparison
  const orderStatusRef = useRef(null);
  
  // Get current order
  const currentOrder = orders.find(order => order.id === orderId);
  const [items, setItems] = useState(currentOrder?.items || []);
  const [orderData, setOrderData] = useState(currentOrder || {});
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load order details
  useEffect(() => {
    const loadOrderDetails = async () => {
      setIsLoading(true);
      
      try {
        // Try to find the order in context
        const orderDetails = orders.find(order => order.id === orderId);
        
        if (orderDetails) {
          // Store the current order status
          orderStatusRef.current = orderDetails.orderStatus;
          
          // Set order data
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
          
          // Initialize items
          if (orderDetails.items && Array.isArray(orderDetails.items)) {
            // Simplify items, remove freebie functionality
            const processedItems = orderDetails.items.map(item => ({
              ...item,
              quantity: parseInt(item.quantity, 10) || 1,
              price: parseFloat(item.price) || 0
            }));
            
            setItems(processedItems);
          }
        } else {
          // Fallback to loading direct from Firebase
          const snapshot = await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/orders/${orderId}.json`);
          const orderData = await snapshot.json();
          
          if (orderData) {
            orderStatusRef.current = orderData.orderStatus;
            
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
            
            if (orderData.items && Array.isArray(orderData.items)) {
              // Simplify items, remove freebie functionality
              const processedItems = orderData.items.map(item => ({
                ...item,
                quantity: parseInt(item.quantity, 10) || 1,
                price: parseFloat(item.price) || 0
              }));
              
              setItems(processedItems);
            }
          } else {
            console.error("Order not found in Firebase");
            toast.error("Order not found");
          }
        }
      } catch (error) {
        console.error("Error loading order:", error);
        toast.error("Failed to load order details");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOrderDetails();
  }, [orderId, orders]);
  
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
      id: uuidv4()
    };
    setItems(prevItems => [...prevItems, newItem]);
  };
  
  // Calculate the current total
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      return total + (price * quantity);
    }, 0).toString();
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
  
  // The simplest save function with direct REST API
  const handleSaveOrder = async () => {
    console.log("Starting direct save with REST API");
    setSaveInProgress(true);
    
    try {
      // Prepare update object
      const updateData = {
        id: orderId,
        items: items,
        total: calculateTotal(),
        updatedAt: new Date().toISOString()
      };
      
      // Make direct REST API call
      const response = await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/orders/${orderId}.json`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Firebase responded with status ${response.status}`);
      }
      
      console.log("Order saved successfully via REST API");
      addToast?.("Order updated successfully", "success");
      closeModal();
    } catch (error) {
      console.error("Error updating order:", error);
      addToast?.("Failed to save order changes", "error");
    } finally {
      setSaveInProgress(false);
    }
  };
  
  // The simplest finalize function with direct REST API
  const handleFinalizeOrder = async () => {
    console.log("Starting direct finalize with REST API");
    setSaveInProgress(true);
    
    try {
      // Prepare update object
      const updateData = {
        id: orderId,
        items: items,
        total: calculateTotal(),
        isFinalized: true,
        finalizedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Make direct REST API call
      const response = await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/orders/${orderId}.json`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Firebase responded with status ${response.status}`);
      }
      
      console.log("Order finalized successfully via REST API");
      addToast?.("Order finalized successfully", "success");
      closeModal();
    } catch (error) {
      console.error("Error finalizing order:", error);
      addToast?.("Failed to finalize order", "error");
    } finally {
      setSaveInProgress(false);
    }
  };
  
  // If the order is not found, show an error
  if (!currentOrder && !isLoading) {
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
  
  // Main editor view
  return (
    <div className="order-editor">
      <div className="editor-header">
        <div className="editor-header-content">
          <h2>Edit Order #{formatValue(orderId)}</h2>
          <div className="order-metadata">
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
              />
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
                Total Items: {items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0)}
                <br />
                Order Total: ${calculateTotal()}
              </p>

              <SaveCancelButtons 
                onSave={handleSaveOrder}
                onCancel={closeModal}
                isDisabled={items.length === 0}
                isSaving={saveInProgress}
                showFinalize={false}
                saveButtonText="Save Order"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderEditor; 