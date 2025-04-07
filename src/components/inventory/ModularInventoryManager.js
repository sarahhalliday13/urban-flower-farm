import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { 
  // eslint-disable-next-line no-unused-vars
  fetchPlants, 
  updatePlant, 
  subscribeToInventory, 
  // eslint-disable-next-line no-unused-vars
  processSyncQueue,
  // eslint-disable-next-line no-unused-vars
  uploadImageToFirebase
} from '../../services/firebase';
import InventoryHeader from './InventoryHeader';
import InventoryTable from './InventoryTable';
import '../../styles/InventoryManager.css';
import '../../styles/PlantManagement.css';
import { useNavigate } from 'react-router-dom';

const ModularInventoryManager = () => {
  // State from AdminContext
  const { plants, loading: plantsLoading, error: plantsError, loadPlants, updatePlantData } = useAdmin();

  // Main component state
  const [activeTab, setActiveTab] = useState('inventory');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [plantSearchTerm, setPlantSearchTerm] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const navigate = useNavigate();
  
  // Use refs for timers to prevent memory leaks
  const saveTimerRef = useRef(null);
  const searchTimerRef = useRef(null);
  
  // Get plants context and other data
  const { plants: plantsContext, updatePlantData: plantsUpdatePlantData, apiRetryCount } = useAdmin();

  // Local state for inventory management
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading inventory data...');
  const [error, setError] = useState(null);
  const [saveStatusPlants, setSaveStatusPlants] = useState({});
  const [sortConfigPlants, setSortConfigPlants] = useState({ key: 'name', direction: 'ascending' });
  
  // Modify loadPlants to use context loadPlants
  const handleLoadPlants = useCallback((forceRefresh = false) => {
    setLoading(true);
    setLoadingMessage('Refreshing inventory data...');
    
    loadPlants(forceRefresh)
      .then(() => {
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [loadPlants]);

  // Check sync queue status
  const checkSyncQueue = useCallback(() => {
    try {
      const queueData = localStorage.getItem('inventorySyncQueue');
      if (queueData) {
        const queue = JSON.parse(queueData);
        console.log(`Sync queue contains ${queue.length} items`);
      }
    } catch (e) {
      console.error('Error checking sync queue:', e);
    }
  }, []);
  
  // Handle form field changes
  const handleChange = useCallback((plantId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [plantId]: {
        ...prev[plantId],
        [field]: value
      }
    }));
    
    // Mark that there are unsaved changes
    setHasUnsavedChanges(true);
  }, []);

  // Handle edit button click
  const handleEdit = useCallback((plantId) => {
    // Initialize edit values with current plant values
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
      const currentStock = plant.inventory?.currentStock || 0;
      
      // Determine proper status if it's unknown
      let status = plant.inventory?.status || 'Unknown';
      if (status === 'Unknown') {
        if (currentStock <= 0) status = "Out of Stock";
        else if (currentStock < 5) status = "Low Stock";
        else status = "In Stock";
      }
      
      setEditValues(prev => ({
        ...prev,
        [plantId]: {
          price: plant.price || 0,
          currentStock: currentStock,
          status: status,
          restockDate: plant.inventory?.restockDate || '',
          notes: plant.inventory?.notes || '',
          featured: plant.featured === true || plant.featured === 'true',
          hidden: plant.hidden === true || plant.hidden === 'true'
        }
      }));
    }
    
    setEditMode(prev => ({
      ...prev,
      [plantId]: true
    }));
  }, [plants]);

  // Handle cancel button click
  const handleCancel = useCallback((plantId) => {
    // Exit edit mode
    setEditMode(prev => {
      const newState = { ...prev };
      delete newState[plantId];
      return newState;
    });
    
    // Clear save status
    setSaveStatus(prev => {
      const newState = { ...prev };
      delete newState[plantId];
      return newState;
    });
    
    // Mark that there are no unsaved changes
    setHasUnsavedChanges(false);
  }, []);

  // Handle save button click
  const handleSave = useCallback(async (plantId) => {
    // Set saving status
    setSaveStatus(prev => ({
      ...prev,
      [plantId]: 'saving'
    }));
    
    try {
      const plant = plants.find(p => p.id === plantId);
      const updates = editValues[plantId];
      
      if (!plant || !updates) {
        throw new Error('Invalid plant or update data');
      }
      
      // Ensure currentStock is a number
      const currentStock = parseInt(updates.currentStock) || 0;
      
      // Auto-determine status based on stock if status is Unknown
      let status = updates.status;
      if (!status || status === 'Unknown') {
        if (currentStock <= 0) status = "Out of Stock";
        else if (currentStock < 5) status = "Low Stock";
        else status = "In Stock";
      }
      
      // Prepare the updated data
      const updatedInventory = {
        currentStock,
        status,
        restockDate: updates.restockDate || '',
        notes: updates.notes || '',
        lastUpdated: new Date().toISOString()
      };
      
      // Update plant price and featured status
      const updatedPlant = {
        ...plant,
        price: updates.price,
        featured: updates.featured,
        hidden: updates.hidden,
        inventory: updatedInventory
      };
      
      // Update the plant in the database
      await updatePlant(plantId, updatedPlant);
      
      // Also update in AdminContext if available
      if (typeof updatePlantData === 'function') {
        updatePlantData(updatedPlant);
      }
      
      // Set success status
      setSaveStatus(prev => ({
        ...prev,
        [plantId]: 'success'
      }));
      
      // Exit edit mode
      setEditMode(prev => {
        const newState = { ...prev };
        delete newState[plantId];
        return newState;
      });
      
      // Clear success message after a delay
      setTimeout(() => {
        setSaveStatus(prev => {
          const newState = { ...prev };
          delete newState[plantId];
          return newState;
        });
      }, 3000);
      
      // Mark that there are no unsaved changes
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving plant:', error);
      
      // Set error status
      setSaveStatus(prev => ({
        ...prev,
        [plantId]: 'error'
      }));
      
      // Clear error message after a delay
      setTimeout(() => {
        setSaveStatus(prev => {
          const newState = { ...prev };
          delete newState[plantId];
          return newState;
        });
      }, 3000);
      
      throw error;
    }
  }, [plants, editValues, updatePlantData]);

  // Handle sorting of columns
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Handle tab change
  const handleTabChange = useCallback((tab) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) {
        return;
      }
      setHasUnsavedChanges(false);
    }
    setActiveTab(tab);
  }, [hasUnsavedChanges]);

  // Handle edit plant click
  const handleEditPlant = useCallback((plant) => {
    navigate(`/admin/editplant/${plant.id}`);
  }, [navigate]);

  // Function to fix plants with Unknown status
  const fixUnknownStatuses = async () => {
    // Find plants with missing or Unknown status
    const unknownPlants = plants.filter(plant => 
      !plant.inventory?.status || plant.inventory.status === 'Unknown'
    );
    
    if (unknownPlants.length === 0) {
      // Show a toast notification if no unknown plants found
      const event = new CustomEvent('show-toast', { 
        detail: { 
          message: 'No plants with unknown status found!',
          type: 'info',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
      return;
    }
    
    // Show a loading toast
    const loadingEvent = new CustomEvent('show-toast', { 
      detail: { 
        message: `Checking ${unknownPlants.length} plants with unknown status...`,
        type: 'info',
        duration: 2000
      }
    });
    window.dispatchEvent(loadingEvent);
    
    let fixedCount = 0;
    const updatedPlants = [...plants];
    
    // Update each plant with a more appropriate status based on stock
    for (const plant of unknownPlants) {
      try {
        const stockLevel = plant.inventory?.currentStock || 0;
        let newStatus;
        
        if (stockLevel > 10) {
          newStatus = 'In Stock';
        } else if (stockLevel > 0) {
          newStatus = 'Low Stock';
        } else {
          newStatus = 'Out of Stock';
        }
        
        // Create updated inventory data
        const updatedInventory = {
          ...(plant.inventory || {}),
          status: newStatus,
          currentStock: stockLevel
        };
        
        // Update the plant in the database
        await updatePlant(plant.id, {
          ...plant,
          inventory: updatedInventory
        });
        
        // Also update in local state for immediate UI refresh
        const plantIndex = updatedPlants.findIndex(p => p.id === plant.id);
        if (plantIndex !== -1) {
          updatedPlants[plantIndex] = {
            ...updatedPlants[plantIndex],
            inventory: updatedInventory
          };
        }
        
        fixedCount++;
      } catch (error) {
        console.error(`Error fixing status for plant ${plant.id}:`, error);
      }
    }
    
    // Update local state immediately for UI refresh
    if (typeof updatePlantData === 'function') {
      // Update each plant individually to ensure context is updated
      for (const plant of updatedPlants) {
        updatePlantData(plant);
      }
    }
    
    // Show success toast
    const successEvent = new CustomEvent('show-toast', { 
      detail: { 
        message: `Fixed ${fixedCount} of ${unknownPlants.length} plants with unknown status!`,
        type: 'success',
        duration: 3000
      }
    });
    window.dispatchEvent(successEvent);
    
    // Also refresh the plants data from the database
    handleLoadPlants(true);
  };

  // Filter plants based on status filter and search term
  const filteredPlants = useMemo(() => {
    let filtered = [...plants];
    
    // Apply search filter first
    if (plantSearchTerm) {
      const lowerSearch = plantSearchTerm.toLowerCase();
      filtered = filtered.filter(plant => 
        plant.name?.toLowerCase().includes(lowerSearch) || 
        plant.scientificName?.toLowerCase().includes(lowerSearch) ||
        String(plant.id).includes(lowerSearch)
      );
    }
    
    // Then apply status filter
    if (filter !== 'all') {
      if (filter === 'Hidden') {
        filtered = filtered.filter(plant => 
          plant.hidden === true || plant.hidden === 'true'
        );
      } else if (filter === 'In Stock') {
        filtered = filtered.filter(plant => 
          (plant.inventory?.status === 'In Stock' || plant.inventory?.status === 'Low Stock') && 
          (!plant.hidden || plant.hidden !== true)
        );
      } else if (filter === 'Sold Out') {
        // Include both "Sold Out" and "Out of Stock" in this filter
        filtered = filtered.filter(plant => 
          (plant.inventory?.status === 'Sold Out' || plant.inventory?.status === 'Out of Stock') && 
          (!plant.hidden || plant.hidden !== true)
        );
      } else {
        filtered = filtered.filter(plant => 
          plant.inventory?.status === filter && 
          (!plant.hidden || plant.hidden !== true)
        );
      }
    } else {
      // For "all", include all plants (including hidden)
      // No filtering needed as we want to show all plants
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA, valB;
        
        // Custom handling for different types of fields
        if (sortConfig.key === 'currentStock') {
          valA = a.inventory?.currentStock || 0;
          valB = b.inventory?.currentStock || 0;
        } else if (sortConfig.key === 'status') {
          valA = a.inventory?.status || '';
          valB = b.inventory?.status || '';
        } else if (sortConfig.key === 'featured' || sortConfig.key === 'hidden') {
          valA = a[sortConfig.key] === true || a[sortConfig.key] === 'true';
          valB = b[sortConfig.key] === true || b[sortConfig.key] === 'true';
        } else {
          valA = a[sortConfig.key] || '';
          valB = b[sortConfig.key] || '';
        }
        
        // Handle string comparison
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
        }
        if (typeof valB === 'string') {
          valB = valB.toLowerCase();
        }
        
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [plants, filter, plantSearchTerm, sortConfig]);

  // Status counts for filter options
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      'In Stock': 0,
      'Low Stock': 0,
      'Sold Out': 0,
      'Coming Soon': 0,
      'Pre-order': 0,
      'Unknown': 0,
      'Hidden': 0
    };
    
    if (plants) {
      // Count all plants for the 'all' count, including hidden
      counts.all = plants.length;
      
      // Count by inventory status and hidden status
      plants.forEach(plant => {
        // Count hidden plants
        if (plant.hidden === true || plant.hidden === 'true') {
          counts['Hidden']++;
          // Skip counting other statuses for hidden plants
          return;
        }
        
        // Count by inventory status
        if (plant.inventory && plant.inventory.status) {
          const status = plant.inventory.status;
          
          // Special handling for "Out of Stock" - count it as "Sold Out"
          if (status === 'Out of Stock') {
            counts['Sold Out']++;
          } else if (counts[status] !== undefined) {
            counts[status]++;
          } else {
            // Count non-standard statuses as Unknown
            console.log(`Found plant with non-standard status: ${status}`);
            counts['Unknown']++;
          }
        } else {
          // Count unknown status plants
          counts['Unknown']++;
        }
      });
    }
    
    return counts;
  }, [plants]);

  // Subscribe to real-time inventory updates
  useEffect(() => {
    // Load plants initially
    handleLoadPlants();
    
    // Subscribe to inventory changes
    const unsubscribe = subscribeToInventory((inventoryData) => {
      console.log('Inventory updated in real-time:', Object.keys(inventoryData || {}).length, 'items');
      checkSyncQueue();
    });
    
    // Check for pending sync items initially
    checkSyncQueue();
    
    // Set up auto-refresh timer (every 5 minutes)
    const refreshTimer = setInterval(() => {
      handleLoadPlants(true); // Force refresh every 5 minutes
    }, 5 * 60 * 1000);
    
    // Store references to timers for cleanup
    searchTimerRef.current = refreshTimer;
    
    // Cleanup function for unmount
    return () => {
      // Unsubscribe from Firebase listener if it exists
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      
      // Clean up all timers using the copied refs
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    };
  }, [handleLoadPlants, checkSyncQueue]);

  // Render a fallback UI if there's an error
  if (error || plantsError) {
    return (
      <div className="error-container" style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error Loading Inventory</h2>
        <p>{error || plantsError}</p>
        <p>Please try refreshing the page. If the problem persists, contact support.</p>
        <button 
          onClick={() => {
            setError(null);
            loadPlants(true);
          }}
          style={{
            padding: '10px 15px',
            background: '#2c5530',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '15px'
          }}
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // Add a loading indicator
  if (loading || plantsLoading) {
    return (
      <div className="loading-container" style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Inventory</h2>
        <p>{loadingMessage}</p>
        <div className="loading-spinner" style={{ 
          display: 'inline-block',
          width: '30px',
          height: '30px',
          border: '3px solid rgba(0,0,0,0.1)',
          borderRadius: '50%',
          borderTopColor: '#2c5530',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      {/* Page Header */}
      <div className="page-header">
        <h1>Flower Inventory</h1>
        <div className="button-group">
          <button 
            className="export-inventory-btn"
            onClick={async () => exportInventory(plants)}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Inventory Header */}
      <InventoryHeader
        activeTab={activeTab}
        handleTabChange={handleTabChange}
        filter={filter}
        setFilter={setFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusCounts={statusCounts}
      />

      {/* Inventory Tab Content */}
      <div className="tab-content">
        {apiRetryCount > 0 && (
          <div className="api-warning">
            <p><span role="img" aria-label="Warning">⚠️</span> API connection issues detected. Your changes are being saved locally and will sync when the connection is restored.</p>
          </div>
        )}
        
        <InventoryTable
          filteredPlants={filteredPlants}
          editMode={editMode}
          editValues={editValues}
          sortConfig={sortConfig}
          handleSort={handleSort}
          handleChange={handleChange}
          handleEdit={handleEdit}
          handleSave={handleSave}
          handleCancel={handleCancel}
          saveStatus={saveStatus}
          onEditPlant={handleEditPlant}
          fixUnknownStatuses={fixUnknownStatuses}
        />
      </div>
    </div>
  );
};

export default ModularInventoryManager; 