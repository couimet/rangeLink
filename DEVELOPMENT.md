# Development Guide

Quick start guide for developing RangeLink.

## Quick Start (2 Minutes)

```bash
# Clone and setup
git clone https://github.com/couimet/rangelink.git
cd rangelink

# Use `setup` script to get started quickly
./setup.sh
```

## Monorepo Structure

RangeLink uses pnpm workspaces with two packages:

```
rangeLink/
  packages/
    rangelink-core-ts/            # Pure TypeScript core library
      src/
        types/                    # Domain models, enums
        selection/                # Selection analysis
        formatting/               # Link generation
        validation/               # Config validation
      tests/                      # Comprehensive test suite
      package.json

    rangelink-vscode-extension/   # VSCode extension
      src/
        extension.ts              # Extension entry point
        commands/                 # Command implementations
        config/                   # Configuration loading
      tests/                      # Extension-specific tests
      package.json

  docs/                           # Comprehensive documentation
```

## Development Commands

### Running Tests

```bash
# Run all tests with coverage
pnpm -r test

# Run tests for specific package
cd packages/rangelink-core-ts
pnpm test

cd packages/rangelink-vscode-extension
pnpm test

# Watch mode
pnpm test:watch
```

### Building

```bash
# Build all packages
pnpm -r compile

# Build specific package
cd packages/rangelink-core-ts
pnpm compile

cd packages/rangelink-vscode-extension
pnpm compile

# Watch mode (auto-compile on changes)
cd packages/rangelink-vscode-extension
pnpm watch
```

### Linting and Formatting

```bash
# Lint all packages
pnpm -r lint

# Format all packages
pnpm -r format

# Fix issues automatically
pnpm -r lint:fix
pnpm -r format:fix
```

### Clean Build Artifacts

```bash
# Clean all packages
pnpm -r clean

# Clean specific package
cd packages/rangelink-core-ts
pnpm clean
```

## Debugging the Extension

### VSCode Extension Development Host

1. Open workspace in VSCode: `code .`
2. Set breakpoints in `packages/rangelink-vscode-extension/src/extension.ts`
3. Press `F5` to launch Extension Development Host
4. Test your changes in the new window
5. Debugger will pause at breakpoints

### Reload After Changes

In the Extension Development Host window:
- **Reload:** `Cmd+R` (Mac) / `Ctrl+R` (Win/Linux)
- Or use Command Palette → "Developer: Reload Window"

### Watch Mode for Faster Iteration

```bash
cd packages/rangelink-vscode-extension
pnpm watch
```

Then just reload the Extension Development Host after making changes.

## Core Library Development

### Philosophy

The core library (`rangelink-core-ts`) follows strict principles:

1. **Zero Dependencies** - No runtime dependencies
2. **Platform-Agnostic** - No VSCode coupling
3. **100% Test Coverage** - Comprehensive test suite
4. **Structured Logging** - All messages use error codes

### Key Modules

**Domain Models** (`src/types/`):
- `Selection.ts` - Platform-agnostic selection interface
- `RangeLinkConfig.ts` - Configuration interface
- `HashMode.ts` - Selection mode enum
- `RangeLinkMessageCode.ts` - Structured logging codes

**Selection Analysis** (`src/selection/`):
- `isRectangularSelection.ts` - Rectangular selection detection

**Link Formatting** (`src/formatting/`):
- `formatLink.ts` - Link generation logic

**Validation** (`src/validation/`):
- `validateConfig.ts` - Configuration validation
- `validateDelimiter.ts` - Delimiter validation rules

### Testing Strategy

```bash
cd packages/rangelink-core-ts

# Run tests
pnpm test

# Coverage report
pnpm test:coverage

# Watch mode
pnpm test:watch
```

**Test categories:**
- Unit tests (isolated components)
- Integration tests (multi-component)
- Edge cases (boundary values, empty inputs)
- Error conditions (validation failures)
- Custom configurations (all delimiter combinations)

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture information.

