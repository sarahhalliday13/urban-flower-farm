import React from 'react';

const EditableStockCell = ({ isEditing, value, onChange }) => {
  return (
    <td data-label="Stock">
      {isEditing ? (
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <span>{value}</span>
      )}
    </td>
  );
};

export default EditableStockCell; 