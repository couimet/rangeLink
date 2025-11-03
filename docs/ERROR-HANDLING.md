# Error Handling and Message Codes

This document defines RangeLink's error handling strategy, message codes, and validation rules for configuration and BYOD parsing.

## Overview

RangeLink uses **structured logging** with stable error codes to enable:

- **Future i18n support**: Error codes decouple identification from message formatting
- **Easier debugging**: Unique codes make issues searchable and trackable
- **Consistent UX**: Users can rely on stable error identifiers

## Message Format

All logged messages follow this format:

```
[LEVEL] [CODE] message
```

**Levels:**

- `INFO` - Informational messages
- `WARN` - Warnings that don't prevent operation
- `ERROR` - Errors that prevent operation or trigger fallback behavior
- `CRITICAL` - Defensive logging for unexpected errors (indicates bugs)

**Examples:**

```
[INFO] [MSG_1002] Using default delimiter configuration: line="L", column="C", hash="#", range="-"
[ERROR] [ERR_1005] Invalid delimiterLine value "L~" (reserved character)
[CRITICAL] [ERR_1099] CRITICAL: Unknown validation error for delimiterLine value "L?" (error type: INVALID_ERROR_VALUE). This indicates a bug in validation logic.
```

## Error Code Categories

Error codes are organized by functional area:

| Range       | Category               | Description                         |
| ----------- | ---------------------- | ----------------------------------- |
| `MSG_1xxx`  | Configuration Messages | Non-error configuration status      |
| `ERR_1xxx`  | Configuration Errors   | Delimiter validation failures       |
| `ERR_2xxx`  | BYOD Parsing Errors    | Portable link parsing failures      |
| `WARN_2xxx` | BYOD Warnings          | BYOD recovery and fallback warnings |
| `ERR_3xxx`  | Selection Validation   | Input selection validation failures |

## Hybrid Error Handling Architecture

RangeLink uses a **hybrid error handling approach** that combines exceptions internally with Result types at public API boundaries:

### Design Principles

**Internal Functions (Private):**

- Throw `SelectionValidationError` exceptions for validation failures
- Natural exception flow simplifies validation logic
- Easy to reason about sequential validation checks

**Public API Functions:**

- Catch exceptions at boundaries
- Convert to `Result<T, RangeLinkMessageCode>` for callers
- Never throw across module boundaries
- Type-safe error handling without try-catch boilerplate

### Example Pattern

```typescript
// Internal validation - throws exceptions
function validateInputSelection(input: InputSelection): void {
  if (selections.length === 0) {
    throw new SelectionValidationError(
      RangeLinkMessageCode.SELECTION_ERR_EMPTY,
      'Selections array must not be empty',
    );
  }
  // ... more validations
}

// Public API - catches and converts to Result
export function computeRangeSpec(
  inputSelection: InputSelection,
): Result<ComputedSelection, RangeLinkMessageCode> {
  try {
    validateInputSelection(inputSelection);
    // ... compute logic
    return Ok(result);
  } catch (error) {
    if (error instanceof SelectionValidationError) {
      return Err(error.code);
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Benefits

1. **Developer Ergonomics**: Validation logic reads naturally without Result boilerplate
2. **Type Safety**: Callers get Result type with exhaustive error checking
3. **Clean Boundaries**: Exceptions never escape public APIs
4. **Best of Both**: Combines exception convenience with Result safety

### When to Use Each Pattern

- **Use Exceptions**: Internal validation, sequential checks, helper functions
- **Use Result**: Public API functions, cross-module boundaries, external consumers

## Error Code Reference

See source code for error codes and validation rules:

- **Configuration errors (ERR_1xxx)**: `packages/rangelink-core-ts/src/validation/validateDelimiter.ts`
- **BYOD parsing errors (ERR_2xxx)**: BYOD parsing implementation (TBD)
- **Selection validation (ERR_3xxx)**: `packages/rangelink-core-ts/src/selection/validateInputSelection.ts` and `packages/rangelink-core-ts/src/errors/SelectionValidationError.ts`

## Related Documentation

- **[LINK-FORMATS.md](./LINK-FORMATS.md)** - Link format specifications and parsing rules
- **[BYOD.md](./BYOD.md)** - Complete guide to portable links and BYOD format
- **[LOGGING.md](./LOGGING.md)** - Structured logging approach and message format
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Core library design including validation logic

---

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Current specification for RangeLink v0.1.0
