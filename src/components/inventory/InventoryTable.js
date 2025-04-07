import React from 'react';
import InventoryTableHeader from './InventoryTableHeader';
import InventoryTableRow from './InventoryTableRow';

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
  return (
    <div className="inventory-table-container">
      <table className="inventory-table">
        <InventoryTableHeader 
          sortConfig={sortConfig} 
          handleSort={handleSort}
          fixUnknownStatuses={fixUnknownStatuses}
        />
        <tbody>
          {filteredPlants.length === 0 ? (
            <tr>
              <td colSpan="7" className="no-results">No plants found matching your criteria</td>
            </tr>
          ) : (
            filteredPlants.map(plant => (
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
    </div>
  );
};

export default InventoryTable; 