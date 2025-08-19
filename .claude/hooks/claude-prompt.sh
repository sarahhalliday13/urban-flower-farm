#!/bin/bash

# Claude Status Line - Shows current git branch and Claude model
# Source this file to update your prompt with git branch and Claude info

# Function to get current git branch
git_branch() {
    git branch 2>/dev/null | grep '^*' | sed 's/* //'
}

# Claude model info (Opus 4)
CLAUDE_MODEL="Opus 4"

# For Bash
if [ -n "$BASH_VERSION" ]; then
    # Original PS1 backup
    export ORIGINAL_PS1="${PS1}"
    
    # New prompt with git branch and Claude model
    export PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\] \[\033[01;33m\][$(git_branch)]\[\033[00m\] \[\033[01;36m\][Claude: ${CLAUDE_MODEL}]\[\033[00m\]\$ '
fi

# For Zsh
if [ -n "$ZSH_VERSION" ]; then
    # Enable command substitution in prompts
    setopt PROMPT_SUBST
    
    # Original PROMPT backup
    export ORIGINAL_PROMPT="${PROMPT}"
    
    # New prompt with git branch and Claude model
    export PROMPT='%F{green}%n@%m%f:%F{blue}%~%f %F{yellow}[$(git_branch)]%f %F{cyan}[Claude: ${CLAUDE_MODEL}]%f$ '
fi

# Function to restore original prompt
restore_prompt() {
    if [ -n "$BASH_VERSION" ]; then
        export PS1="${ORIGINAL_PS1}"
    elif [ -n "$ZSH_VERSION" ]; then
        export PROMPT="${ORIGINAL_PROMPT}"
    fi
    echo "Original prompt restored"
}

# Function to show simplified prompt
simple_prompt() {
    if [ -n "$BASH_VERSION" ]; then
        export PS1='\u@\h:\w [$(git_branch)] \$ '
    elif [ -n "$ZSH_VERSION" ]; then
        export PROMPT='%n@%m:%~ [$(git_branch)] $ '
    fi
    echo "Simplified prompt activated"
}

echo "Claude status line loaded! Current branch: $(git_branch) | Model: ${CLAUDE_MODEL}"
echo "Commands available:"
echo "  restore_prompt - Restore original prompt"
echo "  simple_prompt  - Use simplified prompt without colors"