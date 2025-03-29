// Super visible Firebase test - Will definitely appear
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    // Create a big red button that can't be missed
    var button = document.createElement('button');
    button.textContent = 'FIREBASE TEST';
    button.style.position = 'fixed';
    button.style.top = '50%';
    button.style.left = '50%';
    button.style.transform = 'translate(-50%, -50%)';
    button.style.zIndex = '99999';
    button.style.backgroundColor = '#ff0000';
    button.style.color = 'white';
    button.style.padding = '20px 40px';
    button.style.fontSize = '24px';
    button.style.fontWeight = 'bold';
    button.style.border = 'none';
    button.style.borderRadius = '10px';
    button.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    button.style.cursor = 'pointer';
    
    // Add the button to the body
    document.body.appendChild(button);
    
    // Create a results div
    var resultsDiv = document.createElement('div');
    resultsDiv.style.display = 'none';
    resultsDiv.style.position = 'fixed';
    resultsDiv.style.top = '10%';
    resultsDiv.style.left = '10%';
    resultsDiv.style.width = '80%';
    resultsDiv.style.height = '80%';
    resultsDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    resultsDiv.style.color = 'white';
    resultsDiv.style.padding = '20px';
    resultsDiv.style.borderRadius = '10px';
    resultsDiv.style.zIndex = '99999';
    resultsDiv.style.overflowY = 'auto';
    
    // Add a close button
    var closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.backgroundColor = 'red';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '30px';
    closeButton.style.height = '30px';
    closeButton.style.cursor = 'pointer';
    resultsDiv.appendChild(closeButton);
    
    // Add a title
    var title = document.createElement('h2');
    title.textContent = 'Firebase Connection Test Results';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    resultsDiv.appendChild(title);
    
    // Add the results div to the body
    document.body.appendChild(resultsDiv);
    
    // Show results when button is clicked
    button.addEventListener('click', function() {
      resultsDiv.style.display = 'block';
      
      // Run Firebase tests
      runFirebaseTests(resultsDiv);
    });
    
    // Hide results when close button is clicked
    closeButton.addEventListener('click', function() {
      resultsDiv.style.display = 'none';
    });
    
    // Function to add a log entry
    function addLogEntry(resultsDiv, message, type) {
      var entry = document.createElement('div');
      entry.textContent = message;
      entry.style.padding = '8px';
      entry.style.margin = '5px 0';
      entry.style.borderLeft = '5px solid ' + (type === 'error' ? 'red' : type === 'warning' ? 'orange' : 'green');
      resultsDiv.appendChild(entry);
    }
    
    // Function to run Firebase tests
    function runFirebaseTests(resultsDiv) {
      addLogEntry(resultsDiv, '🔄 Starting Firebase tests...', 'info');
      
      // Test 1: Direct HTTP access
      fetch('https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.json?shallow=true')
        .then(function(response) {
          addLogEntry(resultsDiv, '✅ Direct HTTP access successful: ' + response.status, 'success');
          return response.json();
        })
        .then(function(data) {
          addLogEntry(resultsDiv, '✅ Got data from Firebase via HTTP', 'success');
        })
        .catch(function(error) {
          addLogEntry(resultsDiv, '❌ Direct HTTP access failed: ' + error.message, 'error');
        });
      
      // Test 2: Load Firebase scripts
      var firebaseScriptLoaded = false;
      var scriptApp = document.createElement('script');
      scriptApp.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js';
      scriptApp.onload = function() {
        addLogEntry(resultsDiv, '✅ Firebase App script loaded', 'success');
        
        var scriptDB = document.createElement('script');
        scriptDB.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js';
        scriptDB.onload = function() {
          addLogEntry(resultsDiv, '✅ Firebase Database script loaded', 'success');
          firebaseScriptLoaded = true;
          
          // Initialize Firebase
          if (!window.firebase.apps.length) {
            try {
              window.firebase.initializeApp({
                apiKey: "AIzaSyC_RP2Pw3rA9Nr9zRNzNx1t252lD3zCGuA",
                databaseURL: "https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com",
                authDomain: "buttonsflowerfarm-8a54d.firebaseapp.com",
                projectId: "buttonsflowerfarm-8a54d",
                storageBucket: "buttonsflowerfarm-8a54d.firebasestorage.app",
                messagingSenderId: "862699200436",
                appId: "1:862699200436:web:64b40c67ec932fb8401ce1"
              });
              addLogEntry(resultsDiv, '✅ Firebase initialized', 'success');
              
              // Test database connection
              var connectedRef = window.firebase.database().ref(".info/connected");
              connectedRef.on("value", function(snap) {
                if (snap.val() === true) {
                  addLogEntry(resultsDiv, '✅ Connected to Firebase Realtime Database', 'success');
                } else {
                  addLogEntry(resultsDiv, '⚠️ Not connected to Firebase Realtime Database', 'warning');
                }
              });
              
              // Test read access
              window.firebase.database().ref('plants').limitToFirst(1).get()
                .then(function(snapshot) {
                  if (snapshot.exists()) {
                    addLogEntry(resultsDiv, '✅ Read from Firebase successful', 'success');
                  } else {
                    addLogEntry(resultsDiv, '✅ Read permissions OK, but no data available', 'success');
                  }
                })
                .catch(function(error) {
                  addLogEntry(resultsDiv, '❌ Read from Firebase failed: ' + error.message, 'error');
                });
                
            } catch (error) {
              addLogEntry(resultsDiv, '❌ Firebase initialization failed: ' + error.message, 'error');
            }
          }
        };
        scriptDB.onerror = function() {
          addLogEntry(resultsDiv, '❌ Failed to load Firebase Database script', 'error');
        };
        document.head.appendChild(scriptDB);
      };
      scriptApp.onerror = function() {
        addLogEntry(resultsDiv, '❌ Failed to load Firebase App script', 'error');
      };
      document.head.appendChild(scriptApp);
      
      // Check WebSocket connection
      try {
        addLogEntry(resultsDiv, '🔄 Testing WebSocket connection...', 'info');
        var ws = new WebSocket('wss://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.ws?v=5');
        
        ws.onopen = function() {
          addLogEntry(resultsDiv, '✅ WebSocket connection successful', 'success');
          ws.close();
        };
        
        ws.onerror = function(error) {
          addLogEntry(resultsDiv, '❌ WebSocket connection failed', 'error');
        };
      } catch (error) {
        addLogEntry(resultsDiv, '❌ WebSocket connection error: ' + error.message, 'error');
      }
      
      // Show suggestion
      setTimeout(function() {
        addLogEntry(resultsDiv, '📋 TEST SUMMARY:', 'info');
        addLogEntry(resultsDiv, 'If direct HTTP works but WebSocket fails, you have a CORS issue.', 'info');
        addLogEntry(resultsDiv, 'Suggestion: Try Firebase REST API instead of WebSocket connections.', 'info');
      }, 3000);
    }
  }, 1000); // Wait 1 second after DOMContentLoaded
}); 