// Firebase configuration and utility functions
// 
// CRITICAL: This application MUST use Firebase Storage URLs for all images.
// DO NOT use local image paths. Always use Firebase Storage URLs with the following format:
// https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2F[filename].jpg?alt=media&token=[token]
//
// The following plants require special handling with hardcoded Firebase URLs that include tokens:
// - "Palmer's Beardtongue": Access from /images/penstemonpalmeri.jpg
// - "Gaillardia Pulchella Mix": Access from /images/gaillardiapulchella.jpg
//
// The token is necessary for authentication to access the images.

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update, remove } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// Import auth functions only when needed

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
const storage = getStorage(app);
const db = getFirestore(app);

// Export Firebase utilities
export { set, get, onValue, update, remove, storage, db };

// Utility to get a reference to the database
export const getDatabaseRef = (path) => {
  return ref(database, path);
};

// Utility to get a Firebase storage URL
export const getFirebaseStorageURL = async (path) => {
  try {
    return await getDownloadURL(storageRef(storage, path));
  } catch (error) {
    // Only log in development mode and use debug level
    if (process.env.NODE_ENV === 'development') {
      console.debug('Image URL access handled gracefully:', path);
    }
    return null;
  }
};

// Utility to upload an image to Firebase storage
export const uploadImageToFirebase = async (file, path) => {
  try {
    console.log('Starting image upload to Firebase:', { fileName: file.name, fileSize: file.size, path });
    
    // Check if storage is properly initialized
    if (!storage) {
      console.error('Firebase storage is not initialized!');
      throw new Error('Firebase storage not initialized');
    }
    
    const fileRef = storageRef(storage, path);
    console.log('Created storage reference:', path);
    
    console.log('Uploading bytes to Firebase...');
    await uploadBytes(fileRef, file);
    console.log('Upload successful, getting download URL...');
    
    const downloadURL = await getDownloadURL(fileRef);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file to Firebase:', error);
    console.error('Error details:', error.code, error.message);
    
    // If the error is a permission error, use local fallback
    if (error.code === 'storage/unauthorized') {
      console.log('Firebase storage permission denied. Using local storage fallback...');
      return createLocalImageUrl(file);
    }
    
    // Add additional context for specific Firebase errors
    if (error.code === 'storage/unauthorized') {
      console.error('User does not have permission to access the storage bucket');
    } else if (error.code === 'storage/canceled') {
      console.error('User canceled the upload');
    } else if (error.code === 'storage/unknown') {
      console.error('Unknown error occurred, check Firebase console');
    }
    
    // Rethrow to handle in the calling function
    throw error;
  }
};

// Local fallback for when Firebase storage is unavailable
const createLocalImageUrl = (file) => {
  try {
    // Create a persistent object URL
    const objectUrl = URL.createObjectURL(file);
    
    // Store in localStorage to keep track
    const localImages = JSON.parse(localStorage.getItem('localImageUrls') || '[]');
    localImages.push({
      url: objectUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      created: new Date().toISOString()
    });
    localStorage.setItem('localImageUrls', JSON.stringify(localImages));
    
    console.log('Created local fallback URL for image:', objectUrl);
    
    // Return the URL with a prefix to indicate it's local
    return `local:${objectUrl}`;
  } catch (error) {
    console.error('Error creating local image fallback:', error);
    throw new Error('Could not create local fallback for image');
  }
};

// ===== INVENTORY MANAGEMENT FUNCTIONS =====

/**
 * Fetch all plants data from Firebase
 * @returns {Promise<Array>} Array of plant objects
 */
