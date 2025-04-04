#!/bin/bash

echo "🔄 Restoring production settings..."

# Restore original firebase.json if backup exists
if [ -f .local-config/firebase.json.original ]; then
  cp .local-config/firebase.json.original firebase.json
  echo "✅ Restored original firebase.json"
fi

# Restore original .gitignore if backup exists
if [ -f .local-config/.gitignore.original ]; then
  cp .local-config/.gitignore.original .gitignore
  echo "✅ Restored original .gitignore"
fi

# Remove local config files
rm -f .runtimeconfig.json
rm -f functions/.env

echo "✅ Local configuration removed. Safe to commit or push changes."
