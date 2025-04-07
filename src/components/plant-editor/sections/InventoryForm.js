import React from 'react';

const InventoryForm = ({ flowerData, setFlowerData }) => {
  return (
    <>
      <div className="form-group">
        <label htmlFor="inventory-status">Status:</label>
        <select
          id="inventory-status"
          value={flowerData.inventory?.status || ''}
          onChange={(e) => setFlowerData(prev => ({
            ...prev,
            inventory: { ...(prev.inventory || {}), status: e.target.value }
          }))}
          required
        >
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
          <option value="Coming Soon">Coming Soon</option>
          <option value="Pre-order">Pre-order</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="inventory-quantity">Current Stock:</label>
        <input
          id="inventory-quantity"
          type="number"
          value={flowerData.inventory?.currentStock || 0}
          onChange={(e) => setFlowerData(prev => ({
            ...prev,
            inventory: { 
              ...(prev.inventory || {}), 
              currentStock: parseInt(e.target.value) || 0 
            }
          }))}
          required
          min="0"
        />
      </div>

      <div className="form-group">
        <label htmlFor="restock-date">Restock Date (Optional):</label>
        <input
          id="restock-date"
          type="date"
          value={flowerData.inventory?.restockDate || ''}
          onChange={(e) => setFlowerData(prev => ({
            ...prev,
            inventory: { 
              ...(prev.inventory || {}), 
              restockDate: e.target.value 
            }
          }))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="inventory-notes">Inventory Notes (Optional):</label>
        <textarea
          id="inventory-notes"
          value={flowerData.inventory?.notes || ''}
          onChange={(e) => setFlowerData(prev => ({
            ...prev,
            inventory: { 
              ...(prev.inventory || {}), 
              notes: e.target.value 
            }
          }))}
          placeholder="Enter any notes about inventory"
          rows="3"
        />
      </div>
    </>
  );
};

export default InventoryForm; 