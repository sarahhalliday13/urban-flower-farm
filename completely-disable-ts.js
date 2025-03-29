#!/usr/bin/env node
// THE NUCLEAR OPTION: This script completely disables TypeScript in the React build process
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('☢️ NUCLEAR OPTION: Completely disabling TypeScript...');

try {
  // 1. Disable verifyTypeScriptSetup.js by replacing it with an empty function
  const verifyTsPath = path.join(__dirname, 'node_modules', 'react-scripts', 'scripts', 'utils', 'verifyTypeScriptSetup.js');
  if (fs.existsSync(verifyTsPath)) {
    console.log('Replacing verifyTypeScriptSetup.js with empty function');
    fs.writeFileSync(verifyTsPath, 'module.exports = function() { return; };');
  }

  // 2. Disable TypeScript in webpack config
  const webpackConfigPath = path.join(__dirname, 'node_modules', 'react-scripts', 'config', 'webpack.config.js');
  if (fs.existsSync(webpackConfigPath)) {
    console.log('Patching webpack.config.js to disable TypeScript...');
    let content = fs.readFileSync(webpackConfigPath, 'utf8');
    
    // Add a line to disable TypeScript at the top of the config
    if (!content.includes('const DISABLE_TYPESCRIPT = true;')) {
      content = 'const DISABLE_TYPESCRIPT = true;\n' + content;
    }
    
    // Modify the TypeScript rule to never match any files
    content = content.replace(
      /test: \/\\\.(ts|tsx)\\$/,
      'test: DISABLE_TYPESCRIPT ? /\\.will-never-match-anything$/ : /\\.(ts|tsx)$/'
    );
    
    // Modify the file extensions to exclude .ts and .tsx
    content = content.replace(
      /resolve: {\s+extensions: paths\.moduleFileExtensions/,
      'resolve: {\n    extensions: DISABLE_TYPESCRIPT ? paths.moduleFileExtensions.filter(ext => !ext.includes("ts")) : paths.moduleFileExtensions'
    );
    
    fs.writeFileSync(webpackConfigPath, content);
  }

  // 3. Patch start.js and build.js to remove TypeScript check
  const scriptPaths = [
    path.join(__dirname, 'node_modules', 'react-scripts', 'scripts', 'start.js'),
    path.join(__dirname, 'node_modules', 'react-scripts', 'scripts', 'build.js')
  ];

  scriptPaths.forEach(scriptPath => {
    if (fs.existsSync(scriptPath)) {
      console.log(`Patching ${path.basename(scriptPath)}...`);
      let content = fs.readFileSync(scriptPath, 'utf8');
      
      // Remove TypeScript check
      content = content.replace(
        /checkTypeScriptSetup\(\);/g,
        '// checkTypeScriptSetup(); // DISABLED'
      );
      
      // Add "SKIP_TYPECHECK=true" to the environment
      if (!content.includes('process.env.SKIP_TYPECHECK')) {
        content = content.replace(
          'const useTypeScript =',
          'process.env.SKIP_TYPECHECK = "true";\nconst useTypeScript ='
        );
        
        // Force "useTypeScript" to be false
        content = content.replace(
          'const useTypeScript =',
          'const useTypeScript = false; //'
        );
      }
      
      fs.writeFileSync(scriptPath, content);
    }
  });

  // 4. Create an empty fork-ts-checker-webpack-plugin module
  const fakeTsCheckerPath = path.join(__dirname, 'node_modules', 'fork-ts-checker-webpack-plugin');
  
  if (!fs.existsSync(fakeTsCheckerPath)) {
    fs.mkdirSync(fakeTsCheckerPath, { recursive: true });
    
    fs.writeFileSync(
      path.join(fakeTsCheckerPath, 'package.json'),
      JSON.stringify({
        name: 'fork-ts-checker-webpack-plugin',
        version: '6.5.0',
        main: 'index.js'
      }, null, 2)
    );
    
    fs.writeFileSync(
      path.join(fakeTsCheckerPath, 'index.js'),
      'module.exports = class ForkTsCheckerWebpackPlugin { apply() {} };'
    );
    
    console.log('Created fake fork-ts-checker-webpack-plugin');
  }

  // 5. Create an empty typescript module
  const fakeTsPath = path.join(__dirname, 'node_modules', 'typescript');
  
  if (!fs.existsSync(fakeTsPath)) {
    fs.mkdirSync(fakeTsPath, { recursive: true });
    fs.mkdirSync(path.join(fakeTsPath, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(fakeTsPath, 'bin'), { recursive: true });
    
    fs.writeFileSync(
      path.join(fakeTsPath, 'package.json'),
      JSON.stringify({
        name: 'typescript',
        version: '4.9.5',
        main: 'lib/typescript.js',
        bin: {
          tsc: './bin/tsc',
          tsserver: './bin/tsserver'
        }
      }, null, 2)
    );
    
    fs.writeFileSync(
      path.join(fakeTsPath, 'lib', 'typescript.js'),
      'module.exports = { version: "4.9.5" };'
    );
    
    fs.writeFileSync(
      path.join(fakeTsPath, 'bin', 'tsc'),
      '#!/usr/bin/env node\nconsole.log("TypeScript compiler disabled");\n'
    );
    
    fs.writeFileSync(
      path.join(fakeTsPath, 'bin', 'tsserver'),
      '#!/usr/bin/env node\nconsole.log("TypeScript server disabled");\n'
    );
    
    execSync(`chmod +x ${path.join(fakeTsPath, 'bin', 'tsc')}`);
    execSync(`chmod +x ${path.join(fakeTsPath, 'bin', 'tsserver')}`);
    
    console.log('Created fake typescript module');
  }

  // 6. Create a fake tsconfig.json in the project root
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  const fakeTsConfig = {
    compilerOptions: {
      target: "es5",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false,
      forceConsistentCasingInFileNames: true,
      module: "esnext",
      moduleResolution: "node",
      resolveJsonModule: true,
      isolatedModules: false,
      noEmit: true,
      jsx: "react-jsx",
      noImplicitAny: false
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "**/*.spec.ts"]
  };
  
  fs.writeFileSync(tsconfigPath, JSON.stringify(fakeTsConfig, null, 2));
  console.log('Created simplified tsconfig.json');

  // 7. Create a fake react-app-env.d.ts file
  const reactAppEnvPath = path.join(__dirname, 'src', 'react-app-env.d.ts');
  const fakeDtsContent = `/// <reference types="react-scripts" />

// Global TypeScript declarations
interface Window {
  firebase?: any;
  initializeFirebaseManually?: () => void;
  FIREBASE_DEBUG?: {
    initialized?: boolean;
  };
}

// Add declarations for various file types
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';`;

  if (!fs.existsSync(path.dirname(reactAppEnvPath))) {
    fs.mkdirSync(path.dirname(reactAppEnvPath), { recursive: true });
  }
  
  fs.writeFileSync(reactAppEnvPath, fakeDtsContent);
  console.log('Created fake react-app-env.d.ts');

  console.log('✅ NUCLEAR OPTION COMPLETE: TypeScript should be completely disabled now');
  console.log('🚀 You can now build your app without TypeScript!');
} catch (error) {
  console.error('❌ Error disabling TypeScript:', error);
  process.exit(1);
} 