#!/usr/bin/env node
// Production build script - NO TYPESCRIPT
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting production build...');

// Create clean build directory
if (fs.existsSync('build')) {
  console.log('Cleaning existing build directory...');
  execSync('rm -rf build');
}

// Run the build with TypeScript disabled
console.log('Running build...');
execSync('NODE_OPTIONS=--openssl-legacy-provider CI=false PUBLIC_URL=/ SKIP_PREFLIGHT_CHECK=true react-scripts build', { 
  stdio: 'inherit',
  env: {
    ...process.env,
    DISABLE_TYPESCRIPT: 'true',
    SKIP_TYPESCRIPT_CHECK: 'true',
    TSC_COMPILE_ON_ERROR: 'true',
    SKIP_PREFLIGHT_CHECK: 'true'
  }
});

// Fix paths in JavaScript files
console.log('Fixing JavaScript paths...');
if (fs.existsSync('fix-js-paths.js')) {
  execSync('node fix-js-paths.js', { stdio: 'inherit' });
}

// Fix image paths
console.log('Fixing image paths...');
if (fs.existsSync('fix-image-paths.js')) {
  execSync('node fix-image-paths.js', { stdio: 'inherit' });
}

// Fix build images - ensure all required images are included
console.log('Ensuring all images are included in build...');
if (fs.existsSync('fix-build-images.js')) {
  execSync('node fix-build-images.js', { stdio: 'inherit' });
}

// Preserve static files
console.log('Preserving static files...');
if (fs.existsSync('preserve-static.js')) {
  execSync('node preserve-static.js', { stdio: 'inherit' });
}

console.log('Build completed successfully!');
