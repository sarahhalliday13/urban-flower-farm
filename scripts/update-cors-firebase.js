const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// CORS configuration
const corsConfiguration = [
  {
    origin: [
      "https://buttonsflowerfarm-8a54d.web.app", 
      "https://urban-flower-farm-staging.web.app", 
      "http://localhost:3000"
    ],
    method: ["GET", "PUT", "POST", "DELETE", "HEAD"],
    maxAgeSeconds: 3600
  }
];

// Save the CORS configuration to a file
const corsFilePath = path.join(__dirname, 'cors-config.json');
fs.writeFileSync(corsFilePath, JSON.stringify(corsConfiguration, null, 2));
console.log(`CORS configuration saved to ${corsFilePath}`);

console.log('\nInstructions for updating Firebase Storage CORS:');
console.log('1. Make sure you are logged into Firebase CLI: firebase login');
console.log(`2. Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install`);
console.log('3. Initialize gcloud and set your project: gcloud init');
console.log(`4. Run this command to update CORS settings:`);
console.log(`   gsutil cors set ${corsFilePath} gs://buttonsflowerfarm-8a54d.appspot.com`);
console.log('\nAlternatively, you can update CORS settings from the Firebase Console:');
console.log('1. Go to https://console.firebase.google.com/project/buttonsflowerfarm-8a54d/storage');
console.log('2. Click on "Rules" tab');
console.log('3. Add the CORS configuration manually'); 