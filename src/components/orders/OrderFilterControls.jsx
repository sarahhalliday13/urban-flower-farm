import React from 'react';
import { useOrders } from './OrderContext';

/**
 * OrderFilterControls - Provides search and filter controls for orders
 * Similar to the inventory filter controls, but tailored for order statuses
 */
const OrderFilterControls = () => {
  const { 
    filter, 
    setFilter, 
    searchTerm, 
    setSearchTerm
  } = useOrders();

  // Make the context available globally for refresh button
  window.orderContext = useOrders();

  return (
    <>
      <div className="status-filter">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="status-select"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="orders-search">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search by name, email, or order ID"
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
    </>
  );
};

export default OrderFilterControls;
