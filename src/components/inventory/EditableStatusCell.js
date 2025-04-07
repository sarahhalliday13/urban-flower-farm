import React from 'react';

const statusOptions = [
  'In Stock',
  'Low Stock',
  'Sold Out',
  'Coming Soon',
  'Pre-order'
];

const EditableStatusCell = ({ isEditing, value, onChange, statusClass }) => {
  return (
    <td data-label="Status">
      {isEditing ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      ) : (
        <span className={`status-badge ${statusClass}`}>
          {value || 'Unknown'}
        </span>
      )}
    </td>
  );
};

export default EditableStatusCell; 