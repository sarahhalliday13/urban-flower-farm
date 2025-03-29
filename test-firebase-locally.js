#!/usr/bin/env node
// Simple script to test Firebase connection locally
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('Starting local Firebase connection test...');

// Make sure the test file exists
const testFilePath = path.join(__dirname, 'firebase-test.html');
if (!fs.existsSync(testFilePath)) {
  console.error('firebase-test.html file not found. Please create this file first.');
  process.exit(1);
}

// Create a simple HTTP server to serve the test file
const server = http.createServer((req, res) => {
  console.log(`Request for: ${req.url}`);
  
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(testFilePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 3030;
server.listen(PORT, () => {
  console.log(`Firebase test server running at http://localhost:${PORT}`);
  console.log('Opening browser...');
  
  try {
    // Open the browser - platform specific
    if (process.platform === 'darwin') {  // macOS
      execSync(`open http://localhost:${PORT}`);
    } else if (process.platform === 'win32') {  // Windows
      execSync(`start http://localhost:${PORT}`);
    } else {  // Linux and others
      execSync(`xdg-open http://localhost:${PORT}`);
    }
    
    console.log('Test page opened in browser.');
    console.log('Press Ctrl+C to stop the server when finished testing.');
  } catch (error) {
    console.error('Could not open browser:', error.message);
    console.log(`Please open http://localhost:${PORT} manually in your browser.`);
  }
}); 