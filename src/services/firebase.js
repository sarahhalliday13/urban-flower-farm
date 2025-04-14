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
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
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
const auth = getAuth(app);

// Export Firebase utilities
export { set, get, onValue, update, remove, storage, db, auth };

// Utility to ensure user is authenticated before database operations
export const ensureAuthenticated = () => {
  return new Promise((resolve, reject) => {
    const auth = getAuth();
    
    // Check if already authenticated
    if (auth.currentUser) {
      console.log('🔒 Already authenticated:', auth.currentUser.uid);
      // Ensure we get a fresh token
      auth.currentUser.getIdToken(true)
        .then((token) => {
          console.log('✅ Token refreshed successfully. Token length:', token.length);
          console.log('✅ Token first 10 chars:', token.substring(0, 10) + '...');
          resolve(auth.currentUser);
        })
        .catch((error) => {
          console.error('❌ Error refreshing token:', error.message);
          signInAnonymously(auth)
            .then((userCredential) => {
              console.log('✅ Anonymous auth successful after token refresh failed:', userCredential.user.uid);
              userCredential.user.getIdToken(true).then(token => {
                console.log('✅ New token obtained after re-auth. Token length:', token.length);
                console.log('✅ New token first 10 chars:', token.substring(0, 10) + '...');
                resolve(userCredential.user);
              });
            })
            .catch((error) => {
              console.error('❌ Anonymous auth failed:', error.message);
              reject(error);
            });
        });
      return;
    }
    
    // Try to sign in anonymously
    signInAnonymously(auth)
      .then((userCredential) => {
        console.log('✅ Anonymous auth successful:', userCredential.user.uid);
        userCredential.user.getIdToken(true).then(token => {
          console.log('✅ New token obtained. Token length:', token.length);
          console.log('✅ Token first 10 chars:', token.substring(0, 10) + '...');
          resolve(userCredential.user);
        });
      })
      .catch((error) => {
        console.error('❌ Anonymous auth failed:', error.message);
        reject(error);
      });
  });
};

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
    
    // BYPASS Cloud Function - Directly use Firebase Storage
    // This is more reliable and removes the dependency on Cloud Functions
    
    // Check if storage is properly initialized
    if (!storage) {
      console.error('Firebase storage is not initialized!');
      throw new Error('Firebase storage not initialized');
    }
    
    // Try anonymous authentication to get an auth token
    try {
      console.log('Trying anonymous authentication for storage access...');
      await signInAnonymously(auth);
      console.log('Anonymous auth successful');
    } catch (authError) {
      console.warn('Anonymous auth failed (continuing anyway):', authError);
    }
    
    // Use plants folder structure with file name if no path is provided
    const storagePath = path || `plants/${file.name}`;
    
    try {
      // Try the standard Firebase SDK approach first
      console.log('Trying direct Firebase SDK upload...');
      const fileRef = storageRef(storage, storagePath);
      console.log('Created storage reference:', storagePath);
      
      console.log('Uploading bytes to Firebase...');
      await uploadBytes(fileRef, file);
      console.log('Upload successful, getting download URL...');
      
      const downloadURL = await getDownloadURL(fileRef);
      console.log('Download URL obtained:', downloadURL);
      
      return downloadURL;
    } catch (sdkError) {
      console.warn('Firebase SDK upload failed, trying direct API approach:', sdkError);
      
      // Fallback to direct REST API approach
      console.log('Attempting direct REST API upload as fallback...');
      
      // Construct the API URL
      const bucket = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
      const encodedPath = encodeURIComponent(storagePath);
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodedPath}`;
      
      // Get the file content as an array buffer
      const fileContent = await file.arrayBuffer();
      
      // Make the request
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-Goog-Upload-Protocol': 'raw'
        },
        body: fileContent
      });
      
      if (!response.ok) {
        throw new Error(`Direct upload failed with status: ${response.status}`);
      }
      
      // Parse the response to get the download URL
      const data = await response.json();
      const downloadToken = data.downloadTokens;
      
      if (!downloadToken) {
        throw new Error('No download token received from Firebase');
      }
      
      // Construct the download URL
      const directDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${downloadToken}`;
      console.log('Direct upload successful, download URL:', directDownloadUrl);
      
      return directDownloadUrl;
    }
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
    
    // Fallback to local storage in case all Firebase approaches fail
    console.log('All Firebase upload methods failed, using local storage fallback...');
    return createLocalImageUrl(file);
  }
};

