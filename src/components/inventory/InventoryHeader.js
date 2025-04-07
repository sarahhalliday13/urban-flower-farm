import React from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryFilterControls from './InventoryFilterControls';

const InventoryHeader = ({
  filter,
  setFilter,
  searchTerm,
  setSearchTerm,
  statusCounts
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
      </div>
    </div>
  );
};

export default InventoryHeader; 