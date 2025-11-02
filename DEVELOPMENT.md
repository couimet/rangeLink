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

### Formatting

```bash
# Format code
pnpm format:fix
```

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
