#!/usr/bin/env node
// Script to fix lazy-loaded chunk paths in runtime-main.js
const fs = require('fs');
const path = require('path');

console.log('Fixing lazy-loaded chunk paths in build files...');

// Function to find runtime-main.js file in the build/static/js directory
function findRuntimeFile() {
  const staticJsDir = path.join(__dirname, 'build', 'static', 'js');
  
  if (!fs.existsSync(staticJsDir)) {
    console.error('build/static/js directory not found');
    return null;
  }
  
  const files = fs.readdirSync(staticJsDir);
  const runtimeFile = files.find(file => file.startsWith('runtime-main.') && file.endsWith('.js'));
  
  if (!runtimeFile) {
    console.error('runtime-main.js file not found in build/static/js');
    return null;
  }
  
  return path.join(staticJsDir, runtimeFile);
}

// Find the runtime file
const runtimeFilePath = findRuntimeFile();
if (!runtimeFilePath) {
  process.exit(1);
}

console.log(`Found runtime file: ${runtimeFilePath}`);

// Read the runtime file
let content = fs.readFileSync(runtimeFilePath, 'utf8');

// Apply fixes to ensure all chunk URLs use absolute paths
let modified = false;

// Fix 1: Replace typical webpack 4 chunk loading patterns
if (content.includes('return t+"/"') || content.includes('return t+"/"+')) {
  console.log('Fixing webpack 4 chunk URL construction...');
  
  content = content.replace(/return t\+"\/"/g, 'return "/"');
  content = content.replace(/return t\+"\/"\+/g, 'return "/"+');
  content = content.replace(/return t\+"\/"(\+)?/g, 'return "/"$1');
  
  modified = true;
}

// Fix 2: For specific JSON format in webpack output
if (content.includes('jsonpScriptSrc')) {
  console.log('Fixing jsonpScriptSrc function...');
  
  content = content.replace(/jsonpScriptSrc\s*=\s*function\s*\([^)]*\)\s*\{\s*return\s+([^+]+)\+/g, 
                            'jsonpScriptSrc=function(e){return "/');
  
  modified = true;
}

// Fix 3: General pattern for chunk URL construction
let staticJsPattern = /(return|=)\s*([a-zA-Z][\w\.]*)\s*\+\s*["']\/static\/(js|css)\/["']/g;
if (staticJsPattern.test(content)) {
  console.log('Fixing chunk loading paths with static pattern...');
  
  content = content.replace(staticJsPattern, '$1"/static/$3/');
  modified = true;
}

// Fix 4: Add specific fix for admin routes - this is crucial!
console.log('Implementing specific fix for admin routes...');
content = content.replace(/([a-z])=(["'])([^"']+)(["'])\+["']\/(static\/(?:css|js)\/[^"']+["'])/g, 
                         '$1=$2/$5');
content = content.replace(/[\w\.]+\+["']\/["']/g, '"/');
content = content.replace(/[\w\.]+\+["']\/static\//g, '"/static/');

// Write the updated content back to the file
fs.writeFileSync(runtimeFilePath, content);
console.log('Runtime file updated to use absolute paths for all chunks');

// Now fix the main.js file to ensure it also uses absolute paths for chunks
const mainJsDir = path.join(__dirname, 'build', 'static', 'js');
if (fs.existsSync(mainJsDir)) {
  const files = fs.readdirSync(mainJsDir);
  const mainFile = files.find(file => file.startsWith('main.') && file.endsWith('.chunk.js'));
  
  if (mainFile) {
    const mainFilePath = path.join(mainJsDir, mainFile);
    let mainContent = fs.readFileSync(mainFilePath, 'utf8');
    
    // Look for path construction patterns in the main chunk
    const originalMainContent = mainContent;
    mainContent = mainContent.replace(/([a-z.]+)(\s*\+\s*["'])\/static\//g, '"\/static\/');
    
    if (originalMainContent !== mainContent) {
      fs.writeFileSync(mainFilePath, mainContent);
      console.log(`Updated main.js chunk to use absolute paths`);
    }
  }
}

// Fix index.html to ensure all paths are absolute
const indexPath = path.join(__dirname, 'build', 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Ensure all resource paths use absolute paths
  const originalContent = indexContent;
  indexContent = indexContent.replace(/href="\.?\//g, 'href="/');
  indexContent = indexContent.replace(/src="\.?\//g, 'src="/');
  
  if (originalContent !== indexContent) {
    fs.writeFileSync(indexPath, indexContent);
    console.log('Fixed resource paths in index.html');
  } else {
    console.log('Resource paths in index.html already use absolute paths');
  }
} else {
  console.error('index.html not found in build directory');
}

console.log('All chunk loading paths have been fixed!'); 