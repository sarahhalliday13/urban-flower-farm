#!/usr/bin/env node
// Script to directly inject a Firebase test button into the HTML
const fs = require('fs');
const path = require('path');

console.log('Directly injecting Firebase test button into index.html...');

const buildPath = path.join(__dirname, 'build');
const indexPath = path.join(buildPath, 'index.html');

// Make sure the build directory exists
if (!fs.existsSync(buildPath)) {
  console.error('Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Make sure the index.html file exists
if (!fs.existsSync(indexPath)) {
  console.error('index.html file not found in build directory.');
  process.exit(1);
}

// Read the index.html file
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Define the inline script with the test button
const inlineScript = `
<script>
// Create button as soon as possible
(function() {
  // Function to create the test button
  function createTestButton() {
    console.log("Creating Firebase test button");
    
    // Create button element
    var button = document.createElement('button');
    button.id = 'firebase-test-button';
    button.textContent = 'TEST FIREBASE';
    button.style.position = 'fixed';
    button.style.top = '50%';
    button.style.left = '50%';
    button.style.transform = 'translate(-50%, -50%)';
    button.style.zIndex = '999999';
    button.style.backgroundColor = 'red';
    button.style.color = 'white';
    button.style.padding = '20px';
    button.style.fontSize = '24px';
    button.style.fontWeight = 'bold';
    button.style.border = '5px solid black';
    button.style.borderRadius = '10px';
    
    // Add button to body
    document.body.appendChild(button);
    
    // Add click handler
    button.addEventListener('click', function() {
      alert('Firebase test button clicked! Check console for test results.');
      testFirebase();
    });
    
    console.log("Firebase test button created");
  }
  
  // Function to test Firebase connection
  function testFirebase() {
    console.log("Running Firebase tests");
    
    // Test direct HTTP access
    fetch('https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.json?shallow=true')
      .then(function(response) {
        console.log('Firebase HTTP response:', response.status);
        return response.json();
      })
      .then(function(data) {
        console.log('Firebase data via HTTP:', data);
      })
      .catch(function(error) {
        console.error('Firebase HTTP error:', error);
      });
      
    // Try WebSocket connection
    try {
      var ws = new WebSocket('wss://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.ws?v=5');
      
      ws.onopen = function() {
        console.log('WebSocket connection successful');
        ws.close();
      };
      
      ws.onerror = function(error) {
        console.error('WebSocket connection failed:', error);
      };
    } catch (error) {
      console.error('WebSocket creation error:', error);
    }
  }
  
  // Create button when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createTestButton);
  } else {
    createTestButton();
  }
  
  // As a backup, try again after a delay
  setTimeout(function() {
    if (!document.getElementById('firebase-test-button')) {
      console.log("Backup: Creating Firebase test button after timeout");
      createTestButton();
    }
  }, 2000);
})();
</script>
`;

// Check if the script is already injected
if (indexHtml.includes('firebase-test-button')) {
  console.log('Firebase test button script already included in index.html.');
} else {
  // Inject the script tag right before the closing body tag
  indexHtml = indexHtml.replace('</body>', inlineScript + '\n</body>');
  console.log('Injected inline Firebase test button script into index.html.');
}

// Write the updated index.html file
fs.writeFileSync(indexPath, indexHtml);
console.log('Firebase test button direct injection completed successfully!'); 