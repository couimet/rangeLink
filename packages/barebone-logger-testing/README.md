# barebone-logger-testing

> Testing utilities for barebone-logger — mock logger factory for Jest

Testing companion package for [**barebone-logger**](../barebone-logger/README.md). Provides a zero-setup mock logger that tracks all logging calls for easy assertion in test suites.

## Overview

**barebone-logger-testing** eliminates test boilerplate when testing code that uses `barebone-logger`. The `createMockLogger()` factory returns a fully type-safe Jest mock that implements the `Logger` interface, allowing you to assert on log calls without implementing mock infrastructure yourself.

## Key Features

- **Zero-setup mock logger** — Works out of the box with Jest
- **Type-safe factory** — Returns `jest.Mocked<Logger>` with full type safety
- **Eliminates test boilerplate** — No need to implement mocks manually
- **Tracks all calls** — Assert on debug, info, warn, error calls
- **Conventional pattern** — Follows testing companion conventions (like `@nestjs/testing`)

## Installation

```bash
# Coming soon to npm
npm install --save-dev barebone-logger-testing

# Current: pnpm workspace
{
  "devDependencies": {
    "barebone-logger-testing": "workspace:*"
  }
}
```

## Quick Start

### Basic Usage

```typescript
import { createMockLogger } from 'barebone-logger-testing';
import type { Logger } from 'barebone-logger';

describe('MyService', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should log when processing data', () => {
    const service = new MyService(mockLogger);
    service.processData({ id: 123 });

    // Assert logger was called
    expect(mockLogger.info).toHaveBeenCalledWith({ fn: 'processData', id: 123 }, 'Processing data');
  });
});
```

### With Global Logger (setLogger/getLogger)

```typescript
import { createMockLogger } from 'barebone-logger-testing';
import { setLogger } from 'barebone-logger';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    setLogger(mockLogger);
  });

  it('should log errors when operation fails', () => {
    myFunction({ invalid: 'data' });

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ fn: 'myFunction' }),
      expect.stringContaining('Failed'),
    );
  });
});
```

## API Reference

### `createMockLogger(): jest.Mocked<Logger>`

Creates a mock logger with all methods stubbed as Jest mock functions.

**Returns:** `jest.Mocked<Logger>` with mocked methods:

- `debug: jest.Mock`
- `info: jest.Mock`
- `warn: jest.Mock`
- `error: jest.Mock`

All methods are initialized with `jest.fn()` and can be used with standard Jest assertions:

- `toHaveBeenCalled()`
- `toHaveBeenCalledWith(...)`
- `toHaveBeenCalledTimes(n)`
- `.mock.calls` access

## Common Patterns

### Asserting Log Context

```typescript
it('should include userId in log context', () => {
  const mockLogger = createMockLogger();
  const service = new UserService(mockLogger);

  service.deleteUser(123);

  expect(mockLogger.warn).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 123 }),
    expect.any(String),
  );
});
```

### Checking Log Messages

```typescript
it('should log specific warning message', () => {
  const mockLogger = createMockLogger();
  const validator = new Validator(mockLogger);

  validator.validate({ incomplete: 'data' });

  expect(mockLogger.warn).toHaveBeenCalledWith(
    expect.any(Object),
    'Validation incomplete - missing required fields',
  );
});
```

### Verifying No Logs

```typescript
it('should not log when operation succeeds', () => {
  const mockLogger = createMockLogger();
  const service = new QuietService(mockLogger);

  service.performOperation();

  expect(mockLogger.error).not.toHaveBeenCalled();
  expect(mockLogger.warn).not.toHaveBeenCalled();
});
```

### Inspecting Multiple Calls

```typescript
it('should log progress at each step', () => {
  const mockLogger = createMockLogger();
  const processor = new BatchProcessor(mockLogger);

  processor.processBatch([1, 2, 3]);

  // Check all info calls
  const infoCalls = (mockLogger.info as jest.Mock).mock.calls;
  expect(infoCalls).toHaveLength(3);
  expect(infoCalls[0][1]).toContain('Processing item 1');
  expect(infoCalls[1][1]).toContain('Processing item 2');
  expect(infoCalls[2][1]).toContain('Processing item 3');
});
```

## Related Packages

This package is a testing companion for [**barebone-logger**](../barebone-logger/README.md), a minimal, zero-dependency logging interface for TypeScript projects.

## License

MIT
