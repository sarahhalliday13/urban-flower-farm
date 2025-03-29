// standalone-build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const buildDir = path.join(__dirname, 'build');
const redirectsFile = path.join(buildDir, '_redirects');
const indexFile = path.join(buildDir, 'index.html');
const srcIndexFile = path.join(__dirname, 'src', 'index.js');
const srcAppFile = path.join(__dirname, 'src', 'App.js');
const srcDatabaseDebugFile = path.join(__dirname, 'src', 'DatabaseDebug.js');
const componentsDir = path.join(__dirname, 'src', 'components');
const backToTopFile = path.join(componentsDir, 'BackToTop.js');

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

// Ensure the components directory exists
try {
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
    console.log(`${colors.green}Created components directory${colors.reset}`);
  }
} catch (err) {
  console.error(`${colors.red}Error creating components directory:${colors.reset}`, err);
}

// Check for the presence of BackToTop.js
try {
  if (fs.existsSync(backToTopFile)) {
    console.log(`${colors.green}BackToTop.js exists at the correct location${colors.reset}`);
  } else {
    console.log(`${colors.yellow}BackToTop.js not found at the expected location, searching...${colors.reset}`);
    
    // Check if it's in a nested directory
    const backToTopInSrcDir = execSync('find src -name "BackToTop.js" | head -n 1', { encoding: 'utf8' }).trim();
    
    if (backToTopInSrcDir) {
      console.log(`${colors.green}Found BackToTop.js at: ${backToTopInSrcDir}${colors.reset}`);
      
      // If it exists but in the wrong location, copy it to the correct location
      const fileContent = fs.readFileSync(backToTopInSrcDir, 'utf8');
      fs.writeFileSync(backToTopFile, fileContent);
      console.log(`${colors.green}Copied BackToTop.js to the correct location${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Creating a stub BackToTop.js file...${colors.reset}`);
      
      // Create a simple stub component
      const stubContent = `
import React, { useState, useEffect } from 'react';

const BackToTop = ({ showAlways = false }) => {
  const [isVisible, setIsVisible] = useState(showAlways);

  useEffect(() => {
    if (!showAlways) {
      const toggleVisibility = () => {
        if (window.pageYOffset > 300) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      };

      window.addEventListener('scroll', toggleVisibility);
      return () => window.removeEventListener('scroll', toggleVisibility);
    }
  }, [showAlways]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div 
      className={\`back-to-top \${isVisible ? 'visible' : ''}\`}
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        cursor: 'pointer',
        backgroundColor: '#388e3c',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '50%',
        display: isVisible ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        zIndex: 1000,
        transition: 'all 0.3s ease'
      }}
    >
      ↑
    </div>
  );
};

export default BackToTop;
`;
      fs.writeFileSync(backToTopFile, stubContent);
      console.log(`${colors.green}Created BackToTop.js stub${colors.reset}`);
    }
  }
} catch (err) {
  console.error(`${colors.red}Error handling BackToTop.js:${colors.reset}`, err);
}

