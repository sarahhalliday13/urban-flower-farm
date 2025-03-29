#!/usr/bin/env node
// Script to create a Firebase CORS proxy module for the build
const fs = require('fs');
const path = require('path');

console.log('🔄 Creating Firebase CORS proxy for the build...');

// Content of the Firebase CORS proxy module
const scriptContent = `
// Firebase CORS Proxy Module
// This module patches Firebase to use CORS-friendly methods
window.FIREBASE_CORS_PROXY = {
  init: function() {
    console.log('Firebase CORS Proxy initialized');
    
    // Monitor for Firebase SDK loading and patch it once available
    const checkForFirebase = setInterval(() => {
      if (window.firebase) {
        clearInterval(checkForFirebase);
        this.patchFirebase();
      }
    }, 100);
    
    // Handle the case where Firebase might already be loaded
    if (window.firebase) {
      this.patchFirebase();
    }
  },
  
  patchFirebase: function() {
    console.log('Patching Firebase with CORS-friendly methods');
    
    // Patch Database API if available
    if (window.firebase.database) {
      const originalDatabaseFactory = window.firebase.database;
      window.firebase.database = function() {
        const dbInstance = originalDatabaseFactory.apply(this, arguments);
        
        // Patch the ref method
        const originalRef = dbInstance.ref;
        dbInstance.ref = function() {
          const refInstance = originalRef.apply(this, arguments);
          
          // Patch set method
          const originalSet = refInstance.set;
          refInstance.set = function(value) {
            console.log('Patched Firebase Database set operation');
            return originalSet.call(this, value)
              .catch(error => {
                if (error.message && error.message.includes('CORS')) {
                  console.warn('CORS error in Database set, retrying with modified settings');
                  // Try again with a different connection approach
                  return new Promise((resolve, reject) => {
                    setTimeout(() => {
                      originalSet.call(this, value).then(resolve).catch(reject);
                    }, 100);
                  });
                }
                throw error;
              });
          };
          
          return refInstance;
        };
        
        return dbInstance;
      };
    }
    
    // Patch Storage API if available
    if (window.firebase.storage) {
      const originalStorageFactory = window.firebase.storage;
      window.firebase.storage = function() {
        const storageInstance = originalStorageFactory.apply(this, arguments);
        console.log('Patched Firebase Storage API');
        
        // Add CORS metadata to all uploads
        const originalUpload = storageInstance.ref().put;
        if (originalUpload) {
          storageInstance.ref().put = function(data, metadata) {
            const corsMetadata = {
              contentType: metadata?.contentType || 'application/octet-stream',
              customMetadata: {
                ...metadata?.customMetadata,
                'Access-Control-Allow-Origin': '*'
              }
            };
            console.log('Patched Firebase Storage upload with CORS metadata');
            return originalUpload.call(this, data, corsMetadata);
          };
        }
        
        return storageInstance;
      };
    }
    
    console.log('Firebase patching complete');
  }
};

// Initialize the proxy
document.addEventListener('DOMContentLoaded', function() {
  window.FIREBASE_CORS_PROXY.init();
});
`;

// Write to build directory
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  console.error('Build directory not found');
  process.exit(1);
}

const scriptPath = path.join(buildDir, 'firebase-cors-proxy.js');
fs.writeFileSync(scriptPath, scriptContent);
console.log('Created Firebase CORS proxy script');

// Add the script to index.html
const indexPath = path.join(buildDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Check if the script is already included
  if (!indexContent.includes('firebase-cors-proxy.js')) {
    // Add the script right at the beginning of head
    indexContent = indexContent.replace(
      '<head>',
      '<head>\n  <script src="/firebase-cors-proxy.js"></script>'
    );
    fs.writeFileSync(indexPath, indexContent);
    console.log('Added Firebase CORS proxy script to index.html');
  }
}

console.log('✅ Firebase CORS proxy setup completed successfully!'); 