/**
 * Script to delete corrupted orders from Firebase
 * These orders only have payment data and are missing customer info, items, etc.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com'
});

const db = admin.database();

// IDs of corrupted orders that need to be deleted
const corruptedOrderIds = [
  'ORD-2025-1001-1223',
  'ORD-2025-1001-4144',
  'ORD-2025-1001-7629',
  'ORD-2025-1084-7811'
];

async function deleteCorruptedOrders() {
  console.log('🗑️  Starting deletion of corrupted orders...\n');

  for (const orderId of corruptedOrderIds) {
    try {
      const orderRef = db.ref(`orders/${orderId}`);
      const snapshot = await orderRef.once('value');

      if (snapshot.exists()) {
        const orderData = snapshot.val();
        console.log(`📦 Order ${orderId}:`);
        console.log('   Has customer:', !!orderData.customer);
        console.log('   Has items:', !!orderData.items);
        console.log('   Has total:', !!orderData.total);
        console.log('   Has payment only:', !!orderData.payment && !orderData.customer);

        // Delete the order
        await orderRef.remove();
        console.log(`   ✅ DELETED\n`);
      } else {
        console.log(`⚠️  Order ${orderId} not found in database\n`);
      }
    } catch (error) {
      console.error(`❌ Error deleting ${orderId}:`, error.message, '\n');
    }
  }

  console.log('✅ Deletion complete!');
  process.exit(0);
}

// Run the deletion
deleteCorruptedOrders().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
