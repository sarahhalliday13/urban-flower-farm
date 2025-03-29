#!/usr/bin/env node
// Fix for local development routing issues
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing local router issues for development server...');

try {
  // Check if we're running in dev or production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    console.log('Running in production mode, no fixes needed');
    process.exit(0);
  }
  
  // 1. Check for App.js and modify it if needed
  const appJsPath = path.join(__dirname, 'src', 'App.js');
  
  if (fs.existsSync(appJsPath)) {
    console.log('Fixing App.js router configuration...');
    let appContent = fs.readFileSync(appJsPath, 'utf8');
    
    // Check if we need to update the Router
    if (appContent.includes('BrowserRouter as Router')) {
      // Add basename to Router if it doesn't have one
      if (!appContent.includes('<Router basename=')) {
        appContent = appContent.replace(
          '<Router>',
          '<Router basename="/">'
        );
        fs.writeFileSync(appJsPath, appContent);
        console.log('✅ Added basename to Router');
      }
    }
  }
  
  // 2. Create or update an .env.development file for local development
  const envPath = path.join(__dirname, '.env.development');
  let envContent = fs.existsSync(envPath) ? 
    fs.readFileSync(envPath, 'utf8') : '';
    
  // Add PUBLIC_URL if it doesn't exist
  if (!envContent.includes('PUBLIC_URL=')) {
    envContent += '\nPUBLIC_URL=/\n';
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Added PUBLIC_URL to .env.development');
  }
  
  // 3. Create a setupProxy.js file if it doesn't exist
  const proxyPath = path.join(__dirname, 'src', 'setupProxy.js');
  if (!fs.existsSync(proxyPath)) {
    const proxyContent = `
// This file configures development server proxying
module.exports = function(app) {
  // Handle SPA routes
  app.use((req, res, next) => {
    // Skip for API requests and assets
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/static') ||
        req.path.includes('.')) {
      return next();
    }
    
    // For all other routes, serve the index.html
    if (!req.path.startsWith('/index.html')) {
      if (req.method === 'GET') {
        console.log('SPA route:', req.path, '-> /index.html');
        req.url = '/index.html';
      }
    }
    next();
  });
};
`;
    fs.writeFileSync(proxyPath, proxyContent);
    console.log('✅ Created setupProxy.js for SPA routing');
  }
  
  // 4. Fix public/index.html for proper base href
  const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    let indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
    
    // Add or update base href
    if (!indexContent.includes('<base href=')) {
      indexContent = indexContent.replace(
        '<head>',
        '<head>\n    <base href="/">'
      );
      fs.writeFileSync(indexHtmlPath, indexContent);
      console.log('✅ Added base href to index.html');
    }
  }
  
  console.log('✅ Local router fixes applied successfully!');
  console.log('ℹ️ Please restart your development server for changes to take effect');
} catch (error) {
  console.error('❌ Error fixing router:', error);
} 