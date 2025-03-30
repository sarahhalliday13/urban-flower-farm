// Import the CORS proxy service
import corsProxy from './corsProxy';

// Define multiple possible API URLs to try
const API_URLS = [
  // Your updated Google Apps Script deployment URL
  'https://script.google.com/macros/s/AKfycbyIxjQ39l-Rjva_xkS2Gvq_uvf1iFfVjAA-FVz-6cH-CIbOV-Hm5eZiWZrbtA4D_tx5/exec',
  process.env.REACT_APP_SHEETS_API_URL
].filter(Boolean).filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates and undefined values

// Log the API URLs for debugging
console.log('Available API URLs:', API_URLS);

// Increase timeout to 30 seconds to give more time for the API to respond
const API_TIMEOUT = 30000; // 30 seconds timeout

// Direct test fetch to check if the API is accessible
const testDirectFetch = async () => {
  try {
    console.log('Testing direct fetch to API URL...');
    const url = API_URLS[0] + '?sheet=plants';
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Direct fetch response status:', response.status);
    console.log('Direct fetch response status text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Direct fetch successful! Received data:', data);
      return { success: true, data };
    } else {
      console.error('Direct fetch failed with status:', response.status);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.error('Direct fetch error:', error);
    return { success: false, error: error.message };
  }
};

// Run the direct fetch test immediately
testDirectFetch().then(result => {
  console.log('Direct fetch test result:', result);
}).catch(error => {
  console.error('Direct fetch test error:', error);
});

// Improved helper function to fetch with timeout and CORS handling
const fetchWithTimeout = async (url, options = {}) => {
  console.log(`Attempting fetch with timeout to: ${url}`, options);
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      controller.abort();
      reject(new Error(`Request timed out after ${API_TIMEOUT/1000} seconds`));
    }, API_TIMEOUT);
  });
  
  // Add CORS mode to options
  const fetchOptions = {
    ...options,
    signal,
    mode: 'cors',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    // Race between the fetch and the timeout
    const response = await Promise.race([
      fetch(url, fetchOptions),
      timeoutPromise
    ]);
    
    console.log(`Fetch response from ${url}:`, response.status, response.statusText);
    return response;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    if (error.name === 'AbortError') {
      throw new Error('Request was aborted due to timeout. Please try again later.');
    }
    
    // Handle CORS errors specifically
    if (error.message && error.message.includes('CORS')) {
      console.error('CORS error detected:', error);
      throw new Error('Cross-origin request blocked. This is likely a CORS configuration issue on the server.');
    }
    
    throw error;
  }
};