/**
 * Upload file via the Cloud Function to bypass CORS
 * @param {File} file - The file to upload
 * @param {string} path - Optional path in storage
 * @returns {Promise<string>} The download URL
 */
const uploadViaCloudFunction = async (file, path) => {
  try {
    console.log('Preparing upload via Cloud Function');
    
    // Determine environment and set correct function URL
    let functionUrl;
    if (process.env.NODE_ENV === 'production') {
      functionUrl = 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net/uploadImage';
    } else {
      // Use emulator if in development or local URL for staging
      functionUrl = 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net/uploadImage';
    }

    // Log full configuration for debugging
    console.log('Current environment:', process.env.NODE_ENV);
    console.log('Using Cloud Function URL:', functionUrl);
    console.log('Firebase config:', {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY?.substring(0, 5) + '...',
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET
    });
    
    // Create form data to send to the function
    const formData = new FormData();
    formData.append('file', file);
    
    // Add path if provided
    if (path) {
      // Extract folder part from the path (Cloud Function expects 'folder' parameter)
      const folder = path.split('/')[0];
      formData.append('folder', folder);
    } else {
      formData.append('folder', 'plants');
    }
    
    console.log(`Uploading to Cloud Function at ${functionUrl}`);
    
    // First try a simple GET request to check if the function is available
    try {
      const checkResponse = await fetch(`${functionUrl}?check=true`, {
        method: 'GET',
        mode: 'cors',
      });
      console.log('Function availability check:', checkResponse.status, checkResponse.statusText);
    } catch (checkError) {
      console.warn('Function availability check failed:', checkError.message);
    }
    
    // Send the request to the Cloud Function
    const response = await fetch(functionUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      body: formData,
      // Don't set Content-Type header, the browser will set it with the correct boundary
    });
    
    if (!response.ok) {
      const statusCode = response.status;
      let errorMessage;
      
      try {
        const errorData = await response.text();
        errorMessage = `Cloud Function error (${statusCode}): ${errorData}`;
      } catch (textError) {
        errorMessage = `Cloud Function error (${statusCode}): ${response.statusText}`;
      }
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Parse the response
    const result = await response.json();
    
    if (!result.success || !result.url) {
      throw new Error('Cloud Function did not return a valid URL');
    }
    
    console.log('Cloud Function upload successful, received URL:', result.url);
    return result.url;
  } catch (error) {
    console.error('Error in Cloud Function upload:', error);
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
    
    // Check if we already have cached plants data
    let useCachedData = false;
    try {
      const cachedData = localStorage.getItem('cachedPlantsWithTimestamp');
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        const cacheTime = new Date(parsedCache.timestamp);
        const now = new Date();
        const cacheAgeMinutes = (now - cacheTime) / (1000 * 60);
        
        console.log(`[${environment}] fetchPlants - Found cached plants data (${cacheAgeMinutes.toFixed(1)} minutes old)`);
        
        // Use cache if it's less than 2 minutes old (reduced from 5 to ensure fresher data)
        if (cacheAgeMinutes < 2 && Array.isArray(parsedCache.data) && parsedCache.data.length > 0) {
          console.log(`[${environment}] fetchPlants - Using cached plants data (${parsedCache.data.length} plants)`);
          return parsedCache.data;
        } else {
          console.log(`[${environment}] fetchPlants - Cache is too old or invalid, fetching fresh data`);
        }
      } else {
        console.log(`[${environment}] fetchPlants - No cache found, fetching fresh data`);
      }
    } catch (cacheError) {
      console.error(`[${environment}] fetchPlants - Error reading cached plants:`, cacheError);
      // Continue with Firebase fetch
    }
    
    // Set up timeout for Firebase fetch to prevent long-running requests
    let firebaseTimeout = false;
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        firebaseTimeout = true;
        reject(new Error('Firebase fetch timeout - using fallback data'));
      }, 10000); // 10 second timeout
      
      // Store the timer reference for cleanup
      return () => clearTimeout(timer);
    });
    
    // Try to fetch from Firebase with a timeout
    console.log(`[${environment}] fetchPlants - Getting plants snapshot...`);
    
    try {
      const plantsPromise = get(ref(database, 'plants'));
      const plantsSnapshot = await Promise.race([plantsPromise, timeoutPromise]);
      
      console.log(`[${environment}] fetchPlants - Plants snapshot exists:`, plantsSnapshot.exists());
      
      // If we got this far, Firebase fetch was successful
      console.log(`[${environment}] fetchPlants - Getting inventory snapshot...`);
      const inventorySnapshot = await get(ref(database, 'inventory'));
      console.log(`[${environment}] fetchPlants - Inventory snapshot exists:`, inventorySnapshot.exists());
      
      if (!plantsSnapshot.exists()) {
        console.log(`[${environment}] fetchPlants - No plants data found in Firebase, using sample data`);
        return await getSamplePlantsData();
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
            status: "Out of Stock",
            restockDate: "",
            notes: ""
          }
        };
      });
      
      // Update local inventory cache with the fetched data
      try {
        localStorage.setItem('plantInventory', JSON.stringify(inventoryData));
        console.log(`[${environment}] fetchPlants - Updated local inventory cache`);
      } catch (e) {
        console.error(`[${environment}] fetchPlants - Error updating inventory cache:`, e);
      }
      
      console.log(`[${environment}] fetchPlants - Fetched ${plantsArray.length} plants from Firebase`);
      // Log a sample plant for verification
      if (plantsArray.length > 0) {
        console.log(`[${environment}] fetchPlants - Sample plant:`, 
          {name: plantsArray[0].name, id: plantsArray[0].id, hasInventory: !!plantsArray[0].inventory});
      }
      
      // Cache the fetched data
      try {
        localStorage.setItem('cachedPlantsWithTimestamp', JSON.stringify({
          timestamp: new Date().toISOString(),
          data: plantsArray,
          source: 'firebase'
        }));
        console.log(`[${environment}] fetchPlants - Plants data cached to localStorage`);
      } catch (cacheError) {
        console.error(`[${environment}] fetchPlants - Error caching plants:`, cacheError);
      }
      
      return plantsArray;
    } catch (fetchError) {
      console.error(`[${environment}] fetchPlants - Error fetching from Firebase:`, fetchError);
      
      if (firebaseTimeout) {
        console.log(`[${environment}] fetchPlants - Firebase fetch timed out, using sample data`);
      } else {
        console.log(`[${environment}] fetchPlants - Firebase fetch failed, using sample data`);
      }
      
      return await getSamplePlantsData();
    }
  } catch (error) {
    console.error(`[${process.env.NODE_ENV}] Error in fetchPlants:`, error);
    console.error(`[${process.env.NODE_ENV}] Error details:`, error.code, error.message, error.stack);
    
    // Check if it's a Firebase error and log additional details
    if (error.code) {
      console.error(`[${process.env.NODE_ENV}] Firebase error code:`, error.code);
    }
    
    // Return fallback data instead of throwing
    console.log(`[${process.env.NODE_ENV}] fetchPlants - Fatal error, using sample data as last resort`);
    return await getSamplePlantsData();
  }
};

