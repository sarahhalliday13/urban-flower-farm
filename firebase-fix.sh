#!/bin/bash

# Step 1: Uninstall current Firebase CLI
echo "Uninstalling current Firebase CLI..."
npm uninstall -g firebase-tools

# Step 2: Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Step 3: Remove any Firebase cache directories
echo "Removing Firebase cache directories..."
rm -rf ~/.firebase

# Step 4: Install the specific version of Firebase CLI
echo "Installing Firebase CLI version 11.30.0..."
npm install -g firebase-tools@11.30.0

# Step 5: Verify installation
echo "Verifying Firebase CLI version..."
firebase --version

# Step 6: Create a simplified firebase.json to test deployment
echo "Creating temporary firebase.json for testing..."
cat > firebase.json.temp << 'EOL'
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "functions"
  }
}
EOL

echo "Setup complete. To test the deployment, run: firebase deploy --only functions --config firebase.json.temp"
echo "If that works, you can modify your original firebase.json to match this format." 