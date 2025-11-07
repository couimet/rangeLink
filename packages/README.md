# RangeLink Packages

<div align="center">
  <img src="../assets/icon.png" alt="RangeLink Logo" width="80" />
</div>

This directory contains the RangeLink monorepo packages. Each package has its own `README` with detailed usage information.

## 📁 Structure

RangeLink uses a **pnpm workspace** monorepo with two primary packages:

```
rangeLink/
  packages/
    rangelink-core-ts/        # Pure TypeScript core library
      src/
        types/                # Domain models and enums
        selection/            # Selection analysis
        formatting/           # Link generation
        validation/           # Configuration validation
        parsing/              # Link parsing (future)
      tests/                  # Comprehensive test suite
      package.json

    rangelink-vscode-extension/ # VSCode extension (thin wrapper)
      src/
        extension.ts          # Extension entry point
        commands/             # Command implementations
        config/               # Configuration loading
      tests/                  # Extension-specific tests
      package.json

  docs/                       # Comprehensive documentation
  .commits/                   # Commit message templates
  README.md                   # Monorepo overview
```

## 📦 Packages

### [`rangelink-core-ts/`](./rangelink-core-ts)

Pure TypeScript core library — zero dependencies, platform-agnostic.

- ✅ Link generation and parsing
- ✅ Selection analysis (rectangular detection)
- ✅ Configuration validation
- ✅ BYOD (portable links) support

**[📖 Core Library README](./rangelink-core-ts/README.md)** | **[🔧 Development Guide](./rangelink-core-ts/DEVELOPMENT.md)**

### [`rangelink-vscode-extension/`](./rangelink-vscode-extension)

VS Code extension — thin wrapper around the core library.

- ✅ Commands and keyboard shortcuts
- ✅ Configuration integration
- ✅ Status bar feedback
- ✅ Terminal binding (claude-code integration)

**[📖 Extension README](./rangelink-vscode-extension/README.md)** | **[🔧 Development Guide](./rangelink-vscode-extension/DEVELOPMENT.md)**

---

## 📚 Understanding the Architecture

Want to understand how these packages work together?

- **[Architecture Overview](../docs/ARCHITECTURE.md)** — Design principles, package relationships, and multi-language vision
- **[Development Guide](../DEVELOPMENT.md)** — Monorepo setup, workspace commands, and workflow
- **[Root README](../README.md#monorepo-structure)** — Quick overview of the monorepo structure

---

**💡 Tip:** Each package has its own `DEVELOPMENT.md` with package-specific commands and debugging instructions.
