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

| Range | Category | Description |
|-------|----------|-------------|
| `MSG_1xxx` | Configuration Messages | Non-error configuration status |
| `ERR_1xxx` | Configuration Errors | Delimiter validation failures |
| `ERR_2xxx` | BYOD Parsing Errors | Portable link parsing failures |
| `WARN_2xxx` | BYOD Warnings | BYOD recovery and fallback warnings |

## Configuration Messages (1xxx)

### Success Messages

#### MSG_1001: CONFIG_LOADED
**When:** Valid configuration loaded successfully
**Level:** INFO
**Example:**
```
[INFO] [MSG_1001] Configuration loaded: line="L", column="C", hash="#", range="-"
```

#### MSG_1002: CONFIG_USING_DEFAULTS
**When:** Invalid configuration detected, falling back to defaults
**Level:** INFO
**Example:**
```
[INFO] [MSG_1002] Using default delimiter configuration: line="L", column="C", hash="#", range="-"
```

### Configuration Errors

All configuration errors trigger fallback to default delimiters and log an error message.

#### ERR_1001: CONFIG_ERR_DELIMITER_INVALID
**When:** Generic delimiter validation failure
**Level:** ERROR
**Recovery:** Use default delimiters
**Example:**
```
[ERROR] [ERR_1001] Invalid delimiter configuration detected
```

#### ERR_1002: CONFIG_ERR_DELIMITER_EMPTY
**When:** Delimiter is empty string
**Level:** ERROR
**Recovery:** Use default delimiters
**Validation Rule:** All delimiters must have at least 1 character
**Example:**
```
[ERROR] [ERR_1002] Invalid delimiterLine value "" (empty string not allowed)
```

#### ERR_1003: CONFIG_ERR_DELIMITER_DIGITS
**When:** Delimiter contains numeric characters (0-9)
**Level:** ERROR
**Recovery:** Use default delimiters
**Validation Rule:** Delimiters cannot contain digits
**Rationale:** Ensures numeric tokens (line/column numbers) parse with priority
**Example:**
```
[ERROR] [ERR_1003] Invalid delimiterLine value "L1" (cannot contain digits)
```

#### ERR_1004: CONFIG_ERR_DELIMITER_WHITESPACE
**When:** Delimiter contains whitespace (spaces, tabs, newlines)
**Level:** ERROR
**Recovery:** Use default delimiters
**Validation Rule:** Delimiters cannot contain whitespace
**Rationale:** Whitespace breaks link parsing in various contexts
**Example:**
```
[ERROR] [ERR_1004] Invalid delimiterLine value "L " (whitespace not allowed)
```

