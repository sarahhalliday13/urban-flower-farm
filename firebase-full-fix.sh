#!/bin/bash

# This script performs a comprehensive fix for Firebase deployment issues

echo "===== FIREBASE PROJECT FIX SCRIPT ====="
echo "This script will help fix Firebase CLI deployment issues"
echo ""

# Step 1: Backup original files
echo "Step 1: Backing up original files..."
cp firebase.json firebase.json.original
cp .firebaserc .firebaserc.original
echo "✅ Original files backed up"
echo ""

# Step 2: Create simplified firebase.json
echo "Step 2: Creating simplified firebase.json..."
cat > firebase.json << 'EOL'
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
  },
  "emulators": {
    "functions": {
      "port": 5002
    },
    "ui": {
      "enabled": true,
      "port": 4003
    },
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "database": {
      "port": 9000
    },
    "pubsub": {
      "port": 8085
    },
    "storage": {
      "port": 9199
    }
  },
  "storage": {
    "rules": "storage.rules"
  }
}
EOL
echo "✅ Created simplified firebase.json"
echo ""

# Step 3: Update package.json in functions directory
echo "Step 3: Checking functions directory dependencies..."
cd functions

# Update the dependencies if needed
if [ -f package.json ]; then
  echo "Updating firebase-functions to latest version..."
  npm install --save firebase-functions@latest

  echo "Ensuring firebase-admin is installed..."
  npm install --save firebase-admin@latest
  
  echo "✅ Functions dependencies updated"
else
  echo "❌ No package.json found in functions directory!"
  exit 1
fi

# Step 4: Return to project directory and test deployment
cd ..
echo ""
echo "===== SETUP COMPLETE ====="
echo ""
echo "Now try deploying with: firebase deploy --only functions"
echo ""
echo "If you still encounter issues, try the minimal test project approach:"
echo "1. Create a new directory with minimal Firebase configuration"
echo "2. Set up the basic function structure"
echo "3. Deploy from that directory to verify your account works"
echo "4. Then return to fixing this project" 