/**
 * Script to delete orphaned inventory entries (IDs 5-45)
 * These have inventory data but no corresponding plant data
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('./buttonsflowerfarm-8a54d-firebase-adminsdk-pnbyi-d7a4c92b5d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com"
});

const db = admin.database();

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteOrphanedInventory() {
  try {
    console.log('🔍 Checking for orphaned inventory entries...\n');

    // Fetch both plants and inventory
    const [plantsSnapshot, inventorySnapshot] = await Promise.all([
      db.ref('plants').once('value'),
      db.ref('inventory').once('value')
    ]);

    const plants = plantsSnapshot.val() || {};
    const inventory = inventorySnapshot.val() || {};

    // Find orphaned inventory in the range 5-45
    const orphanedIds = [];
    for (let id = 5; id <= 45; id++) {
      const idStr = id.toString();
      if (inventory[idStr] && !plants[idStr]) {
        orphanedIds.push({
          id: idStr,
          stock: inventory[idStr].currentStock || 0,
          status: inventory[idStr].status || 'Unknown'
        });
      }
    }

    if (orphanedIds.length === 0) {
      console.log('✅ No orphaned inventory found in range 5-45');
      process.exit(0);
    }

    console.log(`Found ${orphanedIds.length} orphaned inventory entries:\n`);
    orphanedIds.forEach(item => {
      console.log(`  ID ${item.id}: ${item.stock} units (${item.status})`);
    });

    console.log('\n⚠️  WARNING: This will PERMANENTLY DELETE these inventory entries!');
    console.log('This action CANNOT be undone.\n');

    // Ask for confirmation
    rl.question('Type "DELETE" to confirm deletion: ', async (answer) => {
      if (answer === 'DELETE') {
        console.log('\n🗑️  Deleting orphaned inventory...\n');

        let deleted = 0;
        for (const item of orphanedIds) {
          try {
            await db.ref(`inventory/${item.id}`).remove();
            console.log(`✅ Deleted inventory ID ${item.id}`);
            deleted++;
          } catch (error) {
            console.error(`❌ Failed to delete ID ${item.id}:`, error.message);
          }
        }

        console.log(`\n✅ Cleanup complete! Deleted ${deleted} of ${orphanedIds.length} entries.`);
      } else {
        console.log('\n❌ Deletion cancelled. No changes were made.');
      }

      rl.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

deleteOrphanedInventory();
