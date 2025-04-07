import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

const AdminUtilities = () => {
  // Function to clear orders and revenue data
  const clearAllOrders = () => {
    if (window.confirm('Are you sure you want to clear all orders and revenue data? This action cannot be undone.')) {
      // Clear orders from localStorage
      localStorage.setItem('orders', JSON.stringify([]));
      
      // Clear revenue data
      localStorage.setItem('totalRevenue', '0');
      localStorage.setItem('monthlyRevenue', JSON.stringify({}));
      localStorage.setItem('dailyRevenue', JSON.stringify({}));
      
      // Clear cart
      localStorage.setItem('cart', JSON.stringify([]));
      
      alert('All orders and revenue data have been cleared.');
    }
  };

  return (
    <div className="admin-utilities">
      <h1>Admin Utilities</h1>
      <p>Use these tools with caution as some actions cannot be undone.</p>
      
      <div className="utility-section">
        <h2>Import Data</h2>
        <p>Import inventory data from CSV files or other sources.</p>
        <Link to="/inventory?tab=import" className="primary-button">
          Go to Import Tool <span className="arrow">→</span>
        </Link>
      </div>
      
      <div className="utility-section">
        <h2>Clear Test Data</h2>
        <p>Clear all test orders and reset revenue statistics. This will not affect your inventory.</p>
        <button onClick={clearAllOrders} className="danger-button">
          Clear Orders & Revenue
        </button>
      </div>
    </div>
  );
};

export default AdminUtilities; 