#### ERR_1005: CONFIG_ERR_DELIMITER_RESERVED
**When:** Delimiter uses a reserved character
**Level:** ERROR
**Recovery:** Use default delimiters
**Validation Rule:** Cannot use: `~`, `|`, `/`, `\`, `:`, `,`, `@`
**Rationale:** These characters have special meaning in RangeLink format
**Example:**
```
[ERROR] [ERR_1005] Invalid delimiterLine value "L~" (reserved character '~')
```

**Reserved Characters Reference:**

| Character | Reason | Context |
|-----------|--------|---------|
| `~` | BYOD separator | Fixed separator in portable link format |
| `|` | Multi-range separator | Reserved for Phase 6 feature |
| `/` `\` | Path separators | File system paths |
| `:` | Single-line format | Reserved for alternate format |
| `,` | Multi-range separator | Reserved for future use |
| `@` | Circular selection | Reserved for future use |

#### ERR_1006: CONFIG_ERR_DELIMITER_NOT_UNIQUE
**When:** Multiple delimiters use the same value
**Level:** ERROR
**Recovery:** Use default delimiters
**Validation Rule:** All delimiters must be unique (case-insensitive)
**Example:**
```
[ERROR] [ERR_1006] Invalid configuration: delimiterLine "L" and delimiterPosition "l" are not unique (case-insensitive)
```

**Note:** Comparison is case-insensitive to prevent user confusion:
- `"L"` and `"l"` are considered duplicates
- `"C"` and `"c"` are considered duplicates

#### ERR_1007: CONFIG_ERR_DELIMITER_SUBSTRING_CONFLICT
**When:** One delimiter is a substring of another
**Level:** ERROR
**Recovery:** Use default delimiters
**Validation Rule:** No delimiter can be a subset/superset of another
**Rationale:** Prevents parsing ambiguity
**Example:**
```
[ERROR] [ERR_1007] Invalid configuration: delimiterLine "L" is a substring of delimiterHash "LH"
```

**Examples of conflicts:**
- `delimiterLine="L"` + `delimiterHash="LINE"` → conflict
- `delimiterRange="-"` + `delimiterHash="--"` → conflict
- `delimiterLine="ABC"` + `delimiterPosition="AB"` → conflict

#### ERR_1008: CONFIG_ERR_HASH_NOT_SINGLE_CHAR
**When:** Hash delimiter is not exactly 1 character
**Level:** ERROR
**Recovery:** Use default delimiters
**Validation Rule:** Hash delimiter must be exactly 1 character
**Rationale:** Enables clean rectangular mode detection with double hash
**Example:**
```
[ERROR] [ERR_1008] Invalid delimiterHash value "##" (must be exactly 1 character)
```

**Valid hash delimiters:**
- ✅ `"#"`, `">"`, `"H"`, `"h"`, `"@"` (single char, but `@` is reserved)
- ❌ `"##"`, `">>"`, `"HASH"`, `""` (multi-char or empty)

**Note:** Multi-character hashes ARE supported in BYOD metadata for received links. This rule only applies to local configuration.

#### ERR_1099: CONFIG_ERR_UNKNOWN
**When:** Unexpected validation error (defensive catch-all)
**Level:** CRITICAL
**Recovery:** Use default delimiters
**Purpose:** Catches bugs in validation logic
**Example:**
```
[CRITICAL] [ERR_1099] CRITICAL: Unknown validation error for delimiterLine value "L?" (error type: INVALID_ERROR_VALUE). This indicates a bug in validation logic.
```

**Note:** This error should never occur in production. If logged, it indicates a bug in the validation code and should be reported.

## BYOD Parsing Errors (2xxx)

BYOD (Bring Your Own Delimiters) parsing errors occur when RangeLink receives a portable link with invalid or malformed delimiter metadata.

### Parsing Errors

#### ERR_2001: BYOD_ERR_INVALID_FORMAT
**When:** BYOD metadata format is malformed
**Level:** ERROR
**Recovery:** Fall back to regular parsing with local delimiters
**Example:**
```
[ERROR] [ERR_2001] Invalid BYOD format: expected 3-4 delimiter fields, got 2
```

**Valid BYOD formats:**
- Line-only: `path#L10-L20~#~L~-~` (3 metadata fields)
- With columns: `path#L10C5-L20C10~#~L~-~C~` (4 metadata fields)

#### ERR_2002: BYOD_ERR_HASH_INVALID
**When:** Hash delimiter in BYOD metadata is invalid
**Level:** ERROR
**Recovery:** Fall back to regular parsing
**Validation:** Hash must be non-empty and not contain digits
**Example:**
```
[ERROR] [ERR_2002] Invalid BYOD hash delimiter: "" (empty string)
```

#### ERR_2003: BYOD_ERR_DELIMITER_VALIDATION
**When:** BYOD delimiter fails validation rules
**Level:** ERROR
**Recovery:** Fall back to regular parsing
**Validation:** Same rules as configuration (no digits, no whitespace, etc.)
**Example:**
```
[ERROR] [ERR_2003] Invalid BYOD line delimiter "L1" (cannot contain digits)
```

#### ERR_2004: BYOD_ERR_FORMAT_MISMATCH
**When:** BYOD metadata doesn't match link format
**Level:** ERROR
**Recovery:** Fall back to regular parsing
**Example:**
```
[ERROR] [ERR_2004] BYOD format mismatch: link has columns but metadata missing position delimiter
```

**Common mismatches:**
- Link has columns (`L10C5`) but metadata missing position field
- Metadata has 4 fields but link doesn't use columns

#### ERR_2005: BYOD_ERR_POSITION_RECOVERY_FAILED
**When:** Cannot determine position delimiter for BYOD link with columns
**Level:** ERROR
**Recovery:** Fall back to regular parsing
**Example:**
```
[ERROR] [ERR_2005] BYOD position delimiter recovery failed: cannot parse columns
```

