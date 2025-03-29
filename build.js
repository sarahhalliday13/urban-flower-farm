#!/usr/bin/env node
// Simple build script without TypeScript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting build process...');

// Clean any existing build
if (fs.existsSync('build')) {
  console.log('Cleaning up existing build...');
  execSync('rm -rf build');
}

// Build the app
console.log('Building the app...');
execSync('NODE_OPTIONS=--openssl-legacy-provider CI=false PUBLIC_URL=/ npm run build', { stdio: 'inherit' });

// Fix JS paths
console.log('Fixing JS paths...');
execSync('node fix-js-paths.js', { stdio: 'inherit' });

// Preserve static files
console.log('Preserving static files...');
execSync('node preserve-static.js', { stdio: 'inherit' });

console.log('Build process completed successfully!'); 