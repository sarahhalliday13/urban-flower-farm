#!/usr/bin/env node
// Script to inject the firebase-fix.js script into the index.html file of the production build
const fs = require('fs');
const path = require('path');

console.log('Injecting firebase-fix.js into index.html...');

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

// Copy the firebase-fix.js file to the build directory
const firebaseFixPath = path.join(__dirname, 'public', 'firebase-fix.js');
const firebaseFixDestPath = path.join(buildPath, 'firebase-fix.js');

if (!fs.existsSync(firebaseFixPath)) {
  console.error('firebase-fix.js file not found in public directory.');
  process.exit(1);
}

fs.copyFileSync(firebaseFixPath, firebaseFixDestPath);
console.log('Copied firebase-fix.js to build directory.');

// Read the index.html file
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Check if the script is already injected
if (indexHtml.includes('firebase-fix.js')) {
  console.log('firebase-fix.js is already included in index.html.');
} else {
  // Inject the script tag at the beginning of the head section
  indexHtml = indexHtml.replace('<head>', '<head>\n  <script src="/firebase-fix.js"></script>');
  
  // Write the updated index.html file
  fs.writeFileSync(indexPath, indexHtml);
  console.log('Injected firebase-fix.js into index.html.');
}

console.log('Firebase fix script injection completed successfully!'); 