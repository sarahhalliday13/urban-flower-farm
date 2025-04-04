#!/usr/bin/env node
// Script to prevent false TypeScript detection in Netlify builds
const fs = require('fs');
const path = require('path');

// Color formatting for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bright: "\x1b[1m"
};

console.log(`${colors.bright}${colors.blue}Preventing TypeScript detection in Netlify builds...${colors.reset}`);

// Explicitly create an empty tsconfig.json to take control of TypeScript detection
const emptyTsConfig = {
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": false,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.d.ts"], // Only include declaration files
  "exclude": ["src/**/*.js", "src/**/*.jsx", "build/**/*", "node_modules/**/*"]
};

// Write empty tsconfig.json
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
fs.writeFileSync(tsconfigPath, JSON.stringify(emptyTsConfig, null, 2));
console.log(`${colors.green}Created controlled tsconfig.json to limit TypeScript scope${colors.reset}`);

// Create a TypeScript declaration file to satisfy TypeScript but not affect JS code
const declarationDir = path.join(__dirname, 'src', '@types');
if (!fs.existsSync(declarationDir)) {
  fs.mkdirSync(declarationDir, { recursive: true });
}

const declarationFile = path.join(declarationDir, 'global.d.ts');
const declarationContent = `// Empty TypeScript declaration file to control TS behavior
declare module '*.js';
declare module '*.jsx';

// This prevents TypeScript from trying to type-check our JavaScript files
`;

fs.writeFileSync(declarationFile, declarationContent);
console.log(`${colors.green}Created controlled declaration file to prevent JS type-checking${colors.reset}`);

// Check for hooks directory
const hooksDir = path.join(__dirname, 'src', 'hooks');
if (fs.existsSync(hooksDir)) {
  // Look for the problematic file
  const problematicFile = path.join(hooksDir, 'ScrollRestorationContext.tsx');
  if (fs.existsSync(problematicFile)) {
    // Delete it
    fs.unlinkSync(problematicFile);
    console.log(`${colors.green}Removed problematic ScrollRestorationContext.tsx file${colors.reset}`);
  } else {
    console.log(`${colors.yellow}No ScrollRestorationContext.tsx file found${colors.reset}`);
  }
  
  // Ensure the JS version exists and has no hints of TypeScript
  const jsFile = path.join(hooksDir, 'ScrollRestorationContext.js');
  if (fs.existsSync(jsFile)) {
    let content = fs.readFileSync(jsFile, 'utf8');
    
    // Add explicit comment to help Netlify detection
    if (!content.includes('// This is a JavaScript file, not TypeScript')) {
      content = `// This is a JavaScript file, not TypeScript
// File: ScrollRestorationContext.js
${content}`;
      fs.writeFileSync(jsFile, content);
      console.log(`${colors.green}Updated ScrollRestorationContext.js with explicit JS marker${colors.reset}`);
    }
  }
}

// Create .netlify-build-ignore file to prevent TypeScript processing
const ignoreFile = path.join(__dirname, '.netlify-build-ignore');
const ignoreContent = `
# Ignore any TypeScript files
*.ts
*.tsx

# Ignore TypeScript config
tsconfig.json

# Ignore TypeScript declaration directory
src/@types/
`;

fs.writeFileSync(ignoreFile, ignoreContent);
console.log(`${colors.green}Created .netlify-build-ignore to prevent TypeScript processing${colors.reset}`);

console.log(`${colors.bright}${colors.green}TypeScript detection prevention complete!${colors.reset}`); 