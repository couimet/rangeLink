# Error Handling and Message Codes

This document defines RangeLink's error handling strategy, error codes, message codes, and validation rules.

## Overview

RangeLink uses a **dual-purpose error system** with separation of concerns:

1. **Error Handling (`RangeLinkErrorCodes`)**: Structured error objects for programmatic error handling with rich context
2. **Message Codes (`RangeLinkMessageCode`)**: Stable identifiers for logging and i18n support

This separation enables:

- **Type-safe error handling**: Structured errors with codes, messages, function names, and contextual details
- **Future i18n support**: Message codes decouple identification from formatting
- **Easier debugging**: Unique codes make issues searchable and trackable
- **Consistent UX**: Users can rely on stable identifiers

## Error Handling System

### RangeLinkErrorCodes (Error Handling)

**Purpose**: Structured error objects for programmatic error handling

**Location**: `packages/rangelink-core-ts/src/errors/RangeLinkErrorCodes.ts`

**Scope**: Error codes WITHOUT prefixes (no `ERR_`, no `WARN_`)

**Architecture principles**:

- If defined in RangeLinkErrorCodes, it's an error
- Warning is a logging level decision, not an error type
- **Values are descriptive strings** (same as keys) for clear context in logs
- Following `SharedErrorCodes` pattern: `VALIDATION = 'VALIDATION'`
- When someone sees an error in logs, they immediately understand what went wrong

Error codes organized by category:

| Category             | Description                         | Examples                 |
| -------------------- | ----------------------------------- | ------------------------ |
| Configuration Errors | Delimiter validation failures       | `CONFIG_DELIMITER_EMPTY` |
| BYOD Parsing Errors  | Portable link parsing failures      | `BYOD_INVALID_FORMAT`    |
| Selection Validation | Input selection validation failures | `SELECTION_EMPTY`        |

**Example error codes**:

```typescript
CONFIG_DELIMITER_EMPTY = 'CONFIG_DELIMITER_EMPTY';
SELECTION_EMPTY = 'SELECTION_EMPTY';
BYOD_INVALID_FORMAT = 'BYOD_INVALID_FORMAT';
```

**Why descriptive values?** When you see `'SELECTION_EMPTY'` in a log or caught exception, you immediately know what went wrong without needing to look up numeric codes or mappings.

### RangeLinkMessageCode (i18n Support)

**Purpose**: Stable message identifiers for informational logging and i18n

**Location**: `packages/rangelink-core-ts/src/types/RangeLinkMessageCode.ts`

**Scope**: Contains ONLY `MSG_xxxx` codes (informational messages)

Message codes organized by functional area:

| Range      | Category               | Description                   |
| ---------- | ---------------------- | ----------------------------- |
| `MSG_1xxx` | Configuration Messages | Configuration status messages |
| `MSG_2xxx` | BYOD Messages          | BYOD parsing status messages  |
| `MSG_3xxx` | Selection Messages     | Selection processing messages |

**Examples**: `MSG_CONFIG_LOADED`, `MSG_CONFIG_USING_DEFAULTS`

### When to Use Each

- **Use `RangeLinkErrorCodes`**: When throwing/returning errors in code (`throw new RangeLinkError({ code: RangeLinkErrorCodes.SELECTION_EMPTY, ... })`)
- **Use `RangeLinkMessageCode`**: When logging informational messages (`logger.info(RangeLinkMessageCode.MSG_CONFIG_LOADED, ...)`)

## Message Format

All logged messages follow this format:

```
[LEVEL] message
```

**Levels:**

- `INFO` - Informational messages
- `WARN` - Warnings that don't prevent operation
- `ERROR` - Errors that prevent operation or trigger fallback behavior
- `CRITICAL` - Defensive logging for unexpected errors (indicates bugs)

**Note**: The `[${code}]` prefix is no longer included in messages since error objects now contain the code in their structure.

**Examples:**

```
[INFO] Using default delimiter configuration: line="L", column="C", hash="#", range="-"
[ERROR] Invalid delimiterLine value "L~" (reserved character)
[CRITICAL] CRITICAL: Unknown validation error for delimiterLine value "L?" (error type: INVALID_ERROR_VALUE). This indicates a bug in validation logic.
```

## Hybrid Error Handling Architecture

RangeLink uses a **hybrid error handling approach** that combines exceptions internally with Result types at public API boundaries:

### Design Principles

**Internal Functions (Private):**

- Throw `RangeLinkError` exceptions for validation failures
- Natural exception flow simplifies validation logic
- Easy to reason about sequential validation checks
- Rich error context with structured details

**Public API Functions:**

- Catch exceptions at boundaries
- Convert to `Result<T, RangeLinkError>` for callers
- Never throw across module boundaries
- Type-safe error handling without try-catch boilerplate

### DetailedError Pattern

