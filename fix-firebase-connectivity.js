#!/usr/bin/env node
// Script to fix Firebase connectivity issues in the build
const fs = require('fs');
const path = require('path');

console.log('🔥 Fixing Firebase connectivity in the build...');

// Function to process JS files and add Firebase connectivity fixes
const fixFirebaseConnectivity = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Add crossorigin="anonymous" to all Firebase scripts
  if (content.includes('firebase') && content.includes('<script')) {
    console.log(`Adding crossorigin attribute to Firebase scripts in: ${path.basename(filePath)}`);
    
    content = content.replace(
      /(<script[^>]+src=["'][^"']*firebase[^"']*["'])/g,
      '$1 crossorigin="anonymous"'
    );
    
    fs.writeFileSync(filePath, content);
    modified = true;
  }
  
  return modified;
};

// Create a script to help with Firebase connectivity
const createConnectivityScript = () => {
  const scriptContent = `
// Firebase connectivity helper
(function() {
  // Add a global error handler for Firebase connectivity issues
  window.addEventListener('error', function(e) {
    const errorMsg = e.message || '';
    const errorSrc = e.filename || '';
    
    // Check if it's a Firebase connectivity error
    if (
      (errorMsg.includes('Firebase') || errorSrc.includes('firebase')) &&
      (errorMsg.includes('connect') || errorMsg.includes('network') || errorMsg.includes('CORS'))
    ) {
      console.warn('Firebase connectivity issue detected:', errorMsg);
      
      // Try to reconnect to Firebase
      if (window.firebase) {
        try {
          console.log('Attempting to reconnect to Firebase...');
          
          // Force a re-initialization of key services
          if (window.firebase.auth) {
            window.firebase.auth().signInAnonymously().catch(function(error) {
              console.log('Anonymous auth failed, but this is expected:', error.message);
            });
          }
          
          // Try to ping Firestore if available
          if (window.firebase.firestore) {
            window.firebase.firestore().enablePersistence({synchronizeTabs: true})
              .catch(function(err) {
                console.log('Persistence mode error (expected):', err.code);
              });
          }
          
          // Try to ping Realtime Database if available
          if (window.firebase.database) {
            window.firebase.database().ref('.info/connected').on('value', function(snap) {
              if (snap.val() === true) {
                console.log('Connected to Firebase Realtime Database');
              } else {
                console.log('Disconnected from Firebase Realtime Database');
              }
            });
          }
          
        } catch (reconnectError) {
          console.error('Firebase reconnection error:', reconnectError);
        }
      }
    }
  });
  
  // Patch fetch to retry on CORS errors for Firebase Storage
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    return originalFetch(url, options).catch(error => {
      if (
        (error.message && error.message.includes('CORS')) && 
        (url.includes('firebase') || url.includes('googleapis'))
      ) {
        console.warn('CORS error on Firebase request, retrying with different mode:', url);
        const newOptions = {...options, mode: 'cors', credentials: 'omit'};
        return originalFetch(url, newOptions);
      }
      throw error;
    });
  };
})();
`;

  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    console.error('Build directory not found');
    return false;
  }
  
  const scriptPath = path.join(buildDir, 'firebase-connectivity-helper.js');
  fs.writeFileSync(scriptPath, scriptContent);
  console.log('Created Firebase connectivity helper script');
  
  // Add the script to index.html
  const indexPath = path.join(buildDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check if the script is already included
    if (!indexContent.includes('firebase-connectivity-helper.js')) {
      // Add the script before any other scripts
      indexContent = indexContent.replace(
        '<head>',
        '<head>\n  <script src="/firebase-connectivity-helper.js"></script>'
      );
      fs.writeFileSync(indexPath, indexContent);
      console.log('Added Firebase connectivity helper script to index.html');
      return true;
    }
  }
  
  return false;
};

// Add the script to index.html
createConnectivityScript();

console.log('✅ Firebase connectivity fixes completed successfully!'); 