// Helper function to try multiple API URLs with CORS proxy fallback
const tryMultipleUrls = async (endpoint, options = {}) => {
  let lastError = null;
  
  // First try direct access to each URL
  for (const baseUrl of API_URLS) {
    const url = `${baseUrl}${endpoint}`;
    console.log(`Attempting to fetch directly from: ${url}`);
    
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok) {
        console.log(`Successfully connected directly to: ${url}`);
        return response;
      } else {
        console.warn(`Failed to fetch directly from ${url}: ${response.status} ${response.statusText}`);
        lastError = new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`Error fetching directly from ${url}:`, error.message);
      lastError = error;
      
      // If we detect a CORS error, try using the proxy immediately
      if (error.message && (error.message.includes('CORS') || error.message.includes('cross-origin'))) {
        console.log('CORS error detected, trying with proxy...');
        break;
      }
    }
  }
  
  // If direct access failed, try using the CORS proxy
  console.log('Direct access failed, attempting to use CORS proxy...');
  
  for (const baseUrl of API_URLS) {
    const url = `${baseUrl}${endpoint}`;
    console.log(`Attempting to fetch via CORS proxy from: ${url}`);
    
    try {
      // Use the fetchThroughProxy function from our CORS proxy service
      const response = await corsProxy.fetchThroughProxy(url, options);
      if (response.ok) {
        console.log(`Successfully connected via CORS proxy to: ${url}`);
        return response;
      } else {
        console.warn(`Failed to fetch via CORS proxy from ${url}: ${response.status} ${response.statusText}`);
        lastError = new Error(`Failed to fetch via proxy: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`Error fetching via CORS proxy from ${url}:`, error.message);
      lastError = error;
    }
  }
  
  // If we get here, all URLs failed with both direct access and proxy
  throw lastError || new Error('Failed to connect to any API endpoint, even with CORS proxy');
};

// Function to get all plants
export const fetchPlants = async () => {
  try {
    console.log('Fetching plants data...');
    
    // First check if we have cached data in localStorage
    let localStorageInventory = {};
    let cachedPlants = null;
    
    try {
      const storedInventory = localStorage.getItem('plantInventory');
      if (storedInventory) {
        localStorageInventory = JSON.parse(storedInventory);
        console.log('Found localStorage inventory data:', localStorageInventory);
      }
      
      const cachedPlantsData = localStorage.getItem('cachedPlantsData');
      if (cachedPlantsData) {
        cachedPlants = JSON.parse(cachedPlantsData);
        console.log('Found cached plants data:', cachedPlants);
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    
    // Try to fetch from API with timeout
    let plantsData = [];
    let inventoryData = [];
    let fetchSuccessful = false;
    
    try {
      console.log('Attempting to fetch plants data...');
      const response = await tryMultipleUrls('?sheet=plants');
      
      plantsData = await response.json();
      console.log('Plants data from API:', plantsData);
      
      // Fetch inventory data
      console.log('Attempting to fetch inventory data...');
      const inventoryResponse = await tryMultipleUrls('?sheet=inventory');
      if (inventoryResponse.ok) {
        inventoryData = await inventoryResponse.json();
        console.log('Inventory data from API:', inventoryData);
        
        // Log the first few inventory items to see their structure
        if (inventoryData.length > 0) {
          console.log('First inventory item:', inventoryData[0]);
          console.log('Available keys in inventory item:', Object.keys(inventoryData[0]));
        }
      } else {
        console.warn('Could not fetch inventory data, using fallback inventory status');
      }
      
      fetchSuccessful = true;
    } catch (fetchError) {
      console.error('Error fetching from API:', fetchError);
      
      // Try to use cached data regardless of age if API fetch fails
      if (cachedPlants) {
        try {
          console.log('API fetch failed, using cached plants data as fallback');
          plantsData = cachedPlants;
        } catch (e) {
          console.error('Error using cached plants data as fallback:', e);
          throw fetchError; // Re-throw if we can't use cached data
        }
      } else {
        // If no cached data, initialize with default data
        console.log('No cached data available, initializing with default data');
        initializeDefaultInventory();
        
        // Try to get the default inventory
        try {
          const defaultInventory = localStorage.getItem('plantInventory');
          if (defaultInventory) {
            const parsedInventory = JSON.parse(defaultInventory);
            console.log('Using default inventory:', parsedInventory);
            
            // Create minimal plant data from the default inventory
            plantsData = Object.keys(parsedInventory).map(id => ({
              id: parseInt(id),
              name: `Plant ${id}`,
              latinName: '',
              mainImage: '',
              price: '0',
              inventory: parsedInventory[id]
            }));
          } else {
            // If all else fails, rethrow the error
            throw new Error(`Failed to fetch plants data and no fallback available. Please check your internet connection and try again.`);
          }
        } catch (e) {
          console.error('Error creating default data:', e);
          throw new Error(`Failed to fetch plants data: ${fetchError.message}. Please check your internet connection and try again.`);
        }
      }
    }
    
    // Process the data
    const processedPlants = plantsData
      .filter(plant => plant.name) // Remove empty entries
      .map(plant => {
        // Find inventory data for this plant - try different possible column names
        // Convert plant.id to string for comparison to handle type mismatches
        const plantIdStr = String(plant.id);
        
        // Try different possible column names for plant_id
        const inventory = inventoryData.find(inv => 
          (inv.plant_id !== undefined && String(inv.plant_id) === plantIdStr) ||
          (inv.plantId !== undefined && String(inv.plantId) === plantIdStr) ||
          (inv.id !== undefined && String(inv.id) === plantIdStr) ||
          (inv.ID !== undefined && String(inv.ID) === plantIdStr) ||
          (inv.Plant_ID !== undefined && String(inv.Plant_ID) === plantIdStr)
        ) || {};
        
        console.log(`Inventory for plant ${plant.id}:`, inventory);
        
        // Check if we have updated inventory in localStorage
        let localInventory = {};
        if (localStorageInventory[plant.id]) {
          localInventory = localStorageInventory[plant.id];
          console.log(`Found localStorage inventory for plant ${plant.id}:`, localInventory);
        }
        
        // Determine inventory status
        let inventoryStatus = "Unknown";
        let currentStock = 0;
        
        // First check localStorage for the most up-to-date values
        if (localInventory.status) {
          inventoryStatus = localInventory.status;
          currentStock = parseInt(localInventory.currentStock) || 0;
        } 
        // Then check the inventory data from the API
        else if (inventory) {
          // Try to get current stock - prioritize current_stock (original format)
          if (inventory.current_stock !== undefined) {
            currentStock = parseInt(inventory.current_stock) || 0;
          } else if (inventory.currentStock !== undefined) {
            currentStock = parseInt(inventory.currentStock) || 0;
          } else if (inventory.stock !== undefined) {
            currentStock = parseInt(inventory.stock) || 0;
          }
          
          // Try to get status
          if (inventory.status !== undefined) {
            inventoryStatus = inventory.status;
          }
        }
        
        // If we have a numeric stock value, determine status based on that
        if (currentStock !== undefined && !localInventory.status) {
          if (currentStock <= 0) {
            inventoryStatus = "Out of Stock";
          } else {
            inventoryStatus = "In Stock";
          }
        }
        
        return {
          id: plant.id,
          name: plant.name,
          scientificName: plant.latinName || '',
          mainImage: plant.mainImage || '',
          price: plant.price ? plant.price.toString() : "0",
          light: plant.light || '',
          water: plant.water || "", 
          care: plant.care || "",
          description: plant.description || '',
          inventory: {
            currentStock: currentStock,
            status: inventoryStatus,
            restockDate: localInventory.restockDate || inventory.restock_date || inventory.restockDate || null,
            notes: localInventory.notes || inventory.notes || ""
          },
          // Additional fields from the sheet
          commonName: plant.commonName || '',
          bloomSeason: plant.bloomSeason || '',
          colour: plant.colour || '',
          spacing: plant.spacing || '',
          attributes: plant.attributes || '',
          hardinessZone: plant.hardinessZone || '',
          height: plant.height || '',
          featured: plant.featured || false,
          shortDescription: plant.shortDescription || '',
          additionalImages: plant.additionalImages ? plant.additionalImages.split(',').map(img => img.trim()) : []
        };
      });
    
    // If fetch was successful, cache the data for future use
    if (fetchSuccessful) {
      try {
        localStorage.setItem('cachedPlantsData', JSON.stringify(plantsData));
        console.log('Cached plants data to localStorage');
      } catch (e) {
        console.error('Error caching plants data to localStorage:', e);
      }
    }
    
    return processedPlants;
  } catch (error) {
    console.error('Error fetching plants:', error);
    throw error;
  }
};

// Function to get a single plant by ID
export const fetchPlantById = async (id) => {
  try {
    const plants = await fetchPlants();
    return plants.find(plant => plant.id === parseInt(id) || plant.id === id);
  } catch (error) {
    console.error('Error fetching plant:', error);
    throw error;
  }
};

// Function to update inventory for a specific plant
export const updateInventory = async (plantId, inventoryData) => {
  try {
    console.log(`Updating inventory for plant ${plantId}:`, inventoryData);
    
    // First, update localStorage as a cache
    let storedInventory = {};
    try {
      const existingData = localStorage.getItem('plantInventory');
      if (existingData) {
        storedInventory = JSON.parse(existingData);
        console.log('Existing localStorage inventory:', storedInventory);
      } else {
        console.log('No existing localStorage inventory found, creating new');
      }
      
      // Update the inventory for this plant
      storedInventory[plantId] = {
        ...inventoryData,
        lastUpdated: new Date().toISOString()
      };
      
      // Save back to localStorage
      localStorage.setItem('plantInventory', JSON.stringify(storedInventory));
      console.log('Updated localStorage inventory:', storedInventory);
    } catch (e) {
      console.error('Error updating localStorage:', e);
    }
    
    // Then, send update to Google Sheets
    try {
      console.log('Sending inventory update to Google Sheets API');
      
      // Create the request body - convert to the format expected by the server
      const requestBody = JSON.stringify({
        action: 'updateInventory',
        plantId: plantId,
        inventoryData: {
          // Map client-side property names to server-side expected names
          current_stock: inventoryData.currentStock,
          status: inventoryData.status,
          restock_date: inventoryData.restockDate,
          notes: inventoryData.notes
        }
      });
      
      // Try all API URLs for the POST request, with CORS proxy fallback
      let response = null;
      let lastError = null;
      
      // First try direct access
      for (const baseUrl of API_URLS) {
        try {
          console.log(`Attempting to update inventory directly using: ${baseUrl}`);
          response = await fetchWithTimeout(baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: requestBody
          });
          
          if (response.ok) {
            console.log(`Successfully updated inventory directly using: ${baseUrl}`);
            break; // Exit the loop if successful
          } else {
            console.warn(`Failed to update inventory directly using ${baseUrl}: ${response.status} ${response.statusText}`);
            lastError = new Error(`Failed to update inventory: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.warn(`Error updating inventory directly using ${baseUrl}:`, error.message);
          lastError = error;
          
          // If we detect a CORS error, try using the proxy immediately
          if (error.message && (error.message.includes('CORS') || error.message.includes('cross-origin'))) {
            console.log('CORS error detected, trying with proxy...');
            break;
          }
        }
      }
      
      // If direct access failed, try using the CORS proxy
      if (!response || !response.ok) {
        console.log('Direct access failed for update, attempting to use CORS proxy...');
        
        for (const baseUrl of API_URLS) {
          try {
            console.log(`Attempting to update inventory via CORS proxy using: ${baseUrl}`);
            
            // Use the fetchThroughProxy function from our CORS proxy service
            response = await corsProxy.fetchThroughProxy(baseUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: requestBody
            });
            
            if (response.ok) {
              console.log(`Successfully updated inventory via CORS proxy using: ${baseUrl}`);
              break; // Exit the loop if successful
            } else {
              console.warn(`Failed to update inventory via CORS proxy using ${baseUrl}: ${response.status} ${response.statusText}`);
              lastError = new Error(`Failed to update inventory via proxy: ${response.status} ${response.statusText}`);
            }
          } catch (error) {
            console.warn(`Error updating inventory via CORS proxy using ${baseUrl}:`, error.message);
            lastError = error;
          }
        }
      }
      
      // If no successful response, throw the last error
      if (!response || !response.ok) {
        throw lastError || new Error('Failed to update inventory in Google Sheets, even with CORS proxy');
      }
      
      const result = await response.json();
      console.log('Google Sheets API response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error updating inventory in Google Sheets');
      }
      
      return {
        success: true,
        message: `Inventory updated for plant ${plantId} in both local storage and Google Sheets`,
        data: {
          plantId,
          ...inventoryData
        }
      };
    } catch (apiError) {
      console.error('Error updating inventory in Google Sheets:', apiError);
      
      // Add to sync queue for failed updates
      addToSyncQueue(plantId, inventoryData, true);
      
      return {
        success: true, // Still return success since we saved to localStorage
        warning: `Changes saved locally but not synced to Google Sheets: ${apiError.message}. Will retry sync later.`,
        data: {
          plantId,
          ...inventoryData
        }
      };
    }
  } catch (error) {
    console.error('Error in updateInventory:', error);
    throw error;
  }
};

