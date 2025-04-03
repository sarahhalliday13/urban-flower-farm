import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import { useAdmin } from '../context/AdminContext';
import { getOrders, getDatabaseRef } from '../services/firebase';
import { onValue, off } from 'firebase/database';
import PlantSalesTracker from './PlantSalesTracker';

const AdminDashboard = () => {
  const { plants } = useAdmin();
  const [lowStockItems, setLowStockItems] = useState([]);
  const [salesData, setSalesData] = useState({
    pending: 0,
    completed: 0,
    totalOrders: 0
  });
  const [timeFilter, setTimeFilter] = useState('lastWeek');
  const [pendingEmails, setPendingEmails] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orders, setOrders] = useState([]);

  // Setup real-time listener for orders
  useEffect(() => {
    let isMounted = true;
    setIsLoadingOrders(true);
    console.log('Setting up real-time order listener...');
    
    const ordersRef = getDatabaseRef('orders');
    let ordersListener = null;
    
    // Create the listener
    const handleSnapshot = (snapshot) => {
      if (!isMounted) return;
      
      if (snapshot.exists()) {
        const ordersData = snapshot.val();
        const ordersList = Object.values(ordersData);
        
        console.log(`Received ${ordersList.length} orders from Firebase real-time listener`);
        
        // Sort by date (newest first)
        ordersList.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update state with the orders
        setOrders(ordersList);
        setIsLoadingOrders(false);
        
        // Also update localStorage for fallback/offline usage
        localStorage.setItem('orders', JSON.stringify(ordersList));
      } else {
        console.log('No orders found in Firebase database');
        if (isMounted) {
          setOrders([]);
          setIsLoadingOrders(false);
        }
      }
    };
    
    const handleError = (error) => {
      console.error('Error in orders listener:', error);
      
      // Fallback to localStorage if available
      if (isMounted) {
        try {
          const cachedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
          if (cachedOrders.length > 0) {
            console.log(`Falling back to ${cachedOrders.length} cached orders from localStorage`);
            setOrders(cachedOrders);
          }
        } catch (e) {
          console.error('Error parsing cached orders:', e);
        }
        
        setIsLoadingOrders(false);
      }
    };
    
    // Attach the listener
    ordersListener = onValue(ordersRef, handleSnapshot, handleError);
    
    // Cleanup function to remove the listener
    return () => {
      console.log('Cleaning up orders listener');
      isMounted = false;
      if (ordersListener) {
        off(ordersRef);
      }
    };
  }, []);

  // Process low stock items from plants context
  useEffect(() => {
    if (plants.length > 0) {
      const lowStock = plants.filter(plant => 
        plant.inventory?.currentStock && 
        plant.inventory?.currentStock < 5 &&
        plant.inventory?.status !== 'Discontinued'
      );
      setLowStockItems(lowStock);
    }
    
    // Get pending emails from localStorage (this part can remain as is for now)
    try {
      const manualEmails = JSON.parse(localStorage.getItem('manualEmails') || '[]');
      setPendingEmails(manualEmails.filter(email => email.status === 'pending'));
    } catch (error) {
      console.error('Error loading pending emails:', error);
      setPendingEmails([]);
    }
  }, [plants]);

  // Calculate sales data when orders change or time filter changes
  useEffect(() => {
    if (!isLoadingOrders) {
      calculateSalesData(orders, timeFilter);
    }
  }, [orders, timeFilter, isLoadingOrders]);

  const calculateSalesData = (ordersList, filter) => {
    try {
      if (!ordersList || ordersList.length === 0) {
        console.log('No orders available to calculate sales data');
        setSalesData({
          pending: 0,
          completed: 0,
          totalOrders: 0
        });
        return;
      }

      console.log(`Calculating sales data for ${ordersList.length} orders with filter: ${filter}`);
      
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
      const filteredOrders = ordersList.filter(order => {
        try {
          const orderDate = new Date(order.date);
          return orderDate >= startDate && orderDate <= now;
        } catch (error) {
          console.warn('Invalid date format:', order.date);
          return false;
        }
      });

      console.log(`Filtered to ${filteredOrders.length} orders in the selected time period`);

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

      console.log(`Sales calculation results - Pending: $${pendingTotal.toFixed(2)}, Completed: $${completedTotal.toFixed(2)}, Count: ${filteredOrders.length}`);
      
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

  const handleRefresh = () => {
    // Force a refresh from Firebase
    setIsLoadingOrders(true);
    getOrders()
      .then(freshOrders => {
        console.log(`Manually refreshed orders: ${freshOrders.length} orders loaded`);
        setOrders(freshOrders);
        setIsLoadingOrders(false);
      })
      .catch(error => {
        console.error('Error refreshing orders:', error);
        setIsLoadingOrders(false);
      });
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
      <p className="welcome-message">Welcome to Button's Admin Dashboard!</p>
      
      {/* Pending Emails Alert - show only if there are pending emails */}
      {pendingEmails.length > 0 && (
        <div className="pending-emails-alert">
          <h2><span role="img" aria-label="Warning">⚠️</span> Pending Order Emails</h2>
          <p>{pendingEmails.length} order confirmation {pendingEmails.length === 1 ? 'email' : 'emails'} need to be sent manually</p>
          
          <div className="pending-emails-list">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingEmails.slice(0, 5).map((email, index) => (
                  <tr key={index}>
                    <td>{email.orderId}</td>
                    <td>{email.customerName || 'Unknown'}</td>
                    <td>{email.customerEmail}</td>
                    <td>{new Date(email.date).toLocaleDateString()}</td>
                    <td>
                      <Link to="/admin/orders" className="email-action-btn">
                        View Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {pendingEmails.length > 5 && (
              <p className="view-all-link">
                <Link to="/admin/orders">View all {pendingEmails.length} pending emails</Link>
              </p>
            )}
          </div>
        </div>
      )}
      
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
          <button 
            className="refresh-button" 
            onClick={handleRefresh} 
            title="Refresh Data"
            disabled={isLoadingOrders}
          >
            <span role="img" aria-label="Refresh">🔄</span> Refresh
          </button>
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
          
          {/* Integrated Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className="inline-low-stock-alert">
              <h4>Low Stock Alert: {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'}</h4>
              <div className="low-stock-items-mini">
                {lowStockItems.slice(0, 3).map(item => (
                  <div key={item.id} className="low-stock-item-mini">
                    <span className="item-name">{item.name}</span>
                    <span className="stock-count">({item.inventory?.currentStock})</span>
                  </div>
                ))}
                {lowStockItems.length > 3 && (
                  <div className="low-stock-more">
                    +{lowStockItems.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}
          
          <Link to="/admin/inventory" className="admin-button">
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
      
      {/* Plant Sales Tracking */}
      <PlantSalesTracker />
    </div>
  );
};

export default AdminDashboard; 