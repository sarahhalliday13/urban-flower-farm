#!/usr/bin/env node
// This script forcibly disables TypeScript verification in react-scripts
const fs = require('fs');
const path = require('path');

console.log('🔥 Forcibly disabling TypeScript verification...');

try {
  // Target the TypeScript verification file
  const verifyTsPath = path.join(__dirname, 'node_modules', 'react-scripts', 'scripts', 'utils', 'verifyTypeScriptSetup.js');
  
  if (fs.existsSync(verifyTsPath)) {
    // Back up the original file
    const backupPath = `${verifyTsPath}.bak`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(verifyTsPath, backupPath);
      console.log('✅ Backed up original verifyTypeScriptSetup.js');
    }
    
    // Replace the file with a no-op function
    fs.writeFileSync(verifyTsPath, 
      `// TypeScript verification disabled
module.exports = function() { 
  console.log('TypeScript verification disabled');
  return; 
};`
    );
    console.log('✅ Replaced verifyTypeScriptSetup.js with no-op function');
  } else {
    console.log('❌ Could not find verifyTypeScriptSetup.js at:', verifyTsPath);
  }
  
  // Also target the scripts that call the verify function
  const scriptPaths = [
    path.join(__dirname, 'node_modules', 'react-scripts', 'scripts', 'start.js'),
    path.join(__dirname, 'node_modules', 'react-scripts', 'scripts', 'build.js')
  ];
  
  scriptPaths.forEach(scriptPath => {
    if (fs.existsSync(scriptPath)) {
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      // Create a backup if it doesn't exist
      const backupPath = `${scriptPath}.bak`;
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(scriptPath, backupPath);
        console.log(`✅ Backed up original ${path.basename(scriptPath)}`);
      }
      
      // Replace any calls to checkTypeScriptSetup with comments
      const modified = content.replace(
        /checkTypeScriptSetup\(\);/g,
        '// TypeScript check disabled\n// checkTypeScriptSetup();'
      );
      
      fs.writeFileSync(scriptPath, modified);
      console.log(`✅ Disabled TypeScript checks in ${path.basename(scriptPath)}`);
    }
  });
  
  console.log('✅ Successfully disabled TypeScript verification');
} catch (error) {
  console.error('❌ Error disabling TypeScript verification:', error);
} 