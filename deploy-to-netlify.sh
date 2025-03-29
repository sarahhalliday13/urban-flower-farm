#!/bin/bash

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Deploy to Netlify
echo "Building and deploying the application to Netlify..."

# Set environment variables for the build
export NODE_OPTIONS=--openssl-legacy-provider
export CI=false
export PUBLIC_URL=/

# Run the build process with path fixing and static file preservation
npm run build
node fix-js-paths.js
node preserve-static.js

# Deploy to Netlify
netlify deploy --prod --dir=build

echo "Deployment completed." 