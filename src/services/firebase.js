// Firebase configuration and utility functions
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update, remove } from "firebase/database";

// Your web app's Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ===== INVENTORY MANAGEMENT FUNCTIONS =====

/**
 * Fetch all plants data from Firebase
 * @returns {Promise<Array>} Array of plant objects
 */
export const fetchPlants = async () => {
  try {
    console.log('DEBUG: fetchPlants - Starting to fetch plants from Firebase');
    console.log('DEBUG: fetchPlants - Database URL:', process.env.REACT_APP_FIREBASE_DATABASE_URL);
    
    console.log('DEBUG: fetchPlants - Getting plants snapshot...');
    const plantsSnapshot = await get(ref(database, 'plants'));
    console.log('DEBUG: fetchPlants - Plants snapshot exists:', plantsSnapshot.exists());
    
    console.log('DEBUG: fetchPlants - Getting inventory snapshot...');
    const inventorySnapshot = await get(ref(database, 'inventory'));
    console.log('DEBUG: fetchPlants - Inventory snapshot exists:', inventorySnapshot.exists());
    
    if (!plantsSnapshot.exists()) {
      console.log('DEBUG: fetchPlants - No plants data found in Firebase');
      return [];
    }
    
    const plantsData = plantsSnapshot.val();
    console.log('DEBUG: fetchPlants - Plants data keys:', Object.keys(plantsData || {}).length);
    
    const inventoryData = inventorySnapshot.exists() ? inventorySnapshot.val() : {};
    console.log('DEBUG: fetchPlants - Inventory data keys:', Object.keys(inventoryData || {}).length);
    
    // Convert the object to an array and add inventory data
    const plantsArray = Object.keys(plantsData).map(key => {
      const plant = plantsData[key];
      return {
        ...plant,
        id: plant.id || key, // Use the plant's ID or the Firebase key
        inventory: inventoryData[plant.id || key] || {
          currentStock: 0,
          status: "Unknown",
          restockDate: "",
          notes: ""
        }
      };
    });
    
    console.log(`DEBUG: fetchPlants - Fetched ${plantsArray.length} plants from Firebase`);
    // Log a sample plant for verification
    if (plantsArray.length > 0) {
      console.log('DEBUG: fetchPlants - Sample plant:', 
        {name: plantsArray[0].name, id: plantsArray[0].id, hasInventory: !!plantsArray[0].inventory});
    }
    
    return plantsArray;
  } catch (error) {
    console.error('Error fetching plants from Firebase:', error);
    console.error('DEBUG: fetchPlants - Detailed error:', error.stack || error.message || error);
    
    // Check if it's a Firebase error and log additional details
    if (error.code) {
      console.error('DEBUG: fetchPlants - Firebase error code:', error.code);
    }
    
    throw error;
  }
};

/**
 * Add a new plant to Firebase
 * @param {Object} plantData - The plant data to add
 * @returns {Promise<Object>} Result of the add operation
 */
