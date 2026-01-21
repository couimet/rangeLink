# RangeLink Core (TypeScript)

**Pure TypeScript domain model for RangeLink - zero runtime dependencies.**

## Overview

This package contains the pure business logic for RangeLink, completely decoupled from any IDE or platform. It provides:

- **Domain Types**: Selection, DelimiterConfig, PathFormat, etc.
- **Validation Logic**: Delimiter validation with comprehensive rules
- **Selection Analysis**: Rectangular Mode detection, range computation
- **Link Formatting**: Anchor building, hash prefixing, portable metadata

## Design Principles

1. **Zero External Dependencies**: Pure TypeScript, no runtime deps
2. **Platform Agnostic**: No VSCode, Node.js, or filesystem APIs
3. **Functional Error Handling**: `Result<T, E>` types throughout
4. **Dependency Injection**: Logger interface for optional logging
5. **100% Test Coverage**: Every branch tested

## Architecture

### Anti-Corruption Layer (ACL)

Core defines its own `Selection` interface (0-based indexing) to avoid coupling to VSCode's `vscode.Selection` type. IDE adapters translate between their platform types and core types.

### Logging

Core uses a `Logger` interface with dependency injection:

```typescript
import { setLogger, Logger } from 'rangelink-core-ts';

// Default: NoOpLogger (does nothing)
// In IDE: Provide real logger
setLogger(myCustomLogger);
```

### Error Handling

All functions return `Result<T, E>` for predictable error handling:

```typescript
const result = validateDelimiter('L', false);
if (!result.success) {
  console.error(result.error);
} else {
  // result.value is available
}
```

## Usage

```typescript
import { formatLink, Selection, DelimiterConfig, PathFormat } from 'rangelink-core-ts';

const selection: Selection = {
  startLine: 2,
  startCharacter: 13,
  endLine: 14,
  endCharacter: 8,
};

const delimiters: DelimiterConfig = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
};

const result = formatLink(
  'recipes/baking/chickenpie.ts',
  selection,
  delimiters,
  PathFormat.WorkspaceRelative,
);

if (result.success) {
  console.log(result.value); // "recipes/baking/chickenpie.ts#L3C14-L15C9"
}
```

## Development

```bash
# Install dependencies
pnpm install

# Compile
pnpm compile

# Run tests with coverage
pnpm test

# Type check
pnpm compile --noEmit
```

## License

MIT
