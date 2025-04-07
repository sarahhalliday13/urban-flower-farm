import React from 'react';
import InventoryFilterControls from './InventoryFilterControls';

const InventoryHeader = ({
  activeTab,
  handleTabChange,
  filter,
  setFilter,
  searchTerm,
  setSearchTerm,
  statusCounts,
  resetPlantForm
}) => {
  return (
    <div className="inventory-header-container">
      <div className="sales-header">
        <h2>{activeTab === 'addPlant' ? 'Add New Flower' : 'Inventory'}</h2>
        
        {activeTab === 'inventory' && (
          <InventoryFilterControls
            filter={filter}
            setFilter={setFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusCounts={statusCounts}
          />
        )}
        
        {activeTab === 'inventory' ? (
          <button 
            className="add-new-button"
            onClick={() => {
              resetPlantForm();
              handleTabChange('addPlant');
            }}
          >
            Add New
          </button>
        ) : activeTab === 'addPlant' ? (
          <div className="button-group">
            <button 
              className="back-button"
              onClick={() => handleTabChange('inventory')}
            >
              Back to Inventory
            </button>
            <button 
              className="save-btn"
              onClick={(e) => {
                e.preventDefault();
                // Submit the form using the form id
                document.getElementById('plantForm').dispatchEvent(new Event('submit', {
                  cancelable: true,
                  bubbles: true
                }));
              }}
            >
              Save
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InventoryHeader; 