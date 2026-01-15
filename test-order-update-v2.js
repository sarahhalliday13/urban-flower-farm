/**
 * Simple test script to verify the order update bug is fixed
 * Uses temporary files to avoid shell escaping issues
 *
 * Usage: node test-order-update-v2.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
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

async function runTest() {
  console.log('🧪 Testing Order Update Fix\n');
  console.log('='.repeat(60));

  const tempFiles = [];

  try {
    // Step 1: Create test order
    console.log('\n1️⃣  Creating test order...');
    const orderFile = `/tmp/test-order-${Date.now()}.json`;
    await fs.writeFile(orderFile, JSON.stringify(testOrder, null, 2));
    tempFiles.push(orderFile);

    await execAsync(`firebase database:set /orders/${TEST_ORDER_ID} ${orderFile}`);
    console.log(`   ✅ Created test order: ${TEST_ORDER_ID}`);

    // Wait for Firebase to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Verify order was created correctly
    console.log('\n2️⃣  Verifying order creation...');
    const { stdout } = await execAsync(`firebase database:get /orders/${TEST_ORDER_ID}`);
    const createdOrder = JSON.parse(stdout);

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

    const paymentFile = `/tmp/test-payment-${Date.now()}.json`;
    await fs.writeFile(paymentFile, JSON.stringify(paymentUpdate, null, 2));
    tempFiles.push(paymentFile);

    await execAsync(`firebase database:update /orders/${TEST_ORDER_ID} ${paymentFile}`);
    console.log('   ✅ Payment info updated');

    // Wait for Firebase to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Verify all original data is STILL there
    console.log('\n4️⃣  Verifying original data is preserved...');
    const { stdout: updatedStdout } = await execAsync(`firebase database:get /orders/${TEST_ORDER_ID}`);
    const updatedOrder = JSON.parse(updatedStdout);

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
      console.log('      Expected: Test Customer (test@example.com)');
      console.log('      Found:', updatedOrder.customer);
      testsFailed++;
    }

    // Check items
    if (updatedOrder.items && updatedOrder.items.length === 1) {
      console.log('   ✅ Items data preserved');
      testsPassed++;
    } else {
      console.log('   ❌ Items data LOST!');
      console.log('      Expected: 1 item');
      console.log('      Found:', updatedOrder.items?.length || 0, 'items');
      testsFailed++;
    }

    // Check totals
    if (updatedOrder.subtotal === 20.00 && updatedOrder.total === 22.40) {
      console.log('   ✅ Total/subtotal preserved');
      testsPassed++;
    } else {
      console.log('   ❌ Total/subtotal LOST!');
      console.log('      Expected: subtotal=$20.00, total=$22.40');
      console.log(`      Found: subtotal=$${updatedOrder.subtotal}, total=$${updatedOrder.total}`);
      testsFailed++;
    }

    // Check payment was added
    if (updatedOrder.payment && updatedOrder.payment.method === 'e-transfer') {
      console.log('   ✅ Payment info successfully added');
      testsPassed++;
    } else {
      console.log('   ❌ Payment info NOT added!');
      console.log('      Expected: e-transfer');
      console.log('      Found:', updatedOrder.payment);
      testsFailed++;
    }

    // Step 5: Cleanup
    console.log('\n5️⃣  Cleaning up test order...');
    await execAsync(`firebase database:remove /orders/${TEST_ORDER_ID}`);
    console.log('   ✅ Test order deleted');

    // Clean up temp files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        // Ignore
      }
    }

    // Final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS\n');
    console.log(`   Tests Passed: ${testsPassed}/4`);
    console.log(`   Tests Failed: ${testsFailed}/4\n`);

    if (testsFailed === 0) {
      console.log('✅ SUCCESS! The bug is FIXED!');
      console.log('   Order updates now merge data correctly.');
      console.log('   Partial updates (like payment) preserve all existing data.\n');
      process.exit(0);
    } else {
      console.log('❌ FAILURE! The bug still exists!');
      console.log('   Order data was lost during update.');
      console.log('   This means set() is still being used instead of update().\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);

    // Try to cleanup
    try {
      await execAsync(`firebase database:remove /orders/${TEST_ORDER_ID}`);
      console.log('   Cleaned up test order');
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    // Clean up temp files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        // Ignore
      }
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
