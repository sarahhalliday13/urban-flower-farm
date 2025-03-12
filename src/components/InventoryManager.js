import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPlants, updateInventory } from '../services/sheets';
import '../styles/InventoryManager.css';

const InventoryManager = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPlants();
    
    // Set up a refresh interval to check for updates
    const refreshInterval = setInterval(() => {
      loadPlants();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);

  const loadPlants = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("InventoryManager - Loading plants data...");
      
      // Check localStorage for inventory data
      try {
        const storedInventory = localStorage.getItem('plantInventory');
        console.log("InventoryManager - localStorage inventory data:", 
          storedInventory ? JSON.parse(storedInventory) : "None");
      } catch (e) {
        console.error("InventoryManager - Error reading localStorage:", e);
      }
      
      const plantsData = await fetchPlants();
      console.log("InventoryManager - Plants data loaded:", plantsData);
      
      setPlants(plantsData);
      
      // Initialize edit values for each plant
      const initialValues = {};
      plantsData.forEach(plant => {
        initialValues[plant.id] = {
          currentStock: plant.inventory?.currentStock || 0,
          status: plant.inventory?.status || 'Unknown',
          restockDate: plant.inventory?.restockDate || '',
          notes: plant.inventory?.notes || ''
        };
      });
      
      setEditValues(initialValues);
      setLoading(false);
    } catch (err) {
      console.error('Error loading plants:', err);
      setError('Failed to load inventory data. Please refresh the page and try again.');
      setLoading(false);
    }
  };

  const handleEdit = (plantId) => {
    setEditMode(prev => ({
      ...prev,
      [plantId]: true
    }));
  };

  const handleCancel = (plantId) => {
    // Reset to original values
    setEditValues(prev => ({
      ...prev,
      [plantId]: {
        currentStock: plants.find(p => p.id === plantId)?.inventory?.currentStock || 0,
        status: plants.find(p => p.id === plantId)?.inventory?.status || 'unknown',
        restockDate: plants.find(p => p.id === plantId)?.inventory?.restockDate || '',
        notes: plants.find(p => p.id === plantId)?.inventory?.notes || ''
      }
    }));
    setEditMode(prev => ({
      ...prev,
      [plantId]: false
    }));
  };

  const handleChange = (plantId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [plantId]: {
        ...prev[plantId],
        [field]: value
      }
    }));
  };

  const handleSave = async (plantId) => {
    setSaveStatus(prev => ({
      ...prev,
      [plantId]: 'saving'
    }));

    try {
      // Use the updateInventory function to save changes
      const inventoryData = {
        currentStock: parseInt(editValues[plantId].currentStock, 10),
        status: editValues[plantId].status,
        restockDate: editValues[plantId].restockDate,
        notes: editValues[plantId].notes
      };
      
      console.log(`InventoryManager - Saving inventory for plant ${plantId}:`, inventoryData);
      
      // Check localStorage before saving
      try {
        const storedInventory = localStorage.getItem('plantInventory');
        console.log("InventoryManager - Current localStorage inventory before save:", 
          storedInventory ? JSON.parse(storedInventory) : "None");
      } catch (e) {
        console.error("InventoryManager - Error reading localStorage before save:", e);
      }
      
      const result = await updateInventory(plantId, inventoryData);
      console.log(`InventoryManager - Save result:`, result);
      
      if (result.success) {
        // Update local state to reflect changes
        setPlants(prev => prev.map(plant => {
          if (plant.id === plantId) {
            return {
              ...plant,
              inventory: {
                ...plant.inventory,
                ...inventoryData
              }
            };
          }
          return plant;
        }));
        
        setSaveStatus(prev => ({
          ...prev,
          [plantId]: 'success'
        }));
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveStatus(prev => ({
            ...prev,
            [plantId]: null
          }));
        }, 3000);
        
        setEditMode(prev => ({
          ...prev,
          [plantId]: false
        }));
        
        // Check localStorage after saving
        try {
          const storedInventory = localStorage.getItem('plantInventory');
          console.log("InventoryManager - Current localStorage inventory after save:", 
            storedInventory ? JSON.parse(storedInventory) : "None");
        } catch (e) {
          console.error("InventoryManager - Error reading localStorage after save:", e);
        }
        
        // Refresh plants data to ensure we have the latest
        console.log("InventoryManager - Refreshing plants data after save");
        loadPlants();
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      console.error('Error saving inventory:', err);
      setSaveStatus(prev => ({
        ...prev,
        [plantId]: 'error'
      }));
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({
          ...prev,
          [plantId]: null
        }));
      }, 3000);
    }
  };

  const getFilteredPlants = () => {
    let filtered = [...plants];
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(plant => {
        if (!plant.inventory?.status) return false;
        
        const statusLower = plant.inventory.status.toLowerCase();
        const filterValue = filter.replace(/-/g, ' ');
        
        return statusLower.includes(filterValue);
      });
    }
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(plant => 
        plant.name.toLowerCase().includes(term) || 
        plant.scientificName.toLowerCase().includes(term) ||
        String(plant.id).toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  if (loading) return <div className="inventory-loading">Loading inventory data...</div>;
  if (error) return <div className="inventory-error">{error}</div>;

  const filteredPlants = getFilteredPlants();

  return (
    <div className="inventory-manager">
      <h1>Inventory Management</h1>
      
      <div className="inventory-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <label>Filter by status:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Plants</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
            <option value="coming-soon">Coming Soon</option>
            <option value="pre-order">Pre-order</option>
          </select>
        </div>
        
        <button 
          className="refresh-btn"
          onClick={loadPlants}
        >
          Refresh Data
        </button>
      </div>
      
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>ID</th>
              <th>Name</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Restock Date</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlants.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-results">No plants found matching your criteria</td>
              </tr>
            ) : (
              filteredPlants.map(plant => (
                <tr key={plant.id} className={`inventory-row ${plant.inventory?.status || 'unknown'}`}>
                  <td data-label="Image">
                    <img 
                      src={plant.mainImage} 
                      alt={plant.name} 
                      className="inventory-thumbnail" 
                    />
                  </td>
                  <td data-label="ID">{plant.id}</td>
                  <td data-label="Name">
                    <div className="plant-name">{plant.name}</div>
                    <div className="scientific-name">{plant.scientificName}</div>
                  </td>
                  
                  {editMode[plant.id] ? (
                    <>
                      <td data-label="Stock">
                        <input
                          type="number"
                          min="0"
                          value={editValues[plant.id].currentStock}
                          onChange={(e) => handleChange(plant.id, 'currentStock', e.target.value)}
                        />
                      </td>
                      <td data-label="Status">
                        <select
                          value={editValues[plant.id].status}
                          onChange={(e) => handleChange(plant.id, 'status', e.target.value)}
                        >
                          <option value="in-stock">In Stock</option>
                          <option value="out-of-stock">Out of Stock</option>
                          <option value="coming-soon">Coming Soon</option>
                          <option value="pre-order">Pre-order</option>
                        </select>
                      </td>
                      <td data-label="Restock Date">
                        <input
                          type="date"
                          value={editValues[plant.id].restockDate}
                          onChange={(e) => handleChange(plant.id, 'restockDate', e.target.value)}
                        />
                      </td>
                      <td data-label="Notes">
                        <textarea
                          value={editValues[plant.id].notes}
                          onChange={(e) => handleChange(plant.id, 'notes', e.target.value)}
                        />
                      </td>
                      <td data-label="Actions" className="action-buttons">
                        <button 
                          className="save-btn"
                          onClick={() => handleSave(plant.id)}
                          disabled={saveStatus[plant.id] === 'saving'}
                        >
                          {saveStatus[plant.id] === 'saving' ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                          className="cancel-btn"
                          onClick={() => handleCancel(plant.id)}
                          disabled={saveStatus[plant.id] === 'saving'}
                        >
                          Cancel
                        </button>
                        {saveStatus[plant.id] === 'success' && (
                          <div className="save-success">Saved!</div>
                        )}
                        {saveStatus[plant.id] === 'error' && (
                          <div className="save-error">Error saving</div>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="Stock">{plant.inventory?.currentStock || 0}</td>
                      <td data-label="Status">
                        <span className={`status-badge ${(plant.inventory?.status || 'unknown').toLowerCase().replace(/\s+/g, '-')}`}>
                          {plant.inventory?.status || 'Unknown'}
                        </span>
                      </td>
                      <td data-label="Restock Date">{plant.inventory?.restockDate || 'N/A'}</td>
                      <td data-label="Notes" className="notes-cell">{plant.inventory?.notes || 'No notes'}</td>
                      <td data-label="Actions">
                        <button 
                          className="edit-btn"
                          onClick={() => handleEdit(plant.id)}
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryManager; 