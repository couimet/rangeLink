# Structured Logging

This document describes RangeLink's structured logging approach, message format, and code organization strategy.

## Overview

RangeLink uses **structured logging** with stable message codes to enable:

- **Future i18n support** - Decouple message identification from formatting
- **Easier debugging** - Unique codes make issues searchable and trackable
- **Consistent UX** - Users can rely on stable error identifiers
- **Better tooling** - Codes enable automated error tracking and analytics

## Message Format

### Standard Format

All logged messages follow this format:

```
[LEVEL] [CODE] message
```

**Components:**

- `[LEVEL]` - Log level (INFO, WARN, ERROR, CRITICAL)
- `[CODE]` - Stable message code (MSG_xxxx, ERR_xxxx, WARN_xxxx)
- `message` - Human-readable description

### Examples

```
[INFO] [MSG_1001] Configuration loaded: line="L", column="C", hash="#", range="-"
[WARN] [WARN_2001] Position delimiter not in BYOD metadata. Used local setting 'C' to parse link.
[ERROR] [ERR_1005] Invalid delimiterLine value "L~" (reserved character '~')
[CRITICAL] [ERR_1099] CRITICAL: Unknown validation error for delimiterLine value "L?" (error type: INVALID_ERROR_VALUE). This indicates a bug in validation logic.
```

## Log Levels

### INFO

**Purpose:** Non-error informational messages
**When to use:** Configuration loaded, defaults applied, feature usage
**Examples:**

- Configuration loaded successfully
- Using default delimiter configuration
- Link copied to clipboard

### WARN

**Purpose:** Warnings that don't prevent operation
**When to use:** Recoverable errors, deprecated features, non-ideal conditions
**Examples:**

- BYOD missing position delimiter (recoverable)
- Extra delimiter in BYOD metadata (ignored)
- Configuration validation warning

### ERROR

**Purpose:** Errors that prevent operation or trigger fallback
**When to use:** Validation failures, parsing errors, operation failures
**Examples:**

- Invalid delimiter configuration
- BYOD parsing failure
- File not found

### CRITICAL

**Purpose:** Defensive logging for unexpected errors (indicates bugs)
**When to use:** Catch-all for unknown errors, assertion failures
**Examples:**

- Unknown validation error (ERR_1099)
- Unexpected exception in core logic
- State inconsistency detected

**Note:** CRITICAL logs should never occur in production. If logged, they indicate a bug.

## Message Codes

### Architecture

RangeLink separates **errors** from **messages**:

1. **RangeLinkErrorCodes** (Error Handling):
   - Location: `packages/rangelink-core-ts/src/errors/RangeLinkErrorCodes.ts`
   - Contains: Error codes WITHOUT prefixes (no `ERR_`, no `WARN_`)
   - Values: Descriptive strings (same as keys) for log clarity
   - Pattern: `SELECTION_EMPTY = 'SELECTION_EMPTY'` (follows `SharedErrorCodes`)
   - Purpose: Exception handling with structured error objects
   - Principle: If defined here, it's an error. Warning is a logging level.
   - Usage: `throw new RangeLinkError({ code: RangeLinkErrorCodes.SELECTION_EMPTY, ... })`

2. **RangeLinkMessageCode** (Informational Logging):
   - Location: `packages/rangelink-core-ts/src/types/RangeLinkMessageCode.ts`
   - Contains: ONLY `MSG_xxxx` codes
   - Purpose: Informational messages for i18n logging
   - Usage: `logger.info(RangeLinkMessageCode.MSG_CONFIG_LOADED, 'Configuration loaded successfully')`

**Key principle:** Logging level is independent of error type. You can catch an error and log it at any level (INFO, WARN, ERROR) based on context.

### Message Code Categories

Informational message codes organized by functional area:

| Range       | Category      | Description                    |
| ----------- | ------------- | ------------------------------ |
| `MSG_1xxx`  | Configuration | Configuration status messages  |
| `MSG_2xxx`  | BYOD Parsing  | BYOD parsing status messages   |
| `MSG_3xxx`  | Selection     | Selection processing messages  |

### Future Categories (Reserved)

| Range      | Category    | Description               |
| ---------- | ----------- | ------------------------- |
| `MSG_4xxx` | Navigation  | Link navigation messages  |
| `MSG_5xxx` | Multi-Range | Multi-range link messages |

## Code Organization

### Informational Message Codes

Message codes for informational logging are defined in `RangeLinkMessageCode.ts`:

