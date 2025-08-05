# Claude Code Auto-Commit Hooks

This directory contains hooks that automatically commit your code changes to Git after successful modifications by Claude Code.

## Features

- 🔄 **Automatic Commits**: Commits changes after successful file edits
- 🎯 **Smart Detection**: Only commits when changes are substantial and error-free
- 🏷️ **Conventional Commits**: Uses proper commit message formats (feat:, fix:, etc.)
- 🛡️ **Safety Features**: Branch protection, syntax checking, and configurable behavior
- 📝 **Meaningful Messages**: Generates descriptive commit messages based on changes

## Setup

The hooks are already created and executable. To activate them:

1. **Source the configuration** (add to your shell profile for persistence):
   ```bash
   source .claude/hooks/config.sh
   ```

2. **Enable auto-commit**:
   ```bash
   claude_auto_commit_on
   # or use alias
   ccon
   ```

## Usage

### Basic Commands

```bash
# Enable auto-commit
ccon

# Disable auto-commit
ccoff

# View current configuration
ccconfig

# Enable auto-push (CAREFUL!)
ccpush

# Disable auto-push
ccnopush
```

### Environment Variables

You can customize behavior by setting these environment variables:

```bash
# Enable/disable auto-commit
export CLAUDE_AUTO_COMMIT=true

# Enable/disable auto-push (disabled by default)
export CLAUDE_AUTO_PUSH=false

# Set commit message prefix
export CLAUDE_COMMIT_PREFIX="[Claude]"

# Use conventional commit format
export CLAUDE_USE_CONVENTIONAL_COMMITS=true

# Minimum lines changed to trigger commit
export CLAUDE_MIN_CHANGE_SIZE=5
```

## How It Works

1. **Post-Command Hook** (`post-command.sh`):
   - Runs after Claude Code executes any command
   - Checks for uncommitted changes
   - Validates files for syntax errors
   - Creates commits with descriptive messages

2. **Post-Edit Success Hook** (`post-edit-success.sh`):
   - Triggers specifically after successful Edit/Write operations
   - Analyzes the type of file changed
   - Uses conventional commit format based on file type

## Commit Message Format

The hooks generate intelligent commit messages:

- `feat: update ComponentName.jsx` - New features or component updates
- `fix: resolve issue in firebase.js` - Bug fixes
- `style: update Shop.css` - Style changes
- `docs: update README.md` - Documentation updates
- `test: update OrderTests.js` - Test modifications

## Safety Features

1. **Branch Protection**: Won't auto-commit on protected branches (configure in config.sh)
2. **Syntax Validation**: Checks for JSON syntax errors and merge conflicts
3. **Size Threshold**: Only commits substantial changes
4. **No Auto-Push by Default**: Pushing is disabled by default for safety

## Customization

Edit `.claude/hooks/config.sh` to customize:
- File patterns to include/exclude
- Protected branches
- Commit message formats
- Minimum change thresholds

## Disable Temporarily

To temporarily disable auto-commit:
```bash
ccoff
```

Or set the environment variable:
```bash
export CLAUDE_AUTO_COMMIT=false
```

## Troubleshooting

- **Commits not happening?** Check if auto-commit is enabled: `ccconfig`
- **Want to skip a commit?** Disable temporarily: `ccoff`
- **Need to see what's happening?** Check git status: `git status`

## Best Practices

1. Review commits periodically: `git log --oneline`
2. Use meaningful branch names for better commit context
3. Disable auto-commit when doing experimental work
4. Never enable auto-push on shared branches

---

Remember: These hooks enhance your workflow but don't replace careful code review and testing!