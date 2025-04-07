import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  
  return (
    <div className="inventory-header-container">
      <div className="sales-header">
        <h2>Inventory</h2>
        
        <InventoryFilterControls
          filter={filter}
          setFilter={setFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusCounts={statusCounts}
        />
        
        <button 
          className="add-new-button"
          onClick={() => navigate('/admin/addplant')}
        >
          Add New
        </button>
      </div>
    </div>
  );
};

export default InventoryHeader; 