**Recovery attempts:**
1. Try local config position delimiter
2. Try default position delimiter (`C`)
3. If both fail, log error and fall back

#### ERR_2006: BYOD_ERR_RECTANGULAR_MODE_DETECTION
**When:** Cannot detect rectangular mode from BYOD link
**Level:** ERROR
**Recovery:** Treat as regular (non-rectangular) mode
**Example:**
```
[ERROR] [ERR_2006] BYOD rectangular mode detection failed: invalid hash sequence
```

**Rectangular mode detection:**
- Double hash (`##`) → rectangular mode
- Single hash (`#`) → regular mode
- Triple+ hash (`###`) → error, treat as single hash

### BYOD Warnings

#### WARN_2001: BYOD_WARN_POSITION_FROM_LOCAL
**When:** BYOD missing position delimiter, using local config
**Level:** WARN
**Recovery:** Use local config position delimiter
**Example:**
```
[WARN] [WARN_2001] BYOD missing position delimiter, using local config: "C"
```

#### WARN_2002: BYOD_WARN_POSITION_FROM_DEFAULT
**When:** BYOD missing position delimiter, using default
**Level:** WARN
**Recovery:** Use default position delimiter (`C`)
**Example:**
```
[WARN] [WARN_2002] BYOD missing position delimiter, using default: "C"
```

#### WARN_2003: BYOD_WARN_EXTRA_DELIMITER
**When:** BYOD has more delimiter fields than expected
**Level:** WARN
**Recovery:** Ignore extra fields
**Example:**
```
[WARN] [WARN_2003] BYOD has 5 delimiter fields, expected 3-4 (ignoring extras)
```

## Validation Rules Summary

### Delimiter Validation

All delimiters (line, position, hash, range) must satisfy:

