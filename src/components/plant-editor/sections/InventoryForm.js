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

      <div className="form-section">
        <h4>Photo Credits</h4>
        
        {/* Main Image Photo Credit */}
        <div className="form-group">
          <label htmlFor="main-credit-type">Main Image Credit Type:</label>
          <select
            id="main-credit-type"
            value={flowerData.inventory?.mainCreditType || 'own'}
            onChange={(e) => setFlowerData(prev => ({
              ...prev,
              inventory: { 
                ...(prev.inventory || {}), 
                mainCreditType: e.target.value 
              }
            }))}
          >
            <option value="own">Own Photo</option>
            <option value="commercial">Commercial Source</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="main-credit-source">Main Image Credit Source:</label>
          <input
            id="main-credit-source"
            type="text"
            value={flowerData.inventory?.mainCreditSource || ''}
            onChange={(e) => setFlowerData(prev => ({
              ...prev,
              inventory: { 
                ...(prev.inventory || {}), 
                mainCreditSource: e.target.value 
              }
            }))}
            placeholder={flowerData.inventory?.mainCreditType === 'commercial' ? 'Source name (e.g., Van Noort, Jelitto)' : 'Photographer name (optional)'}
          />
        </div>

        {flowerData.inventory?.mainCreditType === 'commercial' && (
          <div className="form-group">
            <label htmlFor="main-credit-url">Main Image Source URL (Optional):</label>
            <input
              id="main-credit-url"
              type="url"
              value={flowerData.inventory?.mainCreditUrl || ''}
              onChange={(e) => setFlowerData(prev => ({
                ...prev,
                inventory: { 
                  ...(prev.inventory || {}), 
                  mainCreditUrl: e.target.value 
                }
              }))}
              placeholder="https://example.com"
            />
          </div>
        )}

        {/* Additional Image 1 Photo Credit */}
        {flowerData.additionalImages && (
          <div style={{marginTop: '20px'}}>
            <h5>Additional Image 1 Credit</h5>
            
            <div className="form-group">
              <label htmlFor="add1-credit-type">Additional Image 1 Credit Type:</label>
              <select
                id="add1-credit-type"
                value={flowerData.inventory?.add1CreditType || 'own'}
                onChange={(e) => setFlowerData(prev => ({
                  ...prev,
                  inventory: { 
                    ...(prev.inventory || {}), 
                    add1CreditType: e.target.value 
                  }
                }))}
              >
                <option value="own">Own Photo</option>
                <option value="commercial">Commercial Source</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="add1-credit-source">Additional Image 1 Credit Source:</label>
              <input
                id="add1-credit-source"
                type="text"
                value={flowerData.inventory?.add1CreditSource || ''}
                onChange={(e) => setFlowerData(prev => ({
                  ...prev,
                  inventory: { 
                    ...(prev.inventory || {}), 
                    add1CreditSource: e.target.value 
                  }
                }))}
                placeholder={flowerData.inventory?.add1CreditType === 'commercial' ? 'Source name (e.g., Van Noort, Jelitto)' : 'Photographer name (optional)'}
              />
            </div>

            {flowerData.inventory?.add1CreditType === 'commercial' && (
              <div className="form-group">
                <label htmlFor="add1-credit-url">Additional Image 1 Source URL (Optional):</label>
                <input
                  id="add1-credit-url"
                  type="url"
                  value={flowerData.inventory?.add1CreditUrl || ''}
                  onChange={(e) => setFlowerData(prev => ({
                    ...prev,
                    inventory: { 
                      ...(prev.inventory || {}), 
                      add1CreditUrl: e.target.value 
                    }
                  }))}
                  placeholder="https://example.com"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default InventoryForm; 