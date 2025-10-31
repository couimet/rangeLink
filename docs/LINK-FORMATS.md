# RangeLink Format Specification

This document defines the link format specifications for RangeLink, including standard notation, rectangular mode, portable links (BYOD), and parsing rules.

## Overview

RangeLink generates local file paths with GitHub-inspired range notation. Links are designed to be:
- **Human-readable**: Easy to understand at a glance
- **Editor-agnostic**: Work across VSCode, Cursor, Sublime Text, Neovim, and more
- **Portable**: Optional BYOD format works regardless of recipient's delimiter configuration

## Standard Link Formats

### Basic Notation

| Selection Type | Format | Example |
|----------------|--------|---------|
| Single line | `path#L<line>` | `src/file.ts#L42` |
| Multiple lines | `path#L<start>-L<end>` | `src/file.ts#L10-L25` |
| With column precision | `path#L<line>C<col>-L<line>C<col>` | `src/file.ts#L42C6-L42C15` |
| Rectangular selection | `path##L<start>C<col>-L<end>C<col>` | `src/file.ts##L10C5-L20C10` |

### Default Delimiters

RangeLink uses these delimiters by default (configurable):
- `#` - Hash delimiter (separates path from range)
- `L` - Line delimiter (precedes line numbers)
- `C` - Column/position delimiter (precedes column numbers)
- `-` - Range delimiter (separates start from end)

## Rectangular Mode

### Notation

Rectangular selections use a **double hash** (`##`) to distinguish them from traditional multi-line selections:

```
path##L<start>C<col>-L<end>C<col>
```

**Example:**
```
src/utils/parser.ts##L10C5-L20C10
```

### Detection Rules

A selection is considered rectangular when:
1. Multiple selections exist (2 or more)
2. All selections have:
   - Same start column position
   - Same end column position
   - Consecutive line numbers (no gaps)

### Editor-Specific Implementations

Different editors use different terminology for this feature:

| Editor | Native Term | Keyboard Shortcut |
|--------|-------------|-------------------|
| VSCode | Column selection | Alt+drag or Shift+Alt+Arrow |
| Cursor | Column selection | Alt+drag or Shift+Alt+Arrow |
| Sublime Text | Multiple selections | Alt+drag or Ctrl+Alt+Arrow |
| Neovim | Visual block mode | `Ctrl-v` or `Ctrl-V` |

**Note:** RangeLink uses "rectangular selection" as the universal term internally, but documentation refers to editor-native terminology when discussing specific editors.

## Portable Links (BYOD)

### Format Overview

**BYOD** (Bring Your Own Delimiters) links embed delimiter metadata so they work regardless of recipient's configuration:

```
path#L10C5-L20C10~#~L~-~C~
```

The `~` separator marks embedded delimiters that override recipient's local settings.

### BYOD Structure

```
<standard-link>~<hash>~<line>~<range>~<position>~
```

**Components:**
- `<standard-link>`: Normal RangeLink format using sender's delimiters
- `~`: Separator (fixed, not configurable)
- `<hash>`: Hash delimiter to use
- `<line>`: Line delimiter to use
- `<range>`: Range delimiter to use
- `<position>`: Position/column delimiter to use
- Trailing `~`: Terminator

**Example breakdown:**
```
src/file.ts#L10-L20~#~L~-~C~
           └─┬──┘ └┬┘ └┬┘ └┬┘
             │     │   │   └─ Position delimiter: C
             │     │   └───── Range delimiter: -
             │     └───────── Line delimiter: L
             └───────────────── Hash delimiter: #
```

### Reserved Characters

These characters **cannot be used** as custom delimiters:

| Character | Reason | Context |
|-----------|--------|---------|
| `~` | BYOD separator | Fixed separator in BYOD format |
| `|` | Future multi-range separator | Reserved for Phase 6 |
| `/` `\` | Path separators | File system paths |
| `:` | Windows drive separator | `C:\path\file.txt` |
| `,` | Future use | Reserved |
| `@` | Future use | Reserved |
| `0-9` | Digits | Line/column numbers |

### BYOD Benefits

1. **No coordination required**: Sender and recipient don't need matching configs
2. **Cross-tool compatibility**: Works between different editors and tools
3. **Future-proof**: Links survive configuration changes
4. **Explicit intent**: Delimiter metadata makes format unambiguous

**Full BYOD documentation:** See [BYOD.md](./BYOD.md) for comprehensive guide including validation, parsing rules, and error handling.

## Parsing Rules

### Valid Link Requirements

A valid RangeLink must:
1. Have a file path (absolute or relative)
2. Have a hash delimiter separating path from range
3. Have at least one line number
4. Use valid delimiters (no digits, reserved characters, or empty strings)

### Edge Cases

#### Empty Selections
- **Not supported**: RangeLink requires non-empty selections
- **Extension behavior**: Commands disabled when `editorHasSelection` is false
- **Error handling**: Returns appropriate error code if attempted

#### Single Position
```
src/file.ts#L42C10
```
- Represents cursor position at line 42, column 10
- Technically a zero-width selection

#### Multi-Line Same Column
```
src/file.ts#L10C5-L20C5
```
- Could be rectangular if all intermediate lines match
- Or could be traditional selection ending at same column
- Double hash `##` disambiguates: `src/file.ts##L10C5-L20C5` = rectangular

