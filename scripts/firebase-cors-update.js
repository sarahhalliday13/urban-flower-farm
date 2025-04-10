// Firebase CORS update script
const admin = require('firebase-admin');
const fs = require('fs');

// Path to your Firebase service account key
// You need to generate this from Firebase Console > Project Settings > Service Accounts
// Make sure this file is not committed to version control
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'buttonsflowerfarm-8a54d.firebasestorage.app'
});

const bucket = admin.storage().bucket();

// CORS configuration
const corsConfiguration = [
  {
    origin: [
      "https://buttonsflowerfarm-8a54d.web.app", 
      "https://urban-flower-farm-staging.web.app",
      "https://buttonsflowerfarm-8a54d.firebasestorage.app",
      "http://localhost:3000"
    ],
    method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    responseHeader: [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "X-Requested-With",
      "Authorization",
      "X-Firebase-Storage-Bucket",
      "Content-Length"
    ],
    maxAgeSeconds: 3600
  }
];

// First, save the configuration to a file
fs.writeFileSync('./cors.json', JSON.stringify(corsConfiguration, null, 2));
console.log('CORS configuration saved to cors.json');

console.log('To update Firebase Storage CORS settings, follow these steps:');
console.log('1. Install Google Cloud SDK if not already installed.');
console.log('   Visit: https://cloud.google.com/sdk/docs/install');
console.log('2. Run the following command:');
console.log('   gsutil cors set ./cors.json gs://buttonsflowerfarm-8a54d.firebasestorage.app');
console.log('3. Verify the settings with:');
console.log('   gsutil cors get gs://buttonsflowerfarm-8a54d.firebasestorage.app');
console.log('\nNote: You need to have appropriate permissions on the Firebase project.'); 