/**
 * Script to restore recovered order data to Firebase
 *
 * Usage:
 * 1. Fill in recovered-orders-template.json with actual order data from emails
 * 2. Run: node restore-orders.js
 * 3. Review the changes before confirming
 */

const fs = require('fs');

async function restoreOrders() {
  try {
    // Read the recovered orders
    const data = fs.readFileSync('recovered-orders-template.json', 'utf8');
    const { orders } = JSON.parse(data);

    console.log('=== Order Restoration Script ===\n');
    console.log(`Found ${orders.length} orders to restore\n`);

    // Validate each order has required fields
    let validOrders = 0;
    let invalidOrders = [];

    orders.forEach((order, index) => {
      const issues = [];

      if (!order.customer.firstName || !order.customer.lastName) {
        issues.push('Missing customer name');
      }
      if (!order.customer.email) {
        issues.push('Missing customer email');
      }
      if (!order.items || order.items.length === 0) {
        issues.push('No items');
      }
      if (!order.total || order.total === 0) {
        issues.push('Missing or zero total');
      }

      if (issues.length > 0) {
        invalidOrders.push({
          orderId: order.id,
          issues: issues
        });
      } else {
        validOrders++;
      }
    });

    console.log(`✅ Valid orders: ${validOrders}`);
    console.log(`❌ Invalid orders: ${invalidOrders.length}\n`);

    if (invalidOrders.length > 0) {
      console.log('⚠️  Please fix these orders before restoring:\n');
      invalidOrders.forEach(({ orderId, issues }) => {
        console.log(`  ${orderId}:`);
        issues.forEach(issue => console.log(`    - ${issue}`));
        console.log('');
      });
      console.log('Fill in the missing data in recovered-orders-template.json and run this script again.\n');
      return;
    }

    console.log('=== Orders to be restored ===\n');
    orders.forEach(order => {
      console.log(`${order.id}:`);
      console.log(`  Customer: ${order.customer.firstName} ${order.customer.lastName} (${order.customer.email})`);
      console.log(`  Items: ${order.items.length}`);
      console.log(`  Total: $${order.total.toFixed(2)}`);
      console.log(`  Payment: ${order.payment.method} (${order.payment.timing})`);
      console.log('');
    });

    console.log('\n=== Next Steps ===');
    console.log('1. Review the orders above carefully');
    console.log('2. If everything looks correct, run:');
    console.log('   firebase database:set /orders -y < firebase-restore.json\n');
    console.log('This will create firebase-restore.json with the merge commands.\n');

    // Create Firebase import format
    const firebaseData = {};
    orders.forEach(order => {
      firebaseData[order.id] = order;
    });

    // Save commands for manual review
    console.log('Creating firebase-restore-commands.txt with individual update commands...\n');

    let commands = '# Firebase order restoration commands\n';
    commands += '# Review each command before running\n\n';

    orders.forEach(order => {
      commands += `# Restore ${order.id}\n`;
      commands += `firebase database:set /orders/${order.id} '${JSON.stringify(order, null, 2)}' -y\n\n`;
    });

    fs.writeFileSync('firebase-restore-commands.txt', commands);
    console.log('✅ Created firebase-restore-commands.txt');
    console.log('   Review this file and run the commands one by one\n');

    // Also create a JSON file for bulk import
    fs.writeFileSync('firebase-bulk-restore.json', JSON.stringify(firebaseData, null, 2));
    console.log('✅ Created firebase-bulk-restore.json');
    console.log('   You can bulk import with:');
    console.log('   firebase database:update /orders firebase-bulk-restore.json\n');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'ENOENT') {
      console.error('\n❌ Could not find recovered-orders-template.json');
      console.error('   Make sure you\'re running this script from the project root directory\n');
    }
  }
}

restoreOrders();
