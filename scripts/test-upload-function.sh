#!/bin/bash

FUNCTION_URL="https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net/uploadImage"

# First test the GET endpoint
echo "Testing GET endpoint..."
curl -v "$FUNCTION_URL"

echo -e "\n\nTesting OPTIONS request for CORS..."
curl -v -X OPTIONS "$FUNCTION_URL" \
  -H "Origin: https://urban-flower-farm-staging.web.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

echo -e "\n\nDone." 