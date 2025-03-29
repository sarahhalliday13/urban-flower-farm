#!/usr/bin/env node
// Script to ensure Firebase image URLs are properly handled in the build
const fs = require('fs');
const path = require('path');

console.log('🔥 Fixing Firebase image paths in the build...');

// Function to process JS files and fix Firebase URLs
const fixFirebaseUrls = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if the file contains Firebase Storage URLs
  if (content.includes('firebasestorage.googleapis.com')) {
    console.log(`Found Firebase URLs in: ${path.basename(filePath)}`);
    
    // Fix Firebase Storage URLs that might be malformed
    // 1. Ensure proper encoding of file paths within the URL
    content = content.replace(
      /(https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^\/]+\/o\/)(images\/)([^?]+)(\?alt=media)/g,
      (match, prefix, folder, filename, suffix) => {
        const encodedFilename = encodeURIComponent(folder + filename);
        return `${prefix}${encodedFilename}${suffix}`;
      }
    );
    
    // 2. Ensure the URL has a token parameter if it's missing
    content = content.replace(
      /(https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^\/]+\/o\/[^?]+\?alt=media)(?!&token=)$/g,
      '$1&token=655fba6f-d45e-44eb-8e01-eee626300739'
    );
    
    // 3. Fix URLs with double-encoded components
    content = content.replace(
      /(https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^\/]+\/o\/%252F)([^?]+)(\?alt=media)/g,
      (match, prefix, filename, suffix) => {
        // Convert the double-encoded path to a single-encoded one
        const decodedOnce = decodeURIComponent(filename);
        const properlyEncoded = encodeURIComponent(decodedOnce);
        return `${prefix}${properlyEncoded}${suffix}`;
      }
    );
    
    // Write the modified content back to the file
    fs.writeFileSync(filePath, content);
    modified = true;
  }
  
  return modified;
};

// Process all JS files in the build directory
const processJsFiles = (dir) => {
  const items = fs.readdirSync(dir);
  let modifiedCount = 0;
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Recursively process subdirectories
      modifiedCount += processJsFiles(itemPath);
    } else if (item.endsWith('.js')) {
      // Process JS files
      if (fixFirebaseUrls(itemPath)) {
        modifiedCount++;
      }
    }
  }
  
  return modifiedCount;
};

// Process the JS files in the build directory
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  const jsDir = path.join(buildDir, 'static', 'js');
  if (fs.existsSync(jsDir)) {
    const modifiedCount = processJsFiles(jsDir);
    console.log(`Fixed Firebase image URLs in ${modifiedCount} files`);
  } else {
    console.warn('JavaScript directory not found in build folder');
  }
} else {
  console.error('Build directory not found');
}

// Create a fallback placeholder image for any Firebase images that fail to load
const createFallbackScript = () => {
  const scriptContent = `
// Handle Firebase image loading errors with fallbacks
document.addEventListener('DOMContentLoaded', function() {
  // Add global error handler for images
  document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
      const src = e.target.src || '';
      // Check if it's a Firebase Storage URL that failed
      if (src.includes('firebasestorage.googleapis.com')) {
        console.warn('Firebase image failed to load, using placeholder:', src);
        e.target.src = '/images/placeholder.jpg';
        e.target.dataset.originalSrc = src; // Save the original source
      }
    }
  }, true);
  
  // Find all images with Firebase URLs and add load error handlers
  document.querySelectorAll('img[src*="firebasestorage.googleapis.com"]').forEach(img => {
    img.addEventListener('error', function() {
      if (!this.dataset.fallbackAttempted) {
        console.warn('Firebase image load error, using placeholder:', this.src);
        this.dataset.originalSrc = this.src; // Save the original source
        this.src = '/images/placeholder.jpg';
        this.dataset.fallbackAttempted = 'true';
      }
    });
  });
});
`;

  const scriptPath = path.join(buildDir, 'firebase-image-fallback.js');
  fs.writeFileSync(scriptPath, scriptContent);
  console.log('Created Firebase image fallback script');
  
  // Add the script to index.html
  const indexPath = path.join(buildDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check if the script is already included
    if (!indexContent.includes('firebase-image-fallback.js')) {
      // Add the script before the closing body tag
      indexContent = indexContent.replace(
        '</body>',
        '<script src="/firebase-image-fallback.js"></script></body>'
      );
      fs.writeFileSync(indexPath, indexContent);
      console.log('Added Firebase image fallback script to index.html');
    }
  }
};

// Create the fallback script
createFallbackScript();

console.log('✅ Firebase image path fixing completed successfully!'); 