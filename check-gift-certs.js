#!/usr/bin/env node

/**
 * Command-line utility to check gift certificates in Firebase
 * Usage: node check-gift-certs.js
 */

const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");

// Load environment variables
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

/**
 * Check for gift certificates in the database
 * (Mirrors the checkGiftCertificates function from firebase.js)
 */
async function checkGiftCertificates() {
  try {
    console.log('🔍 Checking gift certificates in Firebase database...\n');
    
    // Fetch all plants and inventory
    const plantsSnapshot = await get(ref(database, 'plants'));
    const inventorySnapshot = await get(ref(database, 'inventory'));
    
    const plantsData = plantsSnapshot.exists() ? plantsSnapshot.val() : {};
    const inventoryData = inventorySnapshot.exists() ? inventorySnapshot.val() : {};
    
    // Search for gift certificate plants
    const allPlants = Object.keys(plantsData).map(key => ({
      ...plantsData[key],
      id: plantsData[key].id || key
    }));
    
    const giftCertPlants = allPlants.filter(plant => 
      (plant.id && plant.id.toString().startsWith('GC-')) ||
      plant.plantType === 'Gift Certificate' ||
      (plant.name && plant.name.toLowerCase().includes('gift certificate'))
    );
    
    // Search for gift certificate inventory
    const giftCertInventories = Object.keys(inventoryData).filter(key => 
      key.startsWith('GC-')
    );
    
    // Check which inventory entries have corresponding plant records
    const orphanedInventory = giftCertInventories.filter(id => !plantsData[id]);
    const completeGiftCerts = giftCertInventories.filter(id => plantsData[id]);
    
    // Display results
    console.log('📊 SUMMARY:');
    console.log('===========');
    console.log(`Plants with gift certificate pattern: ${giftCertPlants.length}`);
    console.log(`Gift certificate inventory entries: ${giftCertInventories.length}`);
    console.log(`Complete records (plant + inventory): ${completeGiftCerts.length}`);
    console.log(`Orphaned inventory (no plant record): ${orphanedInventory.length}`);
    
    if (giftCertPlants.length > 0) {
      console.log('\n✅ ACTIVE GIFT CERTIFICATES:');
      console.log('============================');
      giftCertPlants.forEach(cert => {
        const inventory = inventoryData[cert.id];
        console.log(`${cert.id}: ${cert.name} ($${cert.price})`);
        console.log(`   Stock: ${inventory?.currentStock || 0}, Status: ${inventory?.status || 'No inventory'}`);
      });
    }
    
    if (orphanedInventory.length > 0) {
      console.log('\n⚠️  ORPHANED INVENTORY (Missing Plant Records):');
      console.log('================================================');
      orphanedInventory.forEach(id => {
        const inventory = inventoryData[id];
        console.log(`${id}: Stock=${inventory.currentStock}, Status="${inventory.status}"`);
      });
      
      console.log('\n📝 RECOMMENDATION:');
      console.log('==================');
      console.log('Import gift certificate plant records using:');
      console.log('- gift_certificates_sample.json file');
      console.log('- Admin Dashboard > Import/Update plants feature');
    }
    
    if (giftCertInventories.length > 0) {
      console.log('\n📋 ALL GIFT CERTIFICATE INVENTORY:');
      console.log('==================================');
      giftCertInventories.forEach(id => {
        const inventory = inventoryData[id];
        const hasPlant = plantsData[id] ? '✅' : '❌';
        console.log(`${id}: Stock=${inventory.currentStock}, Status="${inventory.status}", Plant Record: ${hasPlant}`);
      });
    }
    
    console.log('\n✅ Gift certificate check complete');
    
    // Exit with appropriate code
    if (orphanedInventory.length > 0 || completeGiftCerts.length === 0) {
      console.log('⚠️  Issues found - see recommendations above');
      process.exit(1);
    } else {
      console.log('✅ All gift certificates are properly configured');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error checking gift certificates:', error.message);
    process.exit(1);
  }
}

// Run the check
checkGiftCertificates();