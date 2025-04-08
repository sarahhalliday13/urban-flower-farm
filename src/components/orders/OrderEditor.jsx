import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from './OrderContext';
import OrderItemsTable from './OrderItemsTable';
import Invoice from '../Invoice';

/**
 * OrderEditor - Component for editing an existing order
 * Enhanced with improved layout, searchable dropdown, and better UX
 */
const OrderEditor = ({ orderId, onClose }) => {
  console.log("OrderEditor mounted with orderId:", orderId);
  
  const { 
    orders, 
    updateOrderItems, 
    finalizeOrder 
  } = useOrders();
  
  console.log("Orders from context:", orders);
  console.log("updateOrderItems function:", typeof updateOrderItems);
  console.log("finalizeOrder function:", typeof finalizeOrder);
  
  // Find the order details
  const orderDetails = orders.find(order => order.id === orderId);
  console.log("Found orderDetails:", orderDetails);
  
  // Local state for edited items
  const [items, setItems] = useState([]);
  const [availablePlants, setAvailablePlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showItemAddedFeedback, setShowItemAddedFeedback] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPreviewInvoice, setShowPreviewInvoice] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  
  // Refs for autosave
  const itemsRef = useRef(items);
  itemsRef.current = items;
  
  // Initialize the items from the order
  useEffect(() => {
    console.log("OrderEditor useEffect running with orderDetails:", orderDetails);
    if (orderDetails) {
      try {
        console.log("Setting items from orderDetails:", orderDetails.items);
        // Ensure we're creating a safe deep copy of the items
        const safeItems = Array.isArray(orderDetails.items) 
          ? orderDetails.items.map(item => ({ 
              id: item.id,
              name: item.name || 'Unknown Item',
              price: item.price || 0,
              quantity: item.quantity || 1,
              inventory: item.inventory || { currentStock: 0 }
            }))
          : [];
        setItems(safeItems);
        setLoading(false);
        
        // Try to load draft if it exists
        try {
          const draftKey = `orderDraft_${orderId}`;
          const savedDraft = localStorage.getItem(draftKey);
          
          if (savedDraft) {
            const draftData = JSON.parse(savedDraft);
            if (draftData.items && Array.isArray(draftData.items) && draftData.timestamp) {
              // Calculate time since last autosave
              const savedTime = new Date(draftData.timestamp);
              const currentTime = new Date();
              const diffMinutes = Math.round((currentTime - savedTime) / (1000 * 60));
              
              // Only offer to restore if draft is less than 1 day old
              if (diffMinutes < 1440) {
                const restoreDraft = window.confirm(
                  `Found an unsaved draft from ${diffMinutes < 60 ? 
                    `${diffMinutes} minutes ago` : 
                    `${Math.floor(diffMinutes/60)} hours ago`}. Would you like to restore it?`
                );
                
                if (restoreDraft) {
                  setItems(draftData.items);
                  setLastAutoSave(draftData.timestamp);
                } else {
                  // Clear the draft if user doesn't want to restore
                  localStorage.removeItem(draftKey);
                }
              } else {
                // Clear old drafts
                localStorage.removeItem(draftKey);
              }
            }
          }
        } catch (e) {
          console.error('Error loading draft order:', e);
        }
        
        // Fetch available plants
        const fetchPlants = async () => {
          try {
            // Try to get cached plants first
            const cachedPlants = JSON.parse(localStorage.getItem('cachedPlantsWithTimestamp') || '{}');
            console.log("Loaded cached plants:", cachedPlants);
            
            if (cachedPlants.data && Array.isArray(cachedPlants.data)) {
              // Filter to only plants with stock
              const plants = cachedPlants.data
                .filter(plant => plant.inventory && plant.inventory.currentStock > 0)
                // Sort alphabetically by name
                .sort((a, b) => a.name.localeCompare(b.name))
                // Ensure all plant IDs are strings for consistent comparison
                .map(plant => ({
                  ...plant,
                  id: String(plant.id) // Ensure ID is a string
                }));
                
              setAvailablePlants(plants);
              console.log("Set available plants:", plants.length);
              console.log("Sample plant ID type:", plants.length > 0 ? typeof plants[0].id : "no plants");
            } else {
              // Fallback to empty list if no cached plants
              console.log("No cached plants found, using empty list");
              setAvailablePlants([]);
            }
          } catch (error) {
            console.error('Error loading plants for order editor:', error);
            setAvailablePlants([]);
          }
        };
        
        fetchPlants();
      } catch (error) {
        console.error("Error in OrderEditor useEffect:", error);
        setLoading(false);
      }
    }
  }, [orderDetails, orderId]);
  
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
  
  // Handle updating the quantity of an item
  const handleUpdateQuantity = (itemId, newQuantity) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };
  
  // Handle removing an item
  const handleRemoveItem = (itemId) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };
  
  // Filter plants - no longer using search
  const filteredPlants = availablePlants;
  
  // Handle adding a new item
  const handleAddItem = () => {
    console.log("Add to Order clicked, selectedPlantId:", selectedPlantId);
    console.log("Selected quantity:", selectedQuantity);
    console.log("Available plants:", availablePlants);
    
    if (!selectedPlantId) {
      alert('Please select a plant to add');
      return;
    }
    
    // Convert selectedPlantId to string to ensure consistent comparison
    const plantIdStr = String(selectedPlantId);
    
    // Log all plant IDs for debugging
    console.log("All plant IDs in availablePlants:", availablePlants.map(p => String(p.id)));
    
    // Find the plant with matching ID (converted to string for comparison)
    const selectedPlant = availablePlants.find(plant => String(plant.id) === plantIdStr);
    console.log("Found selected plant:", selectedPlant);
    
    if (!selectedPlant) {
      console.error("Selected plant not found in available plants");
      // Try a different approach - search by matching the ID directly
      const alternativePlant = availablePlants.find(plant => plant.id == selectedPlantId); // Note: loose equality
      console.log("Alternative plant search result:", alternativePlant);
      
      if (alternativePlant) {
        // Found with loose equality, proceed with this plant
        addItemToOrder(alternativePlant);
      } else {
        alert('Could not find the selected plant. Please try selecting it again.');
        return;
      }
    } else {
      // Found with strict equality after string conversion
      addItemToOrder(selectedPlant);
    }
  };
  
  // Extract the actual adding logic to a separate function
  const addItemToOrder = (plant) => {
    // Check if the item already exists in the order
    const existingItemIndex = items.findIndex(item => String(item.id) === String(plant.id));
    console.log("Existing item index:", existingItemIndex);
    
    if (existingItemIndex >= 0) {
      // Update quantity if item already exists
      const updatedItems = [...items];
      const newQuantity = parseInt(updatedItems[existingItemIndex].quantity, 10) + parseInt(selectedQuantity, 10);
      updatedItems[existingItemIndex].quantity = newQuantity;
      console.log("Updating quantity of existing item to:", newQuantity);
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        id: plant.id,
        name: plant.name,
        price: plant.price || 0,
        quantity: selectedQuantity,
        inventory: plant.inventory || { currentStock: 0 }
      };
      console.log("Adding new item:", newItem);
      
      setItems(prevItems => [...prevItems, newItem]);
    }
    
    // Show add success feedback
    setShowItemAddedFeedback(true);
    setTimeout(() => setShowItemAddedFeedback(false), 1500);
    
    // Reset selection
    setSelectedPlantId('');
    setSelectedQuantity(1);
  };
  
  // Handle saving the order changes
  const handleSaveChanges = async (finalize = false) => {
    if (items.length === 0) {
      alert('Cannot save an empty order. Please add at least one item.');
      return;
    }
    
    // If finalizing, show confirmation modal
    if (finalize) {
      setShowConfirmModal(true);
      return;
    }
    
    // Otherwise just save changes
    setSaveInProgress(true);
    
    try {
      // Check if updateOrderItems function exists
      if (typeof updateOrderItems !== 'function') {
        console.error('updateOrderItems is not a function:', updateOrderItems);
        alert('Error: Unable to save order changes. The update function is not available.');
        setSaveInProgress(false);
        return;
      }
      
      const success = await updateOrderItems(orderId, items, false);
      
      if (success) {
        // Clear draft
        localStorage.removeItem(`orderDraft_${orderId}`);
        alert('Order changes saved successfully. The order is still in editable state.');
      } else {
        alert('Failed to save changes. Please try again.');
      }
    } catch (error) {
      console.error('Error saving order changes:', error);
      alert(`Error saving changes: ${error.message || 'Unknown error'}`);
    } finally {
      setSaveInProgress(false);
    }
  };
  
  // Handle finalizing the order after confirmation
  const handleFinalizeOrder = async () => {
    setSaveInProgress(true);
    
    try {
      // Check if updateOrderItems function exists
      if (typeof updateOrderItems !== 'function') {
        console.error('updateOrderItems is not a function:', updateOrderItems);
        alert('Error: Unable to finalize order. The update function is not available.');
        setSaveInProgress(false);
        setShowConfirmModal(false);
        return;
      }
      
      const success = await updateOrderItems(orderId, items, true);
      
      if (success) {
        // Clear draft
        localStorage.removeItem(`orderDraft_${orderId}`);
        setShowConfirmModal(false);
        setShowPreviewInvoice(true);
      } else {
        alert('Failed to finalize order. Please try again.');
        setShowConfirmModal(false);
      }
    } catch (error) {
      console.error('Error finalizing order:', error);
      alert(`Error finalizing order: ${error.message || 'Unknown error'}`);
      setShowConfirmModal(false);
    } finally {
      setSaveInProgress(false);
    }
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
  if (!orderDetails) {
    return (
      <div className="order-editor">
        <div className="editor-header">
          <h2>Order Not Found</h2>
          <button className="close-editor-btn" onClick={onClose}>×</button>
        </div>
        <p>The selected order could not be found.</p>
      </div>
    );
  }
  
  // If still loading, show a loading message
  if (loading) {
    return (
      <div className="order-editor">
        <div className="editor-header">
          <h2>Loading Order Editor...</h2>
          <button className="close-editor-btn" onClick={onClose}>×</button>
        </div>
        <p>Loading order details...</p>
      </div>
    );
  }
  
  // If showing finalized invoice preview, render it
  if (showPreviewInvoice) {
    return (
      <div className="order-editor">
        <div className="editor-header">
          <h2>Order #{formatValue(orderId)} Finalized</h2>
          <button className="close-editor-btn" onClick={onClose}>×</button>
        </div>
        <div className="finalized-message">
          <p>This order has been finalized. Here is the final invoice:</p>
          <div className="invoice-preview-container">
            <Invoice 
              order={{
                ...orderDetails,
                items,
                isFinalized: true,
                total: items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity, 10)), 0)
              }} 
              type="print" 
              invoiceType="final" 
            />
          </div>
          <button className="close-preview-btn" onClick={onClose}>
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
            <span className="order-status-pill">{formatValue(orderDetails.status)}</span>
            <span className="order-date">{new Date(orderDetails.date || new Date()).toLocaleDateString()}</span>
            <span className="customer-name">{formatValue(orderDetails.customer?.name)}</span>
          </div>
        </div>
        <button className="close-editor-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="editor-content">
        <div className="editor-grid">
          {/* Left Column - Order Items */}
          <div className="editor-column">
            <div className="editor-card">
              <h3>Current Items</h3>
              <OrderItemsTable 
                items={items} 
                editable={true}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
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
              
              <div className="form-group">
                <label htmlFor="plant-select">Select Plant:</label>
                <select 
                  id="plant-select" 
                  value={selectedPlantId} 
                  onChange={(e) => {
                    const selectedId = String(e.target.value);
                    console.log("Plant selected:", selectedId, "type:", typeof selectedId);
                    setSelectedPlantId(selectedId);
                  }}
                  className="plant-select"
                >
                  <option value="">Choose a plant...</option>
                  {filteredPlants.map(plant => (
                    <option key={`plant-${plant.id}`} value={plant.id}>
                      {plant.name} - ${formatPrice(plant.price)} - {plant.inventory?.currentStock || 0} in stock
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="quantity-input">Quantity:</label>
                <input 
                  id="quantity-input"
                  type="number" 
                  min="1" 
                  value={selectedQuantity} 
                  onChange={(e) => setSelectedQuantity(parseInt(e.target.value, 10) || 1)}
                  className="quantity-input"
                />
              </div>
              
              <div className="add-item-container">
                <button 
                  className={`add-item-btn ${showItemAddedFeedback ? 'success' : ''}`}
                  onClick={() => {
                    console.log("Add to Order button clicked");
                    handleAddItem();
                  }}
                  disabled={!selectedPlantId}
                >
                  {showItemAddedFeedback ? (
                    <>
                      <span className="success-icon">✓</span> Added!
                    </>
                  ) : (
                    'Add to Order'
                  )}
                </button>
              </div>
            </div>
            
            <div className="editor-card">
              <h3>Review & Save</h3>
              <p className="order-summary">
                Total Items: {items.length}
                <br />
                Order Total: ${items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity, 10)), 0).toFixed(2)}
              </p>

              <div className="editor-actions">
                <button 
                  className="save-changes-btn"
                  onClick={() => handleSaveChanges(false)}
                  disabled={items.length === 0 || saveInProgress}
                >
                  {saveInProgress ? 'Saving...' : 'Save Changes (Keep Editable)'}
                </button>
                
                <button 
                  className="finalize-order-btn"
                  onClick={() => handleSaveChanges(true)}
                  disabled={items.length === 0 || saveInProgress}
                >
                  {saveInProgress ? 'Finalizing...' : 'Finalize Order'}
                </button>
                
                <button 
                  className="cancel-edit-btn"
                  onClick={onClose}
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
              <p><strong>Customer:</strong> {formatValue(orderDetails.customer?.name)}</p>
              <p><strong>Items:</strong> {items.length}</p>
              <p><strong>Total:</strong> ${items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity, 10)), 0).toFixed(2)}</p>
            </div>
            
            <div className="confirmation-buttons">
              <button 
                className="confirm-finalize-btn"
                onClick={handleFinalizeOrder}
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