```typescript
/**
 * Informational message codes for logging and i18n.
 * Contains ONLY MSG_xxxx codes.
 * Organized by category (1xxx = Configuration, 2xxx = BYOD, etc.)
 */
export enum RangeLinkMessageCode {
  // Configuration messages (1xxx)
  CONFIG_LOADED = 'MSG_1001',
  CONFIG_USING_DEFAULTS = 'MSG_1002',
  // ... more MSG_ codes

  // BYOD parsing messages (2xxx)
  BYOD_PARSED_SUCCESSFULLY = 'MSG_2001',
  // ... more MSG_ codes

  // Selection messages (3xxx)
  SELECTION_PROCESSED = 'MSG_3001',
  // ... more MSG_ codes
}
```

### Error Codes

Error codes for exception handling are defined in `RangeLinkErrorCodes.ts`:

```typescript
/**
 * Error codes for exception handling.
 * No prefixes: if defined here, it's an error.
 * Warning is a logging level, not an error type.
 * Values are descriptive strings (same as keys) for log clarity.
 */
export enum RangeLinkSpecificCodes {
  // Configuration errors
  CONFIG_DELIMITER_EMPTY = 'CONFIG_DELIMITER_EMPTY',
  CONFIG_DELIMITER_INVALID = 'CONFIG_DELIMITER_INVALID',
  // ... more codes

  // BYOD parsing errors
  BYOD_INVALID_FORMAT = 'BYOD_INVALID_FORMAT',
  // ... more codes

  // Selection validation errors
  SELECTION_EMPTY = 'SELECTION_EMPTY',
  // ... more codes
}

export type RangeLinkErrorCodes = RangeLinkSpecificCodes | SharedErrorCodes;
```

### When to Use Each System

**Use RangeLinkErrorCodes when:**
- Throwing errors in internal functions
- Returning errors in Result types
- Need structured error context (details, functionName, cause)
- Building error objects for programmatic handling

**Use RangeLinkMessageCode when:**
- Logging informational messages to output channel
- Preparing non-error messages for i18n translation
- Displaying status updates to users
- Tracking successful operations

### Usage in Code

**Error handling (RangeLinkErrorCodes):**

```typescript
import { RangeLinkError, RangeLinkErrorCodes } from 'rangelink-core-ts';

// Throw structured error
throw new RangeLinkError({
  code: RangeLinkErrorCodes.SELECTION_EMPTY,
  message: 'Selections array must not be empty',
  functionName: 'validateInputSelection',
  details: { selectionsLength: 0 },
});

// Return error in Result
return Err(
  new RangeLinkError({
    code: RangeLinkErrorCodes.CONFIG_DELIMITER_EMPTY,
    message: 'Delimiter cannot be empty',
  }),
);
```

**Logger interface (RangeLinkMessageCode):**

```typescript
interface Logger {
  info(code: RangeLinkMessageCode, message: string): void;
  warn(code: RangeLinkMessageCode, message: string): void;
  error(code: RangeLinkMessageCode, message: string): void;
  critical(code: RangeLinkMessageCode, message: string): void;
}
```

**Example usage:**

```typescript
import { RangeLinkMessageCode } from './types/RangeLinkMessageCode';

// Configuration loaded
logger.info(
  RangeLinkMessageCode.CONFIG_LOADED,
  `Configuration loaded: line="${config.delimiterLine}", column="${config.delimiterPosition}"`,
);

// Validation error
logger.error(
  RangeLinkMessageCode.CONFIG_ERR_DELIMITER_EMPTY,
  `Invalid delimiterLine value "" (empty string not allowed)`,
);

// BYOD warning
logger.warn(
  RangeLinkMessageCode.BYOD_WARN_POSITION_FROM_LOCAL,
  `Position delimiter not in BYOD metadata. Used local setting '${localDelimiter}' to parse link.`,
);

// Critical error (defensive)
logger.critical(
  RangeLinkMessageCode.CONFIG_ERR_UNKNOWN,
  `CRITICAL: Unknown validation error for delimiterLine value "${value}" (error type: ${errorType}). This indicates a bug in validation logic.`,
);
```

## Message Guidelines

### Writing Good Messages

**Guidelines:**

1. **Be specific** - Include relevant values and context
2. **Be actionable** - Suggest how to fix the issue when possible
3. **Be concise** - Keep messages short and focused
4. **Use quotes** - Quote delimiter values for clarity: `"L"`, not `L`
5. **Include context** - Mention which delimiter or field failed validation

**Good examples:**

```
Invalid delimiterLine value "L~" (reserved character '~')
Position delimiter not in BYOD metadata. Used local setting 'C' to parse link.
Configuration loaded: line="L", column="C", hash="#", range="-"
```

**Bad examples:**

```
Invalid delimiter  ← Too vague
delimiterLine failed validation  ← Missing value and reason
Error  ← No context
```

