# Contributing to RangeLink

Thank you for your interest in contributing to RangeLink! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Make your changes in the `src` directory
5. Build the project: `npm run compile`

## Development Setup

### Prerequisites

- Node.js 22+ (comes with corepack so we can use `pnpm`)
- VS Code or Cursor (latest stable version)

**Enabling pnpm (one-time setup):**

```bash
npm run enable-pnpm
# This runs "corepack enable" - no extra installation needed!
```

### Setup Steps

1. Clone the repository:

```bash
git clone https://github.com/couimet/rangelink.git
cd rangelink
```

2. Install dependencies:

```bash
npm run setup
```

3. Compile the TypeScript:

```bash
pnpm run compile
```

4. Open in VS Code/Cursor:

```bash
code .
```

5. Press `F5` to launch a new Extension Development Host window

## Building and Testing

### Compile

```bash
pnpm run compile
```

### Watch Mode

```bash
pnpm run watch
```

### Package for Distribution

```bash
pnpm add -g vsce
vsce package
pnpm install -g vsce
vsce package
```

This creates a `.vsix` file that can be installed manually or published to the marketplace.

## Code Style

- Use TypeScript with strict mode
- Follow the existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes and commit them: `git commit -m "Add: your feature description"`
3. Push to your fork: `git push origin feature/your-feature-name`
4. Open a Pull Request on GitHub

## Pull Request Guidelines

- Provide a clear description of what the PR does
- Link to any related issues
- Ensure all code compiles without errors
- Update documentation if needed
- Follow the existing code style

## Questions?

If you have questions, feel free to open an issue on GitHub.
