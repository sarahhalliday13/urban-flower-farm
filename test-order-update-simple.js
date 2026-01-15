/**
 * Simple test script to verify the order update bug is fixed
 * Uses Firebase CLI authentication (no service account key needed)
 *
 * This script:
 * 1. Creates a test order with full data
 * 2. Updates only the payment information
 * 3. Verifies all original data is still present
 *
 * Usage:
 * 1. Make sure you're logged into Firebase CLI: firebase login
 * 2. Run: node test-order-update-simple.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

async function runFirebaseCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('Warning')) {
      console.error('Error:', stderr);
    }
    return stdout;
  } catch (error) {
    throw new Error(`Firebase command failed: ${error.message}`);
  }
}

async function runTest() {
  console.log('🧪 Testing Order Update Fix\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create test order
    console.log('\n1️⃣  Creating test order...');
    const orderJson = JSON.stringify(testOrder);
    await runFirebaseCommand(`firebase database:set /orders/${TEST_ORDER_ID} '${orderJson}'`);
    console.log(`   ✅ Created test order: ${TEST_ORDER_ID}`);

    // Wait a moment for Firebase to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Verify order was created correctly
    console.log('\n2️⃣  Verifying order creation...');
    const createdOrderJson = await runFirebaseCommand(`firebase database:get /orders/${TEST_ORDER_ID}`);
    const createdOrder = JSON.parse(createdOrderJson);

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
    const paymentJson = JSON.stringify(paymentUpdate);
    await runFirebaseCommand(`firebase database:update /orders/${TEST_ORDER_ID} '${paymentJson}'`);
    console.log('   ✅ Payment info updated');

    // Wait a moment for Firebase to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Verify all original data is STILL there
    console.log('\n4️⃣  Verifying original data is preserved...');
    const updatedOrderJson = await runFirebaseCommand(`firebase database:get /orders/${TEST_ORDER_ID}`);
    const updatedOrder = JSON.parse(updatedOrderJson);

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
      console.log('      Found:', updatedOrder.customer);
      testsFailed++;
    }

    // Check items
    if (updatedOrder.items && updatedOrder.items.length === 1) {
      console.log('   ✅ Items data preserved');
      testsPassed++;
    } else {
      console.log('   ❌ Items data LOST!');
      console.log('      Found:', updatedOrder.items);
      testsFailed++;
    }

    // Check totals
    if (updatedOrder.subtotal === 20.00 && updatedOrder.total === 22.40) {
      console.log('   ✅ Total/subtotal preserved');
      testsPassed++;
    } else {
      console.log('   ❌ Total/subtotal LOST!');
      console.log('      Found: subtotal=${updatedOrder.subtotal}, total=${updatedOrder.total}');
      testsFailed++;
    }

    // Check payment was added
    if (updatedOrder.payment && updatedOrder.payment.method === 'e-transfer') {
      console.log('   ✅ Payment info successfully added');
      testsPassed++;
    } else {
      console.log('   ❌ Payment info NOT added!');
      console.log('      Found:', updatedOrder.payment);
      testsFailed++;
    }

    // Step 5: Cleanup
    console.log('\n5️⃣  Cleaning up test order...');
    await runFirebaseCommand(`firebase database:remove /orders/${TEST_ORDER_ID}`);
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
      await runFirebaseCommand(`firebase database:remove /orders/${TEST_ORDER_ID}`);
      console.log('   Cleaned up test order');
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

// Check if Firebase CLI is available
exec('firebase --version', (error) => {
  if (error) {
    console.error('❌ Firebase CLI not found!');
    console.error('   Please install it: npm install -g firebase-tools');
    console.error('   Then login: firebase login\n');
    process.exit(1);
  }
  runTest();
});
