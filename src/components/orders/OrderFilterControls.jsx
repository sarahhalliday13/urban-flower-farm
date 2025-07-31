import React from 'react';
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
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search by name, email, order ID, notes, or phone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="search-clear-btn" 
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderFilterControls;
