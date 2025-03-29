// Firebase Fix Script - Place in head before any Firebase scripts

// Disable Content Security Policy for Firebase connections
(function() {
  // Log that we're running
  console.log("Firebase fix script running");
  
  // Add permissive CSP meta tag
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';";
  document.head.appendChild(meta);
  
  // Add Access-Control-Allow-Origin meta tag
  const corsMetaTag = document.createElement('meta');
  corsMetaTag.httpEquiv = 'Access-Control-Allow-Origin';
  corsMetaTag.content = '*';
  document.head.appendChild(corsMetaTag);
  
  // Add debug information
  window.FIREBASE_DEBUG = {
    initialized: false,
    errors: [],
    connectionAttempts: 0,
    lastConnectionTime: null
  };
  
  // Create a mock response for Firebase if it fails to connect
  window.mockFirebaseResponse = function() {
    const xhrFetch = window.fetch;
    window.fetch = function(url, options) {
      // Log all Firebase requests for debugging
      if (typeof url === 'string' && (url.includes('firebaseio.com') || url.includes('firebase'))) {
        console.log('Firebase fetch request:', { url, method: options?.method || 'GET' });
        window.FIREBASE_DEBUG.connectionAttempts++;
        window.FIREBASE_DEBUG.lastConnectionTime = new Date().toISOString();
      }
      
      return xhrFetch(url, options).catch(function(error) {
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
            
            return xhrFetch(proxyUrl, {
              ...options,
              mode: 'cors',
              credentials: 'omit',
              headers: {
                ...options?.headers,
                'Origin': window.location.origin
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
  
  // Patch XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    // Add CORS headers for Firebase
    if (typeof url === 'string' && (url.includes('firebase') || url.includes('firebaseio'))) {
      this.addEventListener('readystatechange', function() {
        if (this.readyState === 4) {
          console.log('XHR response from Firebase:', this.status);
          
          if (this.status >= 400) {
            window.FIREBASE_DEBUG.errors.push({
              time: new Date().toISOString(),
              message: `XHR error: ${this.status}`,
              url: url
            });
          }
        }
      });
    }
    return originalOpen.apply(this, arguments);
  };
  
  // Add a global function to check Firebase connectivity
  window.checkFirebaseConnectivity = function() {
    console.log("Firebase debug information:", window.FIREBASE_DEBUG);
    return window.FIREBASE_DEBUG;
  };
  
  // Monitor for Firebase initialization
  const checkForFirebase = setInterval(function() {
    if (window.firebase) {
      clearInterval(checkForFirebase);
      console.log("Firebase detected, configuring...");
      window.FIREBASE_DEBUG.initialized = true;
      
      // For Firebase 9+
      if (window.firebase?.database) {
        try {
          console.log("Setting up Firebase Realtime Database connectivity check");
          const connectedRef = window.firebase.database().ref(".info/connected");
          connectedRef.on("value", function(snap) {
            if (snap.val() === true) {
              console.log("Connected to Firebase Realtime Database");
            } else {
              console.log("Disconnected from Firebase Realtime Database");
            }
          });
        } catch (e) {
          console.warn("Could not set up Firebase connectivity check:", e);
        }
      }
    }
  }, 100);
  
  // Output debug info
  console.log("Firebase fix script completed setup");
})(); 