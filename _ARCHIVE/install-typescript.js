#!/usr/bin/env node
// This script installs TypeScript to satisfy the build process
const { execSync } = require('child_process');

console.log('Installing TypeScript to satisfy the build process...');
execSync('npm install --no-save typescript', { stdio: 'inherit' });
console.log('TypeScript installed successfully! Now we can build.'); 