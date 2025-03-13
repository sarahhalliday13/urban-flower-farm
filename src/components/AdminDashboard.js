import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [salesData, setSalesData] = useState({
    pending: 0,
    completed: 0,
    totalOrders: 0
  });
  const [timeFilter, setTimeFilter] = useState('lastWeek');

  useEffect(() => {
    // Load inventory data to check for low stock
    const plants = JSON.parse(localStorage.getItem('plants') || '[]');
    const lowStock = plants.filter(plant => 
      plant.stock && parseInt(plant.stock) <= 5 && plant.status === 'In Stock'
    );
    setLowStockItems(lowStock.slice(0, 5)); // Get up to 5 low stock items
    
    // Calculate sales data based on time filter
    try {
      calculateSalesData(timeFilter);
    } catch (error) {
      console.error('Error calculating sales data:', error);
      setSalesData({
        pending: 0,
        completed: 0,
        totalOrders: 0
      });
    }
  }, [timeFilter]);

  const calculateSalesData = (filter) => {
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      if (orders.length === 0) return;

      const now = new Date();
      let startDate;

      // Determine the start date based on the filter
      switch (filter) {
        case 'lastWeek':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'last30Days':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
        case 'lastMonth':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'last3Months':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 3);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
      }

      // Filter orders by date
      const filteredOrders = orders.filter(order => {
        try {
          const orderDate = new Date(order.date);
          return orderDate >= startDate && orderDate <= now;
        } catch (error) {
          console.warn('Invalid date format:', order.date);
          return false;
        }
      });

      // Calculate totals
      let pendingTotal = 0;
      let completedTotal = 0;

      filteredOrders.forEach(order => {
        try {
          // Handle both string and number formats for order.total
          let orderTotal = 0;
          
          if (typeof order.total === 'string') {
            // Remove currency symbol and convert to number
            orderTotal = parseFloat(order.total.replace(/[^0-9.-]+/g, ''));
          } else if (typeof order.total === 'number') {
            orderTotal = order.total;
          }
          
          // Check for NaN and use 0 if invalid
          if (isNaN(orderTotal)) {
            orderTotal = 0;
            console.warn('Invalid order total found:', order.total);
          }
          
          if (order.status === 'Pending' || order.status === 'Processing') {
            pendingTotal += orderTotal;
          } else if (order.status === 'Completed') {
            completedTotal += orderTotal;
          }
        } catch (error) {
          console.warn('Error processing order:', error, order);
        }
      });

      setSalesData({
        pending: pendingTotal.toFixed(2),
        completed: completedTotal.toFixed(2),
        totalOrders: filteredOrders.length
      });
    } catch (error) {
      console.error('Error in calculateSalesData:', error);
      setSalesData({
        pending: 0,
        completed: 0,
        totalOrders: 0
      });
    }
  };

  const handleFilterChange = (e) => {
    setTimeFilter(e.target.value);
  };

  const getFilterLabel = () => {
    switch (timeFilter) {
      case 'lastWeek': return 'Last 7 Days';
      case 'last30Days': return 'Last 30 Days';
      case 'lastMonth': return 'Last Month';
      case 'last3Months': return 'Last 3 Months';
      default: return 'Last 30 Days';
    }
  };

  return (
    <div className="admin-dashboard">
      <p className="welcome-message">Welcome Cunt! Have a great day!</p>
      
      <div className="sales-summary">
        <div className="sales-header">
          <h2>Sales Summary</h2>
          <div className="time-filter">
            <label htmlFor="timeFilter">Time Period:</label>
            <select 
              id="timeFilter" 
              value={timeFilter} 
              onChange={handleFilterChange}
            >
              <option value="lastWeek">Last Week</option>
              <option value="last30Days">Last 30 Days</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
            </select>
          </div>
        </div>
        
        <div className="sales-metrics">
          <div className="metric-card pending">
            <h3>Pending Revenue</h3>
            <p className="metric-value">${salesData.pending}</p>
            <p className="metric-label">Awaiting fulfillment</p>
          </div>
          
          <div className="metric-card completed">
            <h3>Completed Sales</h3>
            <p className="metric-value">${salesData.completed}</p>
            <p className="metric-label">Successfully fulfilled</p>
          </div>
          
          <div className="metric-card total">
            <h3>Total Orders</h3>
            <p className="metric-value">{salesData.totalOrders}</p>
            <p className="metric-label">For {getFilterLabel()}</p>
          </div>
        </div>
        
        <Link to="/admin/orders" className="view-all-orders">
          View All Orders →
        </Link>
      </div>
      
      <div className="admin-cards">
        <div className="admin-card">
          <h2>Inventory</h2>
          <p>Add, edit, and manage plants and inventory levels in one place.</p>
          <Link to="/inventory" className="admin-button">
            Manage Inventory
          </Link>
        </div>
        
        <div className="admin-card">
          <h2>Orders</h2>
          <p>View and process customer orders, update order status, and print invoices.</p>
          <Link to="/admin/orders" className="admin-button">
            Manage Orders
          </Link>
        </div>
      </div>
      
      {lowStockItems.length > 0 && (
        <div className="low-stock-alert">
          <h3>Low Stock Alert</h3>
          <div className="low-stock-items">
            {lowStockItems.map(item => (
              <div key={item.id} className="low-stock-item">
                <span className="item-name">{item.name}</span>
                <span className="stock-count">Only {item.stock} left</span>
              </div>
            ))}
            <Link to="/inventory" className="view-inventory-link">
              Manage Inventory →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 