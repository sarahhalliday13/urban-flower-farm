import React from 'react';

const statusOptions = [
  'In Stock',
  'Out of Stock',
  'Coming Soon',
  'Pre-order'
];

const EditableStatusCell = ({ isEditing, value, onChange, statusClass }) => {
  // Map old status names to new ones for display
  const displayValue = (val) => {
    if (!val) return 'Unknown';
    if (val === 'Sold Out') return 'Out of Stock';
    if (val === 'Low Stock') return 'In Stock';
    return val;
  };

  return (
    <td data-label="Status">
      {isEditing ? (
        <select
          value={value === 'Sold Out' ? 'Out of Stock' : (value === 'Low Stock' ? 'In Stock' : value)}
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
          {displayValue(value)}
        </span>
      )}
    </td>
  );
};

export default EditableStatusCell; 