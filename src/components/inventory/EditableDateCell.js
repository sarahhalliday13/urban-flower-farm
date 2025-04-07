import React from 'react';

const EditableDateCell = ({ isEditing, value, onChange }) => {
  return (
    <td data-label="Restock Date">
      {isEditing ? (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <span>{value || '-'}</span>
      )}
    </td>
  );
};

export default EditableDateCell; 