export const addPlant = async (plantData) => {
  try {
    console.log('Adding new plant to Firebase:', plantData);
    
    // Ensure the plant has an ID
    if (!plantData.id) {
      // Get the highest existing ID and increment by 1
      const plantsSnapshot = await get(ref(database, 'plants'));
      let maxId = 0;
      
      if (plantsSnapshot.exists()) {
        const plantsData = plantsSnapshot.val();
        maxId = Math.max(...Object.values(plantsData).map(plant => parseInt(plant.id) || 0));
      }
      
      plantData.id = maxId + 1;
    }
    
    // Separate inventory data if present
    const { inventory, ...plantWithoutInventory } = plantData;
    
    // Add plant to Firebase
    const plantRef = ref(database, `plants/${plantData.id}`);
    await set(plantRef, plantWithoutInventory);
    
    // Add default inventory if not provided
    if (inventory) {
      const inventoryRef = ref(database, `inventory/${plantData.id}`);
      await set(inventoryRef, {
        ...inventory,
        lastUpdated: new Date().toISOString()
      });
    } else {
      const inventoryRef = ref(database, `inventory/${plantData.id}`);
      await set(inventoryRef, {
        currentStock: 0,
        status: "Out of Stock",
        restockDate: "",
        notes: "",
        lastUpdated: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      message: `Plant added successfully with ID ${plantData.id}`,
      plantId: plantData.id
    };
  } catch (error) {
    console.error('Error adding plant to Firebase:', error);
    throw error;
  }
};

/**
 * Update an existing plant in Firebase
 * @param {string|number} plantId - The ID of the plant to update
 * @param {Object} plantData - The plant data to update
 * @returns {Promise<Object>} Result of the update operation
 */
export const updatePlant = async (plantId, plantData) => {
  try {
    console.log(`Updating plant ${plantId} in Firebase:`, plantData);
    
    // Separate inventory data if present
    const { inventory, ...plantWithoutInventory } = plantData;
    
    // Update plant in Firebase
    const plantRef = ref(database, `plants/${plantId}`);
    await set(plantRef, {
      ...plantWithoutInventory,
      id: plantId // Ensure ID is preserved
    });
    
    // Update inventory if provided
    if (inventory) {
      const inventoryRef = ref(database, `inventory/${plantId}`);
      await set(inventoryRef, {
        ...inventory,
        lastUpdated: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      message: `Plant ${plantId} updated successfully`,
      plantId
    };
  } catch (error) {
    console.error(`Error updating plant ${plantId} in Firebase:`, error);
    throw error;
  }
};

/**
 * Update inventory for a specific plant
 * @param {string|number} plantId - The ID of the plant to update
 * @param {Object} inventoryData - The inventory data to update
 * @returns {Promise<Object>} Result of the update operation
 */
export const updateInventory = async (plantId, inventoryData) => {
  try {
    console.log(`Updating inventory for plant ${plantId}:`, inventoryData);
    
    // First, update localStorage as a cache
    try {
      const existingData = localStorage.getItem('plantInventory');
      let storedInventory = {};
      
      if (existingData) {
        storedInventory = JSON.parse(existingData);
      }
      
      // Update the inventory for this plant
      storedInventory[plantId] = {
        ...inventoryData,
        lastUpdated: new Date().toISOString()
      };
      
      // Save back to localStorage
      localStorage.setItem('plantInventory', JSON.stringify(storedInventory));
    } catch (e) {
      console.error('Error updating localStorage:', e);
    }
    
    // Update Firebase
    const inventoryRef = ref(database, `inventory/${plantId}`);
    await set(inventoryRef, {
      ...inventoryData,
      lastUpdated: new Date().toISOString()
    });
    
    return {
      success: true,
      message: `Inventory updated for plant ${plantId}`,
      data: {
        plantId,
        ...inventoryData
      }
    };
  } catch (error) {
    console.error('Error updating inventory in Firebase:', error);
    
    // Add to sync queue for failed updates
    addToSyncQueue(plantId, inventoryData);
    
    // Return success if we at least updated localStorage
    return {
      success: true,
      warning: `Changes saved locally but not synced to Firebase: ${error.message}. Will retry sync later.`,
      data: {
        plantId,
        ...inventoryData
      }
    };
  }
};

/**
 * Helper function to add an item to the sync queue
 * @param {string|number} plantId - The ID of the plant to update
 * @param {Object} inventoryData - The inventory data to update
 */
const addToSyncQueue = (plantId, inventoryData) => {
  try {
    // Get current sync queue or initialize empty array
    let syncQueue = [];
    const existingQueue = localStorage.getItem('inventorySyncQueue');
    
    if (existingQueue) {
      syncQueue = JSON.parse(existingQueue);
    }
    
    // Add this update to the queue
    // First remove any existing entries for this plant
    syncQueue = syncQueue.filter(item => item.plantId !== plantId);
    
    // Then add the new entry
    syncQueue.push({
      plantId,
      inventoryData,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Added plant ${plantId} to sync queue`);
    
    // Save updated queue
    localStorage.setItem('inventorySyncQueue', JSON.stringify(syncQueue));
  } catch (e) {
    console.error('Error managing sync queue:', e);
  }
};

/**
 * Process any pending inventory updates in the sync queue
 * @returns {Promise<Object>} Result of the sync operation
 */
export const processSyncQueue = async () => {
  try {
    console.log('Processing sync queue...');
    
    // Get the sync queue
    const queueData = localStorage.getItem('inventorySyncQueue');
    if (!queueData) {
      console.log('No sync queue found');
      return {
        success: true,
        message: 'No pending updates to sync',
        syncedItems: 0,
        remainingItems: 0
      };
    }
    
    const queue = JSON.parse(queueData);
    if (queue.length === 0) {
      console.log('Sync queue is empty');
      return {
        success: true,
        message: 'No pending updates to sync',
        syncedItems: 0,
        remainingItems: 0
      };
    }
    
    console.log(`Found ${queue.length} items in sync queue`);
    
    // Process each item in the queue
    let successCount = 0;
    let failedItems = [];
    
    for (const item of queue) {
      try {
        console.log(`Syncing plant ${item.plantId} from queue`);
        
        // Update Firebase
        const inventoryRef = ref(database, `inventory/${item.plantId}`);
        await set(inventoryRef, {
          ...item.inventoryData,
          lastUpdated: new Date().toISOString()
        });
        
        successCount++;
      } catch (error) {
        console.error(`Error syncing plant ${item.plantId} from queue:`, error);
        failedItems.push(item);
      }
    }
    
    // Update the queue with only the failed items
    localStorage.setItem('inventorySyncQueue', JSON.stringify(failedItems));
    
    console.log(`Sync complete. Synced ${successCount} items, ${failedItems.length} items remaining`);
    
    return {
      success: true,
      message: `Synced ${successCount} items. ${failedItems.length} items remaining.`,
      syncedItems: successCount,
      remainingItems: failedItems.length
    };
  } catch (error) {
    console.error('Error processing sync queue:', error);
    // Get the queue again to ensure it's defined
    let remainingItems = 0;
    try {
      const queueData = localStorage.getItem('inventorySyncQueue');
      if (queueData) {
        const queue = JSON.parse(queueData);
        remainingItems = queue.length;
      }
    } catch (e) {
      console.error('Error getting queue length:', e);
    }
    
    return {
      success: false,
      message: `Error syncing updates: ${error.message}`,
      syncedItems: 0,
      remainingItems: remainingItems
    };
  }
};

/**
 * Subscribe to real-time inventory updates
 * @param {Function} callback - Function to call when inventory changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToInventory = (callback) => {
  const inventoryRef = ref(database, 'inventory');
  return onValue(inventoryRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  });
};

/**
 * Import plants data from Google Sheets to Firebase
 * This is a one-time migration function
 * @param {Array} plantsData - Array of plant objects from Google Sheets
 * @param {Array} inventoryData - Array of inventory objects from Google Sheets (optional)
 * @returns {Promise<Object>} Result of the import operation
 */
export const importPlantsFromSheets = async (plantsData, inventoryData = []) => {
  try {
    console.log('Importing plants data from Google Sheets to Firebase...');
    console.log('Plants data:', plantsData.length, 'items');
    console.log('Inventory data:', inventoryData.length, 'items');
    
    // Prepare plants data for Firebase
    const plantsObject = {};
    const inventoryObject = {};
    
    // Process plant data
    plantsData.forEach(plant => {
      // Ensure the plant has an ID
      if (!plant.id) {
        console.warn('Plant missing ID, skipping:', plant);
        return;
      }
      
      // Store plant in plantsObject
      plantsObject[plant.id] = {
        ...plant
      };
    });
    
    // Process inventory data
    if (inventoryData.length > 0) {
      inventoryData.forEach(item => {
        // Use plant_id as the key to match with plants
        const plantId = item.plant_id;
        
        if (!plantId) {
          console.warn('Inventory item missing plant_id, skipping:', item);
          return;
        }
        
        // Create inventory object
        inventoryObject[plantId] = {
          currentStock: parseInt(item.current_stock) || 0,
          status: item.status || 'Unknown',
          restockDate: item.restock_date || '',
          notes: item.notes || '',
          lastUpdated: new Date().toISOString()
        };
      });
    } else {
      // If no inventory data provided, create default entries for each plant
      Object.keys(plantsObject).forEach(plantId => {
        inventoryObject[plantId] = {
          currentStock: 0,
          status: 'Out of Stock',
          restockDate: '',
          notes: 'Auto-generated during migration',
          lastUpdated: new Date().toISOString()
        };
      });
    }
    
    console.log(`Prepared ${Object.keys(plantsObject).length} plants and ${Object.keys(inventoryObject).length} inventory items for import`);
    
    // Update Firebase
    const plantsRef = ref(database, 'plants');
    const inventoryRef = ref(database, 'inventory');
    
    await set(plantsRef, plantsObject);
    await set(inventoryRef, inventoryObject);
    
    return {
      success: true,
      message: `Imported ${Object.keys(plantsObject).length} plants and ${Object.keys(inventoryObject).length} inventory items to Firebase`,
      plantsCount: Object.keys(plantsObject).length,
      inventoryCount: Object.keys(inventoryObject).length
    };
  } catch (error) {
    console.error('Error importing plants to Firebase:', error);
    throw error;
  }
};

/**
 * Initialize default inventory data if none exists
 */
export const initializeDefaultInventory = async () => {
  try {
    // Check if we already have inventory data in Firebase
    const inventorySnapshot = await get(ref(database, 'inventory'));
    if (inventorySnapshot.exists() && Object.keys(inventorySnapshot.val()).length > 0) {
      console.log('Existing inventory data found in Firebase, not initializing defaults');
      return;
    }
    
    console.log('No existing inventory data found in Firebase, initializing defaults');
    
    // Create default inventory for plants 1-10 (assuming these IDs exist)
    const defaultInventory = {};
    for (let i = 1; i <= 10; i++) {
      defaultInventory[i] = {
        currentStock: 10,
        status: "In Stock",
        restockDate: "",
        notes: "Default inventory",
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Save to Firebase
    const inventoryRef = ref(database, 'inventory');
    await set(inventoryRef, defaultInventory);
    
    // Also save to localStorage for offline access
    localStorage.setItem('plantInventory', JSON.stringify(defaultInventory));
    
    console.log('Default inventory initialized in Firebase');
  } catch (e) {
    console.error('Error initializing default inventory in Firebase:', e);
  }
};

/**
 * Load sample plant data from the public folder
 * This is used as a fallback when Firebase is not responding
 * @returns {Promise<Array>} Array of sample plant objects
 */
export const loadSamplePlants = async () => {
  try {
    console.log('DEBUG: loadSamplePlants - Starting to load sample plant data');
    console.log('DEBUG: loadSamplePlants - Fetching from path:', '/data/sample-plants.json');
    const response = await fetch('/data/sample-plants.json');
    console.log('DEBUG: loadSamplePlants - Fetch response status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('DEBUG: loadSamplePlants - Failed to fetch sample data:', response.status, response.statusText);
      throw new Error(`Failed to fetch sample data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`DEBUG: loadSamplePlants - Successfully loaded ${data.length} sample plants`);
    console.log('DEBUG: loadSamplePlants - First sample plant:', data[0]?.name || 'No name available');
    
    // Cache the sample data
    try {
      localStorage.setItem('cachedPlantsWithTimestamp', JSON.stringify({
        timestamp: new Date().toISOString(),
        data: data,
        source: 'sample'
      }));
      console.log('DEBUG: loadSamplePlants - Sample data cached to localStorage');
    } catch (e) {
      console.error('DEBUG: loadSamplePlants - Error caching sample data:', e);
    }
    
    return data;
  } catch (error) {
    console.error('Error loading sample plant data:', error);
    console.error('DEBUG: loadSamplePlants - Detailed error:', error.stack || error.message || error);
    throw error;
  }
};

// Export all functions
const firebaseService = {
  fetchPlants,
  updateInventory,
  processSyncQueue,
  subscribeToInventory,
  importPlantsFromSheets,
  initializeDefaultInventory,
  addPlant,
  updatePlant,
  loadSamplePlants
};

export default firebaseService; 