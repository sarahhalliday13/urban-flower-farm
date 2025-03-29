#!/usr/bin/env node
// Build script with Firebase CORS fixes - using minimal approach
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting build with Firebase CORS fixes...');

try {
  // Ensure firebase-fix-for-app.js exists
  const firebaseFixPath = path.join(__dirname, 'firebase-fix-for-app.js');
  
  if (!fs.existsSync(firebaseFixPath)) {
    console.error('firebase-fix-for-app.js file not found. Please create this file first.');
    process.exit(1);
  }

  // Create inject-firebase-fix.js script if it doesn't exist
  const injectScriptPath = path.join(__dirname, 'inject-firebase-fix.js');
  
  if (!fs.existsSync(injectScriptPath)) {
    console.error('inject-firebase-fix.js file not found. Please create this file first.');
    process.exit(1);
  }

  // Create clean build directory
  const buildDir = path.join(__dirname, 'build');
  if (fs.existsSync(buildDir)) {
    console.log('Cleaning existing build directory...');
    execSync(`rm -rf ${buildDir}`);
  }

  // Run the build command using the same settings as in package.json
  console.log('Running React build...');
  execSync('NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=4096" SKIP_PREFLIGHT_CHECK=true CI=false npm run build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_URL: '/'
    }
  });

  // Inject the firebase fix
  console.log('Injecting Firebase fix...');
  execSync('node inject-firebase-fix.js', { stdio: 'inherit' });

  console.log('✅ Build completed successfully with Firebase CORS fixes!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
} 