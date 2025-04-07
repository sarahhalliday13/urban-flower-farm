import React from 'react';
import EditableStockCell from './EditableStockCell';
import EditableStatusCell from './EditableStatusCell';
import EditableDateCell from './EditableDateCell';
import EditableToggleCell from './EditableToggleCell';

const InventoryTableRow = ({
  plant,
  isEditing,
  editValues,
  handleChange,
  handleEdit,
  handleSave,
  handleCancel,
  saveStatus,
  onEditPlant
}) => {
  const statusClass = plant.inventory?.status 
    ? plant.inventory.status.toLowerCase().replace(/\s+/g, '-') 
    : 'unknown';

  return (
    <tr key={plant.id} className={isEditing ? 'editing' : ''}>
      <td data-label="Flower Name">
        <span className="plant-name">{plant.name}</span>
      </td>
      
      <EditableStockCell 
        isEditing={isEditing}
        value={isEditing ? editValues.currentStock : plant.inventory?.currentStock || 0}
        onChange={(value) => handleChange(plant.id, 'currentStock', value)}
      />
      
      <EditableStatusCell 
        isEditing={isEditing}
        value={isEditing ? editValues.status : plant.inventory?.status || 'Unknown'}
        onChange={(value) => handleChange(plant.id, 'status', value)}
        statusClass={statusClass}
      />
      
      <EditableDateCell 
        isEditing={isEditing}
        value={isEditing ? editValues.restockDate : plant.inventory?.restockDate || ''}
        onChange={(value) => handleChange(plant.id, 'restockDate', value)}
      />
      
      <EditableToggleCell 
        isEditing={isEditing}
        value={isEditing ? editValues.featured : (plant.featured === true || plant.featured === 'true')}
        onChange={(value) => handleChange(plant.id, 'featured', value)}
        label="Featured"
      />
      
      <EditableToggleCell 
        isEditing={isEditing}
        value={isEditing ? editValues.hidden : (plant.hidden === true || plant.hidden === 'true')}
        onChange={(value) => handleChange(plant.id, 'hidden', value)}
        label="Hidden"
      />
      
      <td data-label="Actions">
        <div className="action-buttons">
          {isEditing ? (
            <>
              <button 
                className="save-btn"
                onClick={() => handleSave(plant.id)}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save'}
              </button>
              <button 
                className="cancel-btn"
                onClick={() => handleCancel(plant.id)}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button 
                className="edit-btn"
                onClick={() => handleEdit(plant.id)}
              >
                Tweak In-Line
              </button>
              <button 
                className="edit-plant-btn"
                onClick={() => onEditPlant(plant)}
              >
                Edit Details
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default InventoryTableRow; 