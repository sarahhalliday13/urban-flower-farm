#!/bin/sh

set -e # Exit immediately if a command exits with a non-zero status

# Ensure we're in the right directory
echo "Current directory: $(pwd)"
ls -la

# Install dependencies
echo "Installing dependencies..."
npm ci || npm install

# Set environment variables
export CI=false
export NODE_ENV=production
export SKIP_PREFLIGHT_CHECK=true
export DISABLE_TYPESCRIPT=true
export SKIP_TYPESCRIPT_CHECK=true
export NODE_OPTIONS="--openssl-legacy-provider"
export DISABLE_ESLINT_PLUGIN=true
export GENERATE_SOURCEMAP=false

# Create build directory if it doesn't exist
mkdir -p build

# Run the build
echo "Starting build process..."
npm run build

# Ensure the build directory exists and has content
if [ ! -d "build" ]; then
  echo "Error: build directory was not created"
  exit 1
fi

# List build contents
echo "Build directory contents:"
ls -la build

# Create redirects file
echo "Creating _redirects file..."
echo "/* /index.html 200" > build/_redirects

# Success
echo "Build completed successfully" 