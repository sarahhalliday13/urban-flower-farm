import React from 'react';

const InventoryFilterControls = ({ 
  filter, 
  setFilter, 
  searchTerm, 
  setSearchTerm, 
  statusCounts 
}) => {
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
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All ({statusCounts.all})</option>
          <option value="In Stock">In Stock ({statusCounts['In Stock']})</option>
          <option value="Low Stock">Low Stock ({statusCounts['Low Stock']})</option>
          <option value="Sold Out">Sold Out ({statusCounts['Sold Out']})</option>
          <option value="Coming Soon">Coming Soon ({statusCounts['Coming Soon']})</option>
          <option value="Pre-order">Pre-order ({statusCounts['Pre-order']})</option>
          <option value="Unknown">Unknown ({statusCounts['Unknown']})</option>
          <option value="Hidden">Hidden ({statusCounts['Hidden']})</option>
        </select>
      </div>
    </div>
  );
};

export default InventoryFilterControls; 