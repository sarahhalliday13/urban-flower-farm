// Simple script to debug Firebase database contents
// Run with: NODE_OPTIONS=--openssl-legacy-provider node src/db-debug.js

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
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

// Fetch plants and inventory data
async function fetchData() {
  try {
    console.log('Starting to fetch data from Firebase...');
    
    // Get plants data
    const plantsSnapshot = await get(ref(database, 'plants'));
    const plantsData = plantsSnapshot.exists() ? plantsSnapshot.val() : {};
    
    // Get inventory data
    const inventorySnapshot = await get(ref(database, 'inventory'));
    const inventoryData = inventorySnapshot.exists() ? inventorySnapshot.val() : {};
    
    console.log(`Found ${Object.keys(plantsData).length} plants and ${Object.keys(inventoryData).length} inventory items`);
    
    // Process data as in the app
    const plantsArray = Object.keys(plantsData).map(key => {
      const plant = plantsData[key];
      const plantId = plant.id || key;
      
      return {
        ...plant,
        id: plantId,
        inventory: inventoryData[plantId] || {
          currentStock: 0,
          status: "Unknown",
          restockDate: "",
          notes: ""
        }
      };
    });
    
    // Count by status
    const statusCounts = {};
    plantsArray.forEach(plant => {
      const status = plant.inventory?.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('\n=== STATUS COUNTS ===');
    console.log(statusCounts);
    
    // Show details of plants by status
    console.log('\n=== COMING SOON PLANTS ===');
    plantsArray.filter(p => p.inventory?.status === 'Coming Soon').forEach(p => 
      console.log(`${p.id}: ${p.name} - Stock: ${p.inventory?.currentStock || 0}`)
    );
    
    console.log('\n=== PRE-ORDER PLANTS ===');
    plantsArray.filter(p => 
      p.inventory?.status === 'Pre-order' || 
      p.inventory?.status === 'Pre-Order'
    ).forEach(p => 
      console.log(`${p.id}: ${p.name} - Stock: ${p.inventory?.currentStock || 0}`)
    );
    
    console.log('\n=== SOLD OUT PLANTS ===');
    plantsArray.filter(p => p.inventory?.status === 'Sold Out').forEach(p => 
      console.log(`${p.id}: ${p.name} - Stock: ${p.inventory?.currentStock || 0}`)
    );
    
    console.log('\n=== OUT OF STOCK PLANTS ===');
    plantsArray.filter(p => p.inventory?.status === 'Out of Stock').forEach(p => 
      console.log(`${p.id}: ${p.name} - Stock: ${p.inventory?.currentStock || 0}`)
    );
    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Run the fetch
fetchData(); 