#!/usr/bin/env bash

# Portable script to ensure nvm and pnpm are available before running pnpm commands
# Usage: ./scripts/pnpm-exec.sh <pnpm command and args>

# Source the user's shell RC file to get their environment setup
# This ensures nvm, node, and other tools are available
if [ -n "$SHELL" ]; then
    SHELL_NAME="$(basename "$SHELL")"
    case "$SHELL_NAME" in
        zsh)
            [ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null || true
            ;;
        bash)
            if [ -f "$HOME/.bashrc" ]; then
                source "$HOME/.bashrc" 2>/dev/null || true
            elif [ -f "$HOME/.bash_profile" ]; then
                source "$HOME/.bash_profile" 2>/dev/null || true
            fi
            ;;
    esac
fi

# If nvm is still not available, try loading it directly
if ! command -v nvm &> /dev/null; then
    if [ -n "$NVM_DIR" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
        source "$NVM_DIR/nvm.sh"
    elif [ -s "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        source "$NVM_DIR/nvm.sh"
    fi
fi

# Use the node version from .nvmrc if nvm is available
if command -v nvm &> /dev/null; then
    nvm use &> /dev/null || true
fi

# Enable corepack and pnpm if not already available
if ! command -v pnpm &> /dev/null && command -v corepack &> /dev/null; then
    corepack enable pnpm &> /dev/null || true
    # Update PATH to include node's bin directory where pnpm gets installed
    NODE_BIN_DIR="$(dirname "$(command -v node)")"
    export PATH="$NODE_BIN_DIR:$PATH"
fi

# If pnpm is still not available, use fallback methods
if ! command -v pnpm &> /dev/null; then
    if command -v corepack &> /dev/null; then
        exec corepack pnpm "$@"
    elif command -v npx &> /dev/null; then
        exec npx pnpm "$@"
    else
        echo "Error: pnpm not found. Please run 'corepack enable pnpm' or install pnpm." >&2
        exit 1
    fi
fi

# Execute pnpm with all arguments passed to this script
exec pnpm "$@"
