// Script to check for malformed orders in Firebase
const admin = require('firebase-admin');
const serviceAccount = require('./buttonsflowerfarm-8a54d-firebase-adminsdk-ryyv0-2e5a2ccf6a.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function checkOrders() {
  try {
    console.log('Fetching all orders from Firebase...\n');
    const ordersRef = db.ref('orders');
    const snapshot = await ordersRef.once('value');

    if (!snapshot.exists()) {
      console.log('No orders found in database');
      return;
    }

    const ordersData = snapshot.val();
    const orderKeys = Object.keys(ordersData);

    console.log(`Total orders in database: ${orderKeys.length}\n`);
    console.log('Checking for malformed orders...\n');

    let malformedCount = 0;
    const malformedOrders = [];

    orderKeys.forEach(key => {
      const order = ordersData[key];
      const issues = [];

      // Check for missing critical fields
      if (!order.id || order.id === 'Unknown') {
        issues.push('Missing or Unknown ID');
      }

      if (!order.date) {
        issues.push('Missing date');
      }

      if (!order.customer) {
        issues.push('Missing customer object');
      } else {
        if (!order.customer.name && !order.customer.firstName && !order.customer.email) {
          issues.push('Missing customer info (no name or email)');
        }
      }

      if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        issues.push('Missing or empty items array');
      }

      if (order.total === 0 || order.total === undefined) {
        issues.push('Zero or missing total');
      }

      if (issues.length > 0) {
        malformedCount++;
        malformedOrders.push({
          firebaseKey: key,
          orderId: order.id || 'MISSING',
          date: order.date || 'MISSING',
          customerName: order.customer?.name || order.customer?.firstName || 'MISSING',
          customerEmail: order.customer?.email || 'MISSING',
          total: order.total || 0,
          itemCount: order.items?.length || 0,
          issues: issues
        });
      }
    });

    if (malformedCount > 0) {
      console.log(`\n⚠️  Found ${malformedCount} malformed orders:\n`);
      malformedOrders.forEach((order, index) => {
        console.log(`${index + 1}. Firebase Key: ${order.firebaseKey}`);
        console.log(`   Order ID: ${order.orderId}`);
        console.log(`   Date: ${order.date}`);
        console.log(`   Customer: ${order.customerName} (${order.customerEmail})`);
        console.log(`   Total: $${order.total}`);
        console.log(`   Items: ${order.itemCount}`);
        console.log(`   Issues: ${order.issues.join(', ')}`);
        console.log('');
      });

      console.log('\n📋 Summary of malformed orders:');
      malformedOrders.forEach(order => {
        console.log(`   ${order.firebaseKey} - ${order.issues.join(', ')}`);
      });
    } else {
      console.log('✅ No malformed orders found!');
    }

    console.log(`\n✅ Total orders checked: ${orderKeys.length}`);
    console.log(`⚠️  Malformed orders: ${malformedCount}`);

  } catch (error) {
    console.error('Error checking orders:', error);
  } finally {
    process.exit(0);
  }
}

checkOrders();
