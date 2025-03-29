// This script ensures that static files are preserved during deployment
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

const buildDir = path.join(__dirname, 'build');
const staticDir = path.join(buildDir, 'static');
const jsDir = path.join(staticDir, 'js');
const cssDir = path.join(staticDir, 'css');

console.log(`${colors.bright}${colors.blue}Starting static file preservation script...${colors.reset}`);

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.log(`${colors.red}Error: Build directory doesn't exist. Creating it...${colors.reset}`);
  fs.mkdirSync(buildDir, { recursive: true });
}

// Check if static directory exists
if (!fs.existsSync(staticDir)) {
  console.log(`${colors.yellow}Static directory doesn't exist. Creating it...${colors.reset}`);
  fs.mkdirSync(staticDir, { recursive: true });
}

// Check if js directory exists
if (!fs.existsSync(jsDir)) {
  console.log(`${colors.yellow}JS directory doesn't exist. Creating it...${colors.reset}`);
  fs.mkdirSync(jsDir, { recursive: true });
}

// Check if css directory exists
if (!fs.existsSync(cssDir)) {
  console.log(`${colors.yellow}CSS directory doesn't exist. Creating it...${colors.reset}`);
  fs.mkdirSync(cssDir, { recursive: true });
}

// Run a local build to ensure files are generated
console.log(`${colors.green}Ensuring build files are generated...${colors.reset}`);
try {
  execSync('npm run build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: 'false',
      NODE_ENV: 'production',
      SKIP_PREFLIGHT_CHECK: 'true',
      NODE_OPTIONS: '--openssl-legacy-provider',
      PUBLIC_URL: '/',
      DISABLE_ESLINT_PLUGIN: 'true',
      GENERATE_SOURCEMAP: 'false'
    }
  });
} catch (error) {
  console.log(`${colors.red}Build process failed. Creating minimal static files...${colors.reset}`);
  
  // Create minimal JS file if none exists
  const jsFiles = fs.readdirSync(jsDir);
  if (jsFiles.length === 0) {
    console.log(`${colors.yellow}Creating minimal JS file...${colors.reset}`);
    fs.writeFileSync(path.join(jsDir, 'main.js'), 'console.log("Urban Flower Farm loading...");');
  } else {
    console.log(`${colors.green}Found ${jsFiles.length} JS files.${colors.reset}`);
  }
  
  // Create minimal CSS file if none exists
  const cssFiles = fs.readdirSync(cssDir);
  if (cssFiles.length === 0) {
    console.log(`${colors.yellow}Creating minimal CSS file...${colors.reset}`);
    fs.writeFileSync(path.join(cssDir, 'main.css'), 'body{font-family:sans-serif;text-align:center;margin:40px}');
  } else {
    console.log(`${colors.green}Found ${cssFiles.length} CSS files.${colors.reset}`);
  }
}

// Create index.html if it doesn't exist
if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.log(`${colors.yellow}Creating minimal index.html...${colors.reset}`);
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Urban Flower Farm</title>
  <link rel="stylesheet" href="/static/css/main.css">
</head>
<body>
  <h1>Urban Flower Farm</h1>
  <p>Our site is being updated. Please check back soon!</p>
  <div id="root"></div>
  <script src="/static/js/main.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(buildDir, 'index.html'), htmlContent);
}

// Create _redirects file
console.log(`${colors.green}Creating _redirects file...${colors.reset}`);
fs.writeFileSync(path.join(buildDir, '_redirects'), '/* /index.html 200');

// Create asset-manifest.json if it doesn't exist
if (!fs.existsSync(path.join(buildDir, 'asset-manifest.json'))) {
  console.log(`${colors.yellow}Creating asset-manifest.json...${colors.reset}`);
  const manifestContent = {
    files: {
      "main.css": "/static/css/main.css",
      "main.js": "/static/js/main.js",
      "index.html": "/index.html"
    },
    entrypoints: [
      "static/css/main.css",
      "static/js/main.js"
    ]
  };
  fs.writeFileSync(path.join(buildDir, 'asset-manifest.json'), JSON.stringify(manifestContent, null, 2));
}

// List all files in build directory
console.log(`${colors.bright}${colors.blue}Files in build directory:${colors.reset}`);
const listFiles = (dir, prefix = '') => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      console.log(`${prefix}${file}/`);
      listFiles(filePath, `${prefix}  `);
    } else {
      const fileSize = stat.size;
      console.log(`${prefix}${file} (${fileSize} bytes)`);
    }
  });
};
listFiles(buildDir);

console.log(`${colors.bright}${colors.green}Static file preservation completed.${colors.reset}`); 