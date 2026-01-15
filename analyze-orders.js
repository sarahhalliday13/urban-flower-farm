const fs = require('fs');

const orders = JSON.parse(fs.readFileSync('orders-dump.json', 'utf8'));
const orderKeys = Object.keys(orders);

console.log('Total orders in Firebase:', orderKeys.length);
console.log('\n=== Checking for malformed orders ===\n');

let malformedCount = 0;

orderKeys.forEach(key => {
  const order = orders[key];
  const issues = [];

  if (!order.id || order.id === 'Unknown') issues.push('Missing/Unknown ID');
  if (!order.date || order.date === 'Unknown') issues.push('Missing/Unknown date');
  if (!order.customer) issues.push('Missing customer');
  else if (!order.customer.name && !order.customer.firstName && !order.customer.email) {
    issues.push('No customer info');
  }
  if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
    issues.push('No items');
  }
  if (!order.total || order.total === 0) issues.push('Zero/missing total');

  if (issues.length > 0) {
    malformedCount++;
    console.log(`${malformedCount}. Firebase Key: ${key}`);
    console.log(`   Order ID: ${order.id || 'MISSING'}`);
    console.log(`   Date: ${order.date || 'MISSING'}`);
    console.log(`   Customer: ${order.customer?.name || order.customer?.firstName || 'MISSING'} (${order.customer?.email || 'MISSING'})`);
    console.log(`   Total: $${order.total || 0}`);
    console.log(`   Items: ${order.items?.length || 0}`);
    console.log(`   Issues: ${issues.join(', ')}`);
    console.log('');
  }
});

console.log(`\nTotal malformed orders: ${malformedCount} out of ${orderKeys.length}`);

// If there are malformed orders, show their Firebase keys for deletion
if (malformedCount > 0) {
  console.log('\n=== Firebase keys of malformed orders (for deletion) ===');
  orderKeys.forEach(key => {
    const order = orders[key];
    const issues = [];

    if (!order.id || order.id === 'Unknown') issues.push('Missing/Unknown ID');
    if (!order.date || order.date === 'Unknown') issues.push('Missing/Unknown date');
    if (!order.customer) issues.push('Missing customer');
    else if (!order.customer.name && !order.customer.firstName && !order.customer.email) {
      issues.push('No customer info');
    }
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      issues.push('No items');
    }
    if (!order.total || order.total === 0) issues.push('Zero/missing total');

    if (issues.length > 0) {
      console.log(`  ${key}`);
    }
  });
}
