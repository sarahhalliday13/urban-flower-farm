#!/usr/bin/env node
// Script to ensure images are properly copied to the build folder
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌿 Buttons Farm: Ensuring all images are properly included in the build...');

// Utility function to ensure a directory exists
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
};

// Ensure build/data exists for sample JSON files
const buildDataDir = path.join(__dirname, 'build', 'data');
ensureDirExists(buildDataDir);

// Copy sample-plants.json to build/data
const samplePlantsFile = path.join(__dirname, 'public', 'data', 'sample-plants.json');
if (fs.existsSync(samplePlantsFile)) {
  fs.copyFileSync(samplePlantsFile, path.join(buildDataDir, 'sample-plants.json'));
  console.log('Copied sample-plants.json to build/data/');
} else {
  console.warn('Warning: sample-plants.json not found in public/data');
}

// Copy news.json to build/data if it exists
const newsFile = path.join(__dirname, 'public', 'data', 'news.json');
if (fs.existsSync(newsFile)) {
  fs.copyFileSync(newsFile, path.join(buildDataDir, 'news.json'));
  console.log('Copied news.json to build/data/');
}

// Ensure build/images exists
const buildImagesDir = path.join(__dirname, 'build', 'images');
ensureDirExists(buildImagesDir);

// Copy all images from public/images to build/images
const publicImagesDir = path.join(__dirname, 'public', 'images');
if (fs.existsSync(publicImagesDir)) {
  const imageFiles = fs.readdirSync(publicImagesDir);
  let copied = 0;
  
  for (const file of imageFiles) {
    const sourcePath = path.join(publicImagesDir, file);
    const destPath = path.join(buildImagesDir, file);
    
    // Only copy files (not directories)
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      copied++;
    }
  }
  
  console.log(`Copied ${copied} image files from public/images to build/images/`);
} else {
  console.warn('Warning: public/images directory not found');
}

// Copy any images from src/images to build/images
const srcImagesDir = path.join(__dirname, 'src', 'images');
if (fs.existsSync(srcImagesDir)) {
  const imageFiles = fs.readdirSync(srcImagesDir);
  let copied = 0;
  
  for (const file of imageFiles) {
    const sourcePath = path.join(srcImagesDir, file);
    const destPath = path.join(buildImagesDir, file);
    
    // Only copy files (not directories)
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      copied++;
    }
  }
  
  console.log(`Copied ${copied} image files from src/images to build/images/`);
}

// Create a .htaccess file to ensure proper caching of images
const htaccessPath = path.join(buildImagesDir, '.htaccess');
const htaccessContent = `
# Cache images for 1 week
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpeg "access plus 1 week"
  ExpiresByType image/png "access plus 1 week"
  ExpiresByType image/gif "access plus 1 week"
  ExpiresByType image/svg+xml "access plus 1 week"
</IfModule>

# Allow cross-origin requests
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
</IfModule>
`;

fs.writeFileSync(htaccessPath, htaccessContent);
console.log('Created .htaccess file in build/images/ for proper caching');

// Fix image paths in any JS files that might reference them
const jsDir = path.join(__dirname, 'build', 'static', 'js');
if (fs.existsSync(jsDir)) {
  const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
  
  for (const file of jsFiles) {
    const filePath = path.join(jsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix various image path patterns
    content = content.replace(/(['"])\/static\/media\/([^'"]+)/g, '$1/images/$2');
    content = content.replace(/(['"])\.\/static\/media\/([^'"]+)/g, '$1./images/$2');
    content = content.replace(/(['"])\.\.\/images\/([^'"]+)/g, '$1/images/$2');
    
    // Ensure placeholder.jpg path is correct
    content = content.replace(/(['"])placeholder\.jpg(["'])/g, '$1/images/placeholder.jpg$2');
    
    fs.writeFileSync(filePath, content);
  }
  
  console.log(`Fixed image paths in ${jsFiles.length} JavaScript files`);
}

// Add a base URL to the index.html if needed
const indexPath = path.join(__dirname, 'build', 'index.html');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Add base URL to ensure all paths are resolved correctly
  if (!content.includes('<base href')) {
    content = content.replace(/<head>/, '<head>\n  <base href="/" />');
    fs.writeFileSync(indexPath, content);
    console.log('Added base URL to index.html');
  }
  
  // Fix any direct image references in HTML
  content = content.replace(/(src=["'])\/images\//g, '$1/images/');
  fs.writeFileSync(indexPath, content);
}

console.log('✅ Build images fix completed successfully!'); 