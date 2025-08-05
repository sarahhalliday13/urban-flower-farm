#!/bin/bash

# Simple auto-commit hook for successful Edit/Write operations
# This is the most reliable hook for auto-committing code changes

# Quick exit if not in git repo
git rev-parse --git-dir > /dev/null 2>&1 || exit 0

# Check if auto-commit is enabled
if [ "${CLAUDE_AUTO_COMMIT}" != "true" ]; then
    exit 0
fi

# Get current branch
BRANCH=$(git branch --show-current)

# Skip on protected branches
if [[ "$BRANCH" == "main" || "$BRANCH" == "production" ]]; then
    echo "⚠️  Skipping auto-commit on protected branch: $BRANCH"
    exit 0
fi

# Check for changes
if git diff --quiet && git diff --cached --quiet; then
    exit 0
fi

# Simple commit with timestamp
TIMESTAMP=$(date +"%H:%M:%S")
git add -A
git commit -m "Auto-update at $TIMESTAMP" --no-verify > /dev/null 2>&1 && \
    echo "✅ Changes auto-committed at $TIMESTAMP"