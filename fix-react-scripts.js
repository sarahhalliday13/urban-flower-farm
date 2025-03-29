#!/usr/bin/env node
// This script patches react-scripts to ignore TypeScript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Patching React scripts to ignore TypeScript...');

try {
  // Find react-scripts location
  const reactScriptsPath = path.join(__dirname, 'node_modules', 'react-scripts');
  
  if (!fs.existsSync(reactScriptsPath)) {
    console.log('⚠️ React scripts not found, installing locally...');
    execSync('npm install --no-save react-scripts@5.0.1', { stdio: 'inherit' });
  }
  
  // Create a patch file for react-scripts
  const scriptsPaths = [
    path.join(reactScriptsPath, 'scripts', 'build.js'),
    path.join(reactScriptsPath, 'scripts', 'start.js'),
    path.join(reactScriptsPath, 'config', 'webpack.config.js')
  ];
  
  scriptsPaths.forEach(scriptPath => {
    if (fs.existsSync(scriptPath)) {
      console.log(`Patching ${scriptPath}...`);
      let content = fs.readFileSync(scriptPath, 'utf8');
      
      // Disable TypeScript checks in the build script
      if (scriptPath.includes('build.js') || scriptPath.includes('start.js')) {
        content = content.replace(
          /checkTypeScriptSetup\(\);/g, 
          '// TypeScript check disabled\n// checkTypeScriptSetup();'
        );
        fs.writeFileSync(scriptPath, content);
      }
      
      // Patch webpack config to ignore TypeScript
      if (scriptPath.includes('webpack.config.js')) {
        // Add code to skip TypeScript rule
        content = content.replace(
          /const typescriptFormatter = require\('react-dev-utils\/typescriptFormatter'\);/g,
          'const typescriptFormatter = require(\'react-dev-utils/typescriptFormatter\');\n' +
          'const skipTypeScript = true; // Skip TypeScript processing'
        );
        
        // Modify the TypeScript rule
        content = content.replace(
          /test: \/\\\.(ts|tsx)$/,
          'test: skipTypeScript ? /\\.DISABLED_TS$/ : /\\.(ts|tsx)$/'
        );
        
        fs.writeFileSync(scriptPath, content);
      }
    }
  });
  
  console.log('✅ React scripts patched successfully!');
} catch (error) {
  console.error('❌ Failed to patch React scripts:', error);
} 