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
<style>
@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
  70% { transform: translate(-50%, -50%) scale(1.1); box-shadow: 0 0 0 15px rgba(255, 0, 0, 0); }
  100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
}
#firebase-test-button {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999999;
  background-color: red;
  color: white;
  padding: 25px;
  font-size: 30px;
  font-weight: bold;
  border: 5px solid black;
  border-radius: 10px;
  cursor: pointer;
  animation: pulse 2s infinite;
}
</style>
<div id="firebase-test-button" onclick="testFirebase()">TEST FIREBASE</div>
<script>
// Create test function in global scope
function testFirebase() {
  console.log("Running Firebase tests");
  alert('Firebase test starting! Check console for test results.');
  
  // Test direct HTTP access
  fetch('https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.json?shallow=true')
    .then(function(response) {
      console.log('Firebase HTTP response:', response.status);
      return response.json();
    })
    .then(function(data) {
      console.log('Firebase data via HTTP:', data);
      alert('Firebase HTTP test successful! Status: ' + 200);
    })
    .catch(function(error) {
      console.error('Firebase HTTP error:', error);
      alert('Firebase HTTP test failed: ' + error.message);
    });
    
  // Try WebSocket connection
  try {
    var ws = new WebSocket('wss://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.ws?v=5');
    
    ws.onopen = function() {
      console.log('WebSocket connection successful');
      alert('WebSocket connection successful!');
      ws.close();
    };
    
    ws.onerror = function(error) {
      console.error('WebSocket connection failed:', error);
      alert('WebSocket connection failed!');
    };
  } catch (error) {
    console.error('WebSocket creation error:', error);
    alert('WebSocket creation error: ' + error.message);
  }
}
</script>
`;

// Check if the script is already injected
if (indexHtml.includes('firebase-test-button')) {
  console.log('Firebase test button already included in index.html.');
} else {
  // Inject the script tag right before the closing body tag
  indexHtml = indexHtml.replace('</body>', inlineScript + '\n</body>');
  console.log('Injected inline Firebase test button into index.html.');
}

// Write the updated index.html file
fs.writeFileSync(indexPath, indexHtml);
console.log('Firebase test button direct injection completed successfully!'); 