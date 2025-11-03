# Developing RangeLink Core Library

> **Note:** This guide covers development of the core TypeScript library specifically. For general monorepo setup and workspace-wide commands, see the [root DEVELOPMENT.md](../../DEVELOPMENT.md).

The core library (`rangelink-core-ts`) is a pure TypeScript implementation of RangeLink's link generation and validation logic.

## Prerequisites

Before starting core library development, ensure you've completed the general project setup:

```bash
# From project root
./setup.sh
```

See [root DEVELOPMENT.md](../../DEVELOPMENT.md) for detailed setup instructions.

## Philosophy

The core library follows strict principles:

1. **Zero Dependencies** - No runtime dependencies
2. **Platform-Agnostic** - No VSCode coupling
3. **100% Test Coverage** - Comprehensive test suite
4. **Structured Logging** - All messages use error codes

## Architecture

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

## Development Commands

### Running Tests

```bash
# From project root
cd packages/rangelink-core-ts

# Run tests
pnpm test

# Coverage report
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Building

```bash
# Compile TypeScript
pnpm compile

# Watch mode (auto-compile on changes)
pnpm watch

# Clean build artifacts
pnpm clean
```

### Linting and Formatting

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Auto-fix issues
pnpm lint:fix
pnpm format:fix
```

## Testing Strategy

**Test categories:**

- Unit tests (isolated components)
- Integration tests (multi-component)
- Edge cases (boundary values, empty inputs)
- Error conditions (validation failures)
- Custom configurations (all delimiter combinations)

**Coverage goals:**

- 100% branch coverage
- 100% function coverage
- 100% line coverage

## Additional Resources

### Project Documentation

- [Root DEVELOPMENT.md](../../DEVELOPMENT.md) - Monorepo-wide development
- [Architecture](../../docs/ARCHITECTURE.md) - System design
- [Roadmap](../../docs/ROADMAP.md) - Planned features
- [Link Formats](../../docs/LINK-FORMATS.md) - Link notation guide
- [BYOD](../../docs/BYOD.md) - Portable links
- [Error Handling](../../docs/ERROR-HANDLING.md) - Error codes and validation
- [Logging](../../docs/LOGGING.md) - Structured logging approach

### TypeScript Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