## Extension Development

### Key Files

**Extension Entry Point** (`src/extension.ts`):
- Registers commands
- Loads configuration
- Creates output channel logger

**Command Handlers** (`src/commands/`):
- `copyLinkCommand.ts` - Standard link commands
- `copyPortableLinkCommand.ts` - Portable link commands

**Configuration** (`src/config/`):
- `loadConfig.ts` - Load and validate configuration
- Adapts VSCode settings to core library types

### Adding a New Command

1. Define command in `package.json`:
   ```json
   {
     "command": "rangelink.myNewCommand",
     "title": "My New Command",
     "category": "RangeLink"
   }
   ```

2. Add keybinding in `package.json`:
   ```json
   {
     "command": "rangelink.myNewCommand",
     "key": "ctrl+r ctrl+n",
     "mac": "cmd+r cmd+n"
   }
   ```

3. Implement handler in `src/commands/`:
   ```typescript
   export function myNewCommand(context: vscode.ExtensionContext): void {
     // Implementation
   }
   ```

4. Register in `src/extension.ts`:
   ```typescript
   const disposable = vscode.commands.registerCommand(
     'rangelink.myNewCommand',
     myNewCommand
   );
   context.subscriptions.push(disposable);
   ```

## Testing Checklist

### Manual Testing

- [ ] Empty selection (cursor position only)
- [ ] Single line selection
- [ ] Multi-line selection
- [ ] Selection with specific columns
- [ ] Rectangular selection (Alt+drag)
- [ ] Workspace with multiple folders
- [ ] Single file workspace
- [ ] No active workspace
- [ ] Custom delimiter configuration
- [ ] Invalid delimiter configuration (should fall back)

### Automated Testing

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage meets target (100% for core, 90%+ for extension)
- [ ] No linting errors
- [ ] Formatting is consistent

## Packaging for Distribution

To create a `.vsix` package for local testing or marketplace publishing, see [PUBLISHING.md](./PUBLISHING.md) for complete instructions on:
- Creating VSIX packages
- Installing packages locally
- Testing before publishing
- Publishing to VSCode Marketplace

## Development Workflow

### Micro-Iterations (Recommended)

RangeLink uses **micro-iterations** (1-2 hours) to maintain focus:

1. **Define scope** - What IS and IS NOT in scope
2. **Estimate time** - Aim for 1-2 hours max
3. **Implement with tests** - Write tests during iteration
4. **Commit** - Commit after each iteration
5. **Move to next** - Start next micro-iteration

See [docs/ROADMAP.md](./docs/ROADMAP.md) for detailed iteration planning.

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes with frequent commits
git add .
git commit -m "feat: add my feature"

# Push to fork
git push origin feature/my-feature

# Open pull request on GitHub
```

### Commit Message Format

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes

Examples:
```
feat(core): add multi-range link support
fix(extension): handle empty selections gracefully
docs: update ROADMAP with Phase 3 details
test(core): add rectangular selection edge cases
```

## Troubleshooting

### Tests Failing

```bash
# Clean and rebuild
pnpm -r clean
pnpm -r compile
pnpm -r test
```

### Extension Not Loading

1. Check Output panel → "Extension Host"
2. Check for compilation errors in `out/` directory
3. Reload Extension Development Host (`Cmd+R` / `Ctrl+R`)

### Type Errors

```bash
# Rebuild TypeScript
pnpm -r compile
```

### Linting Errors

```bash
# Auto-fix linting issues
pnpm -r lint:fix
pnpm -r format:fix
```

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

## Next Steps

After getting familiar with the codebase:

1. Pick an issue from [GitHub Issues](https://github.com/couimet/rangelink/issues)
2. Review [docs/ROADMAP.md](./docs/ROADMAP.md) for planned features
3. Check [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for design patterns
4. Start with small contributions (docs, tests, bug fixes)
5. Work up to larger features
