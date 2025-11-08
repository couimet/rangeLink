# RangeLink Packages

<div align="center">
  <img src="../assets/icon.png" alt="RangeLink Logo" width="80" />
</div>

This directory contains the RangeLink monorepo packages. Each package has its own `README` with detailed usage information.

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

### [`barebone-logger/`](./barebone-logger)

Minimal logging interface — zero dependencies, framework-agnostic. Enables dependency injection for logging in any TypeScript project.

**[📖 README](./barebone-logger/README.md)**

### [`barebone-logger-testing/`](./barebone-logger-testing)

Testing companion for barebone-logger — provides mock logger factory for Jest test suites.

**[📖 README](./barebone-logger-testing/README.md)**

---

## 📚 Understanding the Architecture

Want to understand how these packages work together?

- **[Architecture Overview](../docs/ARCHITECTURE.md)** — Design principles, package relationships, and multi-language vision
- **[Development Guide](../DEVELOPMENT.md)** — Monorepo setup, workspace commands, and workflow
- **[Root README](../README.md#monorepo-structure)** — Quick overview of the monorepo structure

---

**💡 Tip:** Each package has its own `DEVELOPMENT.md` with package-specific commands and debugging instructions.
