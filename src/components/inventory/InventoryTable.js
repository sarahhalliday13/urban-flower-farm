import React, { useState, useEffect } from 'react';
import InventoryTableHeader from './InventoryTableHeader';
import InventoryTableRow from './InventoryTableRow';
import './InventoryTable.css';

const ITEMS_PER_PAGE = 50;

const InventoryTable = ({
  filteredPlants,
  editMode,
  editValues,
  sortConfig,
  handleSort,
  handleChange,
  handleEdit,
  handleSave,
  handleCancel,
  saveStatus,
  onEditPlant,
  fixUnknownStatuses
}) => {
  const [visiblePlants, setVisiblePlants] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    setVisiblePlants(filteredPlants.slice(0, ITEMS_PER_PAGE));
    setCurrentPage(1);
  }, [filteredPlants]);
  
  const loadMore = () => {
    const nextPage = currentPage + 1;
    const nextItems = filteredPlants.slice(0, nextPage * ITEMS_PER_PAGE);
    setVisiblePlants(nextItems);
    setCurrentPage(nextPage);
  };
  
  const hasMoreItems = filteredPlants.length > visiblePlants.length;

  return (
    <div className="inventory-table-container">
      <table className="inventory-table">
        <InventoryTableHeader 
          sortConfig={sortConfig} 
          handleSort={handleSort}
          fixUnknownStatuses={fixUnknownStatuses}
        />
        <tbody>
          {visiblePlants.length === 0 ? (
            <tr>
              <td colSpan="7" className="no-results">No plants found matching your criteria</td>
            </tr>
          ) : (
            visiblePlants.map(plant => (
              <InventoryTableRow
                key={plant.id}
                plant={plant}
                isEditing={editMode[plant.id] || false}
                editValues={editValues[plant.id] || {}}
                handleChange={handleChange}
                handleEdit={handleEdit}
                handleSave={handleSave}
                handleCancel={handleCancel}
                saveStatus={saveStatus[plant.id]}
                onEditPlant={onEditPlant}
              />
            ))
          )}
        </tbody>
      </table>
      
      {hasMoreItems && (
        <div className="load-more-container">
          <button 
            className="load-more-btn"
            onClick={loadMore}
          >
            Load More ({filteredPlants.length - visiblePlants.length} remaining)
          </button>
        </div>
      )}
      
      <div className="inventory-table-footer">
        <p className="plant-count">
          Showing {visiblePlants.length} of {filteredPlants.length} plants
        </p>
      </div>
    </div>
  );
};

export default InventoryTable; 