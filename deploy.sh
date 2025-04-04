#!/bin/bash
echo "=== Building and Deploying Buttons Flower Farm App ==="

# Building the React app
echo "Building React app..."
npm run build

# Deploy to Firebase Hosting
echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "Deployment complete!" 