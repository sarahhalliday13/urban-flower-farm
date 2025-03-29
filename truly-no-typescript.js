#!/usr/bin/env node
// Script that completely disables TypeScript for development and production
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 TRULY NO TYPESCRIPT MODE 🔥');

// Create fake tsconfig.json that does nothing
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
const fakeTsConfig = {
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "noImplicitAny": false,
    "baseUrl": "src"
  },
  "include": ["src/react-app-env.d.ts"],
  "exclude": []
};

// Backup existing tsconfig if it exists
let originalTsConfig = null;
if (fs.existsSync(tsConfigPath)) {
  try {
    originalTsConfig = fs.readFileSync(tsConfigPath, 'utf8');
    console.log('✅ Backed up original tsconfig.json');
  } catch (err) {
    console.log('⚠️ Failed to backup tsconfig.json:', err);
  }
}

// Write our fake tsconfig
fs.writeFileSync(tsConfigPath, JSON.stringify(fakeTsConfig, null, 2));
console.log('✅ Wrote fake tsconfig.json');

// Create the most basic .d.ts file to satisfy TypeScript
const dtsPath = path.join(__dirname, 'src', 'react-app-env.d.ts');
const dtsDir = path.dirname(dtsPath);

if (!fs.existsSync(dtsDir)) {
  fs.mkdirSync(dtsDir, { recursive: true });
}

fs.writeFileSync(dtsPath, '/// <reference types="react-scripts" />\n');
console.log('✅ Created minimal TypeScript declaration file');

// Fix the firebase.js file to move imports to the top
const firebasePath = path.join(__dirname, 'src', 'services', 'firebase.js');
if (fs.existsSync(firebasePath)) {
  try {
    console.log('Fixing import order in firebase.js...');
    let firebaseContent = fs.readFileSync(firebasePath, 'utf8');
    
    // Look for the import of firebase-compat
    if (firebaseContent.includes("import firebaseCompat from './firebase-compat';")) {
      // First check if there's a defined firebase variable
      if (firebaseContent.includes("const firebase = window.firebase || firebaseCompat;")) {
        // It's already fixed, nothing to do
        console.log('✅ firebase.js already has correct import order');
      } else {
        // Move the imports to the top
        const lines = firebaseContent.split('\n');
        const newLines = [];
        const imports = [];
        
        // Collect all imports
        for (const line of lines) {
          if (line.startsWith('import ')) {
            imports.push(line);
          } else {
            newLines.push(line);
          }
        }
        
        // Add imports at the top
        firebaseContent = [...imports, '', ...newLines].join('\n');
        
        // Add the firebase variable definition
        firebaseContent = firebaseContent.replace(
          "import firebaseCompat from './firebase-compat';",
          "import firebaseCompat from './firebase-compat';\n\n// Use the imported firebase compat if firebase is not defined globally\nconst firebase = window.firebase || firebaseCompat;"
        );
        
        fs.writeFileSync(firebasePath, firebaseContent);
        console.log('✅ Fixed import order in firebase.js');
      }
    } else {
      console.log('⚠️ Could not find firebase-compat import in firebase.js');
    }
  } catch (error) {
    console.error('⚠️ Error fixing firebase.js:', error);
  }
}

// Determine if this is a production build or dev server
const isProduction = process.argv.includes('build');

// Set up environment variables
const env = {
  ...process.env,
  NODE_OPTIONS: '--openssl-legacy-provider',
  DISABLE_TYPESCRIPT: 'true',
  SKIP_TYPESCRIPT_CHECK: 'true',
  TSC_COMPILE_ON_ERROR: 'true',
  SKIP_PREFLIGHT_CHECK: 'true',
  CI: 'false',
  DANGEROUSLY_DISABLE_HOST_CHECK: 'true'
};

try {
  if (isProduction) {
    console.log('🏗️ Starting production build...');
    
    // Run build command
    execSync('react-scripts build', { 
      stdio: 'inherit',
      env
    });
    
    // Run post-processing scripts
    console.log('🔧 Running post-processing scripts...');
    
    // Run all the post-processing scripts
    const scripts = [
      'fix-js-paths.js',
      'fix-image-paths.js',
      'fix-build-images.js',
      'fix-firebase-image-paths.js',
      'fix-firebase-connectivity.js',
      'firebase-cors-proxy.js',
      'inject-firebase-fix.js',
      'preserve-static.js'
    ];
    
    for (const script of scripts) {
      if (fs.existsSync(script)) {
        console.log(`Running ${script}...`);
        execSync(`node ${script}`, { stdio: 'inherit' });
      }
    }
    
    console.log('✅ Production build completed!');
  } else {
    console.log('🚀 Starting development server...');
    
    // Set port
    env.PORT = '4003';
    
    // Start the development server
    execSync('react-scripts start', { 
      stdio: 'inherit',
      env
    });
  }
} catch (error) {
  console.error('❌ Process failed:', error.message);
  process.exit(1);
} finally {
  // Restore original tsconfig if we had one
  if (originalTsConfig) {
    fs.writeFileSync(tsConfigPath, originalTsConfig);
    console.log('✅ Restored original tsconfig.json');
  }
} 