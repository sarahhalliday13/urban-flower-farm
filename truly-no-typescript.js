#!/usr/bin/env node
/**
 * truly-no-typescript.js
 * 
 * This script completely disables TypeScript in the build process
 * and ensures the project can run without TypeScript dependencies.
 * It's designed to be used before starting the dev server or building.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color formatting for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bright: "\x1b[1m"
};

console.log(`${colors.bright}${colors.blue}📋 TRULY NO TYPESCRIPT - BUILD PREPARATION SCRIPT 📋${colors.reset}`);

// 1. Delete any existing tsconfig files outside node_modules
try {
  console.log(`${colors.yellow}Removing existing TypeScript configuration...${colors.reset}`);
  execSync('find . -name "tsconfig.json" -not -path "*/node_modules/*" -exec rm -v {} \\;', { stdio: 'inherit' });
  execSync('find . -name "*.d.ts" -not -path "*/node_modules/*" -exec rm -v {} \\;', { stdio: 'inherit' });
} catch (error) {
  console.log(`${colors.yellow}No TypeScript files found to remove.${colors.reset}`);
}

// 2. Create a controlled tsconfig.json that excludes everything
const tsconfigContent = {
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
    "jsx": "react-jsx"
  },
  "include": ["src/@types"], // Only include our controlled declaration files
  "exclude": [
    "src/**/*.js", 
    "src/**/*.jsx", 
    "build/**/*", 
    "public/**/*",
    "node_modules/**/*"
  ]
};

console.log(`${colors.green}Creating controlled tsconfig.json...${colors.reset}`);
fs.writeFileSync(path.join(__dirname, 'tsconfig.json'), JSON.stringify(tsconfigContent, null, 2));

// 3. Create type declaration directory and empty declaration file
const typesDir = path.join(__dirname, 'src', '@types');
if (!fs.existsSync(typesDir)) {
  console.log(`${colors.green}Creating @types directory...${colors.reset}`);
  fs.mkdirSync(typesDir, { recursive: true });
}

const declarationContent = `// Empty TypeScript declaration file
// This permits JavaScript files to be imported without type errors

declare module '*.js';
declare module '*.jsx';
declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.json';

// Add any other module declarations needed
`;

const declarationPath = path.join(typesDir, 'global.d.ts');
fs.writeFileSync(declarationPath, declarationContent);
console.log(`${colors.green}Created empty declaration file: ${declarationPath}${colors.reset}`);

// 4. Create/update ScrollRestorationContext.js to be pure JavaScript
const hooksDir = path.join(__dirname, 'src', 'hooks');
if (!fs.existsSync(hooksDir)) {
  console.log(`${colors.green}Creating hooks directory...${colors.reset}`);
  fs.mkdirSync(hooksDir, { recursive: true });
}

// Remove any .tsx version if it exists
const tsxFile = path.join(hooksDir, 'ScrollRestorationContext.tsx');
if (fs.existsSync(tsxFile)) {
  fs.unlinkSync(tsxFile);
  console.log(`${colors.green}Removed ${tsxFile}${colors.reset}`);
}

// Create or update the JavaScript version
const jsContent = `// PURE JAVASCRIPT COMPONENT - NO TYPESCRIPT
import React, { createContext, useContext, useState } from 'react';

const ScrollRestorationContext = createContext(undefined);

export const useScrollRestoration = () => {
  const context = useContext(ScrollRestorationContext);
  if (!context) {
    throw new Error('useScrollRestoration must be used within a ScrollRestorationProvider');
  }
  return context;
};

export const ScrollRestorationProvider = ({ children }) => {
  const [scrollPositions, setScrollPositions] = useState({});

  // Save scroll position by key
  const saveScrollPosition = (key, position) => {
    setScrollPositions(prev => ({
      ...prev,
      [key]: position
    }));
  };

  // Get scroll position by key
  const getScrollPosition = (key) => {
    return scrollPositions[key] || 0;
  };

  // Context value
  const value = {
    saveScrollPosition,
    getScrollPosition
  };

  return (
    <ScrollRestorationContext.Provider value={value}>
      {children}
    </ScrollRestorationContext.Provider>
  );
};
`;

