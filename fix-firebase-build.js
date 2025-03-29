#!/usr/bin/env node
// Script to fix Firebase undefined errors during build
const fs = require('fs');
const path = require('path');

console.log('Fixing Firebase build issues...');

// Create dummy firebase.js for build process
const dummyFirebaseContent = `
// Dummy Firebase module for build process
const firebase = {
  app: () => ({
    options: {
      apiKey: 'dummy-key',
      databaseURL: 'dummy-url',
      projectId: 'dummy-project'
    }
  }),
  database: () => ({
    ref: () => ({
      toString: () => 'dummy-ref',
      on: (event, callback) => callback({ val: () => false })
    })
  }),
  initializeApp: () => ({})
};

window.firebase = firebase;
`;

// Create a temporary file in the src directory
const dummyFilePath = path.join(__dirname, 'src', 'firebase-build-fix.js');
fs.writeFileSync(dummyFilePath, dummyFirebaseContent);
console.log(`Created dummy Firebase file at ${dummyFilePath}`);

// Update index.js to import the dummy Firebase file
const indexPath = path.join(__dirname, 'src', 'index.js');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Add the import if it doesn't exist
  if (!indexContent.includes('firebase-build-fix')) {
    // Add it right at the top, before any other imports
    indexContent = `// Import dummy Firebase for build\nimport './firebase-build-fix';\n\n${indexContent}`;
    fs.writeFileSync(indexPath, indexContent);
    console.log('Updated index.js to import dummy Firebase');
  }
}

console.log('Firebase build fixes applied successfully!'); 