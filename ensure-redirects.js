#!/usr/bin/env node
// Script to ensure _redirects file exists in build directory
const fs = require('fs');
const path = require('path');

console.log('Ensuring _redirects file exists in build directory...');

const buildDir = path.join(__dirname, 'build');
const redirectsPath = path.join(buildDir, '_redirects');

// Make sure the build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Write _redirects file with SPA fallback rule
fs.writeFileSync(redirectsPath, '/* /index.html 200\n');
console.log('Successfully created _redirects file in build directory.');

// Verify file was created
if (fs.existsSync(redirectsPath)) {
  const content = fs.readFileSync(redirectsPath, 'utf8');
  console.log(`_redirects file content: "${content.trim()}"`);
  console.log(`_redirects file size: ${fs.statSync(redirectsPath).size} bytes`);
} else {
  console.error('Failed to create _redirects file!');
  process.exit(1);
} 