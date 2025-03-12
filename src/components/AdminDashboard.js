import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    // Load inventory data to check for low stock
    const plants = JSON.parse(localStorage.getItem('plants') || '[]');
    const lowStock = plants.filter(plant => 
      plant.stock && parseInt(plant.stock) <= 5 && plant.status === 'In Stock'
    );
    setLowStockItems(lowStock.slice(0, 5)); // Get up to 5 low stock items
  }, []);

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <p className="welcome-message">Welcome, Colleen! Manage your flower farm from this dashboard.</p>
      
      <div className="admin-cards">
        <div className="admin-card">
          <h2>Inventory Management</h2>
          <p>Update stock levels, product status, and restock dates.</p>
          <Link to="/inventory" className="admin-button">
            Manage Inventory
          </Link>
        </div>
        
        <div className="admin-card">
          <h2>Order Management</h2>
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
      
      <div className="admin-help">
        <h3>Need Help?</h3>
        <p>
          This dashboard gives you quick access to all the administrative features of your flower farm website.
          You can try to text Sarah, but she only responds when chocolate is offered or free plants are mentioned! 🍫🌱
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard; 