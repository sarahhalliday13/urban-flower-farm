#!/bin/sh

set -e # Stop on errors

echo "===== CREATING MINIMAL SITE BUILD ====="

# Clean up any existing build directory
rm -rf build

# Create essential directories
echo "Creating build directory structure..."
mkdir -p build/static/js
mkdir -p build/static/css
mkdir -p build/data
mkdir -p build/images

# Create minimal JS
echo "Creating JavaScript files..."
cat > build/static/js/main.js << 'EOL'
console.log('Urban Flower Farm');
// Main application JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the application
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '<div class="app-container"><header class="app-header"><h1>Urban Flower Farm</h1><p>Your source for beautiful plants and flowers</p></header><main class="app-content"><p>Our full website is being updated. Please check back soon!</p><p>Contact us at <a href="mailto:info@urbanflowerfarm.com">info@urbanflowerfarm.com</a></p></main><footer>© Urban Flower Farm</footer></div>';
  }
});
EOL

# Create minimal CSS
echo "Creating CSS files..."
cat > build/static/css/main.css << 'EOL'
/* Main application styles */
body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 0;
  background: #f9f9f9;
}
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.app-header {
  text-align: center;
  padding: 40px 20px;
  background: #f0f7f0;
  border-bottom: 1px solid #ddd;
  margin-bottom: 40px;
}
.app-header h1 {
  color: #3a7d44;
  margin: 0 0 10px 0;
}
.app-content {
  padding: 20px;
  background: white;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  text-align: center;
}
footer {
  text-align: center;
  margin-top: 40px;
  padding: 20px;
  color: #666;
  font-size: 14px;
}
a {
  color: #3a7d44;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
EOL

# Create index.html
echo "Creating index.html..."
cat > build/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Urban Flower Farm - Your source for beautiful plants and flowers">
  <title>Urban Flower Farm</title>
  <link rel="stylesheet" href="/static/css/main.css">
  <link rel="icon" href="/favicon.ico">
</head>
<body>
  <div id="root"></div>
  <script src="/static/js/main.js"></script>
</body>
</html>
EOL

# Create _redirects file for SPA routing
echo "Creating _redirects file..."
echo "/* /index.html 200" > build/_redirects

# Create asset-manifest.json for compatibility
echo "Creating asset-manifest.json..."
cat > build/asset-manifest.json << 'EOL'
{
  "files": {
    "main.css": "/static/css/main.css",
    "main.js": "/static/js/main.js",
    "index.html": "/index.html"
  },
  "entrypoints": [
    "static/css/main.css",
    "static/js/main.js"
  ]
}
EOL

# Copy favicons and images from public directory if available
echo "Copying public assets if available..."
if [ -d "public" ]; then
  find public -name "*.ico" -o -name "*.png" -o -name "*.jpg" -o -name "*.svg" -o -name "*.webmanifest" | while read file; do
    target="build/$(basename "$file")"
    echo "Copying $file to $target"
    cp "$file" "$target"
  done
fi

# Verify build directory contents
echo "===== BUILD VERIFICATION ====="
echo "Build directory contents:"
find build -type f | sort

echo "===== BUILD COMPLETED SUCCESSFULLY =====" 