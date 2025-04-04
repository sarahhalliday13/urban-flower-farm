// Firebase direct testing script - Comprehensive Edition
// Add this to your page to test Firebase connectivity directly

(function() {
  // Immediately add a visible button before any other code
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'SHOW FIREBASE TESTS';
  toggleButton.style.position = 'fixed';
  toggleButton.style.top = '10px';
  toggleButton.style.right = '10px';
  toggleButton.style.zIndex = '10000';
  toggleButton.style.backgroundColor = 'red';
  toggleButton.style.color = 'white';
  toggleButton.style.padding = '10px';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '5px';
  toggleButton.style.fontWeight = 'bold';
  toggleButton.style.cursor = 'pointer';
  
  document.body.appendChild(toggleButton);
  
  // Create a very visible debug container
  const debugContainer = document.createElement('div');
  debugContainer.id = 'firebase-test-container';
  debugContainer.style.position = 'fixed';
  debugContainer.style.top = '50%';
  debugContainer.style.left = '50%';
  debugContainer.style.transform = 'translate(-50%, -50%)';
  debugContainer.style.width = '80%';
  debugContainer.style.maxHeight = '80%';
  debugContainer.style.overflowY = 'auto';
  debugContainer.style.backgroundColor = 'rgba(0,0,0,0.9)';
  debugContainer.style.color = '#fff';
  debugContainer.style.padding = '20px';
  debugContainer.style.borderRadius = '10px';
  debugContainer.style.fontFamily = 'monospace';
  debugContainer.style.fontSize = '14px';
  debugContainer.style.zIndex = '9999';
  debugContainer.style.boxShadow = '0 0 20px 5px rgba(255,0,0,0.5)';
  debugContainer.style.border = '3px solid red';
  debugContainer.style.display = 'none'; // Hidden by default
  
  // Add a header to the debug container
  const header = document.createElement('div');
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '15px';
  header.style.fontSize = '18px';
  header.style.textAlign = 'center';
  header.style.borderBottom = '2px solid red';
  header.style.paddingBottom = '10px';
  header.textContent = 'FIREBASE CONNECTIVITY TEST RESULTS';
  debugContainer.appendChild(header);
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.background = 'red';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '50%';
  closeButton.style.width = '30px';
  closeButton.style.height = '30px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontWeight = 'bold';
  debugContainer.appendChild(closeButton);
  
  document.body.appendChild(debugContainer);
  
  // Toggle visibility when button is clicked
  toggleButton.addEventListener('click', () => {
    debugContainer.style.display = 'block';
  });
  
  // Hide when close button is clicked
  closeButton.addEventListener('click', () => {
    debugContainer.style.display = 'none';
  });
  
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
  
  // Helper function to log messages to both console and container
  function logMessage(type, ...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    // Log to console
    originalConsole[type](...args);
    
    // Log to container
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '5px';
    logEntry.style.borderLeft = type === 'error' ? '5px solid red' : 
                             type === 'warn' ? '5px solid orange' : '5px solid green';
    logEntry.style.paddingLeft = '10px';
    logEntry.style.paddingTop = '5px';
    logEntry.style.paddingBottom = '5px';
    logEntry.textContent = message;
    debugContainer.appendChild(logEntry);
    
    // Show container automatically when errors occur
    if (type === 'error') {
      debugContainer.style.display = 'block';
    }
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
        // Auto-show the results panel if there are errors
        debugContainer.style.display = 'block';
      }
      
      // Blink the button if there were errors
      if (errorCount > 0) {
        let isVisible = true;
        const blinkInterval = setInterval(() => {
          toggleButton.style.visibility = isVisible ? 'visible' : 'hidden';
          isVisible = !isVisible;
        }, 500);
        
        // Stop blinking after 10 seconds
        setTimeout(() => clearInterval(blinkInterval), 10000);
      }
    }, 5000);
  })
  .catch(error => {
    console.error("Test #3: Error loading Firebase scripts:", error);
    errorCount++;
    
    // Still show summary if script loading fails
    setTimeout(() => {
      console.log(`Tests completed: ${successCount} successful, ${errorCount} failed`);
      // Auto-show the results panel if there are errors
      debugContainer.style.display = 'block';
    }, 5000);
  });
  
  console.log("Firebase comprehensive test script initialized. Results will appear shortly...");
})(); 