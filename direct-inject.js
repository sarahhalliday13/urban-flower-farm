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

// Define the inline HTML with static test button
const inlineHtml = `
<div style="position: fixed; bottom: 0; left: 0; width: 100%; background-color: red; color: white; padding: 20px; z-index: 99999; font-size: 24px; text-align: center; font-weight: bold;">
  FIREBASE TEST - CLICK THIS TEXT TO TEST CONNECTION
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var testDiv = document.querySelector('div[style*="background-color: red"]');
  if (testDiv) {
    testDiv.addEventListener('click', function() {
      try {
        var url = 'https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.json?shallow=true';
        alert('Testing Firebase connection to: ' + url);
        
        fetch(url)
          .then(function(response) {
            alert('Firebase test succeeded with status: ' + response.status);
          })
          .catch(function(error) {
            alert('Firebase test failed with error: ' + error.message);
          });
      } catch (e) {
        alert('Error running test: ' + e.message);
      }
    });
  }
});
</script>
`;

// Inject the HTML right after the opening body tag
if (indexHtml.includes('FIREBASE TEST')) {
  console.log('Firebase test already included in index.html.');
} else {
  indexHtml = indexHtml.replace('<body>', '<body>' + inlineHtml);
  console.log('Injected Firebase test into index.html.');
}

// Write the updated index.html file
fs.writeFileSync(indexPath, indexHtml);
console.log('Firebase test direct injection completed successfully!'); 