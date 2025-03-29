#!/usr/bin/env node
// Script to fix image paths in the build
const fs = require('fs');
const path = require('path');

console.log('Fixing image paths in build...');

// Ensure the images directory exists in the build folder
const buildImagesDir = path.join(__dirname, 'build', 'images');
if (!fs.existsSync(buildImagesDir)) {
  fs.mkdirSync(buildImagesDir, { recursive: true });
  console.log('Created images directory in build folder');
}

// Copy all images from public/images to build/images
const publicImagesDir = path.join(__dirname, 'public', 'images');
if (fs.existsSync(publicImagesDir)) {
  const imageFiles = fs.readdirSync(publicImagesDir);
  
  for (const file of imageFiles) {
    const sourcePath = path.join(publicImagesDir, file);
    const destPath = path.join(buildImagesDir, file);
    
    // Only copy files (not directories)
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file} to build/images/`);
    }
  }
}

// Copy any source images to build/images as well
const srcImagesDir = path.join(__dirname, 'src', 'images');
if (fs.existsSync(srcImagesDir)) {
  const imageFiles = fs.readdirSync(srcImagesDir);
  
  for (const file of imageFiles) {
    const sourcePath = path.join(srcImagesDir, file);
    const destPath = path.join(buildImagesDir, file);
    
    // Only copy files (not directories)
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file} from src/images to build/images/`);
    }
  }
}

// Find all JS files in build/static/js
const jsDir = path.join(__dirname, 'build', 'static', 'js');
if (fs.existsSync(jsDir)) {
  const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
  
  for (const file of jsFiles) {
    const filePath = path.join(jsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix image paths in JS files
    content = content.replace(/(['"])\/static\/media\/([^'"]+)/g, '$1/images/$2');
    content = content.replace(/(['"])\.\/static\/media\/([^'"]+)/g, '$1./images/$2');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed image paths in ${file}`);
  }
}

// Update index.html
const indexPath = path.join(__dirname, 'build', 'index.html');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Add base URL to ensure all paths are resolved correctly
  if (!content.includes('<base href')) {
    content = content.replace(/<head>/, '<head>\n  <base href="/" />');
    fs.writeFileSync(indexPath, content);
    console.log('Added base URL to index.html');
  }
}

console.log('Image paths fixed successfully!'); 