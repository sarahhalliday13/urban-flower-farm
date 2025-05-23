import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
/* eslint-disable no-unused-vars */
import { 
  useNavigate,
  useParams,
  useLocation
} from 'react-router-dom';
import { 
  fetchPlants,
  uploadImageToFirebase,
  importPlantsFromSheets,
  initializeDefaultInventory,
  deletePlant,
  addPlant, 
  updatePlant, 
  loadSamplePlants,
  subscribeToInventory,
  processSyncQueue,
  repairInventoryData,
  updateInventory,
  updatePlantData,
  update, // Add explicit import of update function
  remove  // Add explicit import of remove function
} from '../services/firebase';
import { useAdmin } from '../context/AdminContext';
import '../styles/InventoryManager.css';
import '../styles/PlantManagement.css';
import '../styles/FirebaseMigration.css';
import ImageWithFallback from './ImageWithFallback';

// Helper function to verify Firebase configuration
const checkFirebaseConfig = () => {
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_DATABASE_URL',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing Firebase configuration variables:', missingVars);
    return false;
  }
  
  console.log('Firebase configuration is complete');
  return true;
};

console.log('InventoryManager.js is being loaded'); // DEBUG LOG

const InventoryManager = () => {
  console.log('InventoryManager component is being initialized'); // DEBUG LOG
  
  const { plants, loading: plantsLoading, error: plantsError, loadPlants, updatePlantData } = useAdmin();
  console.log('useAdmin hook values:', { plantsCount: plants?.length, plantsLoading, plantsError }); // DEBUG LOG
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading inventory data...');
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [filter, setFilter] = useState('all');
  // eslint-disable-next-line no-unused-vars
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
    images: [],
    mainImageIndex: 0,
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
    featured: false,
    hidden: false,
    inventory: {
      currentStock: 0,
      status: 'In Stock',
      restockDate: '',
      notes: ''
    }
  });
  const [plantSaveStatus, setPlantSaveStatus] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [plantSearchTerm, setPlantSearchTerm] = useState('');
  
  // Use refs for timers to prevent memory leaks
  const refreshTimerRef = useRef(null);
  const syncTimerRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  
  // eslint-disable-next-line no-unused-vars
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
  /* eslint-disable-next-line no-unused-vars */
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // New state for multiple image uploads
  const [additionalImageFiles, setAdditionalImageFiles] = useState([]);
  /* eslint-disable-next-line no-unused-vars */
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState([]);
  /* eslint-disable-next-line no-unused-vars */
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);
  /* eslint-disable-next-line no-unused-vars */
  const [additionalUploadProgress, setAdditionalUploadProgress] = useState(0);

  // eslint-disable-next-line no-unused-vars
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [showFirebasePermissionWarning, setShowFirebasePermissionWarning] = useState(false);

  // Add a new state variable to track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    
    // Copy refs to local variables for cleanup
    const syncTimerRefCopy = syncTimerRef.current;
    const loadingTimerRefCopy = loadingTimerRef.current;
    const fetchTimeoutRefCopy = fetchTimeoutRef.current;
    
    // Cleanup function for unmount
    return () => {
      // Unsubscribe from Firebase listener if it exists
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      
      // Clean up all timers using the copied refs
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (syncTimerRefCopy) clearInterval(syncTimerRefCopy);
      if (loadingTimerRefCopy) clearTimeout(loadingTimerRefCopy);
      if (fetchTimeoutRefCopy) clearTimeout(fetchTimeoutRefCopy);
    };
  }, [handleLoadPlants, checkSyncQueue]);

  // eslint-disable-next-line no-unused-vars
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

  // eslint-disable-next-line no-unused-vars
  const handleEdit = useCallback((plantId) => {
    // Initialize edit values with current plant values
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
      const currentStock = plant.inventory?.currentStock || 0;
      
      // Determine proper status if it's unknown
      let status = plant.inventory?.status || 'Unknown';
      if (status === 'Unknown') {
        // Use the same logic as getDefaultStatusFromStock
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
  }, []);

  // Handle form field changes
  const handleChange = useCallback((plantId, field, value) => {
    console.log(`Changing field ${field} for plant ${plantId} to value:`, value);
    
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
        // Use the same logic as getDefaultStatusFromStock
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

  // Function to count plants by status
  const getStatusCounts = useCallback(() => {
    const counts = {
      'all': plants.length,
      'In Stock': 0,
      'Low Stock': 0,
      'Sold Out': 0,
      'Coming Soon': 0,
      'Pre-order': 0,
      'Hidden': 0
    };
    
    // Count plants for each status
    plants.forEach(plant => {
      const status = plant.inventory?.status;
      
      // Count hidden plants separately
      if (plant.hidden === true || plant.hidden === 'true') {
        counts['Hidden']++;
        counts['all']--; // Reduce total count for hidden plants in main filter
        return;
      }
      
      // Log for debugging
      console.log(`Plant ${plant.id} (${plant.name}) has status: "${status}"`);
      
      if (!status) {
        // If no status but has stock, count as In Stock
        if (plant.inventory?.currentStock > 0) {
          counts['In Stock']++;
        } else {
          // If no status and no stock, count as Sold Out
          counts['Sold Out']++;
        }
      }
      // Handle Pre-order case-insensitively
      else if (status.toLowerCase() === 'pre-order') {
        counts['Pre-order']++;
      }
      // Handle Out of Stock as Sold Out
      else if (status === 'Out of Stock') {
        counts['Sold Out']++;
      }
      // Handle other statuses directly
      else if (counts[status] !== undefined) {
        counts[status]++;
      }
      // Handle unknown status
      else {
        console.log(`Unknown status: ${status} for plant ${plant.id} (${plant.name})`);
      }
    });
    
    console.log('Status counts:', counts);
    return counts;
  }, [plants]);
  
  // Memoize the filtered plants to prevent unnecessary recalculations
  const filteredPlants = React.useMemo(() => {
    let filtered = [...plants];
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(plant => {
        // Special case for Hidden filter
        if (filter === 'Hidden') {
          return plant.hidden === true || plant.hidden === 'true';
        }
        
        // For all other filters, exclude hidden plants
        if (plant.hidden === true || plant.hidden === 'true') {
          return false;
        }
        
        if (!plant.inventory?.status) return false;
        
        // Handle Pre-order case specially
        if (filter === 'Pre-order') {
          return plant.inventory.status === 'Pre-order' || plant.inventory.status === 'Pre-Order';
        }
        
        // Include Low Stock in In Stock filter
        if (filter === 'In Stock') {
          return plant.inventory.status === 'In Stock' || plant.inventory.status === 'Low Stock';
        }
        
        // Include Out of Stock in Sold Out filter 
        if (filter === 'Sold Out') {
          return plant.inventory.status === 'Sold Out' || plant.inventory.status === 'Out of Stock';
        }
        
        // Exact match on status for other cases
        return plant.inventory.status === filter;
      });
    }
    
    // Apply search filter using searchTerm
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(plant => 
        plant.name.toLowerCase().includes(term) || 
        (plant.scientificName && plant.scientificName.toLowerCase().includes(term)) ||
        String(plant.id).toLowerCase().includes(term)
      );
    }
    
    // Apply search filter using plantSearchTerm (for the inventory search box)
    if (plantSearchTerm.trim() !== '') {
      const term = plantSearchTerm.toLowerCase();
      filtered = filtered.filter(plant => 
        (plant.name && plant.name.toLowerCase().includes(term)) || 
        (plant.scientificName && plant.scientificName.toLowerCase().includes(term)) ||
        (plant.botanicalName && plant.botanicalName.toLowerCase().includes(term)) ||
        (plant.category && plant.category.toLowerCase().includes(term)) ||
        String(plant.id).toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Special handling for nested inventory fields and featured status
        if (sortConfig.key === 'currentStock') {
          const aStock = a.inventory?.currentStock || 0;
          const bStock = b.inventory?.currentStock || 0;
          return sortConfig.direction === 'ascending' 
            ? aStock - bStock 
            : bStock - aStock;
        }
        
        if (sortConfig.key === 'status') {
          const aStatus = a.inventory?.status || '';
          const bStatus = b.inventory?.status || '';
          if (aStatus < bStatus) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aStatus > bStatus) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }
        
        if (sortConfig.key === 'featured') {
          const aFeatured = a.featured || false;
          const bFeatured = b.featured || false;
          return sortConfig.direction === 'ascending' 
            ? (aFeatured === bFeatured ? 0 : aFeatured ? 1 : -1)
            : (aFeatured === bFeatured ? 0 : aFeatured ? -1 : 1);
        }
        
        if (sortConfig.key === 'hidden') {
          const aHidden = a.hidden || false;
          const bHidden = b.hidden || false;
          return sortConfig.direction === 'ascending' 
            ? (aHidden === bHidden ? 0 : aHidden ? 1 : -1)
            : (aHidden === bHidden ? 0 : aHidden ? -1 : 1);
        }
        
        // Default sorting for other fields
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
  }, [plants, filter, searchTerm, plantSearchTerm, sortConfig]);

  // Force a refresh of data when the component mounts
  useEffect(() => {
    // Check Firebase configuration
    const configStatus = checkFirebaseConfig();
    if (!configStatus) {
      setError('Firebase configuration is incomplete. Check your .env file and console logs.');
      return;
    }
    
    // Clear any cached data to ensure we get fresh data from the API
    localStorage.removeItem('cachedPlantsWithTimestamp');
    
    // Force a refresh after a short delay to allow the component to render
    const refreshTimer = setTimeout(() => {
      handleLoadPlants(true); // Force refresh
    }, 500);
    
    return () => clearTimeout(refreshTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // New function for handling plant form input changes
  const handlePlantFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Set the flag that we have unsaved changes
    setHasUnsavedChanges(true);
    console.log(`Form changed (${name}). Setting hasUnsavedChanges to true.`);
    
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

  // Handle image selection for single image uploads
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Set the flag that we have unsaved changes
    setHasUnsavedChanges(true);
    
    setPlantFormData(prev => {
      // Make sure images is always an array
      const currentImages = Array.isArray(prev.images) ? [...prev.images] : [];
      const newImages = [...currentImages, file];
      
      // If this is the first image, make it the main image
      const newMainImageIndex = currentImages.length === 0 ? 0 : prev.mainImageIndex;
      
      return {
        ...prev,
        images: newImages,
        mainImageIndex: newMainImageIndex
      };
    });
    
    // Reset the file input
    e.target.value = '';
    
    // Show toast notification
    const event = new CustomEvent('show-toast', {
      detail: {
        message: "Image added successfully",
        type: 'success',
        duration: 2000
      }
    });
    window.dispatchEvent(event);
  };

  // Updated uploadImageFile to detect Firebase permission issues
  const uploadImageFile = async (file) => {
    if (!file) {
      console.error('uploadImageFile called with no file');
      return null;
    }
    
    try {
      console.log('Starting image upload process for file:', file.name, 'type:', file.type, 'size:', file.size);
      setIsUploading(true);
      setUploadProgress(0);
      
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        console.error('Invalid file type:', file.type);
        throw new Error(`Invalid file type "${file.type}". Please upload a JPEG, PNG, GIF, or WebP image.`);
      }
      
      // 10MB limit
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        console.error('File too large:', file.size);
        throw new Error(`File too large (${Math.round(file.size/1024/1024)}MB). Maximum size is 10MB.`);
      }
      
      // Create a unique path for the image based on the current time and file name
      const timestamp = new Date().getTime();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileExtension = sanitizedFileName.split('.').pop().toLowerCase();
      // Updated path to put all images in one folder for easier permissions
      const path = `images/${timestamp}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
      
      console.log('Prepared upload path:', path);
      
      // Show diagnostic information in UI
      const diagnosticEvent = new CustomEvent('show-toast', {
        detail: {
          message: `Processing ${file.name} (${Math.round(file.size/1024)}KB)...`,
          type: 'info',
          duration: 2000
        }
      });
      window.dispatchEvent(diagnosticEvent);
      
      // Simulate progress (Firebase Storage doesn't provide progress updates easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 500);
      
      try {
        // Upload the file to Firebase Storage
        console.log('Calling uploadImageToFirebase...');
        const downloadUrl = await uploadImageToFirebase(file, path);
        
        // If we got back a local URL, set the flag to show the warning
        if (downloadUrl && downloadUrl.startsWith('local:')) {
          setUseLocalStorage(true);
          setShowFirebasePermissionWarning(true);
        }
        
        // Ensure the URL has a token parameter
        let finalUrl = downloadUrl;
        if (downloadUrl && downloadUrl.includes('firebasestorage.googleapis.com') && !downloadUrl.includes('token=')) {
          console.log('Firebase URL is missing token parameter, adding default token');
          const defaultToken = '655fba6f-d45e-44eb-8e01-eee626300739';
          finalUrl = downloadUrl.includes('?') 
            ? `${downloadUrl}&token=${defaultToken}` 
            : `${downloadUrl}?alt=media&token=${defaultToken}`;
          console.log('Fixed URL with token:', finalUrl.substring(0, 100) + '...');
        }
        
        // Clear the interval and set progress to 100%
        clearInterval(progressInterval);
        setUploadProgress(100);
        setIsUploading(false);
        
        console.log('Image uploaded successfully:', finalUrl);
        return finalUrl;
      } catch (firebaseError) {
        clearInterval(progressInterval);
        console.error('Firebase upload error:', firebaseError);
        
        // Check if it's a permission error
        if (firebaseError.code === 'storage/unauthorized') {
          setShowFirebasePermissionWarning(true);
        }
        
        // Handle specific Firebase errors
        let errorMessage = 'Error uploading image. Please try again.';
        if (firebaseError.code === 'storage/unauthorized') {
          errorMessage = 'You do not have permission to upload images.';
        } else if (firebaseError.code === 'storage/canceled') {
          errorMessage = 'Upload was canceled.';
        } else if (firebaseError.code === 'storage/unknown') {
          errorMessage = 'Unknown error occurred during upload.';
        } else if (firebaseError.code === 'storage/quota-exceeded') {
          errorMessage = 'Storage quota exceeded. Please contact admin.';
        } else if (firebaseError.code === 'storage/invalid-format') {
          errorMessage = 'Invalid image format. Please try a different image.';
        } else if (firebaseError.code === 'storage/object-not-found') {
          errorMessage = 'The upload location could not be found.';
        } else if (firebaseError.code === 'storage/retry-limit-exceeded') {
          errorMessage = 'Network unstable. Upload retry limit exceeded.';
        }
        
        // Show diagnostic info
        console.error(errorMessage, 'Original error:', firebaseError.message);
        
        throw new Error(`${errorMessage} (${firebaseError.code || 'unknown error'})`);
      }
    } catch (error) {
      console.error('Error in uploadImageFile:', error);
      setUploadProgress(0);
      setIsUploading(false);
      
      // Use toast notification first
      const errorEvent = new CustomEvent('show-toast', {
        detail: {
          message: `Upload failed: ${error.message}`,
          type: 'error',
          duration: 4000
        }
      });
      window.dispatchEvent(errorEvent);
      
      // Don't alert if we already showed a toast
      // alert(`Upload failed: ${error.message}`);
      
      return null;
    }
  };

  // Modified handlePlantSubmit to handle local image URLs
  const handlePlantSubmit = async (e) => {
    e.preventDefault();
    console.log('Starting form submission...');
    console.log('Image files present:', additionalImageFiles.length);
    
    setPlantSaveStatus('saving');

    try {
      // Validate required fields
      if (!plantFormData.name.trim()) {
        throw new Error("Plant name is required");
      }

      console.log("Preparing to save plant:", { ...plantFormData });
      
      // Upload all images if any
      let allImagesUrls = [];
      console.log("Processing images for upload:", plantFormData.images);
      
      // Process existing images
      if (plantFormData.images && Array.isArray(plantFormData.images)) {
        // Classify images that are already URLs vs Files that need uploading
        for (let i = 0; i < plantFormData.images.length; i++) {
          const image = plantFormData.images[i];
          console.log(`Processing image ${i}:`, typeof image, image instanceof File ? 'File object' : 'URL/string');
          
          if (image instanceof File) {
            try {
              console.log(`Uploading file: ${image.name}`);
              const uploadedUrl = await uploadImageFile(image);
              if (uploadedUrl) {
                console.log(`Successfully uploaded to: ${uploadedUrl}`);
                allImagesUrls.push(uploadedUrl);
              } else {
                console.error(`Failed to upload image ${i}`);
              }
            } catch (error) {
              console.error(`Error uploading image ${i}:`, error);
            }
          } else if (typeof image === 'string') {
            // This is already a URL, keep it
            console.log(`Keeping existing image URL: ${image.substring(0, 30)}...`);
            allImagesUrls.push(image);
          } else {
            console.warn(`Skipping invalid image type at index ${i}:`, image);
          }
        }
      }
      
      // Add the main image if we have one that's not in the array yet
      if (imageFile) {
        try {
          console.log('Uploading main image file:', imageFile.name);
          const uploadedUrl = await uploadImageFile(imageFile);
          if (uploadedUrl) {
            console.log('Main image uploaded successfully:', uploadedUrl);
            allImagesUrls.push(uploadedUrl);
          } else {
            console.error('Main image upload failed');
          }
        } catch (error) {
          console.error('Error during main image upload:', error);
        }
      }
      
      // Upload additional images if any
      if (additionalImageFiles.length > 0) {
        console.log(`Uploading ${additionalImageFiles.length} additional images...`);
        const newUrls = await uploadAdditionalImages();
        if (newUrls && newUrls.length > 0) {
          allImagesUrls = [...allImagesUrls, ...newUrls];
          console.log(`Additional images uploaded successfully. Total: ${allImagesUrls.length}`);
        }
      }
      
      // Filter out any empty or null values from allImagesUrls
      allImagesUrls = allImagesUrls.filter(url => {
        // Check if url is a string before trying to call trim()
        if (typeof url === 'string') {
          return url.trim() !== '';
        } else if (url instanceof File) {
          // Keep File objects
          return true;
        }
        // Filter out null, undefined, etc.
        return false;
      });
      console.log('Filtered allImagesUrls:', allImagesUrls);

      // Make sure we have a valid mainImageIndex
      let mainImageIndex = plantFormData.mainImageIndex || 0;
      if (mainImageIndex >= allImagesUrls.length) {
        mainImageIndex = allImagesUrls.length > 0 ? 0 : -1;
      }
      
      // Prepare the plant data for update
      const plantData = {
        ...plantFormData,
        // Set the mainImage for backward compatibility
        mainImage: allImagesUrls.length > 0 && mainImageIndex >= 0 ? allImagesUrls[mainImageIndex] : '',
        // Store all images in a single array
        images: allImagesUrls,
        // Keep track of which image is the main one
        mainImageIndex: mainImageIndex,
        // Ensure all fields are present
        name: plantFormData.name || '',
        scientificName: plantFormData.scientificName || '',
        commonName: plantFormData.commonName || '',
        price: parseFloat(plantFormData.price) || 0,
        description: plantFormData.description || '',
        colour: plantFormData.colour || '',
        light: plantFormData.light || '',
        height: plantFormData.height || '',
        spacing: plantFormData.spread || '', // Map spread to spacing
        bloomSeason: plantFormData.bloomSeason || '',
        plantType: plantFormData.plantType || '',
        specialFeatures: plantFormData.specialFeatures || '',
        uses: plantFormData.uses || '',
        aroma: plantFormData.aroma || '',
        gardeningTips: plantFormData.gardeningTips || '',
        careTips: plantFormData.careTips || '',
        hardinessZone: plantFormData.hardinessZone || '',
        featured: plantFormData.featured || false,
        // Preserve additionalImages if it's an array, otherwise convert to empty array
        additionalImages: Array.isArray(plantFormData.additionalImages) 
          ? plantFormData.additionalImages 
          : (typeof plantFormData.additionalImages === 'string' && plantFormData.additionalImages.trim() 
            ? [plantFormData.additionalImages.trim()] 
            : [])
      };
      
      console.log('Prepared plant data for saving:', plantData);
      console.log('Plant data images length:', plantData.images?.length || 0);
      console.log('Main image index:', plantData.mainImageIndex);
      
      // Ensure we have a valid ID for the plant in edit mode
      if (plantEditMode && !plantFormData.id && currentPlant && currentPlant.id) {
        console.log('Plant ID missing in form data, using currentPlant.id:', currentPlant.id);
        plantData.id = currentPlant.id;
        
        // Also update plantFormData to include the ID for future operations
        setPlantFormData(prev => ({
          ...prev,
          id: currentPlant.id
        }));
      }

      // Save or update the plant in Firebase
      let result;
      if (plantEditMode) {
        // Double-check we have a valid ID before proceeding
        if (!plantData.id && !plantFormData.id) {
          console.error('No valid plant ID found for update');
          setPlantSaveStatus('error');
          alert('Error: Cannot update plant without an ID. Please try again or refresh the page.');
          return;
        }
        
        // Use plantData.id if available, otherwise fall back to plantFormData.id
        const idToUse = plantData.id || plantFormData.id;
        console.log('Updating plant with ID:', idToUse);
        result = await updatePlant(idToUse, plantData);
      } else {
        result = await addPlant(plantData);
      }
      
      // Process the result
      if (result && result.success) {
        console.log('Plant saved successfully:', result);
        setPlantSaveStatus('success');
        // Clear the unsaved changes flag after successful save
        setHasUnsavedChanges(false);
      
        // Force a refresh of the plants data to get the updated images
        console.log('Refreshing plants data after successful save...');
        handleLoadPlants(true);
        
        // Show a toast notification
        const message = plantEditMode ? 'Plant updated successfully!' : 'New plant added successfully!';
        const event = new CustomEvent('show-toast', { 
          detail: { 
            message,
            type: 'success',
            duration: 3000
          }
        });
        window.dispatchEvent(event);
        
        // Use the improved resetPlantForm function after a delay
        // This will change the tab first, then reset the form state
        setTimeout(() => {
          resetPlantForm();
        }, 1000);
      } else {
        console.error('Error saving plant:', result?.error || 'Unknown error');
        setPlantSaveStatus('error');
        
        // Show an error toast
        const event = new CustomEvent('show-toast', { 
          detail: { 
            message: `Error: ${result?.error || 'Failed to save plant'}`,
            type: 'error',
            duration: 5000
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error in handlePlantSubmit:', error);
      setPlantSaveStatus('error');
      
      // Show an error toast
      const event = new CustomEvent('show-toast', { 
        detail: { 
          message: `Error: ${error.message || 'Unknown error occurred'}`,
          type: 'error',
          duration: 5000
        }
      });
      window.dispatchEvent(event);
    }
  };

  // Modify resetPlantForm to explicitly set hidden to false
  const resetPlantForm = () => {
    // First, change the tab to prevent flashing
    setActiveTab('inventory');
    
    // Then reset all the form state after a short delay
    setTimeout(() => {
      setPlantFormData({
        name: '',
        scientificName: '',
        commonName: '',
        price: '',
        description: '',
        images: [],
        mainImageIndex: 0,
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
        featured: false,
        hidden: false,  // Explicitly set to false when resetting
        inventory: {
          currentStock: 0,
          status: 'In Stock',
          restockDate: '',
          notes: ''
        }
      });
      setPlantEditMode(false);
      setCurrentPlant(null);
      setPlantSaveStatus('');
      setImageFile(null);
      setAdditionalImageFiles([]);
      setHasUnsavedChanges(false);
    }, 50);
  };

  // New function to handle edit plant button click
  const handleEditPlant = (plant) => {
    setPlantEditMode(true);
    setCurrentPlant(plant);
    
    // Process images array
    let images = [];
    let mainImageIndex = 0;
    
    if (plant.images && Array.isArray(plant.images)) {
      images = plant.images;
    } else if (plant.image) {
      images = [plant.image];
    }
    
    if (typeof plant.mainImageIndex === 'number') {
      mainImageIndex = plant.mainImageIndex;
    }
    
    // Update form data
    setPlantFormData({
      id: plant.id,
      name: plant.name || '',
      scientificName: plant.scientificName || '',
      commonName: plant.commonName || '',
      price: plant.price || '',
      description: plant.description || '',
      images: images,
      mainImageIndex: mainImageIndex,
      colour: plant.colour || '',
      light: plant.light || '',
      height: plant.height || '',
      spread: plant.spacing || '', // Map spacing to spread
      bloomSeason: plant.bloomSeason || '',
      plantType: plant.plantType || '',
      specialFeatures: plant.specialFeatures || '',
      uses: plant.uses || '',
      aroma: plant.aroma || '',
      gardeningTips: plant.gardeningTips || '',
      careTips: plant.careTips || '',
      hardinessZone: plant.hardinessZone || '',
      featured: plant.featured === true || plant.featured === 'true',
      hidden: plant.hidden === true || plant.hidden === 'true',
      inventory: {
        currentStock: plant.inventory?.currentStock || 0,
        status: plant.inventory?.status || 'In Stock',
        restockDate: plant.inventory?.restockDate || '',
        notes: plant.inventory?.notes || ''
      }
    });
    
    // Finally, switch the tab after form data is set
    setActiveTab('addPlant');
  };

  // eslint-disable-next-line no-unused-vars
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
        // Check for required fields - at minimum we need plant_id and name
        if (!plant.plant_id || !plant.name) {
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
      const transformedPlantsData = validPlants.map(plant => {
        // Log the original plant data to help identify header issues
        console.log('Original plant data headers:', Object.keys(plant));
        
        return {
          id: parseInt(plant.plant_id) || 0,
          name: plant.name || '',
          scientificName: plant.latinname || '',
          commonName: plant.commonname || '',
          price: plant.price || plant.Price || 0,
          featured: plant.featured === 'true' || plant.featured === true || plant.Featured === 'true' || plant.Featured === true,
          plantType: plant.type || plant.Type || plant['type(annual/perennial)'] || plant['Type(Annual/Perennial)'] || '',
          description: plant.description || '',
          bloomSeason: plant.bloom_season || plant.bloom_Season || plant.bloomseason || plant.bloomSeason || plant['bloom season'] || plant['Bloom Season'] || '',
          colour: plant.colour || plant.Colour || plant.color || plant.Color || '',
          light: plant.sunlight || plant.Sunlight || plant.sun_light || plant.Sun_Light || plant['sun light'] || plant['Sun Light'] || '',
          spacing: plant.spread_inches || plant.spreadinches || plant['spread (inches)'] || plant['Spread (inches)'] || '',
          height: plant.height_inches || plant.heightinches || plant['height (inches)'] || plant['Height (inches)'] || '',
          hardinessZone: plant.hardiness_zones || plant.hardinessZones || plant.hardiness_zone || plant['hardiness zones'] || plant['Hardiness Zones'] || '',
          specialFeatures: plant.special_features || plant.specialfeatures || plant.specialFeatures || plant['special features'] || plant['Special Features'] || '',
          uses: plant.uses || plant.Uses || '',
          aroma: plant.aroma || plant.Aroma || '',
          gardeningTips: plant.gardening_tips || plant.gardeningtips || plant.gardeningTips || plant['gardening tips'] || plant['Gardening Tips'] || '',
          careTips: plant.care_tips || plant.caretips || plant.careTips || plant['care tips'] || plant['Care Tips'] || '',
          mainImage: plant.mainimage || plant.mainImage || plant.MainImage || plant['main image'] || plant['Main Image'] || '',
          additionalImages: processAdditionalImages(plant.additionalimage || plant.additionalImage || plant.AdditionalImage || plant['additional image'] || plant['Additional Image'] || '')
        };
      });
      
      // Helper function to process additionalImages
      function processAdditionalImages(imagesString) {
        if (!imagesString) return [];
        if (typeof imagesString !== 'string') return [];
        
        // Split by commas if there are multiple URLs
        if (imagesString.includes(',')) {
          return imagesString.split(',').map(url => url.trim()).filter(url => url);
        }
        
        // If it's a single URL, return as array with one item
        return [imagesString.trim()];
      }
      
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
          notes: plant.inventory?.notes || '',
          featured: plant.featured === true || plant.featured === 'true'
        };
      });
      setEditValues(initialValues);
    }
  }, [plants, plantsLoading, plantsError]);

  // Handle additional images selection
  const handleAdditionalImagesSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    console.log(`Selected ${files.length} additional images:`, files.map(f => f.name));
    
    // Set the flag that we have unsaved changes
    setHasUnsavedChanges(true);
    
    // Add to additionalImageFiles for later upload
    setAdditionalImageFiles(prev => [...prev, ...files]);
    
    // Also update the form data with preview files
    setPlantFormData(prev => {
      // Clone the images array to avoid mutation issues
      const newImages = Array.isArray(prev.images) ? [...prev.images] : [];
      // Add all new files
      newImages.push(...files);
      
      console.log(`Updated images array now has ${newImages.length} images`);
      
      // If there were no previous images, make the first new one the main image
      const newMainImageIndex = newImages.length === 0 ? 0 : prev.mainImageIndex;
      
      return {
        ...prev,
        images: newImages,
        mainImageIndex: newMainImageIndex
      };
    });
    
    // Reset the file input
    e.target.value = '';
    
    // Show toast notification
    const event = new CustomEvent('show-toast', {
      detail: {
        message: `${files.length} images added successfully`,
        type: 'success',
        duration: 2000
      }
    });
    window.dispatchEvent(event);
  };
  
  // Upload multiple images with improved feedback
  const uploadAdditionalImages = async () => {
    if (additionalImageFiles.length === 0) {
      console.log('No additional images to upload');
      return [];
    }
    
    console.log(`Starting upload of ${additionalImageFiles.length} additional images`);
    setIsUploading(true);
    setUploadProgress(0);
    
    const urls = [];
    const failedUploads = [];
    
    try {
      // Create a more explicit progress notification
      const event = new CustomEvent('show-toast', {
        detail: {
          message: `Starting upload of ${additionalImageFiles.length} image(s)...`,
          type: 'info',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
      
      for (let i = 0; i < additionalImageFiles.length; i++) {
        const file = additionalImageFiles[i];
        console.log(`Processing file ${i+1}/${additionalImageFiles.length}: ${file.name} (${file.size} bytes)`);
        
        // Create a progress notification for each file
        const fileStartEvent = new CustomEvent('show-toast', {
          detail: {
            message: `Uploading image ${i+1}/${additionalImageFiles.length}: ${file.name}`,
            type: 'info',
            duration: 2000
          }
        });
        window.dispatchEvent(fileStartEvent);
        
        try {
          // Validate file
          const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if (!validTypes.includes(file.type)) {
            throw new Error(`Invalid file type for ${file.name}. Please upload JPEG, PNG, GIF, or WebP images.`);
          }
          
          // 10MB limit
          const maxSize = 10 * 1024 * 1024;
          if (file.size > maxSize) {
            throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
          }
          
          console.log(`Uploading file ${i+1}: ${file.name}`);
          
          // Create a unique path for the image
          const timestamp = new Date().getTime();
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const fileExtension = sanitizedFileName.split('.').pop().toLowerCase();
          const path = `images/${timestamp}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
          
          console.log(`File ${i+1} upload path: ${path}`);
          
          const url = await uploadImageFile(file); // Uses the specified path
          
          if (url) {
            urls.push(url);
            console.log(`File ${i+1} uploaded successfully: ${url.substring(0, 50)}...`);
            
            // Show success toast for individual file
            const fileSuccessEvent = new CustomEvent('show-toast', {
              detail: {
                message: `Successfully uploaded image ${i+1}: ${file.name}`,
                type: 'success',
                duration: 2000
              }
            });
            window.dispatchEvent(fileSuccessEvent);
          } else {
            // Update status to error
            failedUploads.push(file.name);
            console.error(`Failed to upload file ${i+1}: ${file.name}`);
            
            // Show error toast for individual file
            const fileErrorEvent = new CustomEvent('show-toast', {
              detail: {
                message: `Failed to upload image ${i+1}: ${file.name}`,
                type: 'error',
                duration: 3000
              }
            });
            window.dispatchEvent(fileErrorEvent);
          }
        } catch (error) {
          console.error(`Error uploading file ${i+1} (${file.name}):`, error);
          failedUploads.push(file.name);
          
          // Show error toast for exception
          const errorEvent = new CustomEvent('show-toast', {
            detail: {
              message: `Error uploading ${file.name}: ${error.message}`,
              type: 'error',
              duration: 4000
            }
          });
          window.dispatchEvent(errorEvent);
        }
        
        // Update overall progress
        const progress = Math.round(((i + 1) / additionalImageFiles.length) * 100);
        setUploadProgress(progress);
        console.log(`Overall additional images progress: ${progress}%`);
      }
    } catch (error) {
      console.error('Error in additional images upload process:', error);
      
      // Show general error toast
      const generalErrorEvent = new CustomEvent('show-toast', {
        detail: {
          message: `Upload process error: ${error.message}`,
          type: 'error',
          duration: 4000
        }
      });
      window.dispatchEvent(generalErrorEvent);
    } finally {
      setIsUploading(false);
      console.log(`Completed additional images upload. Success: ${urls.length}, Failed: ${failedUploads.length}`);
      
      // Final status toast
      const completionEvent = new CustomEvent('show-toast', {
        detail: {
          message: `Upload complete: ${urls.length} successful, ${failedUploads.length} failed`,
          type: failedUploads.length > 0 ? 'warning' : 'success',
          duration: 4000
        }
      });
      window.dispatchEvent(completionEvent);
      
      // If we have failed uploads, show an alert with detailed info
      if (failedUploads.length > 0) {
        setTimeout(() => {
          alert(`Failed to upload ${failedUploads.length} images: ${failedUploads.join(', ')}\n\nPlease try again with different images or contact support.`);
        }, 500);
      }
    }
    
    // Log final URLs before returning
    console.log('Final upload URLs:', urls);
    
    return urls.filter(url => url != null && url !== '');
  };
  
  // Handle setting an image as the main image
  const handleSetAsMainImage = (index) => {
    console.log(`Setting image ${index} as main image`);
    
    // Set the flag that we have unsaved changes
    setHasUnsavedChanges(true);
    
    setPlantFormData(prev => ({
      ...prev,
      mainImageIndex: index
    }));
    
    // Show toast notification
    const event = new CustomEvent('show-toast', {
      detail: {
        message: "Main image updated",
        type: 'success',
        duration: 2000
      }
    });
    window.dispatchEvent(event);
  };

  // Handle removing an image
  const handleRemoveImage = (index) => {
    console.log(`Removing image at index ${index}`);
    
    // Set the flag that we have unsaved changes
    setHasUnsavedChanges(true);
    
    setPlantFormData(prev => {
      // Create a copy of the images array without the removed image
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      
      // Adjust mainImageIndex if needed
      let newMainImageIndex = prev.mainImageIndex;
      if (newImages.length === 0) {
        // No images left, reset to 0
        newMainImageIndex = 0;
      } else if (index === prev.mainImageIndex) {
        // We removed the main image, set to first image
        newMainImageIndex = 0;
      } else if (index < prev.mainImageIndex) {
        // We removed an image before the main image, decrement the index
        newMainImageIndex--;
      }
      
      return {
        ...prev,
        images: newImages,
        mainImageIndex: newMainImageIndex
      };
    });
    
    // Show toast notification
    const event = new CustomEvent('show-toast', {
      detail: {
        message: "Image removed",
        type: 'success',
        duration: 2000
      }
    });
    window.dispatchEvent(event);
  };

  // Add useEffect to set up beforeunload event listener
  useEffect(() => {
    console.log("hasUnsavedChanges state updated:", hasUnsavedChanges);
    
    // Function to warn before closing window/navigating away
    const handleBeforeUnload = (e) => {
      console.log("beforeunload event triggered, hasUnsavedChanges:", hasUnsavedChanges);
      if (hasUnsavedChanges) {
        // Standard way of showing a confirmation dialog on page close
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);
    console.log("beforeunload event listener added");

    // Clean up
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log("beforeunload event listener removed");
    };
  }, [hasUnsavedChanges]);

  // Add a navigation warning when user tries to switch tabs with unsaved changes
  const handleTabChange = (newTabName) => {
    if (hasUnsavedChanges && 
        ((plantEditMode && newTabName !== 'addPlant') || 
         (!plantEditMode && activeTab === 'addPlant'))) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this page?'
      );
      if (!confirmLeave) {
        return; // Stay on current tab
      }
      // If they confirm, reset the unsaved changes flag
      setHasUnsavedChanges(false);
    }
    
    // Proceed with changing the tab
    setActiveTab(newTabName);
  };

  // Add this useEffect near your other useEffect hooks
  useEffect(() => {
    // Check for URL parameter to enable import tab
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'import') {
      handleTabChange('csvMigration');
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Handle deleting a plant
  const handleDeletePlant = async (plantId) => {
    if (!plantId) return;
    
    setPlantSaveStatus('saving');
    
    try {
      // Call the deletePlant function from Firebase service
      const result = await deletePlant(plantId);
      
      if (result.success) {
        setPlantSaveStatus('success');
        
        // Show success notification
        const event = new CustomEvent('show-toast', { 
          detail: { 
            message: 'Flower deleted successfully!',
            type: 'success',
            duration: 3000
          }
        });
        window.dispatchEvent(event);
        
        // Force refresh the plants list from the database
        handleLoadPlants(true);
        
        // Reset form and navigate back to inventory tab
        resetPlantForm();
        setPlantEditMode(false);
        setActiveTab('inventory');
      } else {
        setPlantSaveStatus('error');
        
        // Show error notification
        const event = new CustomEvent('show-toast', { 
          detail: { 
            message: `Error deleting flower: ${result.message}`,
            type: 'error',
            duration: 5000
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      setPlantSaveStatus('error');
      
      // Show error notification
      const event = new CustomEvent('show-toast', { 
        detail: { 
          message: `Error deleting flower: ${error.message}`,
          type: 'error',
          duration: 5000
        }
      });
      window.dispatchEvent(event);
    }
  };

  // Find the useEffect that sets up timers (around line 225-230)
  useEffect(() => {
    // Load plants initially
    loadPlants();
    
    // Set up polling for sync status
    const checkSyncStatus = async () => {
      try {
        const queueStatus = await processSyncQueue();
        setSyncStatus(prev => ({
          ...prev,
          syncing: queueStatus.processing,
          pendingUpdates: queueStatus.pendingCount || 0,
          message: queueStatus.message || 'Sync complete',
          lastSync: queueStatus.lastSync || prev.lastSync
        }));
      } catch (err) {
        console.error("Error checking sync queue status:", err);
        setSyncStatus(prev => ({
          ...prev,
          message: `Error: ${err.message}`
        }));
      }
    };
    
    // Set up sync timer
    syncTimerRef.current = setInterval(checkSyncStatus, 30000); // Check every 30 seconds
    
    // Check Firebase config
    checkFirebaseConfig();
    
    // Set a timeout to check if we're still loading after 10 seconds
    loadingTimerRef.current = setTimeout(() => {
      if (loading || plantsLoading) {
        setLoadingMessage('Still loading... This is taking longer than expected.');
        
        // After 5 more seconds, try reloading plants
        fetchTimeoutRef.current = setTimeout(() => {
          if (loading || plantsLoading) {
            setLoadingMessage('Loading timed out. Retrying...');
            setApiRetryCount(prev => prev + 1);
            loadPlants();
          }
        }, 5000);
      }
    }, 10000);
    
    // Clean up the handlers when the component unmounts
    return () => {
      // Store local copies of the current ref values to use in cleanup
      const syncTimer = syncTimerRef.current;
      const loadingTimer = loadingTimerRef.current;
      const fetchTimeout = fetchTimeoutRef.current;
      
      if (syncTimer) clearInterval(syncTimer);
      if (loadingTimer) clearTimeout(loadingTimer);
      if (fetchTimeout) clearTimeout(fetchTimeout);
    };
  }, [loadPlants, loading, plantsLoading]);

  // Add a function to handle manual sync
  const handleManualSync = async () => {
    try {
      setSyncStatus(prev => ({
        ...prev,
        syncing: true,
        message: 'Manual sync in progress...'
      }));
      
      const queueStatus = await processSyncQueue();
      
      setSyncStatus({
        syncing: false,
        pendingUpdates: queueStatus.pendingCount || 0,
        message: queueStatus.message || 'Manual sync complete',
        lastSync: new Date().toISOString()
      });
      
      // Show a success toast
      const event = new CustomEvent('show-toast', { 
        detail: { 
          message: `Database sync complete. ${queueStatus.pendingCount || 0} items remaining.`,
          type: 'success',
          duration: 3000
        }
      });
      window.dispatchEvent(event);
      
      // Refresh plant data after sync
      handleLoadPlants(true);
    } catch (error) {
      console.error('Error during manual sync:', error);
      
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        message: `Sync error: ${error.message}`
      }));
      
      // Show error toast
      const event = new CustomEvent('show-toast', { 
        detail: { 
          message: `Sync error: ${error.message}`,
          type: 'error',
          duration: 5000
        }
      });
      window.dispatchEvent(event);
    }
  };

  // Status counts for filter options
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      'In Stock': 0,
      'Low Stock': 0,
      'Sold Out': 0,
      'Coming Soon': 0,
      'Pre-order': 0,
      'Hidden': 0
    };
    
    if (plants) {
      plants.forEach(plant => {
        counts.all++;
        
        // Count hidden plants
        if (plant.hidden) {
          counts['Hidden']++;
        }
        
        // Count by inventory status
        if (plant.inventory && plant.inventory.status) {
          const status = plant.inventory.status;
          if (counts[status] !== undefined) {
            counts[status]++;
          }
        }
      });
    }
    return counts;
  }, [plants]);
  
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
          newStatus = 'Sold Out';
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
        
        fixedCount++;
      } catch (error) {
        console.error(`Error fixing status for plant ${plant.id}:`, error);
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
    
    // Refresh the plants data
    handleLoadPlants(true);
  };
  
  // Fix for pre-order/Pre-order capitalization differences
  useEffect(() => {
    // Ensure we only do the inventory check if plants are loaded
    if (!plants || plants.length === 0 || plantsLoading) return;
    
    const needsUpdate = plants.some(plant => 
      plant.inventory?.status === 'Pre-Order' ||
      plant.inventory?.status === 'pre-order' ||
      plant.inventory?.status === 'pre-Order'
    );
    
    if (needsUpdate) {
      console.log('Found plants with incorrect Pre-order capitalization, updating them...');
      // This update should be done on the backend or through the appropriate update mechanism
    }
  }, [plants, plantsLoading]);

  // Check Firebase config and log detailed info
  useEffect(() => {
    console.log('InventoryManager mounted - checking Firebase config');
    const configStatus = checkFirebaseConfig();
    console.log('Firebase config status:', configStatus);
    
    // Check environment
    console.log('Current environment:', process.env.NODE_ENV);
    console.log('Firebase database URL:', process.env.REACT_APP_FIREBASE_DATABASE_URL);
    
    // Log initial context state
    console.log('Initial AdminContext state:', { 
      plantsCount: plants?.length, 
      loading: plantsLoading,
      error: plantsError
    });
    
    // Add global error handler to catch rendering errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Log to both console and potentially to a monitoring service in the future
      originalConsoleError(...args);
      
      // Check if this is a React error
      const errorString = args.join(' ');
      if (errorString.includes('Error rendering component')) {
        setError(`Rendering error in InventoryManager: ${errorString}`);
      }
    };
    
    // Try loading plants immediately to catch any issues
    loadPlants(true).catch(err => {
      console.error('Error during initial plants load:', err);
      setError(`Failed to load inventory data: ${err.message}`);
    });
    
    return () => {
      // Restore original console.error
      console.error = originalConsoleError;
      console.log('InventoryManager unmounted');
    };
  }, [loadPlants, plants, plantsError, plantsLoading]);

  // ADD THIS TO THE COMPONENT RENDER SECTION NEAR THE TOP:
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
        <div style={{ marginTop: '20px', textAlign: 'left', background: '#f9f9f9', padding: '15px', borderRadius: '4px' }}>
          <h3>Debug Information:</h3>
          <p>Environment: {process.env.NODE_ENV}</p>
          <p>Firebase Config Valid: {checkFirebaseConfig() ? 'Yes' : 'No'}</p>
          <p>Plants Loaded: {plants?.length || 0}</p>
          <p>Loading State: {loading || plantsLoading ? 'Loading' : 'Not Loading'}</p>
          <p>Last Error: {error || plantsError || 'None'}</p>
        </div>
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
      {/* Hide tabs when editing a flower */}
      {!plantEditMode && (
        <div className="inventory-header-container">
          <div className="sales-header">
            <h2>{activeTab === 'addPlant' ? 'Add New Flower' : 'Inventory'}</h2>
            
            <div className="header-controls">
              {activeTab === 'inventory' && (
                <>
                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="Search plants..."
                      value={plantSearchTerm}
                      onChange={(e) => setPlantSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="filter-controls">
                    <label htmlFor="statusFilter">Status:</label>
                    <select
                      id="statusFilter"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All ({statusCounts.all})</option>
                      <option value="In Stock">In Stock ({statusCounts['In Stock'] + statusCounts['Low Stock']})</option>
                      <option value="Sold Out">Sold Out ({statusCounts['Sold Out']})</option>
                      <option value="Coming Soon">Coming Soon ({statusCounts['Coming Soon']})</option>
                      <option value="Pre-order">Pre-order ({statusCounts['Pre-order']})</option>
                      <option value="Hidden">Hidden ({statusCounts['Hidden']})</option>
                    </select>
                  </div>
                  
                  {/* Sync DB button removed */}
                </>
              )}
            </div>
            
            {activeTab === 'inventory' ? (
              <button 
                className="add-new-button"
                onClick={() => {
                  resetPlantForm();
                  handleTabChange('addPlant');
                }}
              >
                Add New
              </button>
            ) : activeTab === 'addPlant' ? (
              <div className="button-group">
                <button 
                  className="back-button"
                  onClick={() => handleTabChange('inventory')}
                >
                  Back to Inventory
                </button>
                <button 
                  className="save-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    // Submit the form using the form id
                    document.getElementById('plantForm').dispatchEvent(new Event('submit', {
                      cancelable: true,
                      bubbles: true
                    }));
                  }}
                  disabled={plantSaveStatus === 'saving'}
                >
                  {plantSaveStatus === 'saving' ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : null}
          </div>
          {/* Hide the Import Data tab but keep all functionality */}
          {false && (
            <button 
              className={`tab-button ${activeTab === 'csvMigration' ? 'active' : ''}`}
              onClick={() => handleTabChange('csvMigration')}
            >
              Import Data
            </button>
          )}
        </div>
      )}

      {/* When in edit mode, show a page header with the plant name */}
      {plantEditMode && (
        <div className="page-header">
          <h1>Update {plantFormData.name || 'Flower'}</h1>
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
                setPlantEditMode(false);
              }}
            >
              Back to Inventory
            </button>
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
                  let additionalImagesUrls = [...plantFormData.images];
                  
                  if (additionalImageFiles.length > 0) {
                    const newUrls = await uploadAdditionalImages();
                    if (newUrls && newUrls.length > 0) {
                      additionalImagesUrls = [...additionalImagesUrls, ...newUrls];
                    }
                  }
                  
                  // Prepare plant data
                  const plantData = {
                    ...plantFormData,
                    mainImage: mainImageUrl,
                    images: additionalImagesUrls,
                    id: currentPlant ? currentPlant.id : Math.max(0, ...plants.map(p => parseInt(p.id) || 0)) + 1
                  };
                  
                  // Update existing plant
                  await updatePlant(currentPlant.id, plantData);
                  setPlantSaveStatus('success');
                  
                  // Update plant in context if needed
                  if (typeof updatePlantData === 'function') {
                    updatePlantData(plantData);
                  }
                  
                  // Show a toast notification
                  const event = new CustomEvent('show-toast', { 
                    detail: { 
                      message: 'Plant updated successfully!',
                      type: 'success',
                      duration: 3000
                    }
                  });
                  window.dispatchEvent(event);
                  
                  // Use the improved resetPlantForm function after a delay
                  setTimeout(() => {
                    resetPlantForm();
                  }, 1000);
                } catch (error) {
                  console.error('Error saving plant:', error);
                  setPlantSaveStatus('error');
                  
                  // Show an error toast
                  const event = new CustomEvent('show-toast', { 
                    detail: { 
                      message: `Error: ${error.message || 'Unknown error occurred'}`,
                      type: 'error',
                      duration: 5000
                    }
                  });
                  window.dispatchEvent(event);
                }
              }}
              disabled={plantSaveStatus === 'saving'}
            >
              {plantSaveStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
      
      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && !plantEditMode && (
        <div className="tab-content">
          {/* Sync status removed */}
          
          {apiRetryCount > 0 && (
            <div className="api-warning">
              <p><span role="img" aria-label="Warning">⚠️</span> API connection issues detected. Your changes are being saved locally and will sync when the connection is restored.</p>
            </div>
          )}
          
          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th className="sortable-header" onClick={() => handleSort('name')}>
                    Flower Name {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th className="sortable-header" onClick={() => handleSort('currentStock')}>
                    Stock {sortConfig.key === 'currentStock' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th className="sortable-header" onClick={() => handleSort('status')}>
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? '↑' : '↓')} 
                    <button 
                      className="check-status-link" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the sort
                        fixUnknownStatuses();
                      }}
                      title="Check and fix unknown statuses"
                    >
                      (Check)
                    </button>
                  </th>
                  <th>Restock Date</th>
                  <th className="sortable-header" onClick={() => handleSort('featured')}>
                    Featured {sortConfig.key === 'featured' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th className="sortable-header" onClick={() => handleSort('hidden')}>
                    Hidden Status {sortConfig.key === 'hidden' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
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
                              <option value="Low Stock">Low Stock</option>
                              <option value="Sold Out">Sold Out</option>
                              <option value="Coming Soon">Coming Soon</option>
                              <option value="Pre-order">Pre-order</option>
                            </select>
                          ) : (
                            <span className={`status-badge ${statusClass}`}>
                              {plant.inventory?.status || 'Unknown'}
                            </span>
                          )}
                        </td>
                        <td data-label="Restock Date">{plant.inventory?.restockDate || 'N/A'}</td>
                        <td data-label="Featured">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={editValues[plant.id]?.featured || false}
                              onChange={(e) => handleChange(plant.id, 'featured', e.target.checked)}
                            />
                          ) : (
                            <>
                              {plant.featured ? (
                                <>
                                  {plant.imageURL && (
                                    <div className="featured-image-container">
                                      <img src={plant.imageURL} alt={`Plant ${plant.id}`} />
                                    </div>
                                  )}
                                  <span>Yes</span>
                                </>
                              ) : (
                                <span>No</span>
                              )}
                            </>
                          )}
                        </td>
                        <td data-label="Hidden">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={editValues[plant.id]?.hidden || false}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                handleChange(plant.id, 'hidden', isChecked);
                              }}
                            />
                          ) : (
                            <span>{plant.hidden ? 'Hidden' : 'Visible'}</span>
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
          {!plantEditMode && activeTab !== 'addPlant' && <h2>Add New Flower</h2>}
          
          {/* Firebase Storage Permission Warning */}
          {showFirebasePermissionWarning && (
            <div className="firebase-permission-warning">
              <h3><span role="img" aria-label="Warning">⚠️</span> Firebase Storage Permission Issue</h3>
              <p>There's a problem with Firebase Storage permissions. Your images are being saved locally in your browser instead.</p>
              <p>These local images will work for now, but:</p>
              <ul>
                <li>They won't be visible to other users</li>
                <li>They'll be lost if you clear your browser data</li>
                <li>They won't persist if you view the site on another device</li>
              </ul>
              <p>To fix this permanently, update your Firebase Storage security rules to allow uploads.</p>
              <button 
                className="dismiss-warning-btn"
                onClick={() => setShowFirebasePermissionWarning(false)}
              >
                Dismiss Warning
              </button>
            </div>
          )}
          
          <form id="plantForm" className="plant-form" onSubmit={handlePlantSubmit}>
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
                  <option value="Low Stock">Low Stock</option>
                  <option value="Sold Out">Sold Out</option>
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
            
            <div className="form-group">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="hidden"
                  name="hidden"
                  checked={plantFormData.hidden}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setPlantFormData(prev => ({
                      ...prev,
                      hidden: isChecked
                    }));
                  }}
                />
                <label htmlFor="hidden">Hide from shop (clicking this hides the item from customers)</label>
              </div>
            </div>
            
            {/* Unified Images Section */}
            <div className="form-section">
              <h3 style={{ textAlign: 'left' }}>Plant Images</h3>
              <p className="section-description" style={{ textAlign: 'left' }}>
                Upload and manage images for this plant. The main image will be displayed prominently in the shop.
              </p>
              
              <div className="unified-images-gallery">
                {/* Current Images Grid */}
                {plantFormData.images && plantFormData.images.length > 0 && (
                  <div className="images-grid">
                    {plantFormData.images.map((image, index) => {
                      const isMainImage = index === plantFormData.mainImageIndex;
                      const imageUrl = image instanceof File 
                        ? URL.createObjectURL(image) 
                        : image;
                      
                      return (
                        <div 
                          key={index} 
                          className={`image-item ${isMainImage ? 'main-image' : ''}`}
                        >
                          <div className="image-container">
                            <img 
                              src={imageUrl} 
                              alt={`Plant ${index + 1}`}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.target.src = '/images/placeholder.jpg';
                              }}
                            />
                            {isMainImage && (
                              <div className="main-image-badge">Main</div>
                            )}
                          </div>
                          <div className="image-actions">
                            {!isMainImage && (
                              <button 
                                type="button" 
                                className="set-main-button"
                                onClick={() => handleSetAsMainImage(index)}
                              >
                                Set as Main
                              </button>
                            )}
                            <button 
                              type="button" 
                              className="remove-button"
                              onClick={() => handleRemoveImage(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Upload New Image */}
                <div className="image-upload-section">
                  <div className="image-upload-buttons">
                    <label className="edit-btn image-upload-button" htmlFor="image-upload">
                      Add Image
                      <input 
                        id="image-upload"
                        type="file" 
                        className="image-upload"
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                    </label>
                    
                    <label className="edit-btn image-upload-button" htmlFor="additional-images">
                      Add Multiple Images
                      <input 
                        id="additional-images"
                        type="file" 
                        className="additional-images-input"
                        accept="image/*"
                        multiple
                        onChange={handleAdditionalImagesSelect}
                      />
                    </label>
                  </div>
                  
                  {/* Progress Bar (show when uploading) */}
                  {isUploading && (
                    <div className="upload-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{uploadProgress}% uploaded</span>
                    </div>
                  )}
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
                <label htmlFor="spread">Spread</label>
                <input
                  type="text"
                  id="spread"
                  name="spread"
                  value={plantFormData.spread}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-row">
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
              
              <div className="form-group">
                <label htmlFor="plantType">Plant Type</label>
                <input
                  type="text"
                  id="plantType"
                  name="plantType"
                  value={plantFormData.plantType}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="specialFeatures">Special Features</label>
                <input
                  type="text"
                  id="specialFeatures"
                  name="specialFeatures"
                  value={plantFormData.specialFeatures}
                  onChange={handlePlantFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="uses">Uses</label>
                <input
                  type="text"
                  id="uses"
                  name="uses"
                  value={plantFormData.uses}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="aroma">Aroma</label>
                <input
                  type="text"
                  id="aroma"
                  name="aroma"
                  value={plantFormData.aroma}
                  onChange={handlePlantFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="gardeningTips">Gardening Tips</label>
                <input
                  type="text"
                  id="gardeningTips"
                  name="gardeningTips"
                  value={plantFormData.gardeningTips}
                  onChange={handlePlantFormChange}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="careTips">Care Tips</label>
                <input
                  type="text"
                  id="careTips"
                  name="careTips"
                  value={plantFormData.careTips}
                  onChange={handlePlantFormChange}
                />
              </div>
              
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
            </div>
            
            <div className="form-actions">
              <div className="button-group-left">
                {plantEditMode && (
                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this plant? This action cannot be undone.')) {
                        handleDeletePlant(currentPlant.id);
                      }
                    }}
                  >
                    Delete Flower
                  </button>
                )}
              </div>
              <div className="button-group-right">
                <button
                  className="back-button"
                  type="button"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
                      if (!confirmLeave) {
                        return;
                      }
                      setHasUnsavedChanges(false);
                    }
                    resetPlantForm();
                    plantEditMode ? setPlantEditMode(false) : handleTabChange('inventory');
                  }}
                >
                  Back to Inventory
                </button>
                <button
                  className="save-btn"
                  type="submit"
                  disabled={plantSaveStatus === 'saving'}
                >
                  {plantSaveStatus === 'saving' ? 'Saving...' : 'Save'}
                </button>
              </div>
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
                        <li><strong>plant_id</strong> - Unique identifier (number)</li>
                        <li><strong>name</strong> - Plant name</li>
                        <li><strong>latinname</strong> - Latin/scientific name</li>
                        <li><strong>commonname</strong> - Common name</li>
                        <li><strong>price</strong> - Price</li>
                        <li><strong>featured</strong> - Featured (true/false)</li>
                        <li><strong>type</strong> - Plant type</li>
                        <li><strong>description</strong> - Description</li>
                        <li><strong>bloom_season</strong> - Bloom season</li>
                        <li><strong>colour</strong> - Color</li>
                      </ul>
                      <ul className="format-columns">
                        <li><strong>sunlight</strong> - Light requirements</li>
                        <li><strong>spread_inches</strong> - Spread in inches</li>
                        <li><strong>height_inches</strong> - Height in inches</li>
                        <li><strong>hardiness_zones</strong> - Hardiness zones</li>
                        <li><strong>special_features</strong> - Special features</li>
                        <li><strong>uses</strong> - Uses</li>
                        <li><strong>aroma</strong> - Aroma</li>
                        <li><strong>gardening_tips</strong> - Gardening tips</li>
                        <li><strong>care_tips</strong> - Care tips</li>
                        <li><strong>mainimage</strong> - URL to main image</li>
                        <li><strong>additionalimage</strong> - Additional image URLs</li>
                      </ul>
                    </div>
                    <p>Note: For best results, use these exact header names with underscores in your CSV file.</p>
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