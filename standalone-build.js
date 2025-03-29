// standalone-build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const buildDir = path.join(__dirname, 'build');
const redirectsFile = path.join(buildDir, '_redirects');
const indexFile = path.join(buildDir, 'index.html');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

console.log(`${colors.bright}${colors.blue}Starting standalone build process...${colors.reset}\n`);

// Ensure the build directory exists
try {
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
    console.log(`${colors.green}Created build directory${colors.reset}`);
  }
} catch (err) {
  console.error(`${colors.red}Error creating build directory:${colors.reset}`, err);
}

// Execute build command with proper environment variables
try {
  console.log(`${colors.yellow}Building React application...${colors.reset}`);
  
  // Set environment variables for the build
  process.env.CI = 'false';
  process.env.SKIP_PREFLIGHT_CHECK = 'true';
  process.env.NODE_OPTIONS = '--openssl-legacy-provider';
  process.env.PUBLIC_URL = '/';
  
  // First ensure all dependencies are installed
  console.log(`${colors.yellow}Installing dependencies...${colors.reset}`);
  execSync('npm ci --quiet', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--openssl-legacy-provider'
    }
  });
  
  // Add react-dom specifically since it's missing
  console.log(`${colors.yellow}Ensuring react-dom is installed...${colors.reset}`);
  execSync('npm install --save react-dom@16.14.0', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--openssl-legacy-provider'
    }
  });
  
  // Execute the build command
  console.log(`${colors.yellow}Running build...${colors.reset}`);
  execSync('npm run build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: 'false',
      SKIP_PREFLIGHT_CHECK: 'true',
      NODE_OPTIONS: '--openssl-legacy-provider',
      PUBLIC_URL: '/'
    }
  });
  
  console.log(`${colors.green}Build completed successfully${colors.reset}`);
} catch (err) {
  console.error(`${colors.red}Build failed:${colors.reset}`, err);
  process.exit(1);
}

// Create _redirects file
try {
  console.log(`${colors.yellow}Creating _redirects file...${colors.reset}`);
  fs.writeFileSync(redirectsFile, '/* /index.html 200');
  console.log(`${colors.green}Created _redirects file${colors.reset}`);
} catch (err) {
  console.error(`${colors.red}Error creating _redirects file:${colors.reset}`, err);
}

// Make sure index.html exists
if (!fs.existsSync(indexFile)) {
  console.error(`${colors.red}index.html not found in build directory${colors.reset}`);
  process.exit(1);
}

// Check if the static directory exists and has files
const staticDir = path.join(buildDir, 'static');
if (!fs.existsSync(staticDir)) {
  console.error(`${colors.red}static directory not found in build directory${colors.reset}`);
  process.exit(1);
}

// List contents of build directory
console.log(`\n${colors.bright}${colors.blue}Contents of build directory:${colors.reset}`);
const buildFiles = fs.readdirSync(buildDir);
buildFiles.forEach(file => {
  const stats = fs.statSync(path.join(buildDir, file));
  if (stats.isDirectory()) {
    console.log(`${colors.bright}${file}/${colors.reset} (directory)`);
  } else {
    console.log(`${file} (${stats.size} bytes)`);
  }
});

// List contents of static directory
console.log(`\n${colors.bright}${colors.blue}Contents of static directory:${colors.reset}`);
if (fs.existsSync(staticDir)) {
  const staticFiles = fs.readdirSync(staticDir);
  staticFiles.forEach(file => {
    console.log(`${file}`);
  });
}

// Deploy to Netlify
console.log(`\n${colors.bright}${colors.blue}Deploying to Netlify...${colors.reset}`);
try {
  const deployOutput = execSync('npx netlify deploy --prod --dir=build', { 
    stdio: 'pipe', 
    encoding: 'utf-8' 
  });
  console.log(deployOutput);
  console.log(`${colors.green}${colors.bright}Deployment successful!${colors.reset}`);
} catch (err) {
  console.error(`${colors.red}Deployment failed:${colors.reset}`, err.stdout);
  process.exit(1);
} 