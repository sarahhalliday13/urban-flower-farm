import React from 'react';

const EditableToggleCell = ({ isEditing, value, onChange, label }) => {
  return (
    <td data-label={label}>
      {isEditing ? (
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : (
        <span>{value ? 'Yes' : 'No'}</span>
      )}
    </td>
  );
};

export default EditableToggleCell; 