### Message Templates

**Configuration validation errors:**

```
Invalid <fieldName> value "<value>" (<reason>)
```

**BYOD parsing errors:**

```
<operation> failed: <reason>
```

**Recovery warnings:**

```
<issue>. <recovery-action>.
```

**Critical errors:**

```
CRITICAL: <unexpected-condition>. This indicates a bug in <component>.
```

## Output Channel

All logs are written to the **RangeLink** output channel in VSCode.

### Accessing the Output Channel

**Via UI:**

1. Open Output panel: View > Output (`Ctrl+Shift+U` / `Cmd+Shift+U`)
2. Select "RangeLink" from dropdown

**Via Command Palette:**

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Search "Output: Show Output Channels"
3. Select "RangeLink"

### Output Channel Usage

**Logger implementation (VSCode extension):**

```typescript
import * as vscode from 'vscode';

class OutputChannelLogger implements Logger {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('RangeLink');
  }

  info(code: RangeLinkMessageCode, message: string): void {
    this.outputChannel.appendLine(`[INFO] [${code}] ${message}`);
  }

  warn(code: RangeLinkMessageCode, message: string): void {
    this.outputChannel.appendLine(`[WARN] [${code}] ${message}`);
  }

  error(code: RangeLinkMessageCode, message: string): void {
    this.outputChannel.appendLine(`[ERROR] [${code}] ${message}`);
  }

  critical(code: RangeLinkMessageCode, message: string): void {
    this.outputChannel.appendLine(`[CRITICAL] [${code}] ${message}`);
    this.outputChannel.show(); // Auto-show on critical errors
  }
}
```

## Future: i18n Support

### Design Rationale

The structured logging approach with message codes enables future internationalization (i18n) support:

**Current approach:**

```typescript
logger.error(
  RangeLinkMessageCode.CONFIG_ERR_DELIMITER_EMPTY,
  `Invalid delimiterLine value "" (empty string not allowed)`,
);
```

**Future approach (with i18n):**

```typescript
logger.error(
  RangeLinkMessageCode.CONFIG_ERR_DELIMITER_EMPTY,
  i18n.formatMessage(RangeLinkMessageCode.CONFIG_ERR_DELIMITER_EMPTY, {
    fieldName: 'delimiterLine',
    value: '',
  }),
);
```

**Translation files:**

```json
{
  "ERR_1002": {
    "en": "Invalid {fieldName} value \"{value}\" (empty string not allowed)",
    "fr": "Valeur {fieldName} invalide \"{value}\" (chaîne vide non autorisée)",
    "es": "Valor {fieldName} inválido \"{value}\" (cadena vacía no permitida)"
  }
}
```

### Migration Path

1. **Phase 1 (Current):** Use message codes with English messages
2. **Phase 2:** Extract message templates to separate file
3. **Phase 3:** Add i18n library and translation files
4. **Phase 4:** Replace inline messages with `i18n.formatMessage()` calls

**Advantage:** Message codes are stable identifiers, so translations can be added without changing code.

## Testing Strategy

### Log Output Verification

Tests should verify:

1. **Correct code** - Message uses expected `RangeLinkMessageCode`
2. **Correct level** - INFO, WARN, ERROR, or CRITICAL
3. **Message content** - Includes relevant values and context

**Example test:**

```typescript
it('logs error with code ERR_1002 when delimiter is empty', () => {
  const logger = new MockLogger();
  const validator = new DelimiterValidator(logger);

  validator.validate({ delimiterLine: '' });

  expect(logger.getLastError()).toMatchObject({
    code: RangeLinkMessageCode.CONFIG_ERR_DELIMITER_EMPTY,
    level: 'ERROR',
    message: expect.stringContaining('empty string not allowed'),
  });
});
```

### Mock Logger

Test implementation can use a mock logger:

```typescript
class MockLogger implements Logger {
  private logs: Array<{ level: string; code: string; message: string }> = [];

  info(code: RangeLinkMessageCode, message: string): void {
    this.logs.push({ level: 'INFO', code, message });
  }

  warn(code: RangeLinkMessageCode, message: string): void {
    this.logs.push({ level: 'WARN', code, message });
  }

  error(code: RangeLinkMessageCode, message: string): void {
    this.logs.push({ level: 'ERROR', code, message });
  }

  critical(code: RangeLinkMessageCode, message: string): void {
    this.logs.push({ level: 'CRITICAL', code, message });
  }

  getLogs(): typeof this.logs {
    return this.logs;
  }

  getLastLog(): (typeof this.logs)[0] | undefined {
    return this.logs[this.logs.length - 1];
  }

  getLastError(): (typeof this.logs)[0] | undefined {
    return [...this.logs].reverse().find((log) => log.level === 'ERROR');
  }

  clear(): void {
    this.logs = [];
  }
}
```