1. ✅ **Not empty** - At least 1 character
2. ✅ **No digits** - Cannot contain 0-9
3. ✅ **No whitespace** - No spaces, tabs, newlines
4. ✅ **No reserved characters** - Cannot use: `~`, `|`, `/`, `\`, `:`, `,`, `@`
5. ✅ **Unique** - No duplicate delimiters (case-insensitive)
6. ✅ **No substring conflicts** - No delimiter can be a substring of another
7. ✅ **Hash single character** - Hash delimiter must be exactly 1 character

**Special rules:**
- **Case-insensitive uniqueness**: `"L"` and `"l"` are considered duplicates
- **Hash length restriction**: Applies only to local config, not BYOD metadata

### BYOD Metadata Validation

BYOD metadata must satisfy:

1. ✅ **Correct field count** - 3 fields (line-only) or 4 fields (with columns)
2. ✅ **Valid hash delimiter** - Non-empty, no digits
3. ✅ **Valid delimiters** - All delimiters pass standard validation
4. ✅ **Format consistency** - Metadata matches link format (columns or not)
5. ✅ **Separator integrity** - Uses `~` as fixed separator

## Error Recovery Strategies

### Configuration Errors
**Strategy:** Fall back to default delimiters
**Rationale:** Extension must always produce valid links
**User notification:** Error logged to output channel
**Defaults:**
```json
{
  "delimiterLine": "L",
  "delimiterPosition": "C",
  "delimiterHash": "#",
  "delimiterRange": "-"
}
```

### BYOD Parsing Errors
**Strategy:** Fall back to regular parsing with local delimiters
**Rationale:** Portable link parsing is optional; regular parsing always works
**User notification:** Error logged to output channel
**Fallback:** Parse link using local config delimiters

### Unknown Errors (ERR_1099, ERR_2xxx CRITICAL)
**Strategy:** Defensive logging with diagnostics
**Rationale:** Catch bugs in validation logic
**User notification:** CRITICAL level log with context
**Action:** Should be reported as bug

## Testing Strategy

### Configuration Validation Tests

Coverage includes:
- ✅ Valid configurations (all combinations)
- ✅ Empty delimiter values
- ✅ Delimiters with digits (all positions)
- ✅ Delimiters with whitespace (spaces, tabs, newlines)
- ✅ Reserved characters (all 7 types)
- ✅ Duplicate delimiters (all combinations, case-insensitive)
- ✅ Substring conflicts (all combinations)
- ✅ Hash multi-character values
- ✅ Case-insensitive uniqueness
- ✅ Default fallback behavior
- ✅ Error code correctness

### BYOD Parsing Tests

Coverage includes:
- ✅ Valid BYOD links (3-field and 4-field)
- ✅ Invalid field counts (0, 1, 2, 5+)
- ✅ Invalid hash delimiters (empty, digits)
- ✅ Invalid delimiter values (all validation rules)
- ✅ Format mismatches (columns vs metadata)
- ✅ Position recovery (local, default, failure)
- ✅ Rectangular mode detection (single, double, triple hash)
- ✅ Extra delimiter fields (graceful ignore)
- ✅ Fallback to regular parsing
- ✅ Error code correctness

## Output Channel

All errors and warnings are logged to the **RangeLink** output channel in VSCode:

**Accessing the output channel:**
1. Open Output panel: View > Output (`Ctrl+Shift+U` / `Cmd+Shift+U`)
2. Select "RangeLink" from dropdown

**Example output:**
```
[INFO] [MSG_1002] Using default delimiter configuration: line="L", column="C", hash="#", range="-"
[ERROR] [ERR_1005] Invalid delimiterLine value "L~" (reserved character '~')
[ERROR] [ERR_2001] Invalid BYOD format: expected 3-4 delimiter fields, got 2
```

## Related Documentation

- **[LINK-FORMATS.md](./LINK-FORMATS.md)** - Link format specifications and parsing rules
- **[BYOD.md](./BYOD.md)** - Complete guide to portable links and BYOD format
- **[LOGGING.md](./LOGGING.md)** - Structured logging approach and message format
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Core library design including validation logic

## Error Code Reference

### Quick Reference Table

| Code | Name | Category | Recovery |
|------|------|----------|----------|
| MSG_1001 | CONFIG_LOADED | Info | N/A |
| MSG_1002 | CONFIG_USING_DEFAULTS | Info | N/A |
| ERR_1001 | CONFIG_ERR_DELIMITER_INVALID | Config Error | Default delimiters |
| ERR_1002 | CONFIG_ERR_DELIMITER_EMPTY | Config Error | Default delimiters |
| ERR_1003 | CONFIG_ERR_DELIMITER_DIGITS | Config Error | Default delimiters |
| ERR_1004 | CONFIG_ERR_DELIMITER_WHITESPACE | Config Error | Default delimiters |
| ERR_1005 | CONFIG_ERR_DELIMITER_RESERVED | Config Error | Default delimiters |
| ERR_1006 | CONFIG_ERR_DELIMITER_NOT_UNIQUE | Config Error | Default delimiters |
| ERR_1007 | CONFIG_ERR_DELIMITER_SUBSTRING_CONFLICT | Config Error | Default delimiters |
| ERR_1008 | CONFIG_ERR_HASH_NOT_SINGLE_CHAR | Config Error | Default delimiters |
| ERR_1099 | CONFIG_ERR_UNKNOWN | Critical | Default delimiters |
| ERR_2001 | BYOD_ERR_INVALID_FORMAT | BYOD Error | Regular parsing |
| ERR_2002 | BYOD_ERR_HASH_INVALID | BYOD Error | Regular parsing |
| ERR_2003 | BYOD_ERR_DELIMITER_VALIDATION | BYOD Error | Regular parsing |
| ERR_2004 | BYOD_ERR_FORMAT_MISMATCH | BYOD Error | Regular parsing |
| ERR_2005 | BYOD_ERR_POSITION_RECOVERY_FAILED | BYOD Error | Regular parsing |
| ERR_2006 | BYOD_ERR_RECTANGULAR_MODE_DETECTION | BYOD Error | Treat as regular |
| WARN_2001 | BYOD_WARN_POSITION_FROM_LOCAL | BYOD Warning | Use local config |
| WARN_2002 | BYOD_WARN_POSITION_FROM_DEFAULT | BYOD Warning | Use default |
| WARN_2003 | BYOD_WARN_EXTRA_DELIMITER | BYOD Warning | Ignore extras |

---

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Current specification for RangeLink v0.1.0
