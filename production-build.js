#!/usr/bin/env node
// Production build script - NO TYPESCRIPT
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting production build...');

// Disable TypeScript before we do anything
if (fs.existsSync('completely-disable-ts.js')) {
  console.log('Running TypeScript disabler...');
  execSync('node completely-disable-ts.js', { stdio: 'inherit' });
}

// Create clean build directory
if (fs.existsSync('build')) {
  console.log('Cleaning existing build directory...');
  execSync('rm -rf build');
}

// Fix Firebase build issues
console.log('Fixing Firebase build issues...');
if (fs.existsSync('fix-firebase-build.js')) {
  execSync('node fix-firebase-build.js', { stdio: 'inherit' });
}

// Run the build with TypeScript disabled and extra flags
console.log('Running production build...');
execSync('CI=false PUBLIC_URL=/ SKIP_TYPESCRIPT_CHECK=true TSC_COMPILE_ON_ERROR=true react-scripts build', { 
  stdio: 'inherit',
  env: {
    ...process.env,
    DISABLE_TYPESCRIPT: 'true',
    SKIP_TYPESCRIPT_CHECK: 'true',
    TSC_COMPILE_ON_ERROR: 'true',
    SKIP_PREFLIGHT_CHECK: 'true',
    DISABLE_NEW_JSX_TRANSFORM: 'true', // Disable new JSX transform to avoid TS dependencies
    NODE_OPTIONS: '--openssl-legacy-provider --max-old-space-size=4096'
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

// Fix Firebase image paths
console.log('Fixing Firebase image paths...');
if (fs.existsSync('fix-firebase-image-paths.js')) {
  execSync('node fix-firebase-image-paths.js', { stdio: 'inherit' });
}

// Fix Firebase connectivity
console.log('Fixing Firebase connectivity...');
if (fs.existsSync('fix-firebase-connectivity.js')) {
  execSync('node fix-firebase-connectivity.js', { stdio: 'inherit' });
}

// Create Firebase CORS proxy
console.log('Creating Firebase CORS proxy...');
if (fs.existsSync('firebase-cors-proxy.js')) {
  execSync('node firebase-cors-proxy.js', { stdio: 'inherit' });
}

// Inject Firebase fix script
console.log('Injecting Firebase fix script...');
if (fs.existsSync('inject-firebase-fix.js')) {
  execSync('node inject-firebase-fix.js', { stdio: 'inherit' });
}

// Preserve static files
console.log('Preserving static files...');
if (fs.existsSync('preserve-static.js')) {
  execSync('node preserve-static.js', { stdio: 'inherit' });
}

console.log('Build completed successfully!');
