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

// Remove any _headers files (they cause Netlify deployment issues)
console.log('Removing any _headers files to prevent Netlify deployment issues...');
const headersPath = path.join('build', '_headers');
if (fs.existsSync(headersPath)) {
  fs.unlinkSync(headersPath);
  console.log('Removed problematic _headers file from build directory');
}

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

// Inject Firebase fix script
console.log('Injecting Firebase fix script...');
if (fs.existsSync('inject-firebase-fix.js')) {
  execSync('node inject-firebase-fix.js', { stdio: 'inherit' });
}

// Inject direct Firebase test button
console.log('Injecting direct Firebase test button...');
if (fs.existsSync('direct-inject.js')) {
  execSync('node direct-inject.js', { stdio: 'inherit' });
}

// Copy the standalone test page
console.log('Copying Firebase test page...');
if (fs.existsSync('public/firebase-test.html')) {
  if (!fs.existsSync('build/test')) {
    fs.mkdirSync('build/test');
  }
  fs.copyFileSync('public/firebase-test.html', 'build/test/index.html');
  console.log('Firebase test page copied to build/test/index.html');
}

// Add the test link to the navigation
console.log('Adding test link to navigation...');
const indexPath = path.join('build', 'index.html');
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  
  // Use a more specific pattern for the navigation
  if (indexHtml.includes('<a href="/contact">Contact</a>')) {
    indexHtml = indexHtml.replace(
      '<a href="/contact">Contact</a>', 
      '<a href="/contact">Contact</a> <a href="/test/" style="color:red;font-weight:bold;margin-left:15px;font-size:18px;">FIREBASE TEST</a>'
    );
    fs.writeFileSync(indexPath, indexHtml);
    console.log('Test link added to navigation');
  } else {
    // Try another common pattern
    if (indexHtml.includes('Contact</a>')) {
      indexHtml = indexHtml.replace(
        'Contact</a>', 
        'Contact</a> <a href="/test/" style="color:red;font-weight:bold;margin-left:15px;font-size:18px;">FIREBASE TEST</a>'
      );
      fs.writeFileSync(indexPath, indexHtml);
      console.log('Test link added to navigation (using alternate pattern)');
    } else {
      console.log('Could not find navigation pattern to inject test link');
      
      // Just add it to the body as a direct floating button
      indexHtml = indexHtml.replace(
        '<body>', 
        '<body><div style="position:fixed;top:80px;right:20px;z-index:9999;"><a href="/test/" style="display:block;padding:15px;background-color:red;color:white;font-weight:bold;text-decoration:none;border-radius:5px;">FIREBASE TEST</a></div>'
      );
      fs.writeFileSync(indexPath, indexHtml);
      console.log('Added floating test button instead');
    }
  }
}

// Preserve static files
console.log('Preserving static files...');
if (fs.existsSync('preserve-static.js')) {
  execSync('node preserve-static.js', { stdio: 'inherit' });
}

// Final check for _headers files - run after all scripts
console.log('Final check for any _headers files...');
if (fs.existsSync(path.join('build', '_headers'))) {
  fs.unlinkSync(path.join('build', '_headers'));
  console.log('Removed _headers file created by other scripts');
}

console.log('Build completed successfully!');
