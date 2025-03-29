// Firebase direct testing script - Comprehensive Edition
// Add this to your page to test Firebase connectivity directly

(function() {
  console.log("Firebase comprehensive test script running");
  
  // Force Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyC_RP2Pw3rA9Nr9zRNzNx1t252lD3zCGuA",
    databaseURL: "https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com",
    authDomain: "buttonsflowerfarm-8a54d.firebaseapp.com",
    projectId: "buttonsflowerfarm-8a54d",
    storageBucket: "buttonsflowerfarm-8a54d.firebasestorage.app",
    messagingSenderId: "862699200436",
    appId: "1:862699200436:web:64b40c67ec932fb8401ce1"
  };
  
  // Capture original console methods for debugging
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn
  };
  
  // Create a log container that will be visible on the page
  const debugContainer = document.createElement('div');
  debugContainer.style.position = 'fixed';
  debugContainer.style.bottom = '10px';
  debugContainer.style.right = '10px';
  debugContainer.style.width = '400px';
  debugContainer.style.maxHeight = '300px';
  debugContainer.style.overflowY = 'auto';
  debugContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
  debugContainer.style.color = '#fff';
  debugContainer.style.padding = '10px';
  debugContainer.style.borderRadius = '5px';
  debugContainer.style.fontFamily = 'monospace';
  debugContainer.style.fontSize = '12px';
  debugContainer.style.zIndex = '9999';
  
  // Add a header to the debug container
  const header = document.createElement('div');
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '5px';
  header.textContent = 'Firebase Connectivity Tests';
  debugContainer.appendChild(header);
  
  // Only add the container after the DOM is fully loaded
  window.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(debugContainer);
  });
  
  // Helper function to log messages to both console and container
  function logMessage(type, ...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    // Log to console
    originalConsole[type](...args);
    
    // Log to container
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '3px';
    logEntry.style.borderLeft = type === 'error' ? '3px solid red' : 
                              type === 'warn' ? '3px solid orange' : '3px solid green';
    logEntry.style.paddingLeft = '5px';
    logEntry.textContent = message;
    debugContainer.appendChild(logEntry);
  }
  
  // Override console methods to capture logs
  console.log = (...args) => logMessage('log', ...args);
  console.error = (...args) => logMessage('error', ...args);
  console.warn = (...args) => logMessage('warn', ...args);
  
  // Initialize counters
  let successCount = 0;
  let errorCount = 0;
  
  // Test #1: Direct HTTP access to Firebase
  console.log("Test #1: Testing direct HTTP access to Firebase");
  fetch("https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.json?shallow=true")
    .then(response => {
      console.log("Test #1: Firebase HTTP response status:", response.status);
      return response.json();
    })
    .then(data => {
      console.log("Test #1: Firebase data via direct HTTP:", data);
      successCount++;
    })
    .catch(error => {
      console.error("Test #1: Firebase direct HTTP error:", error);
      errorCount++;
    });
  
  // Test #2: WebSocket test with XHR fallback
  console.log("Test #2: Testing WebSocket connection");
  
  // Try to create a WebSocket connection directly
  try {
    const ws = new WebSocket('wss://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.ws?v=5');
    
    ws.onopen = () => {
      console.log("Test #2: WebSocket connection successful!");
      successCount++;
      ws.close();
    };
    
    ws.onerror = (error) => {
      console.error("Test #2: WebSocket connection failed:", error);
      
      // Fallback to long polling
      console.log("Test #2: Falling back to long polling");
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.json?shallow=true');
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          console.log("Test #2: Long polling successful:", xhr.responseText.substring(0, 100) + "...");
          successCount++;
        } else {
          console.error("Test #2: Long polling failed:", xhr.statusText);
          errorCount++;
        }
      };
      
      xhr.onerror = function() {
        console.error("Test #2: Long polling error");
        errorCount++;
      };
      
      xhr.send();
    };
  } catch (e) {
    console.error("Test #2: WebSocket creation error:", e);
    errorCount++;
  }
  
  // Helper function to load scripts
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // Test #3: Loading Firebase scripts
  console.log("Test #3: Loading Firebase scripts");
  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js'),
    loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js')
  ])
  .then(() => {
    console.log("Test #3: Firebase scripts loaded successfully");
    successCount++;
    
    // Test #4: Initialize Firebase directly
    console.log("Test #4: Initializing Firebase");
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
      console.log("Test #4: Firebase initialized successfully");
      successCount++;
      
      // Test #5: Database read with time-based rules
      console.log("Test #5: Testing database read with time-based rules");
      const dbRef = window.firebase.database().ref();
      dbRef.child('plants').limitToFirst(1).get()
        .then((snapshot) => {
          if (snapshot.exists()) {
            console.log("Test #5: Firebase database read successful:", snapshot.val());
            successCount++;
          } else {
            console.log("Test #5: No data available but read permissions work");
            successCount++;
          }
        })
        .catch((error) => {
          console.error("Test #5: Firebase database read error:", error);
          errorCount++;
        });
        
      // Test #6: Database connection test
      console.log("Test #6: Testing database connection status");
      const connectedRef = window.firebase.database().ref(".info/connected");
      connectedRef.on("value", (snap) => {
        if (snap.val() === true) {
          console.log("Test #6: Connected to Firebase!");
          successCount++;
        } else {
          console.warn("Test #6: Not connected to Firebase");
          // This isn't necessarily an error - might just be disconnected temporarily
        }
      });
    } else {
      console.log("Test #4: Firebase already initialized");
      successCount++;
    }
    
    // Summary will be displayed after tests complete
    setTimeout(() => {
      console.log(`Tests completed: ${successCount} successful, ${errorCount} failed`);
      
      if (errorCount === 0 && successCount > 3) {
        console.log("All Firebase connectivity tests passed!");
      } else {
        console.warn("Some Firebase connectivity tests failed.");
      }
    }, 5000);
  })
  .catch(error => {
    console.error("Test #3: Error loading Firebase scripts:", error);
    errorCount++;
    
    // Still show summary if script loading fails
    setTimeout(() => {
      console.log(`Tests completed: ${successCount} successful, ${errorCount} failed`);
    }, 5000);
  });
  
  console.log("Firebase comprehensive test script initialized. Results will appear shortly...");
})(); 