## Best Practices

### For Core Library Developers

1. **Always use message codes** - Never log without a code
2. **Use appropriate level** - INFO for success, WARN for recoverable, ERROR for failures
3. **Include context** - Add relevant values to message
4. **Be consistent** - Use similar phrasing for similar messages
5. **Document new codes** - Add to RangeLinkMessageCode enum with comment

### For Extension Developers

1. **Create output channel early** - Initialize logger at extension activation
2. **Use logger abstraction** - Don't call `console.log()` directly
3. **Show channel on critical errors** - Call `outputChannel.show()` for CRITICAL level
4. **Test log output** - Verify codes and messages in tests

### For Message Writers

1. **Write for developers** - Audience is developers debugging issues
2. **Include actionable info** - Help user understand what went wrong and how to fix it
3. **Use quotes for values** - Make it clear what the actual value was
4. **Be specific about fields** - Mention which delimiter or field failed
5. **Explain recovery** - If fallback occurs, explain what happened

## Message Code Reference

See [ERROR-HANDLING.md](./ERROR-HANDLING.md#error-code-reference) for complete list of all message codes, their meanings, and recovery strategies.

### Quick Reference

**Configuration Messages (1xxx):**

- `MSG_1001` - CONFIG_LOADED
- `MSG_1002` - CONFIG_USING_DEFAULTS
- `ERR_1001` - CONFIG_ERR_DELIMITER_INVALID
- `ERR_1002` - CONFIG_ERR_DELIMITER_EMPTY
- `ERR_1003` - CONFIG_ERR_DELIMITER_DIGITS
- `ERR_1004` - CONFIG_ERR_DELIMITER_WHITESPACE
- `ERR_1005` - CONFIG_ERR_DELIMITER_RESERVED
- `ERR_1006` - CONFIG_ERR_DELIMITER_NOT_UNIQUE
- `ERR_1007` - CONFIG_ERR_DELIMITER_SUBSTRING_CONFLICT
- `ERR_1008` - CONFIG_ERR_HASH_NOT_SINGLE_CHAR
- `ERR_1099` - CONFIG_ERR_UNKNOWN

**BYOD Parsing Messages (2xxx):**

- `ERR_2001` - BYOD_ERR_INVALID_FORMAT
- `ERR_2002` - BYOD_ERR_HASH_INVALID
- `ERR_2003` - BYOD_ERR_DELIMITER_VALIDATION
- `ERR_2004` - BYOD_ERR_FORMAT_MISMATCH
- `ERR_2005` - BYOD_ERR_POSITION_RECOVERY_FAILED
- `ERR_2006` - BYOD_ERR_RECTANGULAR_MODE_DETECTION
- `WARN_2001` - BYOD_WARN_POSITION_FROM_LOCAL
- `WARN_2002` - BYOD_WARN_POSITION_FROM_DEFAULT
- `WARN_2003` - BYOD_WARN_EXTRA_DELIMITER

## Related Documentation

- **[ERROR-HANDLING.md](./ERROR-HANDLING.md)** - Complete error code reference and validation rules
- **[BYOD.md](./BYOD.md)** - BYOD format specification and parsing logic
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Core library design including logger interface
- **[ROADMAP.md](./ROADMAP.md)** - Future plans including i18n support

## Examples

### Configuration Loading

**Success:**

```
[INFO] [MSG_1001] Configuration loaded: line="L", column="C", hash="#", range="-"
```

**Fallback to defaults:**

```
[ERROR] [ERR_1005] Invalid delimiterLine value "L~" (reserved character '~')
[ERROR] [ERR_1003] Invalid delimiterPosition value "C1" (cannot contain digits)
[INFO] [MSG_1002] Using default delimiter configuration: line="L", column="C", hash="#", range="-"
```

### BYOD Parsing

**Missing position delimiter (recovery):**

```
[WARN] [WARN_2001] Position delimiter not in BYOD metadata. Used local setting 'C' to parse link.
```

**Invalid delimiter (error):**

```
[ERROR] [ERR_2003] Invalid BYOD line delimiter "L1" (cannot contain digits)
```

**Format mismatch (error):**

```
[ERROR] [ERR_2004] BYOD format mismatch: link has columns but metadata missing position delimiter
```

### Critical Errors

**Unknown validation error:**

```
[CRITICAL] [ERR_1099] CRITICAL: Unknown validation error for delimiterLine value "L?" (error type: INVALID_ERROR_VALUE). This indicates a bug in validation logic.
```

---

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Current specification for RangeLink v0.1.0
