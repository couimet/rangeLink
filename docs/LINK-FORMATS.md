# RangeLink Format Specification

This document defines the link format specifications for RangeLink, including standard notation, rectangular mode, portable links (BYOD), and parsing rules.

## Overview

RangeLink generates local file paths with GitHub-inspired range notation. Links are designed to be:

- **Human-readable**: Easy to understand at a glance
- **Editor-agnostic**: Work across VSCode, Cursor, Sublime Text, Neovim, and more
- **Portable**: Optional BYOD format works regardless of recipient's delimiter configuration

## Standard Link Formats

### Basic Notation

| Selection Type        | Format                              | Example                                     |
| --------------------- | ----------------------------------- | ------------------------------------------- |
| Single line           | `path#L<line>`                      | `recipes/baking/chickenpie.ts#L3`           |
| Multiple lines        | `path#L<start>-L<end>`              | `recipes/baking/chickenpie.ts#L3-L15`       |
| With column precision | `path#L<line>C<col>-L<line>C<col>`  | `recipes/baking/chickenpie.ts#L3C14-L15C9`  |
| Rectangular selection | `path##L<start>C<col>-L<end>C<col>` | `recipes/baking/chickenpie.ts##L3C14-L15C9` |

### Default Delimiters

RangeLink uses these delimiters by default (configurable):

- `#` - Hash delimiter (separates path from range)
- `L` - Line delimiter (precedes line numbers)
- `C` - Column/position delimiter (precedes column numbers)
- `-` - Range delimiter (separates start from end)

## Rectangular Mode

### Notation

Rectangular selections use a **double hash** (`##`) to distinguish them from traditional multi-line selections:

```text
path##L<start>C<col>-L<end>C<col>
```

**Example:**

```text
recipes/baking/chickenpie.ts##L3C14-L15C9
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

| Editor       | Native Term         | Keyboard Shortcut           |
| ------------ | ------------------- | --------------------------- |
| VSCode       | Column selection    | Alt+drag or Shift+Alt+Arrow |
| Cursor       | Column selection    | Alt+drag or Shift+Alt+Arrow |
| Sublime Text | Multiple selections | Alt+drag or Ctrl+Alt+Arrow  |
| Neovim       | Visual block mode   | `Ctrl-v` or `Ctrl-V`        |

**Note:** RangeLink uses "rectangular selection" as the universal term internally, but documentation refers to editor-native terminology when discussing specific editors.

## Portable Links (BYOD)

### Format Overview

**BYOD** (Bring Your Own Delimiters) links embed delimiter metadata so they work regardless of recipient's configuration:

```text
recipes/baking/chickenpie.ts#L3C14-L15C9~#~L~-~C~
```

The `~` separator marks embedded delimiters that override recipient's local settings.

### BYOD Structure

```text
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

```text
recipes/baking/chickenpie.ts#L3-L15~#~L~-~C~
                                   └┬┴┬┴┬┴┬┘
                                    │ │ │ └─ Position delimiter: C
                                    │ │ └─── Range delimiter: -
                                    │ └───── Line delimiter: L
                                    └─────── Hash delimiter: #
```

### Reserved Characters

These characters **cannot be used** as custom delimiters:

| Character | Reason | Context |
| --------- | ----------------------- | ------------------------------ | -------------------- |
| `~` | BYOD separator | Fixed separator in BYOD format |
| `\|` | Future multi-range separator | Reserved for Phase 6 |
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

## Text Fragment Links

