#!/bin/bash

# Auto-commit hook triggered after successful file edits
# This hook is called specifically after Edit/Write operations succeed

# Configuration
ENABLE_AUTO_COMMIT=${CLAUDE_AUTO_COMMIT:-true}
COMMIT_PREFIX="feat:"  # Use conventional commit format
MIN_CHANGES_SIZE=10    # Minimum characters changed to trigger commit

# Exit if auto-commit is disabled
if [ "$ENABLE_AUTO_COMMIT" != "true" ]; then
    exit 0
fi

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if in git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    exit 0
fi

# Get the edited file from Claude Code context
EDITED_FILE="${CLAUDE_EDITED_FILE:-}"
if [ -z "$EDITED_FILE" ]; then
    # If no specific file, check for any changes
    CHANGED_FILES=$(git diff --name-only)
    if [ -z "$CHANGED_FILES" ]; then
        exit 0
    fi
    EDITED_FILE=$(echo "$CHANGED_FILES" | head -1)
fi

# Check if file exists and has changes
if [ -f "$EDITED_FILE" ] && ! git diff --quiet "$EDITED_FILE"; then
    # Get change statistics
    CHANGES=$(git diff --numstat "$EDITED_FILE" | awk '{print $1+$2}')
    
    if [ "$CHANGES" -ge "$MIN_CHANGES_SIZE" ]; then
        # Determine commit type based on file
        case "$EDITED_FILE" in
            *.test.js|*.spec.js|*.test.jsx)
                COMMIT_TYPE="test"
                ;;
            *.css|*.scss)
                COMMIT_TYPE="style"
                ;;
            */components/*)
                COMMIT_TYPE="feat"
                ;;
            *.md|README*|CLAUDE*)
                COMMIT_TYPE="docs"
                ;;
            */services/*|*/utils/*)
                COMMIT_TYPE="refactor"
                ;;
            *)
                COMMIT_TYPE="update"
                ;;
        esac
        
        # Extract file name without path for commit message
        FILE_NAME=$(basename "$EDITED_FILE")
        
        # Create meaningful commit message
        COMMIT_MSG="$COMMIT_TYPE: update $FILE_NAME"
        
        # Add file
        git add "$EDITED_FILE"
        
        # Commit
        if git commit -m "$COMMIT_MSG" --no-verify > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Auto-committed: $COMMIT_MSG${NC}"
            echo -e "${BLUE}   Changes: +$CHANGES lines${NC}"
        fi
    fi
fi