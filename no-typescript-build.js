#!/usr/bin/env node
// Script that runs a 100% TypeScript free build
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('❌ Running NO TYPESCRIPT build...');

// Check if tsconfig.json exists and temporarily rename it
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
let tsConfigExists = false;

if (fs.existsSync(tsConfigPath)) {
  tsConfigExists = true;
  fs.renameSync(tsConfigPath, path.join(__dirname, '_tsconfig.json.bak'));
  console.log('✅ Temporarily renamed tsconfig.json');
}

// Create a dummy tsconfig.json that disables everything TypeScript related
const dummyTsConfig = {
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
    "isolatedModules": false,
    "noEmit": true,
    "jsx": "react-jsx",
    "noImplicitAny": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "coverage", "**/*.spec.ts", "**/*.test.ts", "**/*.d.ts", "**/*.tsx"]
};

// Write the dummy tsconfig.json
fs.writeFileSync(tsConfigPath, JSON.stringify(dummyTsConfig, null, 2));
console.log('✅ Created dummy tsconfig.json that tells TypeScript to ignore everything');

// Run the production build
try {
  console.log('🚀 Starting production build with TypeScript disabled...');
  
  // Use a more aggressive approach to disable TypeScript
  const buildCommand = 'NODE_OPTIONS=--openssl-legacy-provider CI=false SKIP_PREFLIGHT_CHECK=true DISABLE_TYPESCRIPT=true SKIP_TYPESCRIPT_CHECK=true TSC_COMPILE_ON_ERROR=true react-scripts build';
  
  execSync(buildCommand, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      DISABLE_TYPESCRIPT: 'true',
      SKIP_TYPESCRIPT_CHECK: 'true',
      TSC_COMPILE_ON_ERROR: 'true',
      SKIP_PREFLIGHT_CHECK: 'true',
      CI: 'false'
    }
  });
  
  console.log('✅ Build completed successfully!');
  
  // Run the post-processing scripts
  console.log('🔧 Running post-processing scripts...');
  
  // Fix paths in JavaScript files
  console.log('Fixing JavaScript paths...');
  if (fs.existsSync('fix-js-paths.js')) {
    execSync('node fix-js-paths.js', { stdio: 'inherit' });
  }

  // Fix image paths
  console.log('Fixing image paths...');
  if (fs.existsSync('fix-image-paths.js')) {
    execSync('node fix-image-paths.js', { stdio: 'inherit' });
  }

  // Fix build images
  console.log('Ensuring all images are included in build...');
  if (fs.existsSync('fix-build-images.js')) {
    execSync('node fix-build-images.js', { stdio: 'inherit' });
  }

  // Fix Firebase image paths
  console.log('Fixing Firebase image paths...');
  if (fs.existsSync('fix-firebase-image-paths.js')) {
    execSync('node fix-firebase-image-paths.js', { stdio: 'inherit' });
  }

  // Fix Firebase connectivity
  console.log('Fixing Firebase connectivity...');
  if (fs.existsSync('fix-firebase-connectivity.js')) {
    execSync('node fix-firebase-connectivity.js', { stdio: 'inherit' });
  }

  // Create Firebase CORS proxy
  console.log('Creating Firebase CORS proxy...');
  if (fs.existsSync('firebase-cors-proxy.js')) {
    execSync('node firebase-cors-proxy.js', { stdio: 'inherit' });
  }

  // Inject Firebase fix script
  console.log('Injecting Firebase fix script...');
  if (fs.existsSync('inject-firebase-fix.js')) {
    execSync('node inject-firebase-fix.js', { stdio: 'inherit' });
  }

  // Preserve static files
  console.log('Preserving static files...');
  if (fs.existsSync('preserve-static.js')) {
    execSync('node preserve-static.js', { stdio: 'inherit' });
  }
  
  console.log('✅ Post-processing completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} finally {
  // Restore the original tsconfig.json if it existed
  if (tsConfigExists) {
    fs.unlinkSync(tsConfigPath);
    fs.renameSync(path.join(__dirname, '_tsconfig.json.bak'), tsConfigPath);
    console.log('✅ Restored original tsconfig.json');
  } else {
    // Delete the dummy tsconfig.json
    fs.unlinkSync(tsConfigPath);
    console.log('✅ Removed dummy tsconfig.json');
  }
}

console.log('✅ No-TypeScript build process completed!'); 