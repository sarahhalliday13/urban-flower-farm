// Generate CORS configuration file for Firebase Storage
const fs = require('fs');

// CORS configuration - more permissive version
const corsConfiguration = [
  {
    origin: [
      "https://buttonsflowerfarm-8a54d.web.app", 
      "https://urban-flower-farm-staging.web.app",
      "https://buttonsflowerfarm-8a54d.firebasestorage.googleapis.com",
      "https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net",
      "http://localhost:3000",
      "*" // Allow all origins - use with caution, only for development/testing
    ],
    method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    responseHeader: [
      "Content-Type",
      "Content-Length",
      "Accept-Ranges",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods", 
      "Access-Control-Allow-Headers",
      "Access-Control-Expose-Headers",
      "Access-Control-Max-Age",
      "Cache-Control",
      "Content-Disposition",
      "Content-Encoding",
      "Content-Language",
      "Content-Range",
      "ETag",
      "Expires", 
      "Last-Modified",
      "X-Firebase-Storage-Bucket",
      "X-Requested-With",
      "Authorization"
    ],
    maxAgeSeconds: 3600
  }
];

// Save the configuration to a file
fs.writeFileSync('./cors.json', JSON.stringify(corsConfiguration, null, 2));
console.log('CORS configuration saved to cors.json');

console.log('To update Firebase Storage CORS settings, follow these steps:');
console.log('1. Install Google Cloud SDK if not already installed.');
console.log('   Visit: https://cloud.google.com/sdk/docs/install');
console.log('2. Authenticate with Google Cloud:');
console.log('   gcloud auth login');
console.log('3. Set your project:');
console.log('   gcloud config set project buttonsflowerfarm-8a54d');
console.log('4. Run the following command:');
console.log('   gsutil cors set cors.json gs://buttonsflowerfarm-8a54d.appspot.com');
console.log('5. Verify the settings with:');
console.log('   gsutil cors get gs://buttonsflowerfarm-8a54d.appspot.com');
console.log('\nNote: You need to have appropriate permissions on the Firebase project.');
console.log('\nAlternative: You can also update CORS settings from the Firebase Console:');
console.log('1. Go to https://console.firebase.google.com/project/buttonsflowerfarm-8a54d/storage');
console.log('2. Navigate to the "Rules" tab');
console.log('3. Add the following to your rules:');
console.log('   match /{allPaths=**} {');
console.log('     allow read;');
console.log('     allow write: if request.auth != null;');
console.log('   }'); 