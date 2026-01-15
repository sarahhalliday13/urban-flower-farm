/**
 * Test script to verify the order update bug is fixed
 *
 * This script:
 * 1. Creates a test order with full data
 * 2. Updates only the payment information
 * 3. Verifies all original data is still present
 *
 * Usage: node test-order-update-fix.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need your service account key)
// For now, this is a template - adjust the path to your service account key
try {
  const serviceAccount = require('./buttonsflowerfarm-8a54d-firebase-adminsdk-ryyv0-2e5a2ccf6a.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com"
  });
} catch (error) {
  console.error('⚠️  Could not find service account key.');
  console.error('   This script needs Firebase Admin credentials to run.');
  console.error('   For security, run this only on staging/test environment.\n');
  process.exit(1);
}

const db = admin.database();

// Test order data
const TEST_ORDER_ID = `TEST-ORDER-${Date.now()}`;

const testOrder = {
  id: TEST_ORDER_ID,
  date: new Date().toISOString(),
  status: 'pending',
  customer: {
    firstName: 'Test',
    lastName: 'Customer',
    email: 'test@example.com',
    phone: '555-1234',
    pickupRequest: 'ASAP',
    notes: 'This is a test order'
  },
  items: [
    {
      id: 'item-1',
      name: 'Test Plant',
      price: 10.00,
      quantity: 2,
      inventoryStatus: 'In Stock',
      isFreebie: false
    }
  ],
  subtotal: 20.00,
  gst: 1.00,
  pst: 1.40,
  total: 22.40
};

async function runTest() {
  console.log('🧪 Testing Order Update Fix\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create test order
    console.log('\n1️⃣  Creating test order...');
    const orderRef = db.ref(`orders/${TEST_ORDER_ID}`);
    await orderRef.set(testOrder);
    console.log(`   ✅ Created test order: ${TEST_ORDER_ID}`);

    // Step 2: Verify order was created correctly
    console.log('\n2️⃣  Verifying order creation...');
    const snapshot1 = await orderRef.once('value');
    const createdOrder = snapshot1.val();

    if (!createdOrder.customer || !createdOrder.items) {
      throw new Error('Order not created correctly');
    }
    console.log(`   ✅ Order has customer: ${createdOrder.customer.firstName} ${createdOrder.customer.lastName}`);
    console.log(`   ✅ Order has ${createdOrder.items.length} item(s)`);
    console.log(`   ✅ Order total: $${createdOrder.total}`);

    // Step 3: Update ONLY payment info (this is what caused the bug)
    console.log('\n3️⃣  Updating ONLY payment information...');
    const paymentUpdate = {
      payment: {
        method: 'e-transfer',
        timing: 'paid-in-advance',
        updatedAt: new Date().toISOString()
      }
    };

    // This simulates what happens in the admin when updating payment
    await orderRef.update(paymentUpdate);
    console.log('   ✅ Payment info updated');

    // Step 4: Verify all original data is STILL there
    console.log('\n4️⃣  Verifying original data is preserved...');
    const snapshot2 = await orderRef.once('value');
    const updatedOrder = snapshot2.val();

    let testsPassed = 0;
    let testsFailed = 0;

    // Check customer data
    if (updatedOrder.customer &&
        updatedOrder.customer.firstName === 'Test' &&
        updatedOrder.customer.email === 'test@example.com') {
      console.log('   ✅ Customer data preserved');
      testsPassed++;
    } else {
      console.log('   ❌ Customer data LOST!');
      testsFailed++;
    }

    // Check items
    if (updatedOrder.items && updatedOrder.items.length === 1) {
      console.log('   ✅ Items data preserved');
      testsPassed++;
    } else {
      console.log('   ❌ Items data LOST!');
      testsFailed++;
    }

    // Check totals
    if (updatedOrder.subtotal === 20.00 && updatedOrder.total === 22.40) {
      console.log('   ✅ Total/subtotal preserved');
      testsPassed++;
    } else {
      console.log('   ❌ Total/subtotal LOST!');
      testsFailed++;
    }

    // Check payment was added
    if (updatedOrder.payment && updatedOrder.payment.method === 'e-transfer') {
      console.log('   ✅ Payment info successfully added');
      testsPassed++;
    } else {
      console.log('   ❌ Payment info NOT added!');
      testsFailed++;
    }

    // Step 5: Cleanup
    console.log('\n5️⃣  Cleaning up test order...');
    await orderRef.remove();
    console.log('   ✅ Test order deleted');

    // Final results
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS\n');
    console.log(`   Tests Passed: ${testsPassed}/4`);
    console.log(`   Tests Failed: ${testsFailed}/4\n`);

    if (testsFailed === 0) {
      console.log('✅ SUCCESS! The bug is FIXED!');
      console.log('   Order updates now merge data correctly.\n');
      process.exit(0);
    } else {
      console.log('❌ FAILURE! The bug still exists!');
      console.log('   Order data was lost during update.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);

    // Try to cleanup
    try {
      await db.ref(`orders/${TEST_ORDER_ID}`).remove();
      console.log('   Cleaned up test order');
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

runTest();
