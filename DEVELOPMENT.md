# Development Guide

> **Note:** This guide covers monorepo-wide setup. For package-specific development, see the DEVELOPMENT.md in each package directory.

Quick start guide for developing RangeLink.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/couimet/rangelink.git
cd rangelink
./setup.sh
```

## Monorepo Structure

RangeLink uses pnpm workspaces with two packages:

```
rangeLink/
  packages/
    rangelink-core-ts/            # Pure TypeScript core library
    rangelink-vscode-extension/   # VSCode extension
  docs/                           # Project documentation
```

## Package-Specific Development

For detailed development guides:

- **Core Library:** [packages/rangelink-core-ts/DEVELOPMENT.md](./packages/rangelink-core-ts/DEVELOPMENT.md)
  - Testing strategy
  - Module architecture
  - Build commands

- **VS Code Extension:** [packages/rangelink-vscode-extension/DEVELOPMENT.md](./packages/rangelink-vscode-extension/DEVELOPMENT.md)
  - Extension Development Host (F5 debugging)
  - Local installation and testing
  - Extension architecture

## Workspace Commands

### Tests

```bash
# Run all tests
pnpm test
```

### Build

```bash
# Build all packages
pnpm compile

# Clean build artifacts
pnpm clean
```

### Linting & Formatting

```bash
# Fix linting issues
pnpm lint:fix

# Format code
pnpm format:fix
```

## Working with Git Worktrees

Git worktrees allow you to work on multiple features in parallel without switching branches or stashing changes. This is especially useful when leveraging AI agents in parallel or when you need to quickly context-switch between tasks.

### Why Use Worktrees?

- **Parallel Development:** Work on multiple features simultaneously without branch switching
- **AI Agent Parallelization:** Run multiple AI agents on different features concurrently
- **Clean State:** Each worktree maintains its own working directory and index
- **Zero Context Loss:** No need to stash or commit WIP changes when switching tasks

**Naming Strategy:** Use generic numbered names (`rangeLink-001`, `rangeLink-002`, etc.) for maximum reusability. The branch name contains the feature description, while the worktree directory name stays generic and can be reused for any future work. You can also use descriptive names like `rangeLink-feature-name`, but generic numbers reduce cognitive overhead and make cleanup easier.

### Quick Reference

```bash
# List all worktrees
git worktree list

# Create a new worktree
git worktree add <path> -b <branch-name>

# Remove a worktree
git worktree remove <path>

# Cleanup stale worktrees
git worktree prune
```

### Real-Life Scenario: Feature Development

Let's walk through developing a new feature using a worktree:

#### 1. Create a Worktree for Your Feature

```bash
# From your main rangelink directory
cd ~/geek/src/rangeLink

# Create a new worktree in a sibling directory
# Using generic worktree name - branch name contains the feature description
git worktree add ../rangeLink-001 -b feature/add-copy-link-command

# Navigate to the new worktree
cd ../rangeLink-001
```

**What happened:**

- Created a new directory `rangeLink-001` alongside your main repo
- Created and checked out branch `feature/add-copy-link-command`
- The worktree is fully independent but shares the same Git repository

#### 2. Set Up the Worktree and Implement the New Feature

```bash
# Run project's setup script
./setup.sh

# Open your favortite IDE
code .

# Implement new feature

# Commit with a descriptive message

# Push the branch to remote and create a PR as you'd typically do
```

#### 3. Continue Working in Parallel

While your PR is under review, switch back to your main worktree to start another task:

```bash
# Go back to main worktree
cd ~/geek/src/rangeLink

# Your main worktree is still on main branch, unchanged
git status

# Create another worktree for a different feature
git worktree add ../rangeLink-002 -b fix/bug-123
```

#### 4. Clean Up After PR is Merged

```bash
# After PR is merged, go back to main worktree
cd ~/geek/src/rangeLink

# Update main branch
git checkout main
git pull

# Remove the feature worktree
git worktree remove ../rangeLink-001

# Delete the local branch (already merged)
git branch -d feature/add-copy-link-command
```

### Advanced Tips

**Using Worktrees with AI Agents:**

```bash
# Terminal 1: Main development
cd ~/geek/src/rangeLink
cursor .

# Terminal 2: AI agent working on feature A
cd ~/geek/src/rangeLink-001
cursor .

# Terminal 3: AI agent working on feature B
cd ~/geek/src/rangeLink-002
cursor .
```

**Shared Git Config:**
All worktrees share the same Git configuration, branches, tags, and remotes. Only the working directory and HEAD are independent.

**Node Modules:**
Each worktree needs its own `node_modules`. Always run `pnpm install` in new worktrees.

## Publishing

For publishing instructions:

- Root overview: [PUBLISHING.md](./PUBLISHING.md)
- Core Library: [packages/rangelink-core-ts/PUBLISHING.md](./packages/rangelink-core-ts/PUBLISHING.md)
- VS Code Extension: [packages/rangelink-vscode-extension/PUBLISHING.md](./packages/rangelink-vscode-extension/PUBLISHING.md)

## Documentation

### For Users

- [Extension README](./packages/rangelink-vscode-extension/README.md)
- [Link Formats](./docs/LINK-FORMATS.md)
- [BYOD Guide](./docs/BYOD.md)
- [Error Codes](./docs/ERROR-HANDLING.md)

### For Developers

- [Architecture](./docs/ARCHITECTURE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Logging](./docs/LOGGING.md)
- [Multi-Language Vision](./docs/architecture-multi-language.md)

## Questions?

- Open an issue on [GitHub Issues](https://github.com/couimet/rangelink/issues)
- Review [Architecture docs](./docs/ARCHITECTURE.md) for design decisions
- Check [Roadmap](./docs/ROADMAP.md) for planned features
