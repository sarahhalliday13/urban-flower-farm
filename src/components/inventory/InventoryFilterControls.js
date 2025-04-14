import React from 'react';

const InventoryFilterControls = ({ 
  filter, 
  setFilter, 
  searchTerm, 
  setSearchTerm, 
  statusCounts 
}) => {
  // Map old filter values to new ones
  const getFilterValue = (currentFilter) => {
    if (currentFilter === 'Sold Out') return 'Out of Stock';
    if (currentFilter === 'Low Stock') return 'In Stock';
    return currentFilter;
  };
  
  return (
    <div className="header-controls">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search plants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="clear-search-btn" 
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <div className="filter-controls">
        <label htmlFor="statusFilter">Status:</label>
        <select
          id="statusFilter"
          value={getFilterValue(filter)}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All ({statusCounts.all})</option>
          <option value="In Stock">In Stock ({statusCounts['In Stock']})</option>
          <option value="Out of Stock">Out of Stock ({statusCounts['Sold Out']})</option>
          <option value="Coming Soon">Coming Soon ({statusCounts['Coming Soon']})</option>
          <option value="Pre-order">Pre-order ({statusCounts['Pre-order']})</option>
          <option value="Unknown">Unknown ({statusCounts['Unknown']})</option>
        </select>
      </div>
    </div>
  );
};

export default InventoryFilterControls; 