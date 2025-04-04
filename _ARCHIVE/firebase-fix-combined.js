// Firebase Fix Script - Combined approach for maximum compatibility
// Place in head before any Firebase scripts

// This needs to run BEFORE any Firebase scripts or their dependencies
(function() {
  console.log("Firebase fix combined script running");
  
  // Remove any existing meta tags that might interfere
  Array.from(document.head.getElementsByTagName('meta'))
    .filter(meta => meta.httpEquiv === 'Content-Security-Policy')
    .forEach(meta => meta.remove());
  
  // Add extremely permissive CSP that allows everything
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob: filesystem: about: ws: wss:; connect-src * 'self' wss://*.firebaseio.com https://*.firebaseio.com https://*.googleapis.com https://*.firebase.io https://firebasestorage.googleapis.com data:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';";
  document.head.insertBefore(meta, document.head.firstChild);
  
  // Add Access-Control-Allow-Origin meta tag
  const corsMetaTag = document.createElement('meta');
  corsMetaTag.httpEquiv = 'Access-Control-Allow-Origin';
  corsMetaTag.content = '*';
  document.head.insertBefore(corsMetaTag, document.head.firstChild);
  
  // Add X-Firebase-Config header
  const firebaseHeaderTag = document.createElement('meta');
  firebaseHeaderTag.httpEquiv = 'X-Firebase-Config';
  firebaseHeaderTag.content = 'enabled';
  document.head.insertBefore(firebaseHeaderTag, document.head.firstChild);
  
  // Setup global configuration object
  window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyC_RP2Pw3rA9Nr9zRNzNx1t252lD3zCGuA",
    databaseURL: "https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com",
    authDomain: "buttonsflowerfarm-8a54d.firebaseapp.com",
    projectId: "buttonsflowerfarm-8a54d",
    storageBucket: "buttonsflowerfarm-8a54d.firebasestorage.app",
    messagingSenderId: "862699200436",
    appId: "1:862699200436:web:64b40c67ec932fb8401ce1"
  };
  
  // Add debug info object
  window.FIREBASE_DEBUG = {
    initialized: false,
    errors: [],
    connectionAttempts: 0,
    lastConnectionTime: null,
    websocketAttempts: 0
  };
  
  // Override WebSocket to log Firebase connections
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    console.log('WebSocket connection attempted:', url);
    window.FIREBASE_DEBUG.websocketAttempts++;
    
    if (url.includes('firebaseio')) {
      console.log('Firebase WebSocket connection detected');
      window.FIREBASE_DEBUG.lastConnectionTime = new Date().toISOString();
    }
    
    return new OriginalWebSocket(url, protocols);
  };
  
  // Keep original WebSocket prototype and constructor
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
  
  // Create a mock response for Firebase if it fails to connect
  window.mockFirebaseResponse = function() {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      // Log all Firebase requests for debugging
      if (typeof url === 'string' && (url.includes('firebaseio.com') || url.includes('firebase'))) {
        console.log('Firebase fetch request:', { url, method: options?.method || 'GET' });
        window.FIREBASE_DEBUG.connectionAttempts++;
        window.FIREBASE_DEBUG.lastConnectionTime = new Date().toISOString();
        
        // Override headers to avoid CORS issues
        if (options && options.headers) {
          options.headers = {
            ...options.headers,
            'Origin': window.location.origin,
            'Access-Control-Allow-Origin': '*'
          };
        }
      }
      
      return originalFetch(url, options).catch(function(error) {
        // Log all Firebase errors for debugging
        if (typeof url === 'string' && (url.includes('firebaseio.com') || url.includes('firebase'))) {
          console.error('Firebase fetch error:', error.message);
          window.FIREBASE_DEBUG.errors.push({
            time: new Date().toISOString(),
            message: error.message,
            url: url
          });
          
          // Only use CORS proxy for specific error types
          if (error.message.includes('NetworkError') || 
              error.message.includes('Failed to fetch') || 
              error.message.includes('CORS')) {
            
            console.warn('Firebase connection failed, retrying with CORS proxy:', url);
            
            // Use a more reliable CORS proxy
            let proxyUrl = url;
            if (url.startsWith('https://')) {
              // Try the AllOrigins CORS proxy
              proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
            }
            
            return originalFetch(proxyUrl, {
              ...options,
              mode: 'cors',
              credentials: 'omit',
              headers: {
                ...options?.headers,
                'Origin': window.location.origin,
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        }
        throw error;
      });
    };
  };
  
  // Apply the mock
  window.mockFirebaseResponse();
  
  // Add a global function to check Firebase connectivity
  window.checkFirebaseConnectivity = function() {
    console.log("Firebase debug information:", window.FIREBASE_DEBUG);
    return window.FIREBASE_DEBUG;
  };
  
  // Create a direct firebase import workaround
  window.directFirebaseImport = function() {
    return new Promise((resolve, reject) => {
      try {
        // Create script elements for Firebase SDK
        const firebaseApp = document.createElement('script');
        firebaseApp.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js'; 
        firebaseApp.onload = () => {
          console.log('Firebase App SDK loaded');
          
          // Load Firebase Database
          const firebaseDatabase = document.createElement('script');
          firebaseDatabase.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js';
          firebaseDatabase.onload = () => {
            console.log('Firebase Database SDK loaded');
            
            // Load Firebase Storage
            const firebaseStorage = document.createElement('script');
            firebaseStorage.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js';
            firebaseStorage.onload = () => {
              console.log('Firebase Storage SDK loaded');
              resolve(true);
            };
            firebaseStorage.onerror = (e) => {
              console.error('Failed to load Firebase Storage SDK', e);
              reject(e);
            };
            document.head.appendChild(firebaseStorage);
          };
          firebaseDatabase.onerror = (e) => {
            console.error('Failed to load Firebase Database SDK', e);
            reject(e);
          };
          document.head.appendChild(firebaseDatabase);
        };
        firebaseApp.onerror = (e) => {
          console.error('Failed to load Firebase App SDK', e);
          reject(e);
        };
        document.head.appendChild(firebaseApp);
      } catch (e) {
        console.error('Error importing Firebase directly:', e);
        reject(e);
      }
    });
  };
  
  // Get Firebase up and running with direct configuration
  window.initializeFirebaseManually = function() {
    if (window.firebase && !window.FIREBASE_DEBUG.initialized) {
      console.log("Manually initializing Firebase with hardcoded config");
      try {
        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          window.firebase.initializeApp(window.FIREBASE_CONFIG);
          window.FIREBASE_DEBUG.initialized = true;
          console.log("Firebase manually initialized successfully");
          
          // Set up connection monitoring
          if (window.firebase.database) {
            try {
              const connectedRef = window.firebase.database().ref(".info/connected");
              connectedRef.on("value", function(snap) {
                if (snap.val() === true) {
                  console.log("Connected to Firebase Realtime Database");
                } else {
                  console.log("Disconnected from Firebase Realtime Database");
                }
              });
            } catch (e) {
              console.error("Error setting up connection monitoring", e);
            }
          }
        } else {
          console.log("Firebase already initialized");
          window.FIREBASE_DEBUG.initialized = true;
        }
      } catch (e) {
        console.error("Error manually initializing Firebase:", e);
        window.FIREBASE_DEBUG.errors.push({
          time: new Date().toISOString(),
          message: `Manual init error: ${e.message}`
        });
      }
    } else if (!window.firebase) {
      console.log("Firebase SDK not found, trying direct import");
      window.directFirebaseImport().then(() => {
        window.initializeFirebaseManually();
      }).catch(e => {
        console.error("Failed to import Firebase directly", e);
      });
    }
  };
  
  // Try multiple ways to load Firebase
  
  // 1. Immediate attempt if Firebase is already loaded
  if (window.firebase) {
    window.initializeFirebaseManually();
  }
  
  // 2. Wait for the SDK to load naturally
  const checkForFirebase = setInterval(function() {
    if (window.firebase) {
      clearInterval(checkForFirebase);
      console.log("Firebase SDK detected, configuring...");
      window.initializeFirebaseManually();
    }
  }, 100);
  
  // 3. Try a direct import after a short delay
  setTimeout(function() {
    if (!window.firebase) {
      console.log("Attempting direct Firebase import...");
      window.directFirebaseImport().then(() => {
        console.log("Direct import successful");
        window.initializeFirebaseManually();
      }).catch(e => {
        console.error("Direct import failed", e);
      });
    }
  }, 500);
  
  // 4. One final check after everything has loaded
  setTimeout(function() {
    if (!window.FIREBASE_DEBUG.initialized && window.firebase) {
      console.log("Final attempt at Firebase initialization...");
      window.initializeFirebaseManually();
    }
  }, 3000);
  
  // Output debug info
  console.log("Firebase fix combined script completed setup");
})(); 