#!/bin/bash

echo "📝 Documentation Update Assistant"
echo "================================"

# Get recent commits
echo -e "\n🔍 Recent code changes:"
git log --oneline -10 --grep -v "docs:" | head -5

# Get modified files in last commit
echo -e "\n📁 Files changed in last commit:"
git diff-tree --no-commit-id --name-only -r HEAD

# Prompt for updates
echo -e "\n📋 Documentation to update:"
echo "1. CLAUDE.md - Project context for AI assistants"
echo "2. README.md - Project overview and setup"
echo "3. /docs/* - Technical documentation"

echo -e "\n💡 Suggested updates based on recent changes:"

# Check for specific changes
if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
    echo "- Update dependencies in README.md"
fi

if git diff HEAD~1 HEAD --name-only | grep -q "firebase"; then
    echo "- Update Firebase configuration docs"
fi

if git diff HEAD~1 HEAD --name-only | grep -q "components/"; then
    echo "- Update component documentation"
fi

if git diff HEAD~1 HEAD --name-only | grep -q ".env"; then
    echo "- Update environment setup in README.md"
fi

echo -e "\n🚀 Run 'npm run build' after updating docs if needed"