export const fetchPlants = async () => {
  try {
    const environment = process.env.NODE_ENV;
    console.log(`[${environment}] fetchPlants - Starting to fetch plants from Firebase`);
    console.log(`[${environment}] fetchPlants - Database URL:`, process.env.REACT_APP_FIREBASE_DATABASE_URL);
    
    console.log(`[${environment}] fetchPlants - Getting plants snapshot...`);
    const plantsSnapshot = await get(ref(database, 'plants'));
    console.log(`[${environment}] fetchPlants - Plants snapshot exists:`, plantsSnapshot.exists());
    
    console.log(`[${environment}] fetchPlants - Getting inventory snapshot...`);
    const inventorySnapshot = await get(ref(database, 'inventory'));
    console.log(`[${environment}] fetchPlants - Inventory snapshot exists:`, inventorySnapshot.exists());
    
    if (!plantsSnapshot.exists()) {
      console.log(`[${environment}] fetchPlants - No plants data found in Firebase`);
      return [];
    }
    
    const plantsData = plantsSnapshot.val();
    console.log(`[${environment}] fetchPlants - Plants data keys:`, Object.keys(plantsData || {}).length);
    
    const inventoryData = inventorySnapshot.exists() ? inventorySnapshot.val() : {};
    console.log(`[${environment}] fetchPlants - Inventory data keys:`, Object.keys(inventoryData || {}).length);
    
    // Convert the object to an array and add inventory data
    const plantsArray = Object.keys(plantsData).map(key => {
      const plant = plantsData[key];
      const plantId = plant.id || key;
      
      return {
        ...plant,
        id: plantId, // Use the plant's ID or the Firebase key
        inventory: inventoryData[plantId] || {
          currentStock: 0,
          status: "Unknown",
          restockDate: "",
          notes: ""
        }
      };
    });
    
    console.log(`[${environment}] fetchPlants - Fetched ${plantsArray.length} plants from Firebase`);
    // Log a sample plant for verification
    if (plantsArray.length > 0) {
      console.log(`[${environment}] fetchPlants - Sample plant:`, 
        {name: plantsArray[0].name, id: plantsArray[0].id, hasInventory: !!plantsArray[0].inventory});
    }
    
    return plantsArray;
  } catch (error) {
    console.error(`[${process.env.NODE_ENV}] Error fetching plants from Firebase:`, error);
    console.error(`[${process.env.NODE_ENV}] Error details:`, error.code, error.message, error.stack);
    
    // Check if it's a Firebase error and log additional details
    if (error.code) {
      console.error(`[${process.env.NODE_ENV}] Firebase error code:`, error.code);
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
    
    // Validate input data
    if (!plantId) {
      console.error('Invalid plant ID:', plantId);
      return {
        success: false,
        message: 'Invalid plant ID',
        error: 'No plant ID provided'
      };
    }

    if (!plantData) {
      console.error('Invalid plant data:', plantData);
      return {
        success: false,
        message: 'Invalid plant data',
        error: 'No plant data provided'
      };
    }
    
    // Make a copy of the data to avoid mutation issues
    const plantDataToSave = JSON.parse(JSON.stringify(plantData));
    
    // Check if additionalImages is defined and log it
    console.log('additionalImages before processing:', plantDataToSave.additionalImages);
    
    // Ensure additionalImages is at least an empty array if undefined
    if (plantDataToSave.additionalImages === undefined) {
      plantDataToSave.additionalImages = [];
      console.log('Set additionalImages to empty array because it was undefined');
    }
    
    // Separate inventory data if present
    const { inventory, ...plantWithoutInventory } = plantDataToSave;
    
    // Log the exact data we're sending to Firebase
    console.log('Saving plant data to Firebase:', plantWithoutInventory);
    console.log('Plant additionalImages length:', plantWithoutInventory.additionalImages?.length || 0);
    
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
    
    console.log(`Plant ${plantId} updated successfully`);
    return {
      success: true,
      message: `Plant ${plantId} updated successfully`,
      plantId
    };
  } catch (error) {
    console.error(`Error updating plant ${plantId} in Firebase:`, error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    return {
      success: false,
      message: `Error updating plant: ${error.message}`,
      error: error
    };
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
    
    const { featured, ...inventoryProps } = inventoryData;
    
    // First, update localStorage as a cache
    try {
      const existingData = localStorage.getItem('plantInventory');
      let storedInventory = {};
      
      if (existingData) {
        storedInventory = JSON.parse(existingData);
      }
      
      // Update the inventory for this plant
      storedInventory[plantId] = {
        ...inventoryProps,
        lastUpdated: new Date().toISOString()
      };
      
      // Save back to localStorage
      localStorage.setItem('plantInventory', JSON.stringify(storedInventory));
      
      // If there's a featured flag, update the plant in localStorage
      if (featured !== undefined) {
        try {
          const plantsData = JSON.parse(localStorage.getItem('plants') || '[]');
          const updatedPlants = plantsData.map(plant => {
            if (plant.id === plantId) {
              return { ...plant, featured };
            }
            return plant;
          });
          localStorage.setItem('plants', JSON.stringify(updatedPlants));
        } catch (e) {
          console.error('Error updating plant featured status in localStorage:', e);
        }
      }
    } catch (e) {
      console.error('Error updating localStorage:', e);
    }
    
    // Update Firebase inventory
    const inventoryRef = ref(database, `inventory/${plantId}`);
    await set(inventoryRef, {
      ...inventoryProps,
      lastUpdated: new Date().toISOString()
    });
    
    // Update featured status if provided
    if (featured !== undefined) {
      const plantRef = ref(database, `plants/${plantId}`);
      await update(plantRef, { featured });
    }
    
    return {
      success: true,
      message: `Inventory updated for plant ${plantId}`,
      data: {
        ...inventoryData,
        lastUpdated: new Date().toISOString()
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
      // Ensure the plant has an ID (either id or plant_id)
      const plantId = plant.id || plant.plant_id;
      if (!plantId) {
        console.warn('Plant missing ID, skipping:', plant);
        return;
      }
      
      // Store plant in plantsObject with the correct ID
      plantsObject[plantId] = {
        ...plant,
        id: plantId // Make sure id is set consistently
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
    
    // Map the image URLs to local images
    const localImageMappings = {
      "Lavender": "/images/LavenderMist.jpg",
      "Lavender Mist": "/images/LavenderMist.jpg",
      "Palmer's Beardtongue": "/images/penstemonpalmeri.jpg",
      "Gaillardia Pulchella Mix": "/images/gaillardiapulchella.jpg",
      "Korean Mint": "/images/koreanmint.jpg",
      "Golden Jubilee Anise Hyssop": "/images/koreanmint.jpg", // Using Korean mint image as fallback
    };

    // Update each plant's mainImage to use local files
    const updatedData = data.map(plant => {
      // For Palmer's Beardtongue, use Firebase storage URL with correct token
      if (plant.name === "Palmer's Beardtongue") {
        const fbUrl = "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739";
        console.log('FIREBASE IMAGE URL DEBUG:', {
          plant: "Palmer's Beardtongue",
          url: fbUrl,
          hasToken: fbUrl.includes('token'),
          correctFormat: fbUrl.includes('alt=media')
        });
        return {
          ...plant,
          mainImage: fbUrl,
          additionalImages: [
            "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri2.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
            "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri3.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
            "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri4.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
            "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fpenstemonpalmeri5.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739"
          ]
        };
      }
      // For Gaillardia, use Firebase storage URL with token
      else if (plant.name === "Gaillardia Pulchella Mix") {
        return {
          ...plant,
          mainImage: "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
          additionalImages: [
            "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella2.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
            "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella3.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
            "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella4.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739",
            "https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/images%2Fgaillardiapulchella5.jpg?alt=media&token=655fba6f-d45e-44eb-8e01-eee626300739"
          ]
        };
      }
      // Check if we have a mapping for this plant name
      else if (localImageMappings[plant.name]) {
        return {
          ...plant,
          mainImage: localImageMappings[plant.name]
        };
      }
      // For any other plants without specific mappings, use a placeholder
      return {
        ...plant,
        mainImage: "/images/placeholder.jpg"
      };
    });
    
    // Cache the sample data
    try {
      localStorage.setItem('cachedPlantsWithTimestamp', JSON.stringify({
        timestamp: new Date().toISOString(),
        data: updatedData,
        source: 'sample'
      }));
      console.log('DEBUG: loadSamplePlants - Sample data cached to localStorage');
    } catch (e) {
      console.error('DEBUG: loadSamplePlants - Error caching sample data:', e);
    }
    
    return updatedData;
  } catch (error) {
    console.error('Error loading sample plant data:', error);
    console.error('DEBUG: loadSamplePlants - Detailed error:', error.stack || error.message || error);
    throw error;
  }
};

// Order related functions
export const saveOrder = async (orderData) => {
  try {
    console.log('Saving order to Firebase:', orderData.id);
    
    // Store order by ID for direct lookup
    const orderRef = ref(database, `orders/${orderData.id}`);
    await set(orderRef, orderData);
    
    return true;
  } catch (error) {
    console.error('Error saving order to Firebase:', error);
    return false;
  }
};

export const getOrders = async () => {
  try {
    console.log('Fetching all orders from Firebase');
    const ordersRef = ref(database, 'orders');
    const snapshot = await get(ordersRef);
    
    if (snapshot.exists()) {
      const ordersData = snapshot.val();
      // Convert object to array and sort by date (newest first)
      const orderArray = Object.values(ordersData);
      console.log(`Found ${orderArray.length} orders in Firebase`);
      
      return orderArray.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
    }
    
    console.log('No orders found in Firebase');
    return [];
  } catch (error) {
    console.error('Error fetching orders from Firebase:', error);
    return [];
  }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const orderRef = ref(database, `orders/${orderId}`);
    await update(orderRef, { status: newStatus });
    return true;
  } catch (error) {
    console.error('Error updating order status in Firebase:', error);
    return false;
  }
};

/**
 * Get the default status for a plant based on current stock
 * @param {number} currentStock - The current stock level
 * @returns {string} The appropriate status
 */
const getDefaultStatusFromStock = (currentStock) => {
  if (currentStock === undefined || currentStock === null) return "Out of Stock";
  if (currentStock <= 0) return "Out of Stock";
  if (currentStock < 5) return "Low Stock";
  return "In Stock";
};

/**
 * Create a default inventory object with sensible defaults
 * @param {number} stockLevel - Optional stock level (defaults to 0)
 * @returns {Object} Default inventory object
 */
const createDefaultInventory = (stockLevel = 0) => {
  return {
    currentStock: stockLevel,
    status: getDefaultStatusFromStock(stockLevel),
    restockDate: "",
    notes: "",
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Repair and validate all inventory data, creating missing entries and fixing invalid status
 * @returns {Promise<Object>} Result of the repair operation
 */
export const repairInventoryData = async () => {
  try {
    console.log('Repairing inventory data...');
    
    // Fetch all plants and inventory data
    const plantsSnapshot = await get(ref(database, 'plants'));
    const inventorySnapshot = await get(ref(database, 'inventory'));
    
    if (!plantsSnapshot.exists()) {
      return { success: false, message: 'No plants found to repair' };
    }
    
    const plantsData = plantsSnapshot.val();
    const inventoryData = inventorySnapshot.exists() ? inventorySnapshot.val() : {};
    
    // Track repairs for reporting
    let repairCount = 0;
    let createCount = 0;
    
    // Process each plant
    const repairPromises = Object.keys(plantsData).map(async (key) => {
      const plant = plantsData[key];
      const plantId = plant.id || key;
      
      // Check if inventory exists
      if (!inventoryData[plantId]) {
        // Create a new inventory record
        const inventoryRef = ref(database, `inventory/${plantId}`);
        await set(inventoryRef, createDefaultInventory(0));
        createCount++;
        return;
      }
      
      // Check if status needs repair
      const inventory = inventoryData[plantId];
      
      // Skip "Coming Soon" items - preserve their status regardless of stock
      if (inventory.status === "Coming Soon") {
        return;
      }
      
      // Check if status is missing or Unknown - only fix Unknown status
      if (!inventory.status || inventory.status === "Unknown") {
        const expectedStatus = getDefaultStatusFromStock(inventory.currentStock);
        
        // Fix the status based on stock level
        const inventoryRef = ref(database, `inventory/${plantId}`);
        
        await update(inventoryRef, { 
          status: expectedStatus,
          lastUpdated: new Date().toISOString()
        });
        
        repairCount++;
      }
    });
    
    // Wait for all repairs to complete
    await Promise.all(repairPromises);
    
    console.log(`Inventory repair complete: Created ${createCount} new records, repaired ${repairCount} statuses`);
    
    return {
      success: true,
      message: `Inventory repair complete: Created ${createCount} new records, repaired ${repairCount} statuses`,
      createCount,
      repairCount
    };
  } catch (error) {
    console.error('Error repairing inventory data:', error);
    return {
      success: false,
      message: `Error repairing inventory: ${error.message}`,
      error
    };
  }
};

/**
 * Delete a plant from Firebase
 * @param {string|number} plantId - The ID of the plant to delete
 * @returns {Promise<Object>} Result of the delete operation
 */
export const deletePlant = async (plantId) => {
  try {
    console.log(`Deleting plant ${plantId} from Firebase`);
    
    // Validate input data
    if (!plantId) {
      console.error('Invalid plant ID:', plantId);
      return {
        success: false,
        message: 'Invalid plant ID',
        error: 'No plant ID provided'
      };
    }
    
    // Delete plant from Firebase
    const plantRef = ref(database, `plants/${plantId}`);
    await remove(plantRef);
    
    // Delete inventory data for this plant
    const inventoryRef = ref(database, `inventory/${plantId}`);
    await remove(inventoryRef);
    
    return {
      success: true,
      message: `Plant ${plantId} deleted successfully`
    };
  } catch (error) {
    console.error('Error deleting plant from Firebase:', error);
    return {
      success: false,
      message: 'Error deleting plant',
      error: error.message
    };
  }
};

/**
 * Save news items to Firebase
 * @param {Array} newsItems - Array of news items to save
 * @returns {Promise<Object>} Result of the operation
 */
export const saveNewsItems = async (newsItems) => {
  try {
    const environment = process.env.NODE_ENV;
    console.log(`[${environment}] Saving news items to Firebase:`, newsItems);
    console.log(`Database URL being used: ${process.env.REACT_APP_FIREBASE_DATABASE_URL}`);
    
    if (!Array.isArray(newsItems) || newsItems.length === 0) {
      return {
        success: false,
        message: 'Invalid news data',
        error: 'No valid news items provided'
      };
    }
    
    // Format news items for storage
    const newsData = newsItems.map(item => ({
      id: item.id,
      subject: item.subject,
      content: item.content,
      date: typeof item.date === 'string' ? item.date : item.date.toISOString()
    }));
    
    // Update in Firebase
    const newsRef = ref(database, 'news');
    console.log(`Saving to Firebase path: 'news'`);
    await set(newsRef, newsData);
    console.log(`[${environment}] News items saved successfully to Firebase`);
    
    return {
      success: true,
      message: 'News items saved successfully to Firebase'
    };
  } catch (error) {
    console.error('Error saving news to Firebase:', error);
    return {
      success: false,
      message: 'Failed to save news',
      error: error.message
    };
  }
};

/**
 * Fetch news items from Firebase
 * @returns {Promise<Array>} Array of news items
 */
export const fetchNewsItems = async () => {
  try {
    const environment = process.env.NODE_ENV;
    console.log(`[${environment}] Fetching news items from Firebase`);
    console.log(`Database URL being used: ${process.env.REACT_APP_FIREBASE_DATABASE_URL}`);
    
    const newsRef = ref(database, 'news');
    console.log(`Fetching from Firebase path: 'news'`);
    const snapshot = await get(newsRef);
    
    if (snapshot.exists()) {
      const newsData = snapshot.val();
      console.log(`[${environment}] Found ${Array.isArray(newsData) ? newsData.length : Object.keys(newsData).length} news items`);
      return Array.isArray(newsData) ? newsData : Object.values(newsData);
    }
    
    console.log(`[${environment}] No news items found in Firebase`);
    return [];
  } catch (error) {
    console.error('Error fetching news from Firebase:', error);
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
  loadSamplePlants,
  saveOrder,
  getOrders,
  updateOrderStatus,
  repairInventoryData,
  deletePlant,
  saveNewsItems,
  fetchNewsItems
};

export default firebaseService; 