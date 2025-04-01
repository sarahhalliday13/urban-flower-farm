#!/usr/bin/env node
/**
 * Direct fix for the webpack chunk loading path issue with admin routes
 * This script ensures all chunks are loaded from absolute paths
 */
const fs = require('fs');
const path = require('path');

console.log('Applying direct fix for webpack chunk loading paths...');

// Find the runtime JS file in build
const runtimeFilePath = fs.readdirSync(path.join(__dirname, 'build/static/js'))
  .filter(file => file.startsWith('runtime-main') && file.endsWith('.js'))
  .map(file => path.join(__dirname, 'build/static/js', file))[0];

if (!runtimeFilePath) {
  console.error('Could not find webpack runtime file');
  process.exit(1);
}

console.log(`Found runtime file: ${runtimeFilePath}`);

// Read the file
let content = fs.readFileSync(runtimeFilePath, 'utf8');

// Find the critical part where c.p is used for URLs
if (content.includes('c.p+n') || content.includes('c.p+"static')) {
  console.log('Found chunk loading pattern in runtime file');
  
  // Replace c.p with "/" for all chunk loading URLs
  content = content.replace(/c\.p\s*\+\s*["']static\//g, '"/static/');
  
  // Some more specific fixes based on the observed issues
  content = content.replace(/c\.p\s*\+\s*n/g, '"/"+n');
  content = content.replace(/return\s+c\.p\s*\+\s*["']static\/js\/["']/g, 'return "/static/js/"');
  content = content.replace(/return\s+c\.p\s*\+\s*["']static\/css\/["']/g, 'return "/static/css/"');
  
  // Special fix for the chunk loader function
  content = content.replace(/i\.src\s*=\s*function\s*\([^)]*\)\s*\{\s*return\s*c\.p\s*\+\s*["']static\/js\/["']/g, 
                           'i.src=function(e){return "/static/js/"');
  
  // Also, any dynamic chunk paths in the runtime file should be absolute
  content = content.replace(/c\.p\s*\+\s*["']static\/js\/(.*?)["']/g, '"/static/js/$1"');
  content = content.replace(/c\.p\s*\+\s*["']static\/css\/(.*?)["']/g, '"/static/css/$1"');
  
  // Finally, force c.p to be root
  content = content.replace(/c\.p\s*=\s*["'][^"']*["']/g, 'c.p="/"');
  
  fs.writeFileSync(runtimeFilePath, content);
  console.log('Successfully patched chunk loading paths in runtime file');
} else {
  console.log('Could not find expected webpack chunk loading patterns');
  console.log('Checking for alternative patterns...');
  
  // Alternative pattern search and replace
  if (content.includes('function(e){return') && content.includes('static/js/')) {
    const srcPattern = /i\.src\s*=\s*([^;]+)/g;
    let match;
    let found = false;
    
    while ((match = srcPattern.exec(content)) !== null) {
      if (match[1].includes('static/js/')) {
        console.log('Found alternative script src pattern');
        
        // Get the whole chunk loading function and force absolute paths
        const functionEndIndex = content.indexOf('}(e);', match.index) + 4;
        const chunkFunction = content.substring(match.index, functionEndIndex);
        
        // Force absolute path in the chunk loading function
        const fixedFunction = chunkFunction
          .replace(/return\s+[a-z]\.p\s*\+\s*["']static\/js\//g, 'return "/static/js/')
          .replace(/\+\s*["']static\/js\//g, '+"/static/js/');
        
        // Replace the function in the content
        content = content.substring(0, match.index) + 
                 fixedFunction + 
                 content.substring(functionEndIndex);
        
        found = true;
        break;
      }
    }
    
    if (found) {
      fs.writeFileSync(runtimeFilePath, content);
      console.log('Applied alternative patch for chunk loading paths');
    } else {
      console.log('Could not find suitable chunk loading pattern to patch');
    }
  }
}

// Also check for any PublicPath settings and force them to be root
console.log('Looking for any other main chunk file to fix...');

// Fix main chunk file if it exists 
const mainChunkFile = fs.readdirSync(path.join(__dirname, 'build/static/js'))
  .filter(file => file.startsWith('main.') && file.endsWith('.chunk.js'))
  .map(file => path.join(__dirname, 'build/static/js', file))[0];

if (mainChunkFile) {
  console.log(`Found main chunk file: ${mainChunkFile}`);
  let mainContent = fs.readFileSync(mainChunkFile, 'utf8');
  
  // Check for PublicPath setting in main chunk
  const originalMainContent = mainContent;
  if (mainContent.includes('publicPath') || mainContent.includes('.p=')) {
    mainContent = mainContent.replace(/\.p\s*=\s*["'][^"']*["']/g, '.p="/"');
    mainContent = mainContent.replace(/publicPath\s*:\s*["'][^"']*["']/g, 'publicPath:"/"');
    
    if (originalMainContent !== mainContent) {
      fs.writeFileSync(mainChunkFile, mainContent);
      console.log('Fixed publicPath in main chunk file');
    }
  }
}

console.log('Chunk loading path fix completed!');

// Create/verify _redirects file for SPA routing
const redirectsPath = path.join(__dirname, 'build', '_redirects');
fs.writeFileSync(redirectsPath, '/* /index.html 200\n');
console.log('Verified _redirects file for SPA routing'); 