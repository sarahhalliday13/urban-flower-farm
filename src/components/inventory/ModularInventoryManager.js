import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { 
  fetchPlants,
  updateInventory,
  updatePlant,
  addPlant,
  subscribeToInventory, 
  processSyncQueue,
  uploadImageToFirebase
} from '../../services/firebase';
import InventoryHeader from './InventoryHeader';
import InventoryTable from './InventoryTable';
import ImageUploader from '../plant-editor/sections/ImageUploader';
import '../../styles/InventoryManager.css';
import '../../styles/PlantManagement.css';
import { useNavigate } from 'react-router-dom';

const ModularInventoryManager = () => {
  // Get admin context
  const { plants, loading: plantsLoading, error: plantsError, loadPlants, updatePlantData, apiRetryCount } = useAdmin();

  // Main component state
  const [activeTab, setActiveTab] = useState('inventory');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  // Plant editor state
  const [plantEditMode, setPlantEditMode] = useState(false);
  const [currentPlant, setCurrentPlant] = useState(null);
  const [plantFormData, setPlantFormData] = useState({
    name: '',
    scientificName: '',
    price: '',
    description: '',
    images: [],
    mainImageIndex: 0,
    mainImage: '',
    colour: '',
    light: '',
    height: '',
    spread: '',
    bloomSeason: '',
    plantType: '',
    specialFeatures: '',
    uses: '',
    aroma: '',
    gardeningTips: '',
    careTips: '',
    hardinessZone: '',
    plantingSeason: '',
    plantingDepth: '',
    size: '',
    featured: false,
    hidden: false,
    inventory: {
      currentStock: 0,
      status: 'In Stock',
      restockDate: '',
      notes: ''
    }
  });
  const [plantSaveStatus, setPlantSaveStatus] = useState('idle');
  
  const navigate = useNavigate();
  
  // Use refs for timers to prevent memory leaks
  const saveTimerRef = useRef(null);
  const searchTimerRef = useRef(null);
  
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
  
  // Reset plant form state
  const resetPlantForm = useCallback(() => {
    setPlantFormData({
      name: '',
      scientificName: '',
      price: '',
      description: '',
      images: [],
      mainImageIndex: 0,
      mainImage: '',
      colour: '',
      light: '',
      height: '',
      spread: '',
      bloomSeason: '',
      plantType: '',
      specialFeatures: '',
      uses: '',
      aroma: '',
      gardeningTips: '',
      careTips: '',
      hardinessZone: '',
      plantingSeason: '',
      plantingDepth: '',
      size: '',
      featured: false,
      hidden: false,
      inventory: {
        currentStock: 0,
        status: 'In Stock',
        restockDate: '',
        notes: ''
      }
    });
    setCurrentPlant(null);
    setPlantEditMode(false);
    setPlantSaveStatus('idle');
  }, []);
  
  // Helper function to update plant form data including nested fields
  const updatePlantForm = useCallback((field, value) => {
    setPlantFormData(prev => {
      // Handle nested inventory fields
      if (field.startsWith('inventory.')) {
        const inventoryField = field.split('.')[1];
        return {
          ...prev,
          inventory: {
            ...prev.inventory,
            [inventoryField]: value
          }
        };
      }
      
      // Handle regular fields
      return {
        ...prev,
        [field]: value
      };
    });
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
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

  // Helper function to standardize status values
  const standardizeInventoryStatus = (status) => {
    if (!status) return 'Unknown';
    
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === 'in stock') return 'In Stock';
    if (lowerStatus === 'low stock') return 'In Stock';
    if (lowerStatus === 'out of stock' || lowerStatus === 'sold out') return 'Out of Stock';
    if (lowerStatus.includes('coming') && lowerStatus.includes('soon')) return 'Coming Soon';
    if (lowerStatus.includes('pre') && lowerStatus.includes('order')) return 'Pre-order';
    
    return status; // Return original if no match
  };

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
      } else {
        // Standardize status
        status = standardizeInventoryStatus(status);
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
    console.log("handleEditPlant called with plant:", plant);
    // Instead of navigating to a different URL, we'll set up edit mode with this plant's data
    setCurrentPlant(plant);
    
    // Convert mainImage to images array if needed
    let images = plant.images || [];
    if ((!images || images.length === 0) && plant.mainImage) {
      images = [plant.mainImage];
      // Also check for additionalImages
      if (plant.additionalImages) {
        if (typeof plant.additionalImages === 'string') {
          // If it's a comma-separated string
          const additionalArr = plant.additionalImages.split(',').map(img => img.trim()).filter(img => img);
          images = [...images, ...additionalArr];
        } else if (Array.isArray(plant.additionalImages)) {
          images = [...images, ...plant.additionalImages];
        }
      }
    }
    
    setPlantFormData({
      id: plant.id || '',
      name: plant.name || '',
      scientificName: plant.scientificName || '',
      commonName: plant.commonName || '',
      price: plant.price || '',
      description: plant.description || '',
      images: images,
      mainImageIndex: plant.mainImageIndex || 0,
      mainImage: plant.mainImage || '',
      colour: plant.colour || '',
      light: plant.light || '',
      height: plant.height || '',
      spread: plant.spread || '',
      bloomSeason: plant.bloomSeason || '',
      plantType: plant.plantType || '',
      specialFeatures: plant.specialFeatures || '',
      uses: plant.uses || '',
      aroma: plant.aroma || '',
      gardeningTips: plant.gardeningTips || '',
      careTips: plant.careTips || '',
      hardinessZone: plant.hardinessZone || '',
      plantingSeason: plant.plantingSeason || '',
      plantingDepth: plant.plantingDepth || '',
      size: plant.size || '',
      featured: plant.featured === true || plant.featured === 'true',
      hidden: plant.hidden === true || plant.hidden === 'true',
      inventory: {
        currentStock: plant.inventory?.currentStock || 0,
        status: plant.inventory?.status || 'In Stock',
        restockDate: plant.inventory?.restockDate || '',
        notes: plant.inventory?.notes || ''
      }
    });
    
    setPlantEditMode(true);
    setActiveTab('addPlant');
  }, []);

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
          status: standardizeInventoryStatus(newStatus),
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

  // Filter plants based on search term, filter status, and categories
  const filteredPlants = useMemo(() => {
    if (!plants) return [];
    
    let filtered = [...plants];
    
    // Apply search term filter
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(plant => {
        const name = (plant.name || '').toLowerCase();
        const commonName = (plant.commonName || '').toLowerCase();
        const scientificName = (plant.scientificName || '').toLowerCase();
        const botanicalName = (plant.botanicalName || '').toLowerCase();
        const description = (plant.description || '').toLowerCase();
        const shortDescription = (plant.shortDescription || '').toLowerCase();
        const plantId = String(plant.id || '').toLowerCase();
        
        return (
          name.includes(term) ||
          commonName.includes(term) ||
          scientificName.includes(term) ||
          botanicalName.includes(term) ||
          description.includes(term) ||
          shortDescription.includes(term) ||
          plantId.includes(term)
        );
      });
    }
    
    // Apply status filter (now includes both visible and hidden plants)
    if (filter !== 'all') {
      if (filter === 'Sold Out') {
        // Include both "Sold Out" and "Out of Stock"
        filtered = filtered.filter(plant => 
          (plant.inventory?.status === 'Sold Out' || plant.inventory?.status === 'Out of Stock')
        );
      } else if (filter === 'Unknown') {
        // Filter for plants with missing or nonstandard status
        filtered = filtered.filter(plant => 
          !plant.inventory || 
          !plant.inventory.status || 
          !['In Stock', 'Low Stock', 'Sold Out', 'Out of Stock', 'Coming Soon', 'coming soon', 'Coming soon', 'Pre-order', 'Pre-Order', 'pre-order', 'Preorder'].includes(plant.inventory.status)
        );
      } else if (filter === 'In Stock') {
        // Include both "In Stock" and "Low Stock"
        filtered = filtered.filter(plant => 
          plant.inventory?.status === 'In Stock' || plant.inventory?.status === 'Low Stock'
        );
      } else if (filter === 'Coming Soon') {
        filtered = filtered.filter(plant => 
          plant.inventory?.status === 'Coming Soon' || 
          plant.inventory?.status === 'coming soon' || 
          plant.inventory?.status === 'Coming soon'
        );
      } else if (filter === 'Pre-order') {
        filtered = filtered.filter(plant => 
          plant.inventory?.status === 'Pre-order' || 
          plant.inventory?.status === 'Pre-Order' || 
          plant.inventory?.status === 'pre-order' || 
          plant.inventory?.status === 'Preorder'
        );
      } else {
        // Filter for specific status
        filtered = filtered.filter(plant => 
          plant.inventory && plant.inventory.status === filter
        );
      }
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Get the values to compare
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = a.name || '';
          bValue = b.name || '';
        } else if (sortConfig.key === 'currentStock') {
          aValue = a.inventory?.currentStock || 0;
          bValue = b.inventory?.currentStock || 0;
        } else if (sortConfig.key === 'status') {
          aValue = a.inventory?.status || '';
          bValue = b.inventory?.status || '';
        } else if (sortConfig.key === 'restockDate') {
          aValue = a.inventory?.restockDate || '';
          bValue = b.inventory?.restockDate || '';
        } else if (sortConfig.key === 'featured') {
          aValue = a.featured === true || a.featured === 'true' ? 1 : 0;
          bValue = b.featured === true || b.featured === 'true' ? 1 : 0;
        } else if (sortConfig.key === 'hidden') {
          aValue = a.hidden === true || a.hidden === 'true' ? 1 : 0;
          bValue = b.hidden === true || b.hidden === 'true' ? 1 : 0;
        }
        
        // Compare the values
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [plants, filter, searchTerm, sortConfig]);

  // Status counts for filter options
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      'In Stock': 0,
      'Sold Out': 0,
      'Coming Soon': 0,
      'Pre-order': 0,
      'Unknown': 0,
      'Hidden': 0 // Keep this for reference, but we won't show it in the dropdown
    };
    
    if (plants) {
      // Count all plants for the 'all' count
      counts.all = plants.length;
      
      // Count by inventory status
      plants.forEach(plant => {
        // Track hidden items separately for reference
        if (plant.hidden === true || plant.hidden === 'true') {
          counts['Hidden']++;
        }
        
        // Count all plants (including hidden) by their status
        if (plant.inventory && plant.inventory.status) {
          const status = plant.inventory.status;
          
          // Count both "In Stock" and "Low Stock" as "In Stock"
          if (status === 'In Stock' || status === 'Low Stock') {
            counts['In Stock']++;
          }
          // Special handling for "Out of Stock" - count it as "Sold Out" 
          else if (status === 'Out of Stock' || status === 'Sold Out') {
            counts['Sold Out']++;
          }
          // Special handling for "Pre-order" with all case variants
          else if (status === 'Pre-order' || status === 'Pre-Order' || status === 'pre-order' || status === 'Preorder') {
            counts['Pre-order']++;
          }
          // Special handling for "Coming Soon" case variants
          else if (status === 'Coming Soon' || status === 'coming soon' || status === 'Coming soon') {
            counts['Coming Soon']++;
          }
          else if (counts[status] !== undefined) {
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

  // Function to update all "Low Stock" plants to "In Stock"
  const updateLowStockToInStock = async () => {
    // Find plants with "Low Stock" status
    const lowStockPlants = plants.filter(plant => 
      plant.inventory?.status === 'Low Stock'
    );
    
    if (lowStockPlants.length === 0) {
      // No plants to update
      console.log('No plants with Low Stock status found.');
      return;
    }
    
    console.log(`Found ${lowStockPlants.length} plants with Low Stock status, updating to In Stock...`);
    let updatedCount = 0;
    
    // Update each plant with In Stock status
    for (const plant of lowStockPlants) {
      try {
        const updatedInventory = {
          ...(plant.inventory || {}),
          status: 'In Stock',
          lastUpdated: new Date().toISOString()
        };
        
        // Update the plant in the database
        await updatePlant(plant.id, {
          ...plant,
          inventory: updatedInventory
        });
        
        // Also update in AdminContext if available
        if (typeof updatePlantData === 'function') {
          updatePlantData({
            ...plant,
            inventory: updatedInventory
          });
        }
        
        updatedCount++;
      } catch (error) {
        console.error(`Error updating status for plant ${plant.id}:`, error);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} of ${lowStockPlants.length} plants from Low Stock to In Stock.`);
    
    // Show success toast if any plants were updated
    if (updatedCount > 0) {
      const event = new CustomEvent('show-toast', { 
        detail: { 
          message: `Updated ${updatedCount} plants from Low Stock to In Stock!`,
          type: 'success',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
    }
  };

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
    
    // Convert Low Stock to In Stock when component mounts
    // Do this with a short delay to ensure plants are loaded
    const timer = setTimeout(() => {
      updateLowStockToInStock();
    }, 2000);
    
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
      clearTimeout(timer);
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
    <div className="inventory-manager">
      {/* Page Header - only show when not in edit mode */}
      {!plantEditMode && (
        <div className="page-header">
          <h1>Flower Inventory</h1>
          <div className="button-group">
            <button 
              className="add-new-button"
              onClick={() => {
                resetPlantForm();
                setPlantEditMode(true);
                setActiveTab('addPlant');
              }}
            >
              Add New Plant
            </button>
          </div>
        </div>
      )}

      {!plantEditMode ? (
        <>
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
        </>
      ) : (
        /* Plant Edit Mode */
        <div className="plant-editor">
          <div className="page-header">
            <h1>{currentPlant ? `Edit ${plantFormData.name}` : 'Add New Plant'}</h1>
            <div className="button-group">
              <button 
                className="back-button"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
                    if (!confirmLeave) {
                      return;
                    }
                    setHasUnsavedChanges(false);
                  }
                  resetPlantForm();
                  setActiveTab('inventory');
                }}
                style={{ height: '40px', minWidth: '120px' }}
              >
                Back to Inventory
              </button>
              <button 
                className="save-btn"
                onClick={async () => {
                  try {
                    setPlantSaveStatus('saving');
                    
                    // ID handling - use existing ID or create new one
                    const plantId = currentPlant ? currentPlant.id : Date.now().toString();
                    
                    // Standardize the inventory status before saving
                    const standardizedInventory = {
                      ...plantFormData.inventory,
                      status: standardizeInventoryStatus(plantFormData.inventory.status)
                    };
                    
                    // Ensure mainImage is set from images array
                    const mainImage = plantFormData.images && plantFormData.images.length > 0 
                      ? plantFormData.images[plantFormData.mainImageIndex || 0] 
                      : plantFormData.mainImage || '';
                    
                    const plantData = {
                      ...plantFormData,
                      id: plantId,
                      mainImage: mainImage,
                      inventory: standardizedInventory
                    };
                    
                    // Use the correct function based on whether we're adding or editing
                    if (currentPlant) {
                      await updatePlant(plantId, plantData);
                    } else {
                      await addPlant(plantData);
                    }
                    
                    // Update the plant in context
                    if (typeof updatePlantData === 'function') {
                      updatePlantData(plantData);
                    }
                    
                    setPlantSaveStatus('success');
                    
                    // Show success toast
                    window.dispatchEvent(new CustomEvent('show-toast', {
                      detail: { 
                        message: currentPlant ? 'Plant updated successfully!' : 'Plant added successfully!',
                        type: 'success',
                        duration: 3000
                      }
                    }));
                    
                    // Reset form and go back to inventory after a delay
                    setTimeout(() => {
                      resetPlantForm();
                      setActiveTab('inventory');
                    }, 1000);
                  } catch (error) {
                    console.error('Error saving plant:', error);
                    setPlantSaveStatus('error');
                    
                    // Show error toast
                    window.dispatchEvent(new CustomEvent('show-toast', {
                      detail: {
                        message: `Error: ${error.message || 'Unknown error'}`,
                        type: 'error',
                        duration: 5000
                      }
                    }));
                  }
                }}
                disabled={plantSaveStatus === 'saving'}
                style={{ height: '40px', minWidth: '120px' }}
              >
                {plantSaveStatus === 'saving' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          
          {/* Plant Form */}
          <div className="plant-form-container">
            <form id="plantForm" className="plant-form">
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Flower Name</label>
                    <input
                      type="text"
                      id="name"
                      value={plantFormData.name}
                      onChange={(e) => updatePlantForm('name', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="scientificName">Scientific Name</label>
                    <input
                      type="text"
                      id="scientificName"
                      value={plantFormData.scientificName}
                      onChange={(e) => updatePlantForm('scientificName', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="commonName">Common Name</label>
                    <input
                      type="text"
                      id="commonName"
                      value={plantFormData.commonName || ''}
                      onChange={(e) => updatePlantForm('commonName', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="colour">Color</label>
                    <input
                      type="text"
                      id="colour"
                      value={plantFormData.colour || ''}
                      onChange={(e) => updatePlantForm('colour', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="price">Price ($)</label>
                    <input
                      type="number"
                      id="price"
                      value={plantFormData.price}
                      onChange={(e) => updatePlantForm('price', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="plantType">Plant Type</label>
                    <input
                      type="text"
                      id="plantType"
                      value={plantFormData.plantType || ''}
                      onChange={(e) => updatePlantForm('plantType', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group wide">
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      value={plantFormData.description}
                      onChange={(e) => updatePlantForm('description', e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                
                {/* Image Section - replaced with new ImageUploader component */}
                <div className="form-row">
                  <div className="form-group wide">
                    <label>Plant Images</label>
                    <ImageUploader 
                      images={plantFormData.images || []}
                      mainImageIndex={plantFormData.mainImageIndex || 0}
                      plantId={plantFormData.id}
                      onUpload={(newImages) => updatePlantForm('images', newImages)}
                      onMainSelect={(index) => {
                        updatePlantForm('mainImageIndex', index);
                        // Also update mainImage for backward compatibility
                        if (plantFormData.images && plantFormData.images[index]) {
                          updatePlantForm('mainImage', plantFormData.images[index]);
                        }
                      }}
                      onRemoveImage={(index) => {
                        const updatedImages = [...plantFormData.images];
                        updatedImages.splice(index, 1);
                        updatePlantForm('images', updatedImages);
                        
                        // If we removed the main image, update mainImageIndex
                        if (index === plantFormData.mainImageIndex) {
                          const newMainIndex = updatedImages.length > 0 ? 0 : null;
                          updatePlantForm('mainImageIndex', newMainIndex);
                          
                          // Also update mainImage for backward compatibility
                          if (newMainIndex !== null && updatedImages[newMainIndex]) {
                            updatePlantForm('mainImage', updatedImages[newMainIndex]);
                          } else {
                            updatePlantForm('mainImage', '');
                          }
                        }
                        // If we removed an image before the mainImageIndex, decrement it
                        else if (index < plantFormData.mainImageIndex) {
                          updatePlantForm('mainImageIndex', plantFormData.mainImageIndex - 1);
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Visibility Section - moved here and condensed */}
                <div className="form-row">
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
                    <div className="toggle-group" style={{ marginRight: '20px', display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={plantFormData.featured}
                          onChange={(e) => updatePlantForm('featured', e.target.checked)}
                          style={{ marginRight: '8px' }}
                        />
                        Featured
                      </label>
                    </div>
                    <div className="toggle-group" style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={plantFormData.hidden}
                          onChange={(e) => updatePlantForm('hidden', e.target.checked)}
                          style={{ marginRight: '8px' }}
                        />
                        Hidden from Shop
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Plant Characteristics */}
              <div className="form-section">
                <h3>Plant Characteristics</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="light">Light Requirements</label>
                    <input
                      type="text"
                      id="light"
                      value={plantFormData.light || ''}
                      onChange={(e) => updatePlantForm('light', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="bloomSeason">Bloom Season</label>
                    <input
                      type="text"
                      id="bloomSeason"
                      value={plantFormData.bloomSeason || ''}
                      onChange={(e) => updatePlantForm('bloomSeason', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="height">Height</label>
                    <input
                      type="text"
                      id="height"
                      value={plantFormData.height || ''}
                      onChange={(e) => updatePlantForm('height', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="spread">Spread</label>
                    <input
                      type="text"
                      id="spread"
                      value={plantFormData.spread || ''}
                      onChange={(e) => updatePlantForm('spread', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="hardinessZone">Hardiness Zone</label>
                    <input
                      type="text"
                      id="hardinessZone"
                      value={plantFormData.hardinessZone || ''}
                      onChange={(e) => updatePlantForm('hardinessZone', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="aroma">Aroma</label>
                    <input
                      type="text"
                      id="aroma"
                      value={plantFormData.aroma || ''}
                      onChange={(e) => updatePlantForm('aroma', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="plantingSeason">Planting Season</label>
                    <input
                      type="text"
                      id="plantingSeason"
                      value={plantFormData.plantingSeason || ''}
                      onChange={(e) => updatePlantForm('plantingSeason', e.target.value)}
                      placeholder="e.g., Spring, Fall"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="plantingDepth">Planting Depth (inches)</label>
                    <input
                      type="text"
                      id="plantingDepth"
                      value={plantFormData.plantingDepth || ''}
                      onChange={(e) => updatePlantForm('plantingDepth', e.target.value)}
                      placeholder="e.g., 0.25, 1-2"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group wide">
                    <label htmlFor="size">Mature Size</label>
                    <input
                      type="text"
                      id="size"
                      value={plantFormData.size || ''}
                      onChange={(e) => updatePlantForm('size', e.target.value)}
                      placeholder="e.g., 2-3 feet tall and wide"
                    />
                  </div>
                </div>
              </div>
              
              {/* Additional Information */}
              <div className="form-section">
                <h3>Additional Information</h3>
                <div className="form-row">
                  <div className="form-group wide">
                    <label htmlFor="specialFeatures">Special Features</label>
                    <textarea
                      id="specialFeatures"
                      value={plantFormData.specialFeatures || ''}
                      onChange={(e) => updatePlantForm('specialFeatures', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group wide">
                    <label htmlFor="uses">Uses</label>
                    <textarea
                      id="uses"
                      value={plantFormData.uses || ''}
                      onChange={(e) => updatePlantForm('uses', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group wide">
                    <label htmlFor="careTips">Care Tips</label>
                    <textarea
                      id="careTips"
                      value={plantFormData.careTips || ''}
                      onChange={(e) => updatePlantForm('careTips', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group wide">
                    <label htmlFor="gardeningTips">Gardening Tips</label>
                    <textarea
                      id="gardeningTips"
                      value={plantFormData.gardeningTips || ''}
                      onChange={(e) => updatePlantForm('gardeningTips', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              {/* Inventory Section */}
              <div className="form-section">
                <h3>Inventory Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="inventory-stock">Current Stock</label>
                    <input
                      type="number"
                      id="inventory-stock"
                      value={plantFormData.inventory.currentStock}
                      onChange={(e) => updatePlantForm('inventory.currentStock', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="inventory-status">Status</label>
                    <select
                      id="inventory-status"
                      value={plantFormData.inventory.status}
                      onChange={(e) => updatePlantForm('inventory.status', e.target.value)}
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="Coming Soon">Coming Soon</option>
                      <option value="Pre-order">Pre-order</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="inventory-restock">Restock Date</label>
                    <input
                      type="date"
                      id="inventory-restock"
                      value={plantFormData.inventory.restockDate || ''}
                      onChange={(e) => updatePlantForm('inventory.restockDate', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group wide">
                    <label htmlFor="inventory-notes">Inventory Notes</label>
                    <textarea
                      id="inventory-notes"
                      value={plantFormData.inventory.notes || ''}
                      onChange={(e) => updatePlantForm('inventory.notes', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </form>
            
            {/* Form Bottom Buttons */}
            <div className="form-footer" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button 
                className="back-button"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
                    if (!confirmLeave) {
                      return;
                    }
                    setHasUnsavedChanges(false);
                  }
                  resetPlantForm();
                  setActiveTab('inventory');
                }}
                style={{ height: '40px', minWidth: '120px' }}
              >
                Back to Inventory
              </button>
              <button 
                className="save-btn"
                onClick={async () => {
                  try {
                    setPlantSaveStatus('saving');
                    
                    // ID handling - use existing ID or create new one
                    const plantId = currentPlant ? currentPlant.id : Date.now().toString();
                    
                    // Standardize the inventory status before saving
                    const standardizedInventory = {
                      ...plantFormData.inventory,
                      status: standardizeInventoryStatus(plantFormData.inventory.status)
                    };
                    
                    // Ensure mainImage is set from images array
                    const mainImage = plantFormData.images && plantFormData.images.length > 0 
                      ? plantFormData.images[plantFormData.mainImageIndex || 0] 
                      : plantFormData.mainImage || '';
                    
                    const plantData = {
                      ...plantFormData,
                      id: plantId,
                      mainImage: mainImage,
                      inventory: standardizedInventory
                    };
                    
                    // Use the correct function based on whether we're adding or editing
                    if (currentPlant) {
                      await updatePlant(plantId, plantData);
                    } else {
                      await addPlant(plantData);
                    }
                    
                    // Update the plant in context
                    if (typeof updatePlantData === 'function') {
                      updatePlantData(plantData);
                    }
                    
                    setPlantSaveStatus('success');
                    
                    // Show success toast
                    window.dispatchEvent(new CustomEvent('show-toast', {
                      detail: { 
                        message: currentPlant ? 'Plant updated successfully!' : 'Plant added successfully!',
                        type: 'success',
                        duration: 3000
                      }
                    }));
                    
                    // Reset form and go back to inventory after a delay
                    setTimeout(() => {
                      resetPlantForm();
                      setActiveTab('inventory');
                    }, 1000);
                  } catch (error) {
                    console.error('Error saving plant:', error);
                    setPlantSaveStatus('error');
                    
                    // Show error toast
                    window.dispatchEvent(new CustomEvent('show-toast', {
                      detail: {
                        message: `Error: ${error.message || 'Unknown error'}`,
                        type: 'error',
                        duration: 5000
                      }
                    }));
                  }
                }}
                disabled={plantSaveStatus === 'saving'}
                style={{ height: '40px', minWidth: '120px' }}
              >
                {plantSaveStatus === 'saving' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModularInventoryManager; 