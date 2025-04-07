import React from 'react';

const InventoryTableHeader = ({ sortConfig, handleSort, fixUnknownStatuses }) => {
  return (
    <thead>
      <tr>
        <th className="sortable-header" onClick={() => handleSort('name')}>
          Flower Name {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
        </th>
        <th className="sortable-header" onClick={() => handleSort('currentStock')}>
          Stock {sortConfig.key === 'currentStock' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
        </th>
        <th className="sortable-header" onClick={() => handleSort('status')}>
          Status {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? '↑' : '↓')} 
          <button 
            className="check-status-link" 
            onClick={(e) => {
              e.preventDefault(); // Prevent default to avoid any navigation
              e.stopPropagation(); // Prevent triggering the sort
              fixUnknownStatuses();
            }}
            title="Check and fix unknown statuses"
          >
            (Check)
          </button>
        </th>
        <th>Restock Date</th>
        <th className="sortable-header" onClick={() => handleSort('featured')}>
          Featured {sortConfig.key === 'featured' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
        </th>
        <th className="sortable-header" onClick={() => handleSort('hidden')}>
          Hidden {sortConfig.key === 'hidden' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
        </th>
        <th>Actions</th>
      </tr>
    </thead>
  );
};

export default InventoryTableHeader; 