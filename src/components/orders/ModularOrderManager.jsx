import React from 'react';
import OrderTable from './OrderTable';
import OrderFilterControls from './OrderFilterControls';
// import EmailQueueBanner from './EmailQueueBanner';
import './OrderTable.css';

/**
 * ModularOrderManager - Main controller component for the Orders page
 * Handles the overall structure and provides context to child components
 */
const ModularOrderManager = () => {
  return (
    <div className="admin-orders-container">
      <div className="orders-header">
        <div className="orders-title-row">
          <h1 className="orders-title">Order Management</h1>
          <button 
            className="refresh-button" 
            onClick={() => {
              const { refreshOrders } = window.orderContext || {};
              if (typeof refreshOrders === 'function') {
                refreshOrders();
              }
            }} 
            title="Refresh Orders"
          >
            <span role="img" aria-label="Refresh">🔄</span> Refresh
          </button>
        </div>
        <div className="orders-filters-row">
          <OrderFilterControls />
        </div>
      </div>
      
      {/* Orders Table */}
      <OrderTable />
    </div>
  );
};

export default ModularOrderManager;
