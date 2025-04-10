import React, { useState, useEffect, useCallback } from 'react';
import { getDatabaseRef, onValue, get } from '../services/firebase';
import '../styles/PlantSalesTracker.css';

const PlantSalesTracker = () => {
  const [salesData, setSalesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    plantType: 'all',
    dateRange: '30', // 30 days default
    sortBy: 'unitsSold'
  });
  const [plantTypes, setPlantTypes] = useState([]);
  const [summary, setSummary] = useState({
    totalUnitsSold: 0,
    topSellingPlant: '',
    averageSalesPerDay: 0,
    totalFreebies: 0
  });
  const [displayLimit, setDisplayLimit] = useState(20);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to calculate sales from orders - wrapped in useCallback to prevent unnecessary recreations
  const calculateSalesFromOrders = useCallback((orders) => {
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    // Create a map to track sales by plant
    const salesByPlant = new Map();
    const currentDate = new Date();
    const filterDays = parseInt(filters.dateRange, 10) || 30;
    const filterDate = new Date(currentDate);
    filterDate.setDate(filterDate.getDate() - filterDays);
    
    // Track total freebies
    let totalFreebies = 0;

    // Process orders
    orders.forEach(order => {
      const orderDate = new Date(order.date);
      
      // Skip if order is outside filter date range
      if (orderDate < filterDate) {
        return;
      }
      
      // Process items in the order
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (!item.id || !item.name) return;
          
          // Skip if filtered by plant type and doesn't match
          if (filters.plantType !== 'all' && item.id !== parseInt(filters.plantType)) {
            return;
          }
          
          const plantId = item.id;
          const plantName = item.name;
          const quantity = parseInt(item.quantity, 10) || 0;
          const price = parseFloat(item.price) || 0;
          const total = quantity * price;
          const isFreebie = item.isFreebie || false;
          
          // Count freebies
          if (isFreebie) {
            totalFreebies += quantity;
          }
          
          // Add to existing data or create new entry
          if (salesByPlant.has(plantId)) {
            const plantData = salesByPlant.get(plantId);
            plantData.unitsSold += quantity;
            if (isFreebie) {
              plantData.freebies += quantity;
            } else {
              plantData.revenue += total;
              plantData.paidUnits += quantity;
            }
            plantData.orders.push({
              orderId: order.id,
              date: order.date,
              quantity,
              price,
              isFreebie
            });
          } else {
            salesByPlant.set(plantId, {
              id: plantId,
              name: plantName,
              unitsSold: quantity,
              paidUnits: isFreebie ? 0 : quantity,
              freebies: isFreebie ? quantity : 0,
              revenue: isFreebie ? 0 : total,
              orders: [{
                orderId: order.id,
                date: order.date,
                quantity,
                price,
                isFreebie
              }]
            });
          }
        });
      }
    });
    
    // Convert to array for rendering
    let salesArray = Array.from(salesByPlant.values());
    
    // Sort based on selected sort method
    if (filters.sortBy === 'unitsSold') {
      salesArray.sort((a, b) => b.unitsSold - a.unitsSold);
    } else if (filters.sortBy === 'revenue') {
      salesArray.sort((a, b) => b.revenue - a.revenue);
    } else if (filters.sortBy === 'name') {
      salesArray.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sortBy === 'freebies') {
      salesArray.sort((a, b) => b.freebies - a.freebies);
    }
    
    // Calculate summary data
    const totalUnitsSold = salesArray.reduce((sum, plant) => sum + plant.paidUnits, 0);
    const topSellingPlant = salesArray.length > 0 ? salesArray[0].name : 'No data';
    const averageSalesPerDay = totalUnitsSold / filterDays;
    
    setSummary({
      totalUnitsSold,
      topSellingPlant,
      averageSalesPerDay: parseFloat(averageSalesPerDay.toFixed(2)),
      totalFreebies: totalFreebies || 0
    });
    
    return salesArray;
  }, [filters.dateRange, filters.plantType, filters.sortBy]);

  // Load orders from Firebase
  const loadOrdersFromFirebase = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    const ordersRef = getDatabaseRef('orders');
    
    // Listen for orders from Firebase
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      try {
        if (!snapshot.exists()) {
          setSalesData([]);
          setIsLoading(false);
          return;
        }
        
        const ordersData = snapshot.val();
        const ordersArray = Object.values(ordersData || {});
        
        // Calculate sales data from orders
        const salesArray = calculateSalesFromOrders(ordersArray);
        setSalesData(salesArray);
        
        // Extract plant types for filter dropdown
        const plantTypesSet = new Set();
        ordersArray.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              if (item.id && item.name) {
                plantTypesSet.add(item.id);
              }
            });
          }
        });
        
        // Get plant details for the dropdown
        const plantsRef = getDatabaseRef('plants');
        get(plantsRef).then((plantsSnapshot) => {
          if (plantsSnapshot.exists()) {
            const plantsData = plantsSnapshot.val();
            const plantsList = Object.values(plantsData || {})
              .filter(plant => plantTypesSet.has(plant.id))
              .map(plant => ({
                id: plant.id,
                name: plant.name
              }));
            
            setPlantTypes(plantsList);
          }
        });
        
        setIsLoading(false);
        setIsRefreshing(false);
      } catch (err) {
        console.error('Error processing orders data:', err);
        setError('Failed to process orders data');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, (err) => {
      console.error('Error loading orders:', err);
      setError('Failed to load sales data');
      setIsLoading(false);
      setIsRefreshing(false);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, [calculateSalesFromOrders]);

  // Initial load
  useEffect(() => {
    return loadOrdersFromFirebase();
  }, [loadOrdersFromFirebase]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset display limit when filters change
    setDisplayLimit(20);
  };

  // Handle showing more plants
  const handleShowMore = () => {
    console.log(`Increasing display limit from ${displayLimit} to ${displayLimit + 20}`);
    setDisplayLimit(prev => {
      const newLimit = prev + 20;
      console.log(`New display limit: ${newLimit}`);
      return newLimit;
    });
  };

  // This useEffect will help us debug the displayLimit changes
  useEffect(() => {
    console.log(`Display limit changed to: ${displayLimit}`);
    console.log(`Total plants: ${salesData.length}, showing: ${Math.min(displayLimit, salesData.length)}`);
  }, [displayLimit, salesData.length]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Force a new fetch by detaching and reattaching the Firebase listener
    const unsubscribe = loadOrdersFromFirebase();
    // This is just to simulate detaching and reattaching - the actual work is done in loadOrdersFromFirebase
    unsubscribe();
  };

  return (
    <div className="plant-sales-tracker">
      <div className="plant-sales-header">
        <h2>Plant Sales Tracking</h2>
        <div className="plant-sales-controls">
          <button 
            className="refresh-button" 
            onClick={handleRefresh} 
            disabled={isRefreshing || isLoading}
            title="Refresh Data"
          >
            <span role="img" aria-label="Refresh">🔄</span> Refresh
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="plant-sales-summary">
        <div className="plant-summary-card avg-sales">
          <h3>Avg. Sales Per Day</h3>
          <div className="plant-summary-value">{summary.averageSalesPerDay}</div>
          <div className="plant-summary-label">Units per day</div>
        </div>
        <div className="plant-summary-card top-plant">
          <h3>Top Selling Plant</h3>
          <div className="plant-summary-value">{summary.topSellingPlant}</div>
          <div className="plant-summary-label">Most popular choice</div>
        </div>
        <div className="plant-summary-card units">
          <h3>Total Units Sold</h3>
          <div className="plant-summary-value">{summary.totalUnitsSold}</div>
          <div className="plant-summary-label">Across all plants</div>
        </div>
        <div className="plant-summary-card freebies">
          <h3>Total Freebies</h3>
          <div className="plant-summary-value">{summary.totalFreebies}</div>
          <div className="plant-summary-label">Given away for free</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="sales-filters">
        <div className="filter-group">
          <label htmlFor="plantType">Plant Type:</label>
          <select 
            id="plantType" 
            name="plantType" 
            value={filters.plantType}
            onChange={handleFilterChange}
          >
            <option value="all">All Plants</option>
            {plantTypes.map(plant => (
              <option key={plant.id} value={plant.id}>{plant.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="dateRange">Date Range:</label>
          <select 
            id="dateRange" 
            name="dateRange" 
            value={filters.dateRange}
            onChange={handleFilterChange}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
            <option value="1000">All Time</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="sortBy">Sort By:</label>
          <select 
            id="sortBy" 
            name="sortBy" 
            value={filters.sortBy}
            onChange={handleFilterChange}
          >
            <option value="unitsSold">Units Sold</option>
            <option value="revenue">Revenue</option>
            <option value="name">Plant Name</option>
            <option value="freebies">Freebies</option>
          </select>
        </div>
      </div>
      
      {/* Sales Table */}
      {isLoading ? (
        <div className="loading-indicator">Loading sales data...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : salesData.length === 0 ? (
        <div className="no-data-message">No sales data available for the selected filters.</div>
      ) : (
        <>
          <div className="sales-table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Plant Name</th>
                  <th>Units Sold</th>
                  <th>Freebies</th>
                  <th>Revenue</th>
                  <th>Last Sold</th>
                </tr>
              </thead>
              <tbody>
                {salesData.slice(0, displayLimit).map(plant => {
                  // Find the most recent order
                  const orders = plant.orders || [];
                  const lastOrder = orders.length > 0 
                    ? orders.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                    : null;
                  
                  return (
                    <tr key={plant.id}>
                      <td>{plant.name}</td>
                      <td>{plant.paidUnits}</td>
                      <td>{plant.freebies || 0}</td>
                      <td>${plant.revenue.toFixed(2)}</td>
                      <td>
                        {lastOrder 
                          ? new Date(lastOrder.date).toLocaleDateString() 
                          : 'N/A'
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Show More Button - only if there are more records to show */}
          {salesData.length > displayLimit && (
            <div className="show-more-container">
              <button 
                className="show-more-button" 
                onClick={handleShowMore}
                type="button"
              >
                Show More Plants ({salesData.length - displayLimit} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlantSalesTracker; 