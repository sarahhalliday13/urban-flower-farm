import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPlants, updateInventory, subscribeToInventory, processSyncQueue, initializeDefaultInventory, addPlant, updatePlant, loadSamplePlants, importPlantsFromSheets } from '../services/firebase';
import '../styles/InventoryManager.css';
import '../styles/PlantManagement.css';
import '../styles/FirebaseMigration.css';

const InventoryManager = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading inventory data...');
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    lastSync: null,
    pendingUpdates: 0,
    message: 'No sync activity'
  });
  
  // New state for tabbed interface
  const [activeTab, setActiveTab] = useState('inventory');
  
  // New state for plant management
  const [plantEditMode, setPlantEditMode] = useState(false);
  const [currentPlant, setCurrentPlant] = useState(null);
  const [plantFormData, setPlantFormData] = useState({
    name: '',
    scientificName: '',
    price: '',
    description: '',
    mainImage: '',
    colour: '',
    light: '',
    height: '',
    bloomSeason: '',
    attributes: '',
    hardinessZone: '',
    spacing: ''
  });
  const [plantSaveStatus, setPlantSaveStatus] = useState('');
  const [plantSearchTerm, setPlantSearchTerm] = useState('');
  
  // Use refs for timers to prevent memory leaks
  const refreshTimerRef = useRef(null);
  const syncTimerRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  
  const [apiRetryCount, setApiRetryCount] = useState(0);

  // Add migration state
  const [migrationStatus, setMigrationStatus] = useState({
    loading: false,
    success: false,
    error: null,
    message: '',
    plantsCount: 0
  });

  // Check sync queue status - moved before useEffect that uses it
  const checkSyncQueue = useCallback(() => {
    try {
      const queueData = localStorage.getItem('inventorySyncQueue');
      if (queueData) {
        const queue = JSON.parse(queueData);
        setSyncStatus(prev => ({
          ...prev,
          pendingUpdates: queue.length,
          message: queue.length > 0 ? `${queue.length} updates pending sync` : 'No pending updates'
        }));
      } else {
        setSyncStatus(prev => ({
          ...prev,
          pendingUpdates: 0,
          message: 'No pending updates'
        }));
      }
    } catch (e) {
      console.error('Error checking sync queue:', e);
    }
  }, []);

  // Load sample data directly
  const loadSampleData = useCallback(async () => {
    setLoading(true);
    setLoadingMessage('Loading sample plant data...');
    console.log('DEBUG: Starting loadSampleData');
    
    try {
      console.log('DEBUG: Calling loadSamplePlants');
      const sampleData = await loadSamplePlants();
      console.log('DEBUG: Received sample data with', sampleData.length, 'plants');
      setPlants(sampleData);
      
      // Initialize edit values
      const initialValues = {};
      sampleData.forEach(plant => {
        initialValues[plant.id] = {
          currentStock: plant.inventory?.currentStock || 0,
          status: plant.inventory?.status || 'Unknown',
          restockDate: plant.inventory?.restockDate || '',
          notes: plant.inventory?.notes || ''
        };
      });
      
      setEditValues(initialValues);
      setLoading(false);
      setError(null);
      console.log('DEBUG: Completed loadSampleData successfully');
    } catch (err) {
      console.error('Error loading sample data:', err);
      console.log('DEBUG: Error in loadSampleData:', err.message);
      setError(`Failed to load sample data: ${err.message}`);
      setLoading(false);
      console.log('DEBUG: Falling back to localStorage due to sample data failure');
      forceLoadData(); // Fall back to localStorage if even sample data fails
    }
  }, []);

  // Define forceLoadData before using it in loadPlants
  const forceLoadData = useCallback(() => {
    // Clear any existing loading timer
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    
    // Try to load from cache first
    try {
      const cachedData = localStorage.getItem('cachedPlantsWithTimestamp');
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        console.log(`Force loading ${data.length} plants from cache`);
        setPlants(data);
        
        // Initialize edit values
        const initialValues = {};
        data.forEach(plant => {
          initialValues[plant.id] = {
            currentStock: plant.inventory?.currentStock || 0,
            status: plant.inventory?.status || 'Unknown',
            restockDate: plant.inventory?.restockDate || '',
            notes: plant.inventory?.notes || ''
          };
        });
        
        setEditValues(initialValues);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error('Error force loading from cache:', e);
    }
    
    // If no cache, initialize default inventory
    initializeDefaultInventory();
    
    // Get default inventory from localStorage
    try {
      const storedInventory = localStorage.getItem('plantInventory');
      if (storedInventory) {
        const parsedInventory = JSON.parse(storedInventory);
        
        // Create minimal plant data from the default inventory
        const fallbackPlants = Object.keys(parsedInventory).map(id => ({
          id: parseInt(id),
          name: `Plant ${id}`,
          scientificName: `Scientific Name ${id}`,
          mainImage: '',
          price: '0',
          inventory: parsedInventory[id]
        }));
        
        console.log(`Created ${fallbackPlants.length} fallback plants`);
        setPlants(fallbackPlants);
        
        // Initialize edit values for fallback plants
        const initialValues = {};
        fallbackPlants.forEach(plant => {
          initialValues[plant.id] = {
            currentStock: plant.inventory?.currentStock || 0,
            status: plant.inventory?.status || 'Unknown',
            restockDate: plant.inventory?.restockDate || '',
            notes: plant.inventory?.notes || ''
          };
        });
        
        setEditValues(initialValues);
        setLoading(false);
      }
    } catch (e) {
      console.error('Error creating fallback data:', e);
      setError('Failed to load inventory data. Please refresh the page and try again.');
      setLoading(false);
    }
  }, []);

  // Load plants from Firebase
  const loadPlants = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setLoadingMessage('Fetching plants from Firebase...');
      console.log('DEBUG: Starting loadPlants, forceRefresh =', forceRefresh);
      
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        console.log('DEBUG: Cleared existing fetch timeout');
      }
      
      // Set a timeout to prevent infinite loading - reduced to 5 seconds
      console.log('DEBUG: Setting 5 second timeout for Firebase fetch');
      fetchTimeoutRef.current = setTimeout(() => {
        console.error('Firebase fetch timed out after 5 seconds');
        console.log('DEBUG: Timeout triggered, loading sample data instead');
        setApiRetryCount(prev => prev + 1);
        setError('Firebase connection timed out. Loading sample data instead.');
        loadSampleData(); // Load sample data instead of forcing local data
      }, 5000); // 5 second timeout - reduced from 10 seconds
      
      console.log('DEBUG: Calling fetchPlants() from Firebase service');
      const plantsData = await fetchPlants();
      console.log('DEBUG: Received response from fetchPlants():', plantsData ? plantsData.length : 'null', 'plants');
      
      // Clear the timeout since we got a response
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
        console.log('DEBUG: Cleared timeout after successful fetch');
      }
      
      if (plantsData.length === 0) {
        console.log('DEBUG: No plants found, initializing default inventory');
        // If no plants found, initialize default inventory
        await initializeDefaultInventory();
        // Try fetching again
        console.log('DEBUG: Fetching plants again after initialization');
        const defaultPlants = await fetchPlants();
        console.log('DEBUG: Second fetch returned', defaultPlants ? defaultPlants.length : 'null', 'plants');
        
        if (defaultPlants.length === 0) {
          // If still no plants, use sample data
          console.log('DEBUG: Still no plants after initialization, using sample data');
          loadSampleData();
          return;
        }
        
        setPlants(defaultPlants);
        console.log('DEBUG: Using default plants:', defaultPlants.length);
      } else {
        console.log('DEBUG: Successfully loaded', plantsData.length, 'plants from Firebase');
        setPlants(plantsData);
        
        // Cache the data for offline use
        try {
          localStorage.setItem('cachedPlantsWithTimestamp', JSON.stringify({
            timestamp: new Date().toISOString(),
            data: plantsData,
            source: 'firebase'
          }));
          console.log('DEBUG: Cached', plantsData.length, 'plants to localStorage');
        } catch (e) {
          console.error('Error caching plants data:', e);
        }
      }
      
      // Initialize edit values for all plants
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
      setError(null);
      console.log('DEBUG: Completed loadPlants successfully');
    } catch (err) {
      console.error('Error loading plants:', err);
      console.log('DEBUG: Error in loadPlants:', err.message);
      
      // Clear the timeout if it exists
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
        console.log('DEBUG: Cleared timeout due to error');
      }
      
      setError(`Failed to load plants: ${err.message}`);
      setApiRetryCount(prev => prev + 1);
      
      // Try to use sample data instead of localStorage
      console.log('DEBUG: Error occurred, falling back to sample data');
      loadSampleData();
    }
  }, [forceLoadData, loadSampleData]);
  
  // Subscribe to real-time inventory updates
  useEffect(() => {
    // Load plants initially
    loadPlants();
    
    // Subscribe to inventory changes
    const unsubscribe = subscribeToInventory((inventoryData) => {
      console.log('Received real-time inventory update:', inventoryData);
      
      // Update plants with new inventory data
      setPlants(prevPlants => 
        prevPlants.map(plant => ({
          ...plant,
          inventory: inventoryData[plant.id] || plant.inventory
        }))
      );
    });
    
    // Set up periodic sync check
    syncTimerRef.current = setInterval(() => {
      checkSyncQueue();
    }, 60 * 1000); // Check sync status every minute
    
    // Store refreshTimerRef value in a variable for cleanup
    const refreshTimer = refreshTimerRef.current;
    const loadingTimer = loadingTimerRef.current;
    const syncTimer = syncTimerRef.current;
    const fetchTimeout = fetchTimeoutRef.current;
    
    // Cleanup on unmount
    return () => {
      if (unsubscribe) unsubscribe();
      if (refreshTimer) clearInterval(refreshTimer);
      if (loadingTimer) clearTimeout(loadingTimer);
      if (syncTimer) clearInterval(syncTimer);
      if (fetchTimeout) clearTimeout(fetchTimeout);
    };
  }, [loadPlants, checkSyncQueue]);

  // Process pending updates
  const processPendingUpdates = useCallback(async () => {
    if (syncStatus.syncing) return;
    
    setSyncStatus(prev => ({
      ...prev,
      syncing: true,
      message: 'Syncing inventory updates...'
    }));
    
    try {
      const result = await processSyncQueue();
      
      setSyncStatus({
        syncing: false,
        lastSync: new Date().toISOString(),
        pendingUpdates: result.remainingItems,
        message: result.message
      });
      
      // Refresh plants data to reflect synced changes
      if (result.syncedItems > 0) {
        loadPlants(true);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
      
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        message: `Sync error: ${error.message}`
      }));
    }
  }, [syncStatus.syncing, loadPlants]);

  // Handle edit button click
  const handleEdit = useCallback((plantId) => {
    setEditMode(prev => ({
      ...prev,
      [plantId]: true
    }));
  }, []);

  // Handle cancel button click
  const handleCancel = useCallback((plantId) => {
    // Reset edit values to current plant values
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
      setEditValues(prev => ({
        ...prev,
        [plantId]: {
          currentStock: plant.inventory?.currentStock || 0,
          status: plant.inventory?.status || 'Unknown',
          restockDate: plant.inventory?.restockDate || '',
          notes: plant.inventory?.notes || ''
        }
      }));
    }
    
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
  }, [plants]);

  // Handle form field changes
  const handleChange = useCallback((plantId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [plantId]: {
        ...prev[plantId],
        [field]: value
      }
    }));
  }, []);

  // Handle save button click
  const handleSave = useCallback(async (plantId) => {
    // Set saving status
    setSaveStatus(prev => ({
      ...prev,
      [plantId]: 'saving'
    }));
    
    try {
      // Get the edited values
      const inventoryData = editValues[plantId];
      
      // Call API to update inventory
      const result = await updateInventory(plantId, inventoryData);
      
      // Update local plant data to reflect changes
      setPlants(prev => prev.map(plant => {
        if (plant.id === plantId) {
          return {
            ...plant,
            inventory: {
              ...plant.inventory,
              currentStock: inventoryData.currentStock,
              status: inventoryData.status,
              restockDate: inventoryData.restockDate,
              notes: inventoryData.notes
            }
          };
        }
        return plant;
      }));
      
      // Set success status
      setSaveStatus(prev => ({
        ...prev,
        [plantId]: 'success'
      }));
      
      // Exit edit mode after a delay
      setTimeout(() => {
        setEditMode(prev => {
          const newState = { ...prev };
          delete newState[plantId];
          return newState;
        });
        
        setSaveStatus(prev => {
          const newState = { ...prev };
          delete newState[plantId];
          return newState;
        });
      }, 1500);
      
      // Check sync queue in case it was updated
      checkSyncQueue();
      
      // Show warning if there was one
      if (result.warning) {
        console.warn(result.warning);
      }
    } catch (error) {
      console.error('Error saving inventory:', error);
      
      // Set error status
      setSaveStatus(prev => ({
        ...prev,
        [plantId]: 'error'
      }));
      
      // Clear error status after a delay
      setTimeout(() => {
        setSaveStatus(prev => {
          const newState = { ...prev };
          delete newState[plantId];
          return newState;
        });
      }, 3000);
    }
  }, [editValues, checkSyncQueue]);

  const getFilteredPlants = useCallback(() => {
    let filtered = [...plants];
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(plant => {
        if (!plant.inventory?.status) return false;
        
        // Exact match on status
        return plant.inventory.status === filter;
      });
    }
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(plant => 
        plant.name.toLowerCase().includes(term) || 
        (plant.scientificName && plant.scientificName.toLowerCase().includes(term)) ||
        String(plant.id).toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [plants, filter, searchTerm]);

  // Memoize the filtered plants to prevent unnecessary recalculations
  const filteredPlants = React.useMemo(() => getFilteredPlants(), [getFilteredPlants]);

  // Force a refresh of data when the component mounts
  useEffect(() => {
    // Clear any cached data to ensure we get fresh data from the API
    localStorage.removeItem('cachedPlantsWithTimestamp');
    
    // Force a refresh after a short delay to allow the component to render
    const refreshTimer = setTimeout(() => {
      loadPlants(true); // Force refresh
    }, 500);
    
    return () => clearTimeout(refreshTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // New function for handling plant form input changes
  const handlePlantFormChange = (e) => {
    const { name, value } = e.target;
    setPlantFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // New function for handling plant form submission
  const handlePlantSubmit = async (e) => {
    e.preventDefault();
    setPlantSaveStatus('saving');

    try {
      // Prepare plant data
      const plantData = {
        ...plantFormData,
        // If editing, keep the existing ID, otherwise generate a new one
        id: plantEditMode && currentPlant ? currentPlant.id : Math.max(0, ...plants.map(p => parseInt(p.id) || 0)) + 1
      };

      if (plantEditMode && currentPlant) {
        // Update existing plant
        await updatePlant(currentPlant.id, plantData);
        setPlantSaveStatus('success');
        
        // Update local plants array
        setPlants(prev => prev.map(p => 
          p.id === currentPlant.id ? { ...p, ...plantData } : p
        ));
      } else {
        // Add new plant
        await addPlant(plantData);
        setPlantSaveStatus('success');
        
        // Add to local plants array
        setPlants(prev => [...prev, plantData]);
      }

      // Reset form after successful save
      setTimeout(() => {
        resetPlantForm();
        setPlantSaveStatus('');
      }, 2000);
    } catch (error) {
      console.error('Error saving plant:', error);
      setPlantSaveStatus('error');
    }
  };

  // New function to reset plant form
  const resetPlantForm = () => {
    setPlantFormData({
      name: '',
      scientificName: '',
      price: '',
      description: '',
      mainImage: '',
      colour: '',
      light: '',
      height: '',
      bloomSeason: '',
      attributes: '',
      hardinessZone: '',
      spacing: ''
    });
    setPlantEditMode(false);
    setCurrentPlant(null);
  };

  // New function to handle edit plant button click
  const handleEditPlant = (plant) => {
    setCurrentPlant(plant);
    setPlantFormData({
      name: plant.name || '',
      scientificName: plant.scientificName || '',
      price: plant.price || '',
      description: plant.description || '',
      mainImage: plant.mainImage || '',
      colour: plant.colour || '',
      light: plant.light || '',
      height: plant.height || '',
      bloomSeason: plant.bloomSeason || '',
      attributes: plant.attributes || '',
      hardinessZone: plant.hardinessZone || '',
      spacing: plant.spacing || ''
    });
    setPlantEditMode(true);
    setActiveTab('addPlant'); // Switch to the add/edit plant tab
  };

  // Filter plants based on search term for plant management
  const filteredPlantsForManagement = plants.filter(plant => 
    plant.name?.toLowerCase().includes(plantSearchTerm.toLowerCase()) || 
    plant.scientificName?.toLowerCase().includes(plantSearchTerm.toLowerCase()) ||
    String(plant.id).includes(plantSearchTerm)
  );

  // Add migration handler
  const handleMigration = async () => {
    setMigrationStatus({
      loading: true,
      success: false,
      error: null,
      message: 'Loading sample plant data...',
      plantsCount: 0
    });

    try {
      // Step 1: Load sample plants instead of fetching from Google Sheets
      const plantsData = await loadSamplePlants();
      
      setMigrationStatus(prev => ({
        ...prev,
        message: `Found ${plantsData.length} sample plants. Importing to Firebase...`
      }));

      // Step 2: Import plants to Firebase
      const result = await importPlantsFromSheets(plantsData);
      
      // Step 3: Initialize default inventory if needed
      await initializeDefaultInventory();
      
      // Step 4: Refresh the plants data
      loadPlants(true);

      setMigrationStatus({
        loading: false,
        success: true,
        error: null,
        message: result.message || `Successfully imported ${plantsData.length} plants to Firebase`,
        plantsCount: plantsData.length
      });
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus({
        loading: false,
        success: false,
        error: error.message,
        message: `Failed to import plants: ${error.message}`,
        plantsCount: 0
      });
    }
  };

  if (loading) return (
    <div className="inventory-loading">
      <div className="loading-spinner"></div>
      <div className="loading-message">{loadingMessage}</div>
      <p className="loading-tip">
        If loading takes too long, Firebase might be experiencing connection issues.
      </p>
      <div className="loading-buttons">
        <button 
          className="force-load-btn"
          onClick={loadSampleData}
        >
          Load Sample Data
        </button>
        <button 
          className="force-load-btn secondary"
          onClick={forceLoadData}
        >
          Load from Local Cache
        </button>
      </div>
      <p className="loading-note">
        Note: Sample data contains demo plants for testing. Local cache will use the last saved data.
      </p>
    </div>
  );
  
  if (error) return (
    <div className="inventory-error">
      <p className="error-message">{error}</p>
      <div className="error-buttons">
        <button 
          className="force-load-btn"
          onClick={loadSampleData}
        >
          Load Sample Data
        </button>
        <button 
          className="force-load-btn secondary"
          onClick={forceLoadData}
        >
          Load from Local Cache
        </button>
      </div>
      {apiRetryCount > 0 && (
        <div className="api-retry-info">
          <p>API connection attempts: {apiRetryCount}</p>
          <p>We're having trouble connecting to Firebase. You can use sample data for testing or load from local cache if you have previously saved data.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="inventory-manager">
      <h1>Inventory</h1>
      
      {/* Tab Navigation */}
      <div className="inventory-tabs">
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
        <button 
          className={`tab-button ${activeTab === 'addPlant' ? 'active' : ''}`}
          onClick={() => setActiveTab('addPlant')}
        >
          Add New Flower
        </button>
        <button 
          className={`tab-button ${activeTab === 'bulkUpload' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulkUpload')}
        >
          Sample Data
        </button>
      </div>
      
      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <div className="tab-content">
          <div className="inventory-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search plants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-controls">
              <label htmlFor="statusFilter">Status:</label>
              <select
                id="statusFilter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="in-stock">In Stock</option>
                <option value="out-of-stock">Out of Stock</option>
                <option value="coming-soon">Coming Soon</option>
                <option value="pre-order">Pre-order</option>
              </select>
            </div>
            
            <div className="admin-buttons">
              <button 
                className="refresh-btn"
                onClick={() => loadPlants(true)}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
              
              <button 
                className="sync-btn"
                onClick={processPendingUpdates}
                disabled={syncStatus.syncing || syncStatus.pendingUpdates === 0}
              >
                {syncStatus.syncing ? 'Syncing...' : `Sync Updates (${syncStatus.pendingUpdates})`}
              </button>
            </div>
          </div>
          
          {syncStatus.pendingUpdates > 0 && (
            <div className="sync-status">
              <div className="sync-message">
                {syncStatus.message}
                {syncStatus.lastSync && (
                  <span className="sync-time">
                    Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {apiRetryCount > 0 && (
            <div className="api-warning">
              <p>⚠️ API connection issues detected. Your changes are being saved locally and will sync when the connection is restored.</p>
            </div>
          )}
          
          <div className="inventory-stats">
            <p>Total plants: {plants.length}</p>
            <p>Filtered plants: {filteredPlants.length}</p>
          </div>
          
          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Plant</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Restock Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-results">No plants found matching your criteria</td>
                  </tr>
                ) : (
                  filteredPlants.map(plant => {
                    const isEditing = editMode[plant.id] || false;
                    const statusClass = plant.inventory?.status 
                      ? plant.inventory.status.toLowerCase().replace(/\s+/g, '-') 
                      : 'unknown';
                    
                    return (
                      <tr key={plant.id} className={isEditing ? 'editing' : ''}>
                        <td data-label="Plant" className="plant-info">
                          <div className="plant-image">
                            {plant.mainImage ? (
                              <img 
                                src={plant.mainImage} 
                                alt={plant.name}
                                onError={(e) => {
                                  e.target.src = '/images/placeholder.jpg';
                                }}
                              />
                            ) : (
                              <div className="no-image">No Image</div>
                            )}
                          </div>
                          <div className="plant-details">
                            <span className="plant-name">{plant.name}</span>
                            <span className="plant-scientific-name">{plant.scientificName}</span>
                            <span className="plant-price">${plant.price}</span>
                          </div>
                        </td>
                        
                        {isEditing ? (
                          <>
                            <td data-label="Stock">
                              <input
                                type="number"
                                min="0"
                                value={editValues[plant.id]?.currentStock || 0}
                                onChange={(e) => handleChange(plant.id, 'currentStock', e.target.value)}
                              />
                            </td>
                            <td data-label="Status">
                              <select
                                value={editValues[plant.id]?.status || 'Unknown'}
                                onChange={(e) => handleChange(plant.id, 'status', e.target.value)}
                              >
                                <option value="In Stock">In Stock</option>
                                <option value="Out of Stock">Out of Stock</option>
                                <option value="Coming Soon">Coming Soon</option>
                                <option value="Pre-order">Pre-order</option>
                                <option value="Discontinued">Discontinued</option>
                              </select>
                            </td>
                            <td data-label="Restock Date">
                              <input
                                type="date"
                                value={editValues[plant.id]?.restockDate || ''}
                                onChange={(e) => handleChange(plant.id, 'restockDate', e.target.value)}
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
                              <span className={`status-badge ${statusClass}`}>
                                {plant.inventory?.status || 'Unknown'}
                              </span>
                            </td>
                            <td data-label="Restock Date">{plant.inventory?.restockDate || 'N/A'}</td>
                            <td data-label="Actions" className="action-buttons">
                              <button 
                                className="edit-plant-btn"
                                onClick={() => handleEditPlant(plant)}
                              >
                                Update
                              </button>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add/Edit Plant Tab Content - renamed to Add New Flower */}
      {activeTab === 'addPlant' && (
        <div className="tab-content">
          <h2>{plantEditMode ? 'Edit Flower' : 'Add New Flower'}</h2>
          
          <form className="plant-form" onSubmit={handlePlantSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Plant Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={plantFormData.name}
                  onChange={handlePlantFormChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="scientificName">Scientific Name</label>
                <input
                  type="text"
                  id="scientificName"
                  name="scientificName"
                  value={plantFormData.scientificName}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">Price</label>
                <input
                  type="text"
                  id="price"
                  name="price"
                  value={plantFormData.price}
                  onChange={handlePlantFormChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="mainImage">Main Image URL</label>
                <input
                  type="text"
                  id="mainImage"
                  name="mainImage"
                  value={plantFormData.mainImage}
                  onChange={handlePlantFormChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={plantFormData.description}
                onChange={handlePlantFormChange}
                rows="4"
              ></textarea>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="colour">Color</label>
                <input
                  type="text"
                  id="colour"
                  name="colour"
                  value={plantFormData.colour}
                  onChange={handlePlantFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="light">Light Requirements</label>
                <input
                  type="text"
                  id="light"
                  name="light"
                  value={plantFormData.light}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="height">Height</label>
                <input
                  type="text"
                  id="height"
                  name="height"
                  value={plantFormData.height}
                  onChange={handlePlantFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bloomSeason">Bloom Season</label>
                <input
                  type="text"
                  id="bloomSeason"
                  name="bloomSeason"
                  value={plantFormData.bloomSeason}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hardinessZone">Hardiness Zone</label>
                <input
                  type="text"
                  id="hardinessZone"
                  name="hardinessZone"
                  value={plantFormData.hardinessZone}
                  onChange={handlePlantFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="spacing">Spacing</label>
                <input
                  type="text"
                  id="spacing"
                  name="spacing"
                  value={plantFormData.spacing}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="attributes">Attributes</label>
              <input
                type="text"
                id="attributes"
                name="attributes"
                value={plantFormData.attributes}
                onChange={handlePlantFormChange}
                placeholder="Drought-tolerant, Deer-resistant, etc."
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className={`save-btn ${plantSaveStatus}`}
                disabled={plantSaveStatus === 'saving'}
              >
                {plantSaveStatus === 'saving' ? 'Saving...' : plantEditMode ? 'Update Flower' : 'Add Flower'}
              </button>
              
              {plantEditMode && (
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={resetPlantForm}
                >
                  Cancel
                </button>
              )}
              
              {plantSaveStatus === 'success' && (
                <span className="success-message">Flower saved successfully!</span>
              )}
              
              {plantSaveStatus === 'error' && (
                <span className="error-message">Error saving flower. Please try again.</span>
              )}
            </div>
          </form>
          
          <div className="plants-list-section">
            <h2>Existing Plants</h2>
            
            <div className="search-box">
              <input
                type="text"
                placeholder="Search plants..."
                value={plantSearchTerm}
                onChange={(e) => setPlantSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="plants-list">
              {filteredPlantsForManagement.length === 0 ? (
                <p className="no-plants">No plants found matching your search.</p>
              ) : (
                filteredPlantsForManagement.map(plant => (
                  <div key={plant.id} className="plant-item">
                    <div className="plant-info">
                      <h3>{plant.name}</h3>
                      <p className="scientific-name">{plant.scientificName}</p>
                      <p className="price">${plant.price}</p>
                    </div>
                    <div className="plant-image">
                      {plant.mainImage ? (
                        <img src={plant.mainImage} alt={plant.name} />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </div>
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditPlant(plant)}
                    >
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* New Bulk Upload Tab */}
      {activeTab === 'bulkUpload' && (
        <div className="tab-content">
          <h2>Bulk Upload from Sample Data</h2>
          
          <div className="bulk-upload-section">
            <p>
              Import sample plant data to Firebase. This is useful for quickly populating your 
              database with a predefined set of plants.
            </p>
            <p className="note">
              <strong>Note:</strong> This will add the sample plants to your database. If plants with the same IDs already exist,
              they will be updated with the sample data.
            </p>
            
            <button 
              className={`migration-button ${migrationStatus?.loading ? 'loading' : ''}`}
              onClick={handleMigration}
              disabled={migrationStatus?.loading}
            >
              {migrationStatus?.loading ? 'Importing...' : 'Import Sample Plants'}
            </button>
            
            {migrationStatus?.success && (
              <div className="success-message">
                <p>{migrationStatus.message}</p>
              </div>
            )}
            
            {migrationStatus?.error && (
              <div className="error-message">
                <p>{migrationStatus.message}</p>
              </div>
            )}
          </div>
          
          <div className="migration-help">
            <h3>How Sample Data Import Works</h3>
            <ol>
              <li>The sample data consists of 10 pre-defined plants with images and details</li>
              <li>When you click "Import Sample Plants", the data will be loaded from the public directory</li>
              <li>The plants will be imported into your Firebase database</li>
              <li>Default inventory data will be created for each plant</li>
              <li>After import completes, verify your plants in the Inventory tab</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager; 