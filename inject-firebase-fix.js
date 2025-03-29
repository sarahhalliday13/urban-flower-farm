#!/usr/bin/env node
// Script to inject the firebase fix and test scripts into the index.html file
const fs = require('fs');
const path = require('path');

console.log('Injecting Firebase scripts into index.html...');

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

// Copy the firebase fix script to the build directory
const firebaseFixPath = path.join(__dirname, 'firebase-fix-simple.js');
const firebaseFixDestPath = path.join(buildPath, 'firebase-fix.js');

if (!fs.existsSync(firebaseFixPath)) {
  console.error('firebase-fix-simple.js file not found in root directory.');
  process.exit(1);
}

fs.copyFileSync(firebaseFixPath, firebaseFixDestPath);
console.log('Copied simple Firebase fix script to build directory.');

// Copy the super visible firebase test to the build directory
const visibleTestPath = path.join(__dirname, 'super-visible-test.js');
const visibleTestDestPath = path.join(buildPath, 'super-visible-test.js');

if (!fs.existsSync(visibleTestPath)) {
  console.error('super-visible-test.js file not found in root directory.');
  process.exit(1);
}

fs.copyFileSync(visibleTestPath, visibleTestDestPath);
console.log('Copied super visible test script to build directory.');

// Read the index.html file
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Check if the fix script is already injected
if (indexHtml.includes('firebase-fix.js')) {
  console.log('firebase-fix.js is already included in index.html.');
} else {
  // Inject the fix script tag at the beginning of the head section
  indexHtml = indexHtml.replace('<head>', '<head>\n  <script src="/firebase-fix.js" defer="false" async="false"></script>');
  console.log('Injected simple Firebase fix into index.html.');
}

// Check if the test script is already injected
if (indexHtml.includes('super-visible-test.js')) {
  console.log('super-visible-test.js is already included in index.html.');
} else {
  // Inject the test script tag at the end of the body section
  indexHtml = indexHtml.replace('</body>', '  <script src="/super-visible-test.js"></script>\n</body>');
  console.log('Injected super visible test script into index.html.');
}

// Write the updated index.html file
fs.writeFileSync(indexPath, indexHtml);
console.log('Firebase scripts injection completed successfully!'); 