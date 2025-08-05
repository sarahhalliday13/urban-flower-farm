#!/bin/bash

# Auto-commit hook for Claude Code
# Commits code changes automatically after successful modifications

# Configuration
ENABLE_AUTO_COMMIT=${CLAUDE_AUTO_COMMIT:-true}
COMMIT_PREFIX="[auto-commit]"
BRANCH_NAME=$(git branch --show-current 2>/dev/null)

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if auto-commit is enabled
if [ "$ENABLE_AUTO_COMMIT" != "true" ]; then
    exit 0
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not in a git repository. Skipping auto-commit.${NC}"
    exit 0
fi

# Function to check if there are changes to commit
has_changes() {
    git diff --quiet && git diff --cached --quiet
    return $?
}

# Function to check if last command was successful
# This checks the last tool output for common error patterns
check_last_command_success() {
    # Check for common error indicators in recent operations
    # You can customize these patterns based on your needs
    if git status --porcelain | grep -E "\.js$|\.jsx$|\.css$|\.json$|\.md$" > /dev/null; then
        # Check if files have syntax errors by attempting to parse them
        for file in $(git diff --name-only); do
            case "$file" in
                *.json)
                    if ! python -m json.tool "$file" > /dev/null 2>&1; then
                        echo -e "${RED}❌ JSON syntax error in $file. Skipping auto-commit.${NC}"
                        return 1
                    fi
                    ;;
                *.js|*.jsx)
                    # Basic syntax check - you could add more sophisticated checks
                    if grep -E "<<<<<<|>>>>>>|=======" "$file" > /dev/null 2>&1; then
                        echo -e "${RED}❌ Merge conflict markers found in $file. Skipping auto-commit.${NC}"
                        return 1
                    fi
                    ;;
            esac
        done
    fi
    return 0
}

# Main logic
if has_changes; then
    if check_last_command_success; then
        # Get list of modified files
        MODIFIED_FILES=$(git diff --name-only | head -5 | tr '\n' ', ' | sed 's/,$//')
        if [ $(git diff --name-only | wc -l) -gt 5 ]; then
            MODIFIED_FILES="$MODIFIED_FILES and more"
        fi
        
        # Generate commit message
        TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
        COMMIT_MSG="$COMMIT_PREFIX Update: $MODIFIED_FILES"
        
        # Add all changes
        git add -A
        
        # Commit changes
        if git commit -m "$COMMIT_MSG" -m "Automated commit at $TIMESTAMP on branch: $BRANCH_NAME" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Auto-committed changes: $MODIFIED_FILES${NC}"
            
            # Optional: Show commit hash
            COMMIT_HASH=$(git rev-parse --short HEAD)
            echo -e "${GREEN}   Commit: $COMMIT_HASH${NC}"
            
            # Optional: Push to remote (disabled by default for safety)
            # Uncomment the following lines to enable auto-push
            # if [ "$CLAUDE_AUTO_PUSH" = "true" ]; then
            #     if git push origin "$BRANCH_NAME" > /dev/null 2>&1; then
            #         echo -e "${GREEN}   Pushed to origin/$BRANCH_NAME${NC}"
            #     else
            #         echo -e "${YELLOW}   ⚠️  Failed to push to remote${NC}"
            #     fi
            # fi
        else
            echo -e "${YELLOW}⚠️  Failed to create auto-commit${NC}"
        fi
    fi
else
    # No changes to commit
    exit 0
fi