#### Reverse Selections
RangeLink normalizes selections so start always comes before end:
- User selects from line 20 to line 10 (bottom-up)
- RangeLink generates: `src/file.ts#L10-L20` (normalized)

### Path Handling

#### Relative Paths
```
src/utils/parser.ts#L42-L58
```
- Relative to workspace root
- Preferred for portability within a project

#### Absolute Paths
```
/Users/alice/project/src/utils/parser.ts#L42-L58
```
- Machine-specific
- Useful for system files or cross-project references

### Delimiter Validation

All delimiters must:
1. **Not contain digits** (`0-9`)
2. **Not be empty** (minimum 1 character)
3. **Be unique** (no duplicate delimiters)
4. **Avoid reserved characters** (`~`, `|`, `/`, `\`, `:`, `,`, `@`)

Invalid configurations fall back to defaults with a warning in the output channel.

## Format Evolution

RangeLink's format is designed for extensibility while maintaining backward compatibility:

### Current Format (v0.1.0)
- Single file ranges
- Rectangular mode support
- BYOD portable links
- Custom delimiters

### Planned Enhancements

**Phase 6 - Multi-Range Links** (see [ROADMAP.md](./ROADMAP.md#phase-6-multi-range-links)):
```
path#L10-L20|L30-L40|L50-L60
```
- Pipe (`|`) separator for multiple ranges
- Single link references multiple code sections

**Phase 8 - Cross-File Multi-Range** (see [ROADMAP.md](./ROADMAP.md#phase-8-cross-file-multi-range-links)):
```
file1.ts#L10-L20|file2.ts#L30-L40
```
- Reference code across multiple files
- Maintains single link format

## Configuration

### VSCode Settings

Customize delimiters in VSCode settings (Preferences > Settings > search "rangelink"):

```json
{
  "rangelink.delimiterLine": "L",
  "rangelink.delimiterPosition": "C",
  "rangelink.delimiterHash": "#",
  "rangelink.delimiterRange": "-"
}
```

### Validation

Invalid configurations trigger:
1. **Error code**: `ERR_1000` (Invalid Configuration) - see [ERROR-HANDLING.md](./ERROR-HANDLING.md#configuration-errors)
2. **Fallback behavior**: Use default delimiters
3. **User notification**: Warning in output channel with details

## Related Documentation

- **[BYOD.md](./BYOD.md)** - Complete guide to portable links with BYOD format
- **[ERROR-HANDLING.md](./ERROR-HANDLING.md)** - Error codes and handling strategies
- **[ROADMAP.md](./ROADMAP.md)** - Format evolution plans and future features
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Core library design and parsing implementation

## Examples

### Real-World Usage

**AI Assistant Prompts:**
```
"Check the bug in auth/login.ts#L42C10-L58C25"
```

**Documentation:**
```markdown
See the implementation in [parser.ts#L89-L102](src/parser.ts#L89-L102)
```

**Code Reviews:**
```
"The issue is here: api/routes.ts#L215C8-L223C45"
```

**Cross-Editor Sharing:**
```
# Sender (VSCode with default delimiters)
src/utils/parser.ts#L120-L145

# Recipient (Sublime with custom delimiters @l:p)
# Standard link won't parse correctly

# Use portable link instead:
src/utils/parser.ts#L120-L145~#~L~-~C~
# → Recipient sees correct range regardless of their config
```

### Rectangular Mode Examples

**VSCode column selection:**
```
src/data.ts##L10C5-L20C10
```

**Neovim visual block mode:**
```
config.lua##L5C1-L15C1
```

**Sublime multiple selections:**
```
styles.css##L100C8-L110C8
```

## Format Summary

| Feature | Syntax | Example |
|---------|--------|---------|
| Basic range | `path#L<start>-L<end>` | `file.ts#L10-L20` |
| With columns | `path#L<line>C<col>-L<line>C<col>` | `file.ts#L10C5-L20C10` |
| Rectangular | `path##L<start>C<col>-L<end>C<col>` | `file.ts##L10C5-L20C10` |
| Portable (BYOD) | `path#L<range>~<delimiters>~` | `file.ts#L10-L20~#~L~-~C~` |
| Custom delimiters | Configurable | `file.ts@l10:l20` (if configured) |

---

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Current specification for RangeLink v0.1.0