/**
 * Helper function to load sample plant data when Firebase fails
 * @returns {Promise<Array>} Array of sample plant objects
 */
async function getSamplePlantsData() {
  try {
    console.log('Using sample plants data as fallback');
    const samplePlants = await loadSamplePlants();
    
    // Cache the sample data as plants data
    try {
      localStorage.setItem('cachedPlantsWithTimestamp', JSON.stringify({
        timestamp: new Date().toISOString(),
        data: samplePlants,
        source: 'sample'
      }));
      console.log('Sample plants data cached to localStorage as regular plants data');
    } catch (e) {
      console.error('Error caching sample plants data:', e);
    }
    
    return samplePlants;
  } catch (error) {
    console.error('Error loading sample plants data:', error);
    
    // Last resort - return minimal hardcoded data
    const emergencyData = [
      {
        id: 1,
        name: "Sample Plant (Emergency Fallback)",
        scientificName: "Example species",
        price: "9.99",
        description: "This is an emergency fallback plant when all other loading methods fail.",
        mainImage: "/images/placeholder.jpg",
        inventory: {
          currentStock: 10,
          status: "In Stock"
        }
      }
    ];
    
    return emergencyData;
  }
}

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
    console.log(`[${process.env.NODE_ENV}] updateInventory - Starting update for plant ${plantId}`);
    console.log(`[${process.env.NODE_ENV}] updateInventory - Data:`, inventoryData);
    
    const { featured, ...inventoryProps } = inventoryData;
    
    // First, update localStorage as a cache
    try {
      console.log(`[${process.env.NODE_ENV}] updateInventory - Updating localStorage cache`);
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
      console.log(`[${process.env.NODE_ENV}] updateInventory - Local storage updated successfully`);
      
      // Update cached plants data too, if it exists
      try {
        const cachedData = localStorage.getItem('cachedPlantsWithTimestamp');
        if (cachedData) {
          const parsedCache = JSON.parse(cachedData);
          if (Array.isArray(parsedCache.data)) {
            const updatedPlants = parsedCache.data.map(plant => {
              if (plant.id === plantId) {
                return {
                  ...plant,
                  inventory: {
                    ...(plant.inventory || {}),
                    ...inventoryProps,
                    lastUpdated: new Date().toISOString()
                  }
                };
              }
              return plant;
            });
            
            // Update the cache with the new data
            localStorage.setItem('cachedPlantsWithTimestamp', JSON.stringify({
              ...parsedCache,
              data: updatedPlants,
              lastInventoryUpdate: new Date().toISOString()
            }));
            console.log(`[${process.env.NODE_ENV}] updateInventory - Updated plants cache for ${plantId}`);
          }
        }
      } catch (cacheError) {
        console.error(`[${process.env.NODE_ENV}] updateInventory - Error updating plants cache:`, cacheError);
        // Continue with Firebase update
      }
      
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
    console.log(`[${process.env.NODE_ENV}] updateInventory - Sending update to Firebase for path: inventory/${plantId}`);
    const inventoryRef = ref(database, `inventory/${plantId}`);
    await set(inventoryRef, {
      ...inventoryProps,
      lastUpdated: new Date().toISOString()
    });
    console.log(`[${process.env.NODE_ENV}] updateInventory - Firebase inventory update successful`);
    
    // Update featured status if provided
    if (featured !== undefined) {
      console.log(`[${process.env.NODE_ENV}] updateInventory - Updating featured status for plant ${plantId}`);
      const plantRef = ref(database, `plants/${plantId}`);
      await update(plantRef, { featured });
      console.log(`[${process.env.NODE_ENV}] updateInventory - Featured status update successful`);
    }
    
    // Clear the plants cache to force a refresh on next load
    localStorage.removeItem('cachedPlantsWithTimestamp');
    console.log(`[${process.env.NODE_ENV}] updateInventory - Cleared plants cache to ensure fresh data on next load`);
    
    return {
      success: true,
      message: `Inventory updated for plant ${plantId}`,
      data: {
        ...inventoryData,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`[${process.env.NODE_ENV}] Error updating inventory in Firebase:`, error);
    console.error(`[${process.env.NODE_ENV}] Error details:`, error.code, error.message, error.stack);
    
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
    
    // First check if we have cached sample data in localStorage
    const cachedData = localStorage.getItem('cachedSamplePlants');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        // Only use cache if it's less than 1 hour old
        const cacheTime = new Date(parsed.timestamp);
        const now = new Date();
        const cacheAgeHours = (now - cacheTime) / (1000 * 60 * 60);
        
        if (cacheAgeHours < 1 && Array.isArray(parsed.data) && parsed.data.length > 0) {
          console.log(`DEBUG: loadSamplePlants - Using cached data (${cacheAgeHours.toFixed(2)} hours old)`);
          return parsed.data;
        }
      } catch (e) {
        console.error('DEBUG: loadSamplePlants - Error parsing cached data:', e);
        // Continue to fetch new data
      }
    }
    
    // Hardcoded fallback data in case fetch fails
    const fallbackPlants = [
      {
        id: 1,
        name: "Lavender",
        scientificName: "Lavandula angustifolia",
        price: "12.99",
        description: "Fragrant perennial with purple flowers, perfect for borders and containers.",
        mainImage: "/images/placeholder.jpg",
        colour: "Purple",
        light: "Full Sun",
        height: "24-36 inches",
        bloomSeason: "Summer",
        inventory: {
          currentStock: 25,
          status: "In Stock"
        }
      },
      {
        id: 2,
        name: "Echinacea",
        scientificName: "Echinacea purpurea",
        price: "9.99",
        description: "Native perennial with daisy-like flowers that attract butterflies and bees.",
        mainImage: "/images/placeholder.jpg",
        colour: "Pink",
        light: "Full Sun to Part Shade",
        height: "24-36 inches",
        bloomSeason: "Summer to Fall",
        inventory: {
          currentStock: 15,
          status: "In Stock"
        }
      },
      {
        id: 3,
        name: "Black-Eyed Susan",
        scientificName: "Rudbeckia hirta",
        price: "8.99",
        description: "Cheerful native perennial with golden-yellow flowers and dark centers.",
        mainImage: "/images/placeholder.jpg",
        colour: "Yellow",
        light: "Full Sun to Part Shade",
        height: "24-36 inches",
        bloomSeason: "Summer to Fall",
        inventory: {
          currentStock: 10,
          status: "In Stock"
        }
      }
    ];

    // Try with a fetch first
    console.log('DEBUG: loadSamplePlants - Fetching from path:', '/data/sample-plants.json');
    let data;
    
    try {
      // Use a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), 5000)
      );
      
      const fetchPromise = fetch('/data/sample-plants.json');
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log('DEBUG: loadSamplePlants - Fetch response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sample data: ${response.status} ${response.statusText}`);
      }
      
      data = await response.json();
      console.log(`DEBUG: loadSamplePlants - Successfully loaded ${data.length} sample plants`);
      console.log('DEBUG: loadSamplePlants - First sample plant:', data[0]?.name || 'No name available');
    } catch (fetchError) {
      console.error('DEBUG: loadSamplePlants - Fetch error:', fetchError.message);
      console.log('DEBUG: loadSamplePlants - Using fallback hardcoded sample data');
      
      // If fetch fails, use the hardcoded fallback data
      data = fallbackPlants;
    }
    
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
      localStorage.setItem('cachedSamplePlants', JSON.stringify({
        timestamp: new Date().toISOString(),
        data: updatedData
      }));
      console.log('DEBUG: loadSamplePlants - Sample data cached to localStorage');
    } catch (e) {
      console.error('DEBUG: loadSamplePlants - Error caching sample data:', e);
    }
    
    return updatedData;
  } catch (error) {
    console.error('Error loading sample plant data:', error);
    console.error('DEBUG: loadSamplePlants - Detailed error:', error.stack || error.message || error);
    
    // Last resort - return a minimal set of plants as emergency fallback
    const emergencyFallback = [
      {
        id: 1,
        name: "Sample Plant",
        scientificName: "Example species",
        price: "9.99",
        description: "This is a fallback plant for when all other loading methods fail.",
        mainImage: "/images/placeholder.jpg",
        inventory: {
          currentStock: 10,
          status: "In Stock"
        }
      }
    ];
    
    return emergencyFallback;
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
 * Update an order in Firebase with new data
 * @param {string} orderId - The ID of the order to update
 * @param {Object} orderData - The data to update (partial update)
 * @returns {Promise<boolean>} Success status
 */
export const updateOrder = async (orderId, orderData) => {
  try {
    console.log(`Updating order ${orderId} with data:`, orderData);
    const orderRef = ref(database, `orders/${orderId}`);
    await update(orderRef, orderData);
    console.log(`Order ${orderId} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating order in Firebase:', error);
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