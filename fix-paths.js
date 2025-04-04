#!/usr/bin/env node
// Script to fix relative paths in build/index.html for SPA routing
const fs = require('fs');
const path = require('path');

console.log('Fixing resource paths in build/index.html for SPA routing...');

const buildDir = path.join(__dirname, 'build');
const indexPath = path.join(buildDir, 'index.html');

// Make sure the build directory and index.html exist
if (!fs.existsSync(buildDir)) {
  console.error('Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error('index.html not found in build directory.');
  process.exit(1);
}

// Read the current index.html content
let content = fs.readFileSync(indexPath, 'utf8');

// Replace all relative paths (./) with absolute paths (/)
const originalContent = content;
content = content.replace(/href="\.\//g, 'href="/');
content = content.replace(/src="\.\//g, 'src="/');

// Write the updated content back to index.html
fs.writeFileSync(indexPath, content);

// Check if any changes were made
if (originalContent !== content) {
  console.log('Successfully updated resource paths in index.html.');
} else {
  console.log('No relative paths found in index.html or paths already fixed.');
}

// Ensure _redirects file exists
const redirectsPath = path.join(buildDir, '_redirects');
fs.writeFileSync(redirectsPath, '/* /index.html 200\n');
console.log('Successfully ensured _redirects file exists in build directory.'); 