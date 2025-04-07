// Script to update some plants in the database with different statuses
// Run with: NODE_OPTIONS=--openssl-legacy-provider node src/db-update.js

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, update, get } = require('firebase/database');
require('dotenv').config();

// Firebase configuration
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

// Update plant statuses
async function updateStatuses() {
  try {
    console.log('Starting to update plant statuses...');
    
    // Get plants data
    const plantsSnapshot = await get(ref(database, 'plants'));
    const plantsData = plantsSnapshot.exists() ? plantsSnapshot.val() : {};
    
    if (!plantsSnapshot.exists()) {
      console.error('No plants found in database!');
      return;
    }
    
    // Get keys of first 15 "Out of Stock" plants to update
    const plantsToUpdate = [];
    let plantsChecked = 0;
    
    // First collect plant IDs we might want to update
    for (const key in plantsData) {
      const plant = plantsData[key];
      plantsChecked++;
      
      // Get first 15 plants to update
      if (plantsToUpdate.length < 15) {
        plantsToUpdate.push(plant.id || key);
      } else {
        break;
      }
      
      // Stop after checking 30 plants
      if (plantsChecked >= 30) break;
    }
    
    console.log(`Found ${plantsToUpdate.length} plants to update`);
    
    // Set 5 plants to "Coming Soon"
    const comingSoonPlants = plantsToUpdate.slice(0, 5);
    console.log('Setting Coming Soon status for plants:', comingSoonPlants);
    
    for (const plantId of comingSoonPlants) {
      const inventoryRef = ref(database, `inventory/${plantId}`);
      await update(inventoryRef, {
        status: "Coming Soon",
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Set 5 plants to "Pre-order"
    const preOrderPlants = plantsToUpdate.slice(5, 10);
    console.log('Setting Pre-order status for plants:', preOrderPlants);
    
    for (const plantId of preOrderPlants) {
      const inventoryRef = ref(database, `inventory/${plantId}`);
      await update(inventoryRef, {
        status: "Pre-order",
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Set 5 plants to "Sold Out"
    const soldOutPlants = plantsToUpdate.slice(10, 15);
    console.log('Setting Sold Out status for plants:', soldOutPlants);
    
    for (const plantId of soldOutPlants) {
      const inventoryRef = ref(database, `inventory/${plantId}`);
      await update(inventoryRef, {
        status: "Sold Out",
        lastUpdated: new Date().toISOString()
      });
    }
    
    console.log('Plant statuses updated successfully!');
    
  } catch (error) {
    console.error('Error updating plant statuses:', error);
  }
}

// Run the update
updateStatuses(); 