require('dotenv').config();

const firebase = require('firebase/app');
const database = require('firebase/database');

// Log environment variables (without showing sensitive values)
console.log('Environment variables loaded:', {
  firebaseApiKeyExists: !!process.env.REACT_APP_FIREBASE_API_KEY,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
});

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
const app = firebase.initializeApp(firebaseConfig);
const db = database.getDatabase(app);

// Generate a test order ID
const testOrderId = `TEST-${Date.now().toString().slice(-6)}`;
console.log(`Creating test order with ID: ${testOrderId}`);

// Create test order data
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
      quantity: 2
    },
    {
      id: 'plant2',
      name: 'Another Test Plant',
      price: 30.00,
      quantity: 1
    }
  ]
};

// Save order to Firebase
const orderRef = database.ref(db, `orders/${testOrderId}`);
database.set(orderRef, testOrder)
  .then(() => {
    console.log(`✅ Test order created successfully with ID: ${testOrderId}`);
    console.log('Order details:', JSON.stringify(testOrder, null, 2));
    
    console.log('\nInstructions:');
    console.log('1. Go to your admin interface at /admin');
    console.log('2. Check that your test order appears in the list');
    console.log('3. Click the refresh button to trigger confirmation emails');
    
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  })
  .catch((error) => {
    console.error('Error creating test order:', error);
    process.exit(1);
  }); 