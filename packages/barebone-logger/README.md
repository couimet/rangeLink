# barebone-logger

> Minimal logging interface for TypeScript — zero dependencies, framework-agnostic

## Overview

**barebone-logger** provides a simple, type-safe logging interface that can be implemented by any logging backend. With zero runtime dependencies and a minimal API surface (just 4 methods), it's perfect for libraries and applications that need logging without coupling to specific logging frameworks.

The package follows the dependency injection pattern, allowing you to swap logging implementations at runtime while keeping your code clean and testable.

## Key Features

- **Zero dependencies** — No runtime dependencies, minimal footprint
- **Framework-agnostic** — Works anywhere: VSCode extensions, Neovim plugins, IntelliJ extensions, web apps, Node.js services
- **Minimal interface** — Just 4 methods: `debug()`, `info()`, `warn()`, `error()`
- **Dependency injection** — Swap logger implementations at runtime
- **TypeScript-first** — Full type safety with structured log contexts
- **100% test coverage** — Reliable and well-tested

## Installation

```bash
# Coming soon to npm
npm install barebone-logger

# Current: pnpm workspace
{
  "dependencies": {
    "barebone-logger": "workspace:*"
  }
}
```

## Quick Start

### The Logger Interface

```typescript
import type { Logger, LogContext } from 'barebone-logger';

interface Logger {
  debug(context: LogContext, message: string): void;
  info(context: LogContext, message: string): void;
  warn(context: LogContext, message: string): void;
  error(context: LogContext, message: string): void;
}

type LogContext = Record<string, unknown>;
```

### Implementing a Logger

```typescript
import type { Logger, LogContext } from 'barebone-logger';

export class ConsoleLogger implements Logger {
  debug(context: LogContext, message: string): void {
    console.debug('[DEBUG]', message, context);
  }

  info(context: LogContext, message: string): void {
    console.info('[INFO]', message, context);
  }

  warn(context: LogContext, message: string): void {
    console.warn('[WARN]', message, context);
  }

  error(context: LogContext, message: string): void {
    console.error('[ERROR]', message, context);
  }
}
```

### Using the Logger

```typescript
import { setLogger, getLogger } from 'barebone-logger';
import { ConsoleLogger } from './ConsoleLogger';

// Set your logger implementation once at startup
setLogger(new ConsoleLogger());

// Use it anywhere in your codebase
const logger = getLogger();
logger.info(
  { userId: 123, action: 'login' },
  'User logged in successfully'
);
```

### Library/Package Usage Pattern

```typescript
import { getLogger } from 'barebone-logger';

export const processData = (data: unknown) => {
  const logger = getLogger();

  logger.debug({ fn: 'processData', data }, 'Processing data');

  try {
    // ... your logic
    logger.info({ fn: 'processData' }, 'Data processed successfully');
  } catch (error) {
    logger.error(
      { fn: 'processData', error },
      'Failed to process data'
    );
    throw error;
  }
};
```

## API Reference

### Logger Interface

#### `debug(context, message)`
Log debug-level information (verbose, diagnostic details).

#### `info(context, message)`
Log informational messages (normal operation events).

#### `warn(context, message)`
Log warning messages (potential issues, deprecated usage).

#### `error(context, message)`
Log error messages (failures, exceptions).

**Parameters:**
- `context: LogContext` — Structured data providing context (e.g., `{ userId, action, error }`)
- `message: string` — Human-readable log message

### Global Logger Management

#### `setLogger(logger: Logger): void`
Set the global logger implementation. Call once at application startup.

```typescript
import { setLogger } from 'barebone-logger';
import { MyLogger } from './MyLogger';

setLogger(new MyLogger());
```

#### `getLogger(): Logger`
Get the current logger instance. Returns `NoOpLogger` if no logger has been set.

```typescript
import { getLogger } from 'barebone-logger';

const logger = getLogger();
logger.info({}, 'Application started');
```

#### `pingLog(): void`
Exercise all logger levels (DEBUG, INFO, WARN, ERROR) to verify logger is configured correctly. Useful for smoke testing logger initialization.

```typescript
import { pingLog } from 'barebone-logger';

// After setLogger(), verify it works
pingLog();
// Logs:
// DEBUG: Logger initialized
// INFO: Logger operational
// WARN: Logger warning test
// ERROR: Logger error test
```

### NoOpLogger

Built-in no-op implementation that silently discards all logs. Used as default when no logger is set.

```typescript
import { NoOpLogger } from 'barebone-logger';

const logger = new NoOpLogger();
logger.info({}, 'This will be silently discarded');
```

## Testing

For testing code that uses `barebone-logger`, see the companion package [**barebone-logger-testing**](../barebone-logger-testing/README.md), which provides a zero-setup mock logger factory for Jest.

## License

MIT
