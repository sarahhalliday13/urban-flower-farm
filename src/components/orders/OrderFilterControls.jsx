import React, { useState, useEffect } from 'react';
import { useOrders } from './OrderContext';
import './OrderFilterControls.css';

/**
 * OrderFilterControls - Provides search and filter controls for orders
 * Similar to the inventory filter controls, but tailored for order statuses
 */
const OrderFilterControls = () => {
  const { 
    filter, 
    setFilter, 
    searchTerm, 
    setSearchTerm,
    statusCounts = {} // Get status counts from context
  } = useOrders();
  
  // Local state for the search input (allows typing without immediate filtering)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  
  // Sync local search term when context search term changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);
  
  console.log('OrderFilterControls - localSearchTerm:', localSearchTerm, 'length:', localSearchTerm?.length);

  // Calculate archive count (completed + cancelled)
  const archiveCount = (statusCounts.completed || 0) + (statusCounts.cancelled || 0);

  // Status options with their display names
  const statusOptions = [
    { value: 'all', label: 'Active Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'archived', label: 'Archive' }
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    console.log('🔍 Search submitted:', localSearchTerm);
    setSearchTerm(localSearchTerm);
  };

  const handleSearchClear = () => {
    setLocalSearchTerm('');
    setSearchTerm('');
  };

  return (
    <div className="order-filter-controls">
      <div className="status-filter">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="status-select"
        >
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label} ({value === 'archived' ? archiveCount : (statusCounts[value] || 0)})
            </option>
          ))}
        </select>
      </div>
      <div className="orders-search">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by name, email, order ID, notes, or phone"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="search-input"
            />
            {localSearchTerm && (
              <button 
                type="button"
                className="search-clear-btn" 
                onClick={handleSearchClear}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            <button 
              type="submit" 
              className="search-go-button"
              aria-label="Search orders"
            >
              Go
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderFilterControls;
