const SHEETS_API_URL = process.env.REACT_APP_SHEETS_API_URL || 'https://script.google.com/macros/s/AKfycbw8STj53fmnI2DuiyhMwXLW3btLxJSC_rQH4YMhLADaw50Olkr8Y2-CcJ2Cr6IgZ0ZY/exec';

// Function to get all plants
export const fetchPlants = async () => {
  try {
    console.log('Fetching plants data...');
    const response = await fetch(`${SHEETS_API_URL}?sheet=plants`);
    if (!response.ok) {
      throw new Error('Failed to fetch plants');
    }
    const plantsData = await response.json();
    console.log('Plants data from API:', plantsData);
    
    // Fetch inventory data
    const inventoryResponse = await fetch(`${SHEETS_API_URL}?sheet=inventory`);
    let inventoryData = [];
    
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
    
    // Check if we have any localStorage inventory data
    let localStorageInventory = {};
    try {
      const storedInventory = localStorage.getItem('plantInventory');
      if (storedInventory) {
        localStorageInventory = JSON.parse(storedInventory);
        console.log('Found localStorage inventory data:', localStorageInventory);
      } else {
        console.log('No localStorage inventory data found');
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    
    // Filter out empty entries and map the data to match our app's structure
    return plantsData
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
        
        // Use localStorage data if available, otherwise fall back to API data
        if (localInventory.currentStock !== undefined) {
          currentStock = parseInt(localInventory.currentStock);
          inventoryStatus = localInventory.status || "Unknown";
          console.log(`Using localStorage inventory for plant ${plant.id}: stock=${currentStock}, status=${inventoryStatus}`);
        } else {
          // Try different possible column names for current_stock
          const stockValue = 
            inventory.current_stock !== undefined ? inventory.current_stock :
            inventory.currentStock !== undefined ? inventory.currentStock :
            inventory.stock !== undefined ? inventory.stock :
            inventory.Stock !== undefined ? inventory.Stock :
            inventory["Current Stock"] !== undefined ? inventory["Current Stock"] :
            null;
          
          if (stockValue !== null) {
            currentStock = parseInt(stockValue);
            console.log(`Plant ${plant.id} stock value:`, stockValue, 'parsed as:', currentStock);
            
            if (currentStock <= 0) {
              inventoryStatus = "Out of Stock";
            } else {
              inventoryStatus = "In Stock";
            }
          } else if (plant.availability) {
            // Fallback to the old availability field if inventory tab data is not available
            currentStock = plant.availability === "Ready now" ? 1 : 0;
            inventoryStatus = plant.availability === "Ready now" ? "In Stock" : "Out of Stock";
            console.log(`Plant ${plant.id} using fallback availability:`, plant.availability, 'currentStock:', currentStock);
          }
          
          // If there's a specific status in the inventory tab, use that instead
          // Try different possible column names for status
          const statusValue = 
            inventory.status !== undefined ? inventory.status :
            inventory.Status !== undefined ? inventory.Status :
            inventory["Status"] !== undefined ? inventory["Status"] :
            null;
            
          if (statusValue !== null) {
            console.log(`Plant ${plant.id} status value:`, statusValue);
            
            // Convert status to a standardized format
            const statusLower = String(statusValue).toLowerCase().trim();
            
            if (statusLower.includes('in stock') || statusLower === 'instock') {
              inventoryStatus = "In Stock";
            } else if (statusLower.includes('out of stock') || statusLower === 'outofstock' || statusLower === 'sold out' || statusLower === 'soldout') {
              inventoryStatus = "Out of Stock";
            } else if (statusLower.includes('coming soon') || statusLower === 'comingsoon') {
              inventoryStatus = "Coming Soon";
            } else if (statusLower.includes('pre-order') || statusLower === 'preorder') {
              inventoryStatus = "Pre-order";
            } else {
              // If we can't match to a known status, use the original value
              inventoryStatus = statusValue;
            }
          }
        }
        
        return {
          id: plant.id,
          name: plant.name,
          scientificName: plant.latinName,
          mainImage: plant.mainImage,
          price: plant.price ? plant.price.toString() : "0",
          light: plant.light,
          water: plant.water || "", 
          care: plant.care || "",
          description: plant.description,
          inventory: {
            currentStock: currentStock,
            status: inventoryStatus,
            restockDate: localInventory.restockDate || inventory.restock_date || inventory.restockDate || null,
            notes: localInventory.notes || inventory.notes || ""
          },
          // Additional fields from the sheet
          commonName: plant.commonName,
          bloomSeason: plant.bloomSeason,
          colour: plant.colour,
          spacing: plant.spacing,
          attributes: plant.attributes,
          hardinessZone: plant.hardinessZone,
          height: plant.height,
          featured: plant.featured,
          shortDescription: plant.shortDescription,
          additionalImages: plant.additionalImages ? plant.additionalImages.split(',').map(img => img.trim()) : []
        };
      });
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
    // In a real implementation, this would make a POST request to your Google Apps Script
    // For now, we'll store the updated inventory in localStorage to persist it
    console.log(`Updating inventory for plant ${plantId}:`, inventoryData);
    
    // Get current inventory from localStorage or initialize empty object
    let storedInventory = {};
    try {
      const existingData = localStorage.getItem('plantInventory');
      if (existingData) {
        storedInventory = JSON.parse(existingData);
        console.log('Existing localStorage inventory:', storedInventory);
      } else {
        console.log('No existing localStorage inventory found, creating new');
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
    
    // Update the inventory for this plant
    storedInventory[plantId] = {
      ...inventoryData,
      lastUpdated: new Date().toISOString()
    };
    
    // Save back to localStorage
    try {
      localStorage.setItem('plantInventory', JSON.stringify(storedInventory));
      console.log('Updated localStorage inventory:', storedInventory);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return success response
    return {
      success: true,
      message: `Inventory updated for plant ${plantId}`,
      data: {
        plantId,
        ...inventoryData
      }
    };
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw new Error('Failed to update inventory. Please try again later.');
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
      
      // Update inventory
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

// Call this function when the module loads
initializeDefaultInventory(); 