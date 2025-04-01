#!/usr/bin/env node
// Script to verify admin routes are working
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Verifying admin routes are working...');

try {
  // Create a _redirects file if it doesn't exist
  const redirectsPath = path.join(__dirname, 'build', '_redirects');
  if (!fs.existsSync(redirectsPath)) {
    fs.writeFileSync(redirectsPath, '/* /index.html 200\n');
    console.log('Created _redirects file for SPA routing');
  }
  
  // Start the test server
  console.log('\n🚀 Starting test server on port 5000...');
  console.log('Test these routes in your browser:');
  console.log('  • http://localhost:5000/admin');
  console.log('  • http://localhost:5000/admin/inventory');
  console.log('  • http://localhost:5000/admin/orders');
  console.log('  • http://localhost:5000/admin/utilities');
  console.log('  • http://localhost:5000/admin/updates');
  console.log('\nPress Ctrl+C to stop the server\n');
  
  // Execute serve in the foreground so it can be stopped with Ctrl+C
  execSync('npx serve -s build -l 5000', { stdio: 'inherit' });
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} 