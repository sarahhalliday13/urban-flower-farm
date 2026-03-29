/**
 * Script to find orphaned inventory entries
 * (inventory entries that don't have corresponding plant data)
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./buttonsflowerfarm-8a54d-firebase-adminsdk-pnbyi-d7a4c92b5d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function findOrphanedInventory() {
  try {
    console.log('Fetching plants and inventory from Firebase...\n');

    // Fetch both plants and inventory
    const [plantsSnapshot, inventorySnapshot] = await Promise.all([
      db.ref('plants').once('value'),
      db.ref('inventory').once('value')
    ]);

    const plants = plantsSnapshot.val() || {};
    const inventory = inventorySnapshot.val() || {};

    console.log(`Total plants: ${Object.keys(plants).length}`);
    console.log(`Total inventory entries: ${Object.keys(inventory).length}\n`);

    // Find orphaned inventory (inventory with no corresponding plant)
    const orphaned = [];
    const orphanedDetails = [];

    Object.keys(inventory).forEach(inventoryId => {
      if (!plants[inventoryId]) {
        orphaned.push(inventoryId);
        orphanedDetails.push({
          id: inventoryId,
          data: inventory[inventoryId]
        });
      }
    });

    if (orphaned.length === 0) {
      console.log('✅ No orphaned inventory entries found!');
    } else {
      console.log(`⚠️  Found ${orphaned.length} orphaned inventory entries:\n`);

      orphanedDetails.forEach(item => {
        console.log(`ID: ${item.id}`);
        console.log(`  Stock: ${item.data.currentStock || 0}`);
        console.log(`  Status: ${item.data.status || 'Unknown'}`);
        console.log(`  Restock Date: ${item.data.restockDate || 'None'}`);
        console.log(`  Notes: ${item.data.notes || 'None'}`);
        console.log('---');
      });

      // Save to file
      const report = {
        timestamp: new Date().toISOString(),
        orphanedCount: orphaned.length,
        orphanedIds: orphaned,
        details: orphanedDetails
      };

      fs.writeFileSync(
        'orphaned-inventory-report.json',
        JSON.stringify(report, null, 2)
      );

      console.log('\n📝 Report saved to: orphaned-inventory-report.json');
    }

    // Also find plants without inventory
    const plantsWithoutInventory = [];
    Object.keys(plants).forEach(plantId => {
      if (!inventory[plantId]) {
        plantsWithoutInventory.push({
          id: plantId,
          name: plants[plantId].name
        });
      }
    });

    if (plantsWithoutInventory.length > 0) {
      console.log(`\n📋 Found ${plantsWithoutInventory.length} plants without inventory entries:`);
      plantsWithoutInventory.slice(0, 10).forEach(plant => {
        console.log(`  - ID ${plant.id}: ${plant.name}`);
      });
      if (plantsWithoutInventory.length > 10) {
        console.log(`  ... and ${plantsWithoutInventory.length - 10} more`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findOrphanedInventory();