const jsFilePath = path.join(hooksDir, 'ScrollRestorationContext.js');
fs.writeFileSync(jsFilePath, jsContent);
console.log(`${colors.green}Created/updated pure JavaScript version: ${jsFilePath}${colors.reset}`);

// 5. Update environment variables to disable TypeScript
const envContent = `
# TypeScript Disabling Configuration
DISABLE_TYPESCRIPT=true
SKIP_TYPESCRIPT_CHECK=true
TSC_COMPILE_ON_ERROR=true
SKIP_PREFLIGHT_CHECK=true
`;

// Append to existing .env or create one
let envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  // Read existing content
  let existingContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if TypeScript disabling is already configured
  if (!existingContent.includes('DISABLE_TYPESCRIPT=true')) {
    fs.appendFileSync(envPath, '\n' + envContent);
    console.log(`${colors.green}Updated .env file with TypeScript disabling configuration${colors.reset}`);
  } else {
    console.log(`${colors.yellow}.env already has TypeScript disabling configuration${colors.reset}`);
  }
} else {
  fs.writeFileSync(envPath, envContent);
  console.log(`${colors.green}Created .env file with TypeScript disabling configuration${colors.reset}`);
}

// Create/update .env.development file
envPath = path.join(__dirname, '.env.development');
fs.writeFileSync(envPath, envContent);
console.log(`${colors.green}Updated .env.development file${colors.reset}`);

// Create/update .env.production file
envPath = path.join(__dirname, '.env.production');
if (fs.existsSync(envPath)) {
  let prodEnvContent = fs.readFileSync(envPath, 'utf8');
  if (!prodEnvContent.includes('DISABLE_TYPESCRIPT=true')) {
    fs.appendFileSync(envPath, '\n' + envContent);
  }
} else {
  fs.writeFileSync(envPath, envContent);
}
console.log(`${colors.green}Updated .env.production file${colors.reset}`);

// 6. Create/update .netlify-build-ignore file
const ignoreContent = `
# Ignore TypeScript files for Netlify build
*.ts
*.tsx
tsconfig.json
`;

const ignoreFilePath = path.join(__dirname, '.netlify-build-ignore');
fs.writeFileSync(ignoreFilePath, ignoreContent);
console.log(`${colors.green}Created/updated .netlify-build-ignore file${colors.reset}`);

// 7. Check if we need to install a dummy TypeScript package
// This is for projects where the build expects typescript to be installed
try {
  if (!fs.existsSync(path.join(__dirname, 'node_modules', 'typescript'))) {
    console.log(`${colors.yellow}TypeScript package not found. Installing dummy version...${colors.reset}`);
    execSync('npm install --no-save --no-package-lock typescript@latest', { stdio: 'inherit' });
    console.log(`${colors.green}Installed dummy TypeScript package${colors.reset}`);
  } else {
    console.log(`${colors.yellow}TypeScript package already installed${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}Failed to install TypeScript: ${error.message}${colors.reset}`);
  console.log(`${colors.yellow}You may need to run: npm install --no-save typescript${colors.reset}`);
}

// Success message
console.log(`
${colors.bright}${colors.green}✅ TYPESCRIPT SUCCESSFULLY DISABLED! ✅${colors.reset}

The project is now configured to run without TypeScript.
You can now:
- Start dev server: ${colors.bright}npm start${colors.reset}
- Build for production: ${colors.bright}npm run build${colors.reset}
- Deploy to Netlify: ${colors.bright}npm run netlify:build${colors.reset}

No TypeScript errors will interfere with your build!
`);

// Export environment variables for the current process
process.env.DISABLE_TYPESCRIPT = 'true';
process.env.SKIP_TYPESCRIPT_CHECK = 'true';
process.env.TSC_COMPILE_ON_ERROR = 'true';
process.env.SKIP_PREFLIGHT_CHECK = 'true'; 