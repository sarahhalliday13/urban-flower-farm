#!/usr/bin/env node
// Ultra simple build script - just copies files
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Starting vanilla build process...');

try {
  // 1. Clean up existing build
  const buildDir = path.join(__dirname, 'build');
  if (fs.existsSync(buildDir)) {
    console.log('Cleaning existing build directory...');
    execSync(`rm -rf ${buildDir}`);
  }

  // 2. Create build directory
  fs.mkdirSync(buildDir, { recursive: true });

  // 3. Copy public directory to build
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    console.log('Copying static assets from public...');
    execSync(`cp -R ${publicDir}/* ${buildDir}`, { stdio: 'inherit' });
  }

  // 4. Create a basic index.html if it doesn't exist
  const indexPath = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('Creating basic index.html...');
    
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Urban Flower Farm - Your source for native plants and flowers" />
    <link rel="apple-touch-icon" href="/logo192.png" />
    <link rel="manifest" href="/manifest.json" />
    <title>Urban Flower Farm</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Custom styles -->
    <link href="/styles.css" rel="stylesheet">
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root">
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h1>Urban Flower Farm</h1>
            <p>Site is under maintenance. Please check back soon!</p>
            <p>For inquiries, please contact <a href="mailto:info@urbanflowerfarm.com">info@urbanflowerfarm.com</a></p>
        </div>
    </div>
    <!-- Placeholder for your app -->
    <script>
        // Basic redirect to maintenance mode
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Site is in maintenance mode');
        });
    </script>
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
    
    fs.writeFileSync(indexPath, indexHtml);
  }

  // 5. Create a basic CSS file
  const cssPath = path.join(buildDir, 'styles.css');
  if (!fs.existsSync(cssPath)) {
    console.log('Creating basic styles.css...');
    
    const cssContent = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

#root {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2e7d32;
}

a {
  color: #1976d2;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}`;
    
    fs.writeFileSync(cssPath, cssContent);
  }

  // 6. Create a netlify.toml file if needed
  const netlifyTomlPath = path.join(__dirname, 'netlify.toml');
  if (!fs.existsSync(netlifyTomlPath)) {
    console.log('Creating netlify.toml...');
    
    const netlifyToml = `[build]
  publish = "build"

# SPA routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
    
    fs.writeFileSync(netlifyTomlPath, netlifyToml);
  }

  console.log('✅ Simple build completed successfully!');
  console.log('👉 The site is now in maintenance mode and can be deployed');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
} 