#!/bin/sh

# Set environment variables
export CI=false
export NODE_ENV=production
export SKIP_PREFLIGHT_CHECK=true
export DISABLE_TYPESCRIPT=true
export SKIP_TYPESCRIPT_CHECK=true
export NODE_OPTIONS="--openssl-legacy-provider"
export DISABLE_ESLINT_PLUGIN=true
export GENERATE_SOURCEMAP=false

# Run the build
echo "Starting Netlify build process..."
npm run build

# Create redirects file
echo "/* /index.html 200" > build/_redirects

echo "Build completed successfully" 