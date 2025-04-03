// Script to add a test order to Firebase for testing
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

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

// Generate a random ID with TEST prefix
const generateTestId = () => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TEST-${randomPart}`;
};

// Create a test order
const createTestOrder = async () => {
  try {
    const testOrderId = generateTestId();
    
    // Test order data
    const testOrder = {
      id: testOrderId,
      date: new Date().toISOString(),
      status: 'Pending',
      emailSent: false,
      total: 69.98,
      customer: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'buttonsflowerfarm@gmail.com',
        phone: '555-123-4567'
      },
      items: [
        {
          id: 'plant1',
          name: 'Test Plant',
          price: 19.99,
          quantity: 2,
          inventory: {
            currentStock: 10
          }
        },
        {
          id: 'plant2',
          name: 'Another Test Plant',
          price: 30.00,
          quantity: 1,
          inventory: {
            currentStock: 15
          }
        }
      ]
    };
    
    // Save to Firebase
    const orderRef = ref(database, `orders/${testOrderId}`);
    await set(orderRef, testOrder);
    
    console.log(`✅ Test order created with ID: ${testOrderId}`);
    console.log('Order data:', JSON.stringify(testOrder, null, 2));
    
    // Tell the user what to do next
    console.log('\nNow you can:');
    console.log('1. Go to your admin/orders page');
    console.log('2. Click the refresh button');
    console.log('3. It should detect this pending order without an email and send a confirmation');
    console.log('4. The order should be updated with emailSent=true');
    
    return testOrderId;
  } catch (error) {
    console.error('Error creating test order:', error);
    throw error;
  }
};

// Run the function
createTestOrder()
  .then(() => {
    console.log('Successfully completed test order creation');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create test order:', error);
    process.exit(1);
  }); 