// Helper function to manage the sync queue
const addToSyncQueue = (plantId, inventoryData, needsSync) => {
  try {
    // Get current sync queue or initialize empty array
    let syncQueue = [];
    const existingQueue = localStorage.getItem('inventorySyncQueue');
    
    if (existingQueue) {
      syncQueue = JSON.parse(existingQueue);
    }
    
    if (needsSync) {
      // Add this update to the queue if it needs syncing
      // First remove any existing entries for this plant
      syncQueue = syncQueue.filter(item => item.plantId !== plantId);
      
      // Then add the new entry
      syncQueue.push({
        plantId,
        inventoryData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Added plant ${plantId} to sync queue`);
    } else {
      // Remove this plant from the queue if it was successfully synced
      syncQueue = syncQueue.filter(item => item.plantId !== plantId);
      console.log(`Removed plant ${plantId} from sync queue after successful sync`);
    }
    
    // Save updated queue
    localStorage.setItem('inventorySyncQueue', JSON.stringify(syncQueue));
  } catch (e) {
    console.error('Error managing sync queue:', e);
  }
};

// Function to process the sync queue and attempt to sync pending inventory updates
export const processSyncQueue = async () => {
  let syncQueue = [];
  try {
    console.log('Processing inventory sync queue...');
    
    // Get current sync queue
    const existingQueue = localStorage.getItem('inventorySyncQueue');
    if (!existingQueue) {
      console.log('No pending inventory updates to sync');
      return { success: true, message: 'No pending updates', remainingItems: 0 };
    }
    
    syncQueue = JSON.parse(existingQueue);
    if (syncQueue.length === 0) {
      console.log('Sync queue is empty');
      return { success: true, message: 'No pending updates', remainingItems: 0 };
    }
    
    console.log(`Found ${syncQueue.length} pending inventory updates to sync`);
    
    // Process each item in the queue
    const results = [];
    const failedItems = [];
    let successCount = 0;
    
    for (const item of syncQueue) {
      try {
        console.log(`Attempting to sync inventory for plant ${item.plantId}`);
        
        // Create the request body - convert to the format expected by the server
        const requestBody = JSON.stringify({
          action: 'updateInventory',
          plantId: item.plantId,
          inventoryData: {
            // Map client-side property names to server-side expected names
            current_stock: item.inventoryData.currentStock,
            status: item.inventoryData.status,
            restock_date: item.inventoryData.restockDate,
            notes: item.inventoryData.notes
          }
        });
        
        // Try all API URLs for the POST request, with CORS proxy fallback
        let response = null;
        let lastError = null;
        
        // First try direct access
        for (const baseUrl of API_URLS) {
          try {
            console.log(`Attempting to sync directly using: ${baseUrl}`);
            response = await fetchWithTimeout(baseUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: requestBody
            });
            
            if (response.ok) {
              console.log(`Successfully synced directly using: ${baseUrl}`);
              break; // Exit the loop if successful
            } else {
              console.warn(`Failed to sync directly using ${baseUrl}: ${response.status} ${response.statusText}`);
              lastError = new Error(`Failed to sync: ${response.status} ${response.statusText}`);
            }
          } catch (error) {
            console.warn(`Error syncing directly using ${baseUrl}:`, error.message);
            lastError = error;
            
            // If we detect a CORS error, try using the proxy immediately
            if (error.message && (error.message.includes('CORS') || error.message.includes('cross-origin'))) {
              console.log('CORS error detected, trying with proxy...');
              break;
            }
          }
        }
        
        // If direct access failed, try using the CORS proxy
        if (!response || !response.ok) {
          console.log('Direct access failed for sync, attempting to use CORS proxy...');
          
          for (const baseUrl of API_URLS) {
            try {
              console.log(`Attempting to sync via CORS proxy using: ${baseUrl}`);
              
              // Use the fetchThroughProxy function from our CORS proxy service
              response = await corsProxy.fetchThroughProxy(baseUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: requestBody
              });
              
              if (response.ok) {
                console.log(`Successfully synced via CORS proxy using: ${baseUrl}`);
                break; // Exit the loop if successful
              } else {
                console.warn(`Failed to sync via CORS proxy using ${baseUrl}: ${response.status} ${response.statusText}`);
                lastError = new Error(`Failed to sync via proxy: ${response.status} ${response.statusText}`);
              }
            } catch (error) {
              console.warn(`Error syncing via CORS proxy using ${baseUrl}:`, error.message);
              lastError = error;
            }
          }
        }
        
        // If no successful response, throw the last error
        if (!response || !response.ok) {
          throw lastError || new Error('Failed to sync inventory in Google Sheets, even with CORS proxy');
        }
        
        const result = await response.json();
        console.log(`Sync result for plant ${item.plantId}:`, result);
        
        if (result.success) {
          results.push({ plantId: item.plantId, success: true });
          successCount++;
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (error) {
        console.error(`Error syncing inventory for plant ${item.plantId}:`, error);
        results.push({ plantId: item.plantId, success: false, error: error.message });
        failedItems.push(item);
      }
    }
    
    // Update the sync queue with only failed items
    if (failedItems.length > 0) {
      localStorage.setItem('inventorySyncQueue', JSON.stringify(failedItems));
      console.log(`Updated sync queue with ${failedItems.length} remaining items`);
    } else {
      localStorage.removeItem('inventorySyncQueue');
      console.log('All items synced successfully, removed sync queue');
    }
    
    return {
      success: successCount > 0,
      message: successCount > 0 
        ? (failedItems.length > 0 
            ? `Synced ${successCount} items, ${failedItems.length} items remaining` 
            : 'All items synced successfully')
        : 'Failed to sync any items',
      syncedItems: successCount,
      remainingItems: failedItems.length,
      results
    };
  } catch (error) {
    console.error('Error processing sync queue:', error);
    return {
      success: false,
      message: `Error processing sync queue: ${error.message}`,
      remainingItems: syncQueue.length || 0
    };
  }
};

// Function to update inventory after an order is placed
export const updateInventoryAfterOrder = async (orderItems) => {
  try {
    console.log('Updating inventory after order:', orderItems);
    
    // Get current inventory data
    const plants = await fetchPlants();
    
    // Process each ordered item
    const updatePromises = orderItems.map(async (orderItem) => {
      // Find the plant in our data
      const plant = plants.find(p => p.id === orderItem.id);
      
      if (!plant) {
        console.error(`Plant with ID ${orderItem.id} not found`);
        return null;
      }
      
      // Calculate new stock level
      const currentStock = plant.inventory?.currentStock || 0;
      const newStock = Math.max(0, currentStock - orderItem.quantity);
      
      console.log(`Updating inventory for ${plant.name} (ID: ${plant.id}): Current stock: ${currentStock}, Ordered: ${orderItem.quantity}, New stock: ${newStock}`);
      
      // Determine new status based on stock level
      let newStatus = plant.inventory?.status || "Unknown";
      
      if (newStock <= 0) {
        newStatus = "Out of Stock";
      } else {
        newStatus = "In Stock";
      }
      
      // Update inventory - use the client-side property names
      // The updateInventory function will convert them to server-side names
      const inventoryData = {
        currentStock: newStock,
        status: newStatus,
        restockDate: plant.inventory?.restockDate || '',
        notes: plant.inventory?.notes || ''
      };
      
      // Call the updateInventory function
      return updateInventory(orderItem.id, inventoryData);
    });
    
    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    
    // Check if all updates were successful
    const allSuccessful = results.every(result => result && result.success);
    
    // Force a refresh of the plants data to ensure we have the latest
    try {
      // Clear any cached data
      localStorage.setItem('plantsDataCache', '');
      console.log('Cleared plants data cache to force refresh');
    } catch (e) {
      console.error('Error clearing plants data cache:', e);
    }
    
    return {
      success: allSuccessful,
      message: allSuccessful ? 'Inventory updated successfully' : 'Some inventory updates failed',
      results
    };
  } catch (error) {
    console.error('Error updating inventory after order:', error);
    throw new Error('Failed to update inventory after order. Please try again later.');
  }
};

// Function to initialize default inventory data if none exists
export const initializeDefaultInventory = () => {
  try {
    // Check if we already have inventory data
    const existingData = localStorage.getItem('plantInventory');
    if (existingData) {
      const parsed = JSON.parse(existingData);
      // If we have data for at least one plant, don't initialize
      if (Object.keys(parsed).length > 0) {
        console.log('Existing inventory data found, not initializing defaults');
        return;
      }
    }
    
    console.log('No existing inventory data found, initializing defaults');
    
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
    
    // Save to localStorage
    localStorage.setItem('plantInventory', JSON.stringify(defaultInventory));
    console.log('Default inventory initialized:', defaultInventory);
  } catch (e) {
    console.error('Error initializing default inventory:', e);
  }
};

// Function to clear all cached data
export const clearAllCachedData = () => {
  try {
    console.log('Clearing all cached data...');
    localStorage.removeItem('cachedPlantsData');
    localStorage.removeItem('cachedPlantsWithTimestamp');
    localStorage.removeItem('plantInventory');
    localStorage.removeItem('inventorySyncQueue');
    localStorage.removeItem('plantsDataCache');
    console.log('All cached data cleared');
  } catch (e) {
    console.error('Error clearing cached data:', e);
  }
};

// Function to clear all cached data and force reload
export const clearCacheAndReload = () => {
  try {
    console.log('Clearing all cached data and reloading...');
    
    // Clear all localStorage items related to plants and inventory
    localStorage.removeItem('cachedPlantsData');
    localStorage.removeItem('cachedPlantsWithTimestamp');
    localStorage.removeItem('plantInventory');
    localStorage.removeItem('inventorySyncQueue');
    localStorage.removeItem('plantsDataCache');
    
    console.log('All cached data cleared, reloading page...');
    
    // Reload the page to force fresh data fetch
    window.location.reload();
    
    return true;
  } catch (e) {
    console.error('Error clearing cache and reloading:', e);
    return false;
  }
};

// Function to test API connection
export const testApiConnection = async () => {
  console.log('Testing API connection...');
  
  for (const url of API_URLS) {
    try {
      console.log(`Testing connection to: ${url}`);
      const response = await fetch(`${url}?sheet=plants`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Response from ${url}:`, response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully connected to ${url}. Received ${data.length} plants.`);
        return {
          success: true,
          url,
          message: `Successfully connected to ${url}. Received ${data.length} plants.`,
          data
        };
      } else {
        console.error(`Failed to connect to ${url}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error testing connection to ${url}:`, error);
    }
  }
  
  // Try with CORS proxy as last resort
  for (const url of API_URLS) {
    try {
      console.log(`Testing connection via CORS proxy to: ${url}`);
      const response = await corsProxy.fetchThroughProxy(`${url}?sheet=plants`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully connected via CORS proxy to ${url}. Received ${data.length} plants.`);
        return {
          success: true,
          url: `CORS proxy -> ${url}`,
          message: `Successfully connected via CORS proxy to ${url}. Received ${data.length} plants.`,
          data
        };
      } else {
        console.error(`Failed to connect via CORS proxy to ${url}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error testing connection via CORS proxy to ${url}:`, error);
    }
  }
  
  return {
    success: false,
    message: 'Failed to connect to any API endpoint, even with CORS proxy'
  };
};

// Call this function when the module loads
initializeDefaultInventory();

// Clear all cached data to ensure we use the new API URL
clearAllCachedData();

// Test API connection on load
testApiConnection().then(result => {
  console.log('API connection test result:', result);
}).catch(error => {
  console.error('API connection test error:', error);
}); 