import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  updateInventory,
  subscribeToInventory,
  getFirebaseStorageURL,
  uploadImageToFirebase,
  getDatabaseRef,
  onValue,
  set,
  processSyncQueue,
  initializeDefaultInventory,
  importPlantsFromSheets
} from '../services/firebase';
import { addPlant, updatePlant, loadSamplePlants } from '../services/firebase';
import { useAdmin, updatePlantData } from '../context/AdminContext';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/InventoryManager.css';
import '../styles/PlantManagement.css';
import '../styles/FirebaseMigration.css';

const InventoryManager = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { plants, loading: plantsLoading, error: plantsError, loadPlants, updatePlantData } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading inventory data...');
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
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
    commonName: '',
    price: '',
    description: '',
    mainImage: '',
    additionalImages: [],
    colour: '',
    light: '',
    height: '',
    bloomSeason: '',
    attributes: '',
    hardinessZone: '',
    spacing: '',
    featured: false,
    inventory: {
      currentStock: 0,
      status: 'In Stock',
      restockDate: '',
      notes: ''
    }
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

  // CSV Migration tab states
  const [plantsFileInput, setPlantsFileInput] = useState(null);
  const [inventoryFileInput, setInventoryFileInput] = useState(null);
  const [plantsCsvUrl, setPlantsCsvUrl] = useState('');
  const [inventoryCsvUrl, setInventoryCsvUrl] = useState('');
  const [csvStatus, setCsvStatus] = useState({ loading: false, message: '' });

  // Add state for image upload
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // New state for multiple image uploads
  const [additionalImageFiles, setAdditionalImageFiles] = useState([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState([]);
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);
  const [additionalUploadProgress, setAdditionalUploadProgress] = useState(0);

  // Get URL parameters
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const plantIdParam = queryParams.get('plantId');
  const filterParam = queryParams.get('filter');

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

  // Load sample data functionality is now handled by the AdminContext
  // const loadSampleData = useCallback(async () => {
  //   // Function removed - now using AdminContext
  // }, [handleLoadPlants]);

  // Local cache loading functionality is now handled by the AdminContext
  // const forceLoadData = useCallback(() => {
  //   // Function removed - now using AdminContext
  // }, []);

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
    refreshTimerRef.current = refreshTimer;
    
    return () => {
      // Clean up on unmount
      unsubscribe();
      // Clear timers using the current value at cleanup time
      const refresh = refreshTimerRef.current;
      const sync = syncTimerRef.current;
      const loading = loadingTimerRef.current;
      const fetchTimeout = fetchTimeoutRef.current;
      
      if (refresh) clearInterval(refresh);
      if (sync) clearInterval(sync);
      if (loading) clearTimeout(loading);
      if (fetchTimeout) clearTimeout(fetchTimeout);
    };
  }, [handleLoadPlants, checkSyncQueue]);

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
        handleLoadPlants(true);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
      
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        message: `Sync error: ${error.message}`
      }));
    }
  }, [syncStatus.syncing, handleLoadPlants]);

  // Handle edit button click
  const handleEdit = useCallback((plantId) => {
    // Initialize edit values with current plant values
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
      setEditValues(prev => ({
        ...prev,
        [plantId]: {
          price: plant.price || 0,
          currentStock: plant.inventory?.currentStock || 0,
          status: plant.inventory?.status || 'Unknown',
          restockDate: plant.inventory?.restockDate || '',
          notes: plant.inventory?.notes || ''
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
      const priceValue = inventoryData.price;
      
      // Call API to update inventory
      const result = await updateInventory(plantId, inventoryData);
      
      // Update plant data in context
      const updatedPlant = {
        ...plants.find(p => p.id === plantId),
        price: priceValue,
        inventory: {
          ...plants.find(p => p.id === plantId)?.inventory,
          currentStock: inventoryData.currentStock,
          status: inventoryData.status,
          restockDate: inventoryData.restockDate,
          notes: inventoryData.notes
        }
      };
      
      // Update plants state using the context's updatePlantData function
      updatePlantData(updatedPlant);
      
      // Set success status
      setSaveStatus(prev => ({
        ...prev,
        [plantId]: 'success'
      }));
      
      // Clear success message after a delay
      setTimeout(() => {
        setSaveStatus(prev => {
          const newState = { ...prev };
          delete newState[plantId];
          return newState;
        });
      }, 3000);
      
      // Exit edit mode
      setEditMode(prev => {
        const newState = { ...prev };
        delete newState[plantId];
        return newState;
      });
      
      return result;
    } catch (error) {
      console.error('Error updating inventory:', error);
      
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

  // Function to count plants by status
  const getStatusCounts = useCallback(() => {
    const counts = {
      'all': plants.length,
      'In Stock': 0,
      'Out of Stock': 0,
      'Coming Soon': 0,
      'Pre-order': 0
    };
    
    // Count plants for each status
    plants.forEach(plant => {
      const status = plant.inventory?.status;
      if (status && counts[status] !== undefined) {
        counts[status]++;
      }
    });
    
    return counts;
  }, [plants]);
  
  // Get the counts for each status
  const statusCounts = useMemo(() => getStatusCounts(), [getStatusCounts]);

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
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
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

  // Memoize the filtered plants to prevent unnecessary recalculations
  const filteredPlants = React.useMemo(() => getFilteredPlants(), [getFilteredPlants]);

  // Force a refresh of data when the component mounts
  useEffect(() => {
    // Clear any cached data to ensure we get fresh data from the API
    localStorage.removeItem('cachedPlantsWithTimestamp');
    
    // Force a refresh after a short delay to allow the component to render
    const refreshTimer = setTimeout(() => {
      handleLoadPlants(true); // Force refresh
    }, 500);
    
    return () => clearTimeout(refreshTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When component loads, scroll to the specific plant if plantId is in URL
  useEffect(() => {
    if (plantIdParam && !plantsLoading) {
      // Find the plant in the list
      const targetPlant = plants.find(plant => plant.id === plantIdParam);
      
      if (targetPlant) {
        // Set the filter term to show this plant
        setFilter({
          ...filter,
          searchTerm: targetPlant.name
        });
        
        // Scroll to the plant row after a slight delay to allow rendering
        setTimeout(() => {
          const plantRow = document.getElementById(`plant-row-${plantIdParam}`);
          if (plantRow) {
            plantRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            plantRow.classList.add('highlight-plant-row');
            
            // Remove highlight after animation completes
            setTimeout(() => {
              plantRow.classList.remove('highlight-plant-row');
            }, 2000);
          }
        }, 300);
      }
      
      // Clear the plantId from URL after handling to avoid re-scrolling on page refresh
      if (plantIdParam) {
        const newParams = new URLSearchParams(location.search);
        newParams.delete('plantId');
        navigate({ search: newParams.toString() }, { replace: true });
      }
    }
    
    // Apply low stock filter if requested
    if (filterParam === 'lowStock') {
      setFilter({
        ...filter,
        lowStock: true
      });
      
      // Clear the filter from URL after handling
      const newParams = new URLSearchParams(location.search);
      newParams.delete('filter');
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [plantIdParam, filterParam, plants, plantsLoading, navigate, location.search]);

  // New function for handling plant form input changes
  const handlePlantFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      setPlantFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle nested inventory fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setPlantFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      // Handle regular fields
      setPlantFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle image file selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageFile(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload image to Firebase Storage
  const uploadImageFile = async (file) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create a unique path for the image based on the current time and file name
      const timestamp = new Date().getTime();
      const fileExtension = file.name.split('.').pop();
      const path = `plant_images/${timestamp}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
      
      // Simulate progress (Firebase Storage doesn't provide progress updates easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 20;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 500);
      
      // Upload the file to Firebase Storage
      const downloadUrl = await uploadImageToFirebase(file, path);
      
      // Clear the interval and set progress to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      
      console.log('Image uploaded successfully:', downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsUploading(false);
      return null;
    }
  };

  // Modified handlePlantSubmit to include image upload
  const handlePlantSubmit = async (e) => {
    e.preventDefault();
    setPlantSaveStatus('saving');

    try {
      // Upload main image if selected
      let mainImageUrl = plantFormData.mainImage;
      
      if (imageFile) {
        const uploadedUrl = await uploadImageFile(imageFile);
        if (uploadedUrl) {
          mainImageUrl = uploadedUrl;
        }
      }
      
      // Upload additional images if selected
      let additionalImagesUrls = [...plantFormData.additionalImages];
      
      if (additionalImageFiles.length > 0) {
        const newUrls = await uploadAdditionalImages();
        additionalImagesUrls = [...additionalImagesUrls, ...newUrls];
      }
      
      // Prepare plant data
      const plantData = {
        ...plantFormData,
        mainImage: mainImageUrl, // Use uploaded URL or existing URL
        additionalImages: additionalImagesUrls,
        // If editing, keep the existing ID, otherwise generate a new one
        id: plantEditMode && currentPlant ? currentPlant.id : Math.max(0, ...plants.map(p => parseInt(p.id) || 0)) + 1
      };

      if (plantEditMode && currentPlant) {
        // Update existing plant
        await updatePlant(currentPlant.id, plantData);
        setPlantSaveStatus('success');
        
        // Update plant in context
        updatePlantData(plantData);
      } else {
        // Add new plant
        const result = await addPlant(plantData);
        setPlantSaveStatus('success');
        
        // Add to plants in context
        updatePlantData({...plantData, id: result.plantId});
      }

      // Reset form after successful save
      setTimeout(() => {
        resetPlantForm();
        setPlantSaveStatus('');
        setImageFile(null);
        setImagePreview(null);
        setAdditionalImageFiles([]);
        setAdditionalImagePreviews([]);
      }, 2000);
    } catch (error) {
      console.error('Error saving plant:', error);
      setPlantSaveStatus('error');
    }
  };

  // Modify resetPlantForm to also reset image state
  const resetPlantForm = () => {
    setPlantFormData({
      name: '',
      scientificName: '',
      commonName: '',
      price: '',
      description: '',
      mainImage: '',
      additionalImages: [],
      colour: '',
      light: '',
      height: '',
      bloomSeason: '',
      attributes: '',
      hardinessZone: '',
      spacing: '',
      featured: false,
      inventory: {
        currentStock: 0,
        status: 'In Stock',
        restockDate: '',
        notes: ''
      }
    });
    setPlantEditMode(false);
    setCurrentPlant(null);
    setImageFile(null);
    setImagePreview(null);
    setAdditionalImageFiles([]);
    setAdditionalImagePreviews([]);
  };

  // New function to handle edit plant button click
  const handleEditPlant = (plant) => {
    setCurrentPlant(plant);
    setPlantFormData({
      name: plant.name || '',
      scientificName: plant.scientificName || '',
      commonName: plant.commonName || '',
      price: plant.price || '',
      description: plant.description || '',
      mainImage: plant.mainImage || '',
      additionalImages: plant.additionalImages || [],
      colour: plant.colour || '',
      light: plant.light || '',
      height: plant.height || '',
      bloomSeason: plant.bloomSeason || '',
      attributes: plant.attributes || '',
      hardinessZone: plant.hardinessZone || '',
      spacing: plant.spacing || '',
      featured: plant.featured === true || plant.featured === 'true',
      inventory: {
        currentStock: plant.inventory?.currentStock || 0,
        status: plant.inventory?.status || 'In Stock',
        restockDate: plant.inventory?.restockDate || '',
        notes: plant.inventory?.notes || ''
      }
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
      handleLoadPlants(true);

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

  // Helper function to parse CSV data
  const parseCSV = (csvText) => {
    // Split by lines and remove empty lines
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(header => 
      header.trim().toLowerCase().replace(/["']/g, '')
    );
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted fields correctly
      let line = lines[i];
      const values = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim().replace(/^"|"$/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      values.push(currentValue.trim().replace(/^"|"$/g, ''));
      
      // Create object from headers and values
      if (values.length === headers.length) {
        const obj = {};
        headers.forEach((header, index) => {
          // Skip empty headers
          if (header) {
            obj[header] = values[index];
          }
        });
        data.push(obj);
      }
    }
    
    return data;
  };
  
  const fetchCsvFromUrl = async (url) => {
    try {
      setCsvStatus({ loading: true, message: `Fetching CSV from URL: ${url}...` });
      
      // Using a proxy to avoid CORS issues
      const corsProxy = 'https://corsproxy.io/?';
      const response = await fetch(`${corsProxy}${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV data: ${response.status}`);
      }
      
      const csvText = await response.text();
      return parseCSV(csvText);
    } catch (error) {
      console.error('Error fetching from CSV URL:', error);
      throw error;
    }
  };
  
  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csvText = event.target.result;
          const parsedData = parseCSV(csvText);
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Error reading file'));
      
      reader.readAsText(file);
    });
  };
  
  const handleCsvMigration = async (e) => {
    e.preventDefault();
    
    // Check that we have at least one plants data source
    if (!plantsFileInput && !plantsCsvUrl) {
      setCsvStatus({ 
        loading: false, 
        message: 'Please either upload a plants CSV file or provide a Google Sheets CSV URL' 
      });
      return;
    }
    
    try {
      setCsvStatus({ loading: true, message: 'Starting migration...' });
      
      // Get plants data
      let plantsData;
      if (plantsFileInput) {
        setCsvStatus({ loading: true, message: 'Reading plants CSV file...' });
        plantsData = await readFile(plantsFileInput);
      } else if (plantsCsvUrl) {
        plantsData = await fetchCsvFromUrl(plantsCsvUrl);
      }
      
      if (!plantsData || plantsData.length === 0) {
        throw new Error('Invalid plants data format or empty CSV');
      }
      
      // Filter out empty or invalid plant records
      const validPlants = plantsData.filter(plant => {
        // Check for required fields - at minimum we need id and name
        if (!plant.id || !plant.name) {
          return false;
        }
        
        // Additional validation can be added here
        return true;
      });
      
      const skippedCount = plantsData.length - validPlants.length;
      
      setCsvStatus({ 
        loading: true, 
        message: `Found ${plantsData.length} plants in the CSV. ${skippedCount} blank/invalid plants will be skipped. Processing ${validPlants.length} valid plants...` 
      });
      
      // Transform plant data to match Firebase expected structure
      const transformedPlantsData = validPlants.map(plant => ({
        id: parseInt(plant.id) || 0,
        name: plant.name || '',
        scientificName: plant.latinname || plant.scientificname || '',
        commonName: plant.commonname || '',
        price: plant.price || 0,
        featured: plant.featured === 'true' || plant.featured === true,
        description: plant.description || '',
        bloomSeason: plant.bloomseason || '',
        colour: plant.colour || '',
        light: plant.light || '',
        spacing: plant.spacing || '',
        attributes: plant.attributes || '',
        hardinessZone: plant.hardinesszone || '',
        height: plant.height || '',
        mainImage: plant.mainimage || '',
        additionalImages: plant.additionalimages || ''
      }));
      
      // Get inventory data (if available)
      let inventoryData = [];
      if (inventoryFileInput) {
        setCsvStatus({ loading: true, message: 'Reading inventory CSV file...' });
        inventoryData = await readFile(inventoryFileInput);
        
        // Filter inventory data to match only the valid plants we're importing
        const validPlantIds = transformedPlantsData.map(p => p.id.toString());
        inventoryData = inventoryData.filter(item => 
          item.plant_id && validPlantIds.includes(item.plant_id.toString())
        );
      } else if (inventoryCsvUrl) {
        try {
          inventoryData = await fetchCsvFromUrl(inventoryCsvUrl);
          
          // Filter inventory data to match only the valid plants we're importing
          const validPlantIds = transformedPlantsData.map(p => p.id.toString());
          inventoryData = inventoryData.filter(item => 
            item.plant_id && validPlantIds.includes(item.plant_id.toString())
          );
        } catch (error) {
          console.error('Error fetching inventory data:', error);
          setCsvStatus({ 
            loading: true, 
            message: `Warning: Could not fetch inventory data: ${error.message}. Continuing with plants only...` 
          });
          inventoryData = [];
        }
      }
      
      if (inventoryData.length > 0) {
        setCsvStatus({ 
          loading: true, 
          message: `Found ${validPlants.length} valid plants and ${inventoryData.length} inventory records. Importing to Firebase...` 
        });
      } else {
        // If no inventory data provided, create default inventory records
        inventoryData = transformedPlantsData.map(plant => ({
          plant_id: plant.id,
          current_stock: 0,
          status: 'out_of_stock',
          restock_date: '',
          notes: 'Auto-generated during migration'
        }));
      }
      
      // Send the data to Firebase
      const result = await importPlantsFromSheets(transformedPlantsData, inventoryData);
      
      setCsvStatus({ 
        loading: false, 
        message: `Successfully imported ${result.plantsCount} plants and ${result.inventoryCount} inventory items to Firebase! (${skippedCount} blank/invalid plants were skipped)`,
        success: true
      });
      
      // Force reload of inventory data
      handleLoadPlants(true);
    } catch (error) {
      console.error('Migration error:', error);
      setCsvStatus({ 
        loading: false, 
        message: `Error: ${error.message}`,
        error: true
      });
    }
  };

  // Use data from context instead of doing separate fetch
  useEffect(() => {
    if (plantsError) {
      setError(plantsError);
    }
    
    if (!plantsLoading && plants.length > 0) {
      // Initialize edit values from context data
      const initialValues = {};
      plants.forEach(plant => {
        initialValues[plant.id] = {
          currentStock: plant.inventory?.currentStock || 0,
          status: plant.inventory?.status || 'Unknown',
          restockDate: plant.inventory?.restockDate || '',
          notes: plant.inventory?.notes || ''
        };
      });
      setEditValues(initialValues);
    }
  }, [plants, plantsLoading, plantsError]);

  // Handle additional images selection
  const handleAdditionalImagesSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAdditionalImageFiles([...additionalImageFiles, ...newFiles]);
      
      // Create previews for the new files
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setAdditionalImagePreviews([...additionalImagePreviews, ...newPreviews]);
    }
  };
  
  // Upload multiple images
  const uploadAdditionalImages = async () => {
    if (additionalImageFiles.length === 0) return [];
    
    setIsUploadingAdditional(true);
    setAdditionalUploadProgress(0);
    
    const urls = [];
    try {
      for (let i = 0; i < additionalImageFiles.length; i++) {
        const file = additionalImageFiles[i];
        const url = await uploadImageFile(file);
        urls.push(url);
        
        // Update progress
        setAdditionalUploadProgress(Math.round(((i + 1) / additionalImageFiles.length) * 100));
      }
    } catch (error) {
      console.error('Error uploading additional images:', error);
    } finally {
      setIsUploadingAdditional(false);
      setAdditionalImageFiles([]);
      setAdditionalImagePreviews([]);
    }
    
    return urls;
  };
  
  // Remove an additional image
  const handleRemoveAdditionalImage = (index) => {
    // If it's a new file (not yet uploaded)
    if (index < additionalImagePreviews.length) {
      const newFiles = [...additionalImageFiles];
      const newPreviews = [...additionalImagePreviews];
      
      URL.revokeObjectURL(newPreviews[index]); // Free up memory
      
      newFiles.splice(index, 1);
      newPreviews.splice(index, 1);
      
      setAdditionalImageFiles(newFiles);
      setAdditionalImagePreviews(newPreviews);
    } else {
      // If it's an existing image in the plant data
      const imageIndex = index - additionalImagePreviews.length;
      const newImages = [...plantFormData.additionalImages];
      newImages.splice(imageIndex, 1);
      
      setPlantFormData({
        ...plantFormData,
        additionalImages: newImages
      });
    }
  };
  
  // Set an image as the main image
  const handleSetAsMainImage = (imageUrl) => {
    setPlantFormData({
      ...plantFormData,
      mainImage: imageUrl
    });
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
          onClick={() => handleLoadPlants(true)}
        >
          Load Sample Data
        </button>
        <button 
          className="force-load-btn secondary"
          onClick={() => handleLoadPlants(true)}
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
          onClick={() => handleLoadPlants(true)}
        >
          Load Sample Data
        </button>
        <button 
          className="force-load-btn secondary"
          onClick={() => handleLoadPlants(true)}
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
      {/* Hide tabs when editing a flower */}
      {!plantEditMode && (
        <div className="inventory-tabs">
          <button 
            className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory
          </button>
          <button 
            className={`tab-button ${activeTab === 'csvMigration' ? 'active' : ''}`}
            onClick={() => setActiveTab('csvMigration')}
          >
            Import Data
          </button>
        </div>
      )}

      {/* When in edit mode, show a page header with the plant name */}
      {plantEditMode && (
        <div className="page-header">
          <h1>Update {plantFormData.name}</h1>
          <button 
            className="save-btn"
            onClick={async (e) => {
              e.preventDefault();
              setPlantSaveStatus('saving');
              
              try {
                // Upload main image if selected
                let mainImageUrl = plantFormData.mainImage;
                
                if (imageFile) {
                  const uploadedUrl = await uploadImageFile(imageFile);
                  if (uploadedUrl) {
                    mainImageUrl = uploadedUrl;
                  }
                }
                
                // Upload additional images if selected
                let additionalImagesUrls = [...plantFormData.additionalImages];
                
                if (additionalImageFiles.length > 0) {
                  const newUrls = await uploadAdditionalImages();
                  additionalImagesUrls = [...additionalImagesUrls, ...newUrls];
                }
                
                // Prepare plant data
                const plantData = {
                  ...plantFormData,
                  mainImage: mainImageUrl,
                  additionalImages: additionalImagesUrls,
                  id: currentPlant ? currentPlant.id : Math.max(0, ...plants.map(p => parseInt(p.id) || 0)) + 1
                };
                
                // Update existing plant
                await updatePlant(currentPlant.id, plantData);
                setPlantSaveStatus('success');
                
                // Update plant in context if needed
                if (typeof updatePlantData === 'function') {
                  updatePlantData(plantData);
                }
                
                // Show success message briefly then go back to inventory
                setTimeout(() => {
                  resetPlantForm();
                  setActiveTab('inventory');
                }, 1000);
              } catch (error) {
                console.error('Error saving plant:', error);
                setPlantSaveStatus('error');
              }
            }}
            disabled={plantSaveStatus === 'saving'}
          >
            {plantSaveStatus === 'saving' ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
      
      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && !plantEditMode && (
        <div className="tab-content">
          <div className="inventory-controls">
            <div className="filter-controls">
              <label htmlFor="statusFilter">Status:</label>
              <select
                id="statusFilter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All ({statusCounts.all})</option>
                <option value="In Stock">In Stock ({statusCounts['In Stock']})</option>
                <option value="Out of Stock">Out of Stock ({statusCounts['Out of Stock']})</option>
                <option value="Coming Soon">Coming Soon ({statusCounts['Coming Soon']})</option>
                <option value="Pre-order">Pre-order ({statusCounts['Pre-order']})</option>
              </select>
            </div>
            {/* Add New button in the top right */}
            <div className="add-new-button-container">
              <button 
                className="add-new-button"
                onClick={() => {
                  resetPlantForm();
                  setActiveTab('addPlant');
                }}
              >
                Add New
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
          
          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th className="sortable-header" onClick={() => handleSort('name')}>
                    Flower Name {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
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
                      <tr 
                        key={plant.id} 
                        className={isEditing ? 'editing' : ''}
                        id={`plant-row-${plant.id}`}
                      >
                        <td data-label="Flower Name">
                          <span className="plant-name">{plant.name}</span>
                        </td>
                        <td data-label="Stock">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editValues[plant.id]?.currentStock || 0}
                              onChange={(e) => handleChange(plant.id, 'currentStock', e.target.value)}
                            />
                          ) : (
                            <span>{plant.inventory?.currentStock || 0}</span>
                          )}
                        </td>
                        <td data-label="Status">
                          {isEditing ? (
                            <select
                              value={editValues[plant.id]?.status || 'Unknown'}
                              onChange={(e) => handleChange(plant.id, 'status', e.target.value)}
                            >
                              <option value="In Stock">In Stock</option>
                              <option value="Out of Stock">Out of Stock</option>
                              <option value="Coming Soon">Coming Soon</option>
                              <option value="Pre-order">Pre-order</option>
                            </select>
                          ) : (
                            <span className={`status-badge ${statusClass}`}>
                              {plant.inventory?.status || 'Unknown'}
                            </span>
                          )}
                        </td>
                        <td data-label="Restock Date">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editValues[plant.id]?.restockDate || ''}
                              onChange={(e) => handleChange(plant.id, 'restockDate', e.target.value)}
                            />
                          ) : (
                            <span>{plant.inventory?.restockDate || 'N/A'}</span>
                          )}
                        </td>
                        <td data-label="Actions" className="action-buttons">
                          {isEditing ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <button 
                                className="edit-plant-btn"
                                onClick={() => handleEditPlant(plant)}
                              >
                                Update
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add/Edit Plant Tab Content */}
      {(activeTab === 'addPlant' || plantEditMode) && (
        <div className="tab-content">
          {!plantEditMode && <h2>Add New Flower</h2>}
          
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
                <label htmlFor="scientificName">Latin Name</label>
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
                <label htmlFor="commonName">Common Name</label>
                <input
                  type="text"
                  id="commonName"
                  name="commonName"
                  value={plantFormData.commonName || ''}
                  onChange={handlePlantFormChange}
                  placeholder="Alternative names, separated by commas"
                />
              </div>
              
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
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="inventory.currentStock">Stock</label>
                <input
                  type="number"
                  id="inventory.currentStock"
                  name="inventory.currentStock"
                  value={plantFormData.inventory.currentStock}
                  onChange={handlePlantFormChange}
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="inventory.status">Status</label>
                <select
                  id="inventory.status"
                  name="inventory.status"
                  value={plantFormData.inventory.status}
                  onChange={handlePlantFormChange}
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Coming Soon">Coming Soon</option>
                  <option value="Pre-order">Pre-order</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="inventory.restockDate">Restock Date</label>
                <input
                  type="date"
                  id="inventory.restockDate"
                  name="inventory.restockDate"
                  value={plantFormData.inventory.restockDate}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-group">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="featured"
                  name="featured"
                  checked={plantFormData.featured}
                  onChange={(e) => {
                    setPlantFormData(prev => ({
                      ...prev,
                      featured: e.target.checked
                    }));
                  }}
                />
                <label htmlFor="featured">Feature on homepage</label>
              </div>
            </div>
            
            {/* Consolidated Images Area */}
            <div className="form-group full-width">
              <label>Images</label>
              <div className="images-container">
                {/* Main Image Section */}
                <div className="main-image-section">
                  <h4>Main Image</h4>
                  <input
                    type="text"
                    id="mainImage"
                    name="mainImage"
                    value={plantFormData.mainImage}
                    onChange={handlePlantFormChange}
                    placeholder="Enter image URL or use upload below"
                    className="main-image-input"
                  />
                  
                  <div className="image-upload-container">
                    <div className="file-upload-wrapper">
                      <input
                        type="file"
                        id="imageFile"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="image-file-input"
                      />
                      <label htmlFor="imageFile" className="image-upload-label green-button">
                        Select Image File
                      </label>
                    </div>
                    
                    {imagePreview && (
                      <div className="image-preview main-preview">
                        <img src={imagePreview} alt="Preview" />
                      </div>
                    )}
                    
                    {isUploading && (
                      <div className="upload-progress">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Additional Images Section */}
                <div className="additional-images-section">
                  <h4>Additional Images</h4>
                  
                  {/* Display existing additional images */}
                  {plantFormData.additionalImages && plantFormData.additionalImages.length > 0 && (
                    <div className="existing-additional-images">
                      <div className="additional-images-grid">
                        {plantFormData.additionalImages.map((imageUrl, index) => (
                          <div key={`existing-${index}`} className="additional-image-item">
                            <div className="image-preview">
                              <img src={imageUrl} alt={`Additional ${index + 1}`} />
                            </div>
                            <div className="image-actions">
                              <button 
                                type="button"
                                className="set-main-button"
                                onClick={() => handleSetAsMainImage(imageUrl)}
                              >
                                Set as Main
                              </button>
                              <button 
                                type="button"
                                className="remove-button"
                                onClick={() => handleRemoveAdditionalImage(additionalImagePreviews.length + index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Display previews for new additional images */}
                  {additionalImagePreviews.length > 0 && (
                    <div className="new-additional-images">
                      <h5>New Additional Images</h5>
                      <div className="additional-images-grid">
                        {additionalImagePreviews.map((preview, index) => (
                          <div key={`new-${index}`} className="additional-image-item">
                            <div className="image-preview">
                              <img src={preview} alt={`Additional ${index + 1}`} />
                            </div>
                            <div className="image-actions">
                              <button 
                                type="button"
                                className="remove-button"
                                onClick={() => handleRemoveAdditionalImage(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="upload-additional-images">
                    <div className="file-upload-wrapper">
                      <input
                        type="file"
                        id="additionalImageFiles"
                        accept="image/*"
                        multiple
                        onChange={handleAdditionalImagesSelect}
                        className="image-file-input"
                      />
                      <label htmlFor="additionalImageFiles" className="image-upload-label green-button">
                        Select Additional Images
                      </label>
                    </div>
                    
                    {isUploadingAdditional && (
                      <div className="upload-progress">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${additionalUploadProgress}%` }}
                        ></div>
                        <span>{Math.round(additionalUploadProgress)}%</span>
                      </div>
                    )}
                  </div>
                </div>
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
              {plantEditMode && (
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={resetPlantForm}
                >
                  Cancel
                </button>
              )}
              
              <button 
                type="submit" 
                className={`save-btn ${plantSaveStatus}`}
                disabled={plantSaveStatus === 'saving'}
              >
                {plantSaveStatus === 'saving' ? 'Saving...' : 'Save'}
              </button>
              
              {plantSaveStatus === 'success' && (
                <span className="success-message">Flower saved successfully!</span>
              )}
              
              {plantSaveStatus === 'error' && (
                <span className="error-message">Error saving flower. Please try again.</span>
              )}
            </div>
          </form>
          
        </div>
      )}
      
      {/* New CSV Migration Tab */}
      {activeTab === 'csvMigration' && (
        <div className="tab-content">
          <h2>Data Import Options</h2>
          
          <div className="migration-tabs">
            <div className="csv-migration">
              <div className="migration-section">
                <h3>CSV Data Import</h3>
                <p>
                  Import plants and inventory data from CSV files. This is useful for migrating data
                  from spreadsheets to your Firebase database.
                </p>
                
                <div className="instructions">
                  <h4>Instructions</h4>
                  <ol>
                    <li>
                      You have two options for importing your data:
                      <ul>
                        <li><strong>Option 1:</strong> Upload CSV files directly from your computer</li>
                        <li><strong>Option 2:</strong> Provide URLs to CSV files published from Google Sheets</li>
                      </ul>
                    </li>
                    <li>
                      If using Google Sheets URLs:
                      <ol>
                        <li>Publish your sheets to the web (File &gt; Share &gt; Publish to web)</li>
                        <li>Select "Comma-separated values (.csv)" format</li>
                        <li>Copy the published URLs and paste them below</li>
                      </ol>
                    </li>
                  </ol>
                </div>
                
                <form onSubmit={handleCsvMigration} className="migration-form">
                  <h4>Plants Data (Required)</h4>
                  
                  <div className="form-section">
                    <h5>Option 1: Upload Plants CSV File</h5>
                    <div className="form-field">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setPlantsFileInput(e.target.files[0])}
                        className="file-input"
                      />
                      <p className="input-help">
                        Select a CSV file from your computer
                      </p>
                    </div>
                    
                    <h5>OR Option 2: Google Sheets CSV URL</h5>
                    <div className="form-field">
                      <input
                        type="text"
                        value={plantsCsvUrl}
                        onChange={(e) => setPlantsCsvUrl(e.target.value)}
                        className="text-input"
                        placeholder="https://docs.google.com/spreadsheets/d/e/your-sheet-id/pub?output=csv"
                      />
                      <p className="input-help">
                        Paste the URL from Google Sheets "Publish to web" (CSV format)
                      </p>
                    </div>
                  </div>
                  
                  <h4>Inventory Data (Optional)</h4>
                  
                  <div className="form-section">
                    <h5>Option 1: Upload Inventory CSV File</h5>
                    <div className="form-field">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setInventoryFileInput(e.target.files[0])}
                        className="file-input"
                      />
                      <p className="input-help">
                        Select a CSV file from your computer
                      </p>
                    </div>
                    
                    <h5>OR Option 2: Google Sheets CSV URL</h5>
                    <div className="form-field">
                      <input
                        type="text"
                        value={inventoryCsvUrl}
                        onChange={(e) => setInventoryCsvUrl(e.target.value)}
                        className="text-input"
                        placeholder="https://docs.google.com/spreadsheets/d/e/your-sheet-id/pub?output=csv"
                      />
                      <p className="input-help">
                        Paste the URL from Google Sheets "Publish to web" (CSV format)
                      </p>
                    </div>
                    
                    <p className="note">
                      <strong>Note:</strong> If inventory data is not provided, default inventory records will be created automatically with 0 stock.
                    </p>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={csvStatus.loading || (!plantsFileInput && !plantsCsvUrl)}
                    className={`migration-button ${csvStatus.loading ? 'loading' : ''}`}
                  >
                    {csvStatus.loading ? 'Migrating...' : 'Start CSV Migration'}
                  </button>
                </form>
                
                {csvStatus.message && (
                  <div className={csvStatus.error ? "error-message" : csvStatus.success ? "success-message" : "info-message"}>
                    <p>{csvStatus.message}</p>
                  </div>
                )}
                
                <div className="csv-format-info">
                  <h4>Data Format Requirements</h4>
                  
                  <div className="format-section">
                    <h5>Plants CSV Format</h5>
                    <p>Your Plants CSV should have the following columns:</p>
                    <div className="columns-container">
                      <ul className="format-columns">
                        <li><strong>id</strong> - Unique identifier (number)</li>
                        <li><strong>name</strong> - Plant name</li>
                        <li><strong>latinName</strong> - Latin/scientific name</li>
                        <li><strong>commonName</strong> - Common name</li>
                        <li><strong>price</strong> - Price</li>
                        <li><strong>featured</strong> - Featured (true/false)</li>
                        <li><strong>description</strong> - Description</li>
                        <li><strong>bloomSeason</strong> - Bloom season</li>
                      </ul>
                      <ul className="format-columns">
                        <li><strong>colour</strong> - Color/colour</li>
                        <li><strong>light</strong> - Light requirements</li>
                        <li><strong>spacing</strong> - Spacing requirements</li>
                        <li><strong>attributes</strong> - Attributes</li>
                        <li><strong>hardinessZone</strong> - Hardiness zone</li>
                        <li><strong>height</strong> - Height</li>
                        <li><strong>mainImage</strong> - URL to main image</li>
                        <li><strong>additionalImages</strong> - Additional image URLs</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="format-section">
                    <h5>Inventory CSV Format</h5>
                    <p>Your Inventory CSV should have the following columns:</p>
                    <ul>
                      <li><strong>plant_id</strong> - ID matching the plant's ID</li>
                      <li><strong>current_stock</strong> - Current stock level</li>
                      <li><strong>status</strong> - Status (e.g., in_stock, out_of_stock, low_stock)</li>
                      <li><strong>restock_date</strong> - Expected restock date</li>
                      <li><strong>notes</strong> - Additional notes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sample-data-section">
              <div className="migration-option">
                <h3>Sample Data Import</h3>
                <p>
                  Import sample plant data to Firebase. This is useful for quickly populating
                  your database with a predefined set of plants for testing.
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager; 