A text fragment link points at a block of text instead of a line range, using the
[text fragment](https://wicg.github.io/scroll-to-text-fragment/) grammar that browsers
and terminals already understand. The referenced text survives edits that shift line
numbers, and any consumer that supports `:~:text=` can resolve the link without
line arithmetic.

### Format

```text
<file-path>:~:text=<start>
```

```text
recipes/baking/chickenpie.ts:~:text=Preheat%20the%20oven
```

The full grammar accepts up to four percent-encoded terms:

```text
<file-path>:~:text=[prefix-,]start[,end][,-suffix]
```

| Term     | Meaning                                     |
| -------- | ------------------------------------------- |
| `prefix` | Text that must immediately precede `start`  |
| `start`  | First word(s) of the target text (required) |
| `end`    | Last word(s) of the target text             |
| `suffix` | Text that must immediately follow `end`     |

RangeLink **generates** the `start`-only form. It **parses and navigates** the full
grammar, so a text fragment link produced elsewhere (a browser's "Copy link to highlight",
a documentation tool, another editor) resolves correctly here.

### Encoding

Term values are percent-encoded UTF-8. Space becomes `%20` and the line feed of a
multi-line selection becomes `%0A`; `,` and `%` are always escaped, and a `-` is escaped
when it would otherwise be read as the prefix or suffix marker. Line endings are
normalized before encoding, so a selection spanning lines in a CRLF file is emitted with
`%0A` and never `%0D`.

### Detection and Coexistence

Text fragment links are matched before numeric RangeLinks, and a bare file path is never
underlined when either kind of suffix follows it. That guard means a text fragment link and
a numeric RangeLink can sit on separate lines of the same document and both be detected:

```text
src/alpha.ts:~:text=FIRST%20HERE
src/beta.ts#L5
```

Each gets its own range and its own tooltip — `Fragment "<start>" in <path> • RangeLink`
for the text fragment link, `Open <path>:<line> • RangeLink` for the numeric one.

### Navigation Behavior

Clicking a text fragment link searches the target file for the target text:

- **Exactly one match** — the text is selected and revealed.
- **No match** — a warning reports `Text "<start>" not found in <path>` and the current
  selection is left untouched.
- **More than one match** — a warning reports `Text "<start>" appears <count> times in <path>`
  and the current selection is left untouched.

RangeLink never guesses between candidates: an ambiguous or missing match leaves the
editor exactly where it was.

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

```text
recipes/baking/chickenpie.ts#L3C14
```

- Represents cursor position at line 3, column 14
- Technically a zero-width selection

#### Multi-Line Same Column

```text
recipes/baking/chickenpie.ts#L3C14-L15C14
```

- Could be rectangular if all intermediate lines match
- Or could be traditional selection ending at same column
- Double hash `##` disambiguates: `recipes/baking/chickenpie.ts##L3C14-L15C14` = rectangular

#### Reverse Selections

RangeLink normalizes selections so start always comes before end:

- User selects from line 15 to line 3 (bottom-up)
- RangeLink generates: `recipes/baking/chickenpie.ts#L3-L15` (normalized)

### Path Handling

#### Relative Paths

```text
recipes/baking/chickenpie.ts#L3-L15
```

- Relative to workspace root
- Preferred for portability within a project

#### Absolute Paths

```text
/Users/alice/project/recipes/baking/chickenpie.ts#L3-L15
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

**Phase 6 - Multi-Range Links** (potential future feature):

```text
path#L10-L20|L30-L40|L50-L60
```

- Pipe (`|`) separator for multiple ranges
- Single link references multiple code sections

**Phase 8 - Cross-File Multi-Range** (potential future feature):

```text
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
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Core library design and parsing implementation

## Examples

### Real-World Usage

**AI Assistant Prompts:**

```text
"Check the bug in recipes/baking/chickenpie.ts#L3C14-L15C9"
```

**Documentation:**

```markdown
See the implementation in [chickenpie.ts#L3-L15](recipes/baking/chickenpie.ts#L3-L15)
```

**Code Reviews:**

```text
"The issue is here: recipes/baking/chickenpie.ts#L3C14-L15C9"
```

**Cross-Editor Sharing:**

```text
# Sender (VSCode with default delimiters)
recipes/baking/chickenpie.ts#L3-L15

# Recipient (Sublime with custom delimiters @l:p)
# Standard link won't parse correctly

# Use portable link instead:
recipes/baking/chickenpie.ts#L3-L15~#~L~-~C~
# → Recipient sees correct range regardless of their config
```

### Rectangular Mode Examples

**VSCode column selection:**

```text
recipes/baking/chickenpie.ts##L3C14-L15C9
```

**Neovim visual block mode:**

```text
recipes/baking/chickenpie.ts##L3C14-L15C9
```

**Sublime multiple selections:**

```text
recipes/baking/chickenpie.ts##L3C14-L15C9
```

## Format Summary

| Feature           | Syntax                              | Example                                               |
| ----------------- | ----------------------------------- | ----------------------------------------------------- |
| Basic range       | `path#L<start>-L<end>`              | `recipes/baking/chickenpie.ts#L3-L15`                 |
| With columns      | `path#L<line>C<col>-L<line>C<col>`  | `recipes/baking/chickenpie.ts#L3C14-L15C9`            |
| Rectangular       | `path##L<start>C<col>-L<end>C<col>` | `recipes/baking/chickenpie.ts##L3C14-L15C9`           |
| Portable (BYOD)   | `path#L<range>~<delimiters>~`       | `recipes/baking/chickenpie.ts#L3-L15~#~L~-~C~`        |
| Text fragment     | `path:~:text=<start>`               | `recipes/baking/chickenpie.ts:~:text=Preheat%20oven`  |
| Custom delimiters | Configurable                        | `recipes/baking/chickenpie.ts@l3:l15` (if configured) |

---

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Current specification for RangeLink v0.1.0