// Check for the presence of DatabaseDebug.js
try {
  if (fs.existsSync(srcDatabaseDebugFile)) {
    console.log(`${colors.green}DatabaseDebug.js exists at the correct location${colors.reset}`);
  } else {
    console.log(`${colors.yellow}DatabaseDebug.js not found at the expected location, searching...${colors.reset}`);
    
    // Check if it's in a nested directory
    const dbDebugInSrcDir = execSync('find src -name "DatabaseDebug.js" | head -n 1', { encoding: 'utf8' }).trim();
    
    if (dbDebugInSrcDir) {
      console.log(`${colors.green}Found DatabaseDebug.js at: ${dbDebugInSrcDir}${colors.reset}`);
      
      // If it exists but in the wrong location, copy it to the correct location
      const fileContent = fs.readFileSync(dbDebugInSrcDir, 'utf8');
      fs.writeFileSync(srcDatabaseDebugFile, fileContent);
      console.log(`${colors.green}Copied DatabaseDebug.js to the correct location${colors.reset}`);
      
      // Fix any import paths if needed by updating the file
      const updatedContent = fileContent.replace(
        /from ['"]\.\/([^'"]+)['"]/g, 
        (match, p1) => `from './${p1}'`
      );
      fs.writeFileSync(srcDatabaseDebugFile, updatedContent);
    } else {
      console.log(`${colors.yellow}Creating a stub DatabaseDebug.js file...${colors.reset}`);
      
      // Create a simple stub component
      const stubContent = `
import React from 'react';

const DatabaseDebug = () => {
  return (
    <div className="database-debug">
      <h1>Database Debug</h1>
      <p>This is a placeholder for the DatabaseDebug component.</p>
    </div>
  );
};

export default DatabaseDebug;
`;
      fs.writeFileSync(srcDatabaseDebugFile, stubContent);
      console.log(`${colors.green}Created DatabaseDebug.js stub${colors.reset}`);
    }
  }
} catch (err) {
  console.error(`${colors.red}Error handling DatabaseDebug.js:${colors.reset}`, err);
}

// Check if src/index.js exists and backup it if it does
try {
  if (fs.existsSync(srcIndexFile)) {
    console.log(`${colors.yellow}Backing up src/index.js...${colors.reset}`);
    const indexContent = fs.readFileSync(srcIndexFile, 'utf8');
    fs.writeFileSync(`${srcIndexFile}.backup`, indexContent);
    console.log(`${colors.green}Created backup at src/index.js.backup${colors.reset}`);
    
    // Fix the index.js file to use React 16 syntax instead of React 18
    console.log(`${colors.yellow}Updating index.js to use React 16 syntax...${colors.reset}`);
    
    // Look for React 18 import syntax (react-dom/client) and replace with React 16 syntax
    let updatedContent = indexContent;
    
    // Replace any import from react-dom/client with regular react-dom
    updatedContent = updatedContent.replace(
      /import\s+\{\s*createRoot\s*\}\s+from\s+['"]react-dom\/client['"]/g,
      `import ReactDOM from 'react-dom'`
    );
    
    // Replace createRoot().render() with ReactDOM.render()
    updatedContent = updatedContent.replace(
      /const\s+root\s*=\s*createRoot\(\s*document\.getElementById\(['"]root['"]\)\s*\)[\s\S]*?root\.render\(([\s\S]*?)\);/g,
      `ReactDOM.render($1, document.getElementById('root'));`
    );
    
    // If that didn't work, look for other patterns of createRoot
    if (updatedContent === indexContent) {
      updatedContent = updatedContent.replace(
        /import\s+ReactDOM\s+from\s+['"]react-dom\/client['"]/g,
        `import ReactDOM from 'react-dom'`
      );
      
      updatedContent = updatedContent.replace(
        /ReactDOM\.createRoot\(\s*document\.getElementById\(['"]root['"]\)\s*\)\.render\(([\s\S]*?)\);/g,
        `ReactDOM.render($1, document.getElementById('root'));`
      );
    }
    
    // Write the updated content back to index.js
    fs.writeFileSync(srcIndexFile, updatedContent);
    console.log(`${colors.green}Updated src/index.js to use React 16 syntax${colors.reset}`);
  }
} catch (err) {
  console.error(`${colors.red}Error updating index.js:${colors.reset}`, err);
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

// Restore the original src/index.js from backup
try {
  if (fs.existsSync(`${srcIndexFile}.backup`)) {
    console.log(`${colors.yellow}Restoring original src/index.js from backup...${colors.reset}`);
    const backupContent = fs.readFileSync(`${srcIndexFile}.backup`, 'utf8');
    fs.writeFileSync(srcIndexFile, backupContent);
    console.log(`${colors.green}Restored original src/index.js${colors.reset}`);
  }
} catch (err) {
  console.error(`${colors.red}Error restoring index.js:${colors.reset}`, err);
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