All RangeLink errors extend the `DetailedError` base class, providing:

**Error Structure:**

```typescript
interface RangeLinkError {
  code: RangeLinkErrorCodes; // Typed error code (ERR_xxxx)
  message: string; // Plain error message (no prefixes)
  functionName?: string; // Function where error occurred
  details?: Record<string, any>; // Contextual details (structured data)
  cause?: Error; // Original error (for chaining)
}
```

**Benefits:**

- **Rich Context**: Structured details object captures all relevant information
- **Type Safety**: TypeScript ensures correct error codes and structure
- **Error Chaining**: Preserve original errors via `cause` field
- **Testability**: Custom Jest matchers validate full error structure

### Example Pattern

```typescript
// Internal validation - throws structured exceptions
function validateInputSelection(input: InputSelection): void {
  if (selections.length === 0) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.SELECTION_EMPTY,
      message: 'Selections array must not be empty',
      functionName: 'validateInputSelection',
      details: {
        selectionsLength: 0,
        selectionType: input.selectionType,
      },
      //TODO: Review error for details
    });
  }
  // ... more validations
}

// Public API - catches and converts to Result
export function computeRangeSpec(
  inputSelection: InputSelection,
): Result<ComputedSelection, RangeLinkError> {
  try {
    validateInputSelection(inputSelection);
    // ... compute logic
    return Ok(result);
  } catch (error) {
    if (error instanceof RangeLinkError) {
      return Err(error); // Return full error object
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Testing with Custom Matcher

Use the `toBeRangeLinkError` matcher for comprehensive error validation:

```typescript
it('returns error when selections array is empty', () => {
  const result = computeRangeSpec({
    selections: [],
    selectionType: 'Normal',
  });

  expect(result).toBeErr();
  expect(result).toBeErrWith((error) => {
    expect(error).toBeRangeLinkError({
      code: RangeLinkErrorCodes.SELECTION_EMPTY,
      message: 'Selections array must not be empty',
      functionName: 'validateInputSelection',
      details: { selectionsLength: 0, selectionType: 'Normal' },
    });
  });
});
```

### Benefits

1. **Developer Ergonomics**: Validation logic reads naturally without Result boilerplate
2. **Rich Context**: Structured details provide debugging information
3. **Type Safety**: Callers get Result type with full error objects
4. **Clean Boundaries**: Exceptions never escape public APIs
5. **Testability**: Custom matchers enable strict error validation
6. **Best of Both**: Combines exception convenience with Result safety

### When to Use Each Pattern

- **Use Exceptions (RangeLinkError)**: Internal validation, sequential checks, helper functions
- **Use Result**: Public API functions, cross-module boundaries, external consumers

## Error Code Reference

### Error Handling Codes

**RangeLinkErrorCodes** (for error handling):

- **Source**: `packages/rangelink-core-ts/src/errors/RangeLinkErrorCodes.ts`
- **Contains**: Only `ERR_xxxx` codes (29 total)
- **Usage**: `throw new RangeLinkError({ code: RangeLinkErrorCodes.SELECTION_ERR_EMPTY, ... })`

Error code locations by category:

- **Configuration errors (ERR_1xxx)**: `packages/rangelink-core-ts/src/validation/validateDelimiter.ts`
- **BYOD parsing errors (ERR_2xxx)**: BYOD parsing implementation (TBD)
- **Selection validation (ERR_3xxx)**: `packages/rangelink-core-ts/src/selection/validateInputSelection.ts`

### Message Codes

**RangeLinkMessageCode** (for i18n and logging):

- **Source**: `packages/rangelink-core-ts/src/types/RangeLinkMessageCode.ts`
- **Contains**: All message types: `MSG_xxxx`, `WARN_xxxx`, `ERR_xxxx` (30 total)
- **Usage**: `logger.error(RangeLinkMessageCode.CONFIG_ERR_DELIMITER_EMPTY, 'message')`

### Shared Error Infrastructure

- **DetailedError**: `packages/rangelink-core-ts/src/errors/detailedError.ts` - Base class for structured errors
- **RangeLinkError**: `packages/rangelink-core-ts/src/errors/RangeLinkError.ts` - Main error class
- **SharedErrorCodes**: `packages/rangelink-core-ts/src/errors/sharedErrorCodes.ts` - Generic error codes
- **Custom Matcher**: `packages/rangelink-core-ts/src/__tests__/matchers/toBeRangeLinkError.ts` - Jest matcher for error assertions

## Related Documentation

- **[LINK-FORMATS.md](./LINK-FORMATS.md)** - Link format specifications and parsing rules
- **[BYOD.md](./BYOD.md)** - Complete guide to portable links and BYOD format
- **[LOGGING.md](./LOGGING.md)** - Structured logging approach and message format
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Core library design including validation logic

---

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Current specification for RangeLink v0.1.0
