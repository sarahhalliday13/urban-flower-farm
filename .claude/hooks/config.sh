#!/bin/bash

# Claude Code Auto-Commit Hook Configuration
# Source this file in your shell to configure auto-commit behavior

# Enable/Disable auto-commit globally
export CLAUDE_AUTO_COMMIT=true

# Enable/Disable auto-push (BE CAREFUL - disabled by default)
export CLAUDE_AUTO_PUSH=false

# Commit message settings
export CLAUDE_COMMIT_PREFIX="[Claude]"  # Prefix for commit messages
export CLAUDE_USE_CONVENTIONAL_COMMITS=true  # Use feat:, fix:, etc.

# File patterns to auto-commit (space-separated)
export CLAUDE_AUTO_COMMIT_PATTERNS="*.js *.jsx *.css *.json *.md"

# File patterns to exclude from auto-commit
export CLAUDE_EXCLUDE_PATTERNS="*.log *.tmp node_modules/* .env*"

# Minimum file size change to trigger commit (in lines)
export CLAUDE_MIN_CHANGE_SIZE=5

# Branch protection - prevent auto-commits on these branches
export CLAUDE_PROTECTED_BRANCHES="main production"

# Functions to control auto-commit

# Enable auto-commit for current session
claude_auto_commit_on() {
    export CLAUDE_AUTO_COMMIT=true
    echo "✅ Claude auto-commit enabled"
}

# Disable auto-commit for current session
claude_auto_commit_off() {
    export CLAUDE_AUTO_COMMIT=false
    echo "❌ Claude auto-commit disabled"
}

# Enable auto-push (use with caution!)
claude_auto_push_on() {
    export CLAUDE_AUTO_PUSH=true
    echo "✅ Claude auto-push enabled (BE CAREFUL!)"
}

# Disable auto-push
claude_auto_push_off() {
    export CLAUDE_AUTO_PUSH=false
    echo "❌ Claude auto-push disabled"
}

# Show current configuration
claude_config() {
    echo "Claude Code Hook Configuration:"
    echo "  Auto-commit: ${CLAUDE_AUTO_COMMIT}"
    echo "  Auto-push: ${CLAUDE_AUTO_PUSH}"
    echo "  Commit prefix: ${CLAUDE_COMMIT_PREFIX}"
    echo "  Conventional commits: ${CLAUDE_USE_CONVENTIONAL_COMMITS}"
    echo "  Min change size: ${CLAUDE_MIN_CHANGE_SIZE} lines"
}

# Add aliases for convenience
alias ccon="claude_auto_commit_on"
alias ccoff="claude_auto_commit_off"
alias ccpush="claude_auto_push_on"
alias ccnopush="claude_auto_push_off"
alias ccconfig="claude_config"