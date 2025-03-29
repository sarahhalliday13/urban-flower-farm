#!/bin/bash

echo "Starting direct Netlify deployment process..."

# Install dependencies
npm ci --quiet --no-audit --no-fund || true

# Build the project
SKIP_PREFLIGHT_CHECK=true CI=false npm run build || true

# Ensure _redirects file exists
echo "/* /index.html 200" > build/_redirects

# Install Netlify CLI if not already installed
if ! command -v netlify &> /dev/null; then
  npm install -g netlify-cli
fi

# Deploy to Netlify
echo "Deploying to Netlify..."
netlify deploy --prod --dir=build 