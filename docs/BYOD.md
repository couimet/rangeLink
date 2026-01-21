# BYOD - Bring Your Own Delimiters

**Portable RangeLinks that work everywhere, regardless of delimiter configuration.**

## Overview

BYOD (Bring Your Own Delimiters, aka BYODELI 🥪) solves a critical collaboration problem: when you share a RangeLink with someone who uses different delimiter configurations, the link will still work perfectly.

**The problem:**

```
Alice: delimiterHash="#", delimiterLine="L"
Bob:   delimiterHash="@", delimiterLine="line"

Alice shares: src/file.ts#L10-L20
Bob sees:     src/file.ts# L10-L20  ← Parsing fails!
```

**The solution:**

```
Alice shares: src/file.ts#L10-L20~#~L~-~
Bob receives: Parsed correctly with embedded delimiters (#, L, -)
```

## Benefits

### 1. Share Links Freely

No coordination needed between sender and recipient. Send links to anyone, regardless of their configuration.

### 2. Future-Proof References

Links work even if someone changes their configuration later. Delimiter metadata is permanently embedded.

### 3. Cross-Tool Compatibility

Share links between different editors and tools. As long as they support RangeLink format, portable links work.

### 4. Zero Setup

Recipients don't need to configure anything. Links parse automatically using embedded metadata.

## Format Specification

### Line-Only Format

```
path#L10-L20~#~L~-~
```

**Structure:**

```
<standard-link>~<hash>~<line>~<range>~
```

**Components:**

- `path#L10-L20` - Standard RangeLink using sender's delimiters
- `~` - Fixed separator (not configurable)
- `#` - Hash delimiter to use
- `L` - Line delimiter to use
- `-` - Range delimiter to use
- Trailing `~` - Terminator

### Line and Position Format

```
path#L10C5-L20C10~#~L~-~C~
```

**Structure:**

```
<standard-link>~<hash>~<line>~<range>~<position>~
```

**Components:**

- `path#L10C5-L20C10` - Standard RangeLink with column positions
- `~` - Fixed separator
- `#` - Hash delimiter
- `L` - Line delimiter
- `-` - Range delimiter
- `C` - Position/column delimiter
- Trailing `~` - Terminator

### Rectangular Mode Format

```
path##L10C5-L20C10~#~L~-~C~
```

**Structure:**

```
<standard-link-with-double-hash>~<hash>~<line>~<range>~<position>~
```

**Key difference:** Double hash (`##`) in the standard link portion indicates rectangular mode.

**Metadata:** Only includes single hash (`#`), not double hash. The parser doubles it automatically for rectangular mode detection.

## Custom Delimiter Examples

### Example 1: Extreme Custom Delimiters

**Configuration:**

```json
{
  "delimiterHash": ">>",
  "delimiterLine": "line",
  "delimiterRange": "thru",
  "delimiterPosition": "pos"
}
```

**Portable link:**

```
path>>line10pos5thruline20pos10~>>~line~thru~pos~
```

**How it works:**

1. Recipient receives link
2. Extension detects `~` separator
3. Extracts metadata: hash=`>>`, line=`line`, range=`thru`, position=`pos`
4. Parses link using these delimiters
5. Ignores recipient's local configuration completely

### Example 2: Single Character Custom Delimiters

**Configuration:**

```json
{
  "delimiterHash": "@",
  "delimiterLine": "l",
  "delimiterRange": ":",
  "delimiterPosition": "p"
}
```

**Portable link:**

```
path@l10p5:l20p10~@~l~:~p~
```

### Example 3: Default Delimiters (Still Portable)

**Configuration:**

```json
{
  "delimiterHash": "#",
  "delimiterLine": "L",
  "delimiterRange": "-",
  "delimiterPosition": "C"
}
```

**Portable link:**

```
path#L10C5-L20C10~#~L~-~C~
```

Even with default delimiters, portable links ensure recipient parses correctly.

## Parsing and Validation

### Metadata Format Validation

**Valid formats:**

1. **Line-only** (3 fields): `~<hash>~<line>~<range>~`
2. **With positions** (4 fields): `~<hash>~<line>~<range>~<position>~`

**Invalid formats:**

- Wrong field count (0, 1, 2, 5+)
- Missing separator `~`
- Wrong delimiter order
- Empty delimiter values

### Delimiter Validation

All embedded delimiters must satisfy:

1. ✅ **Not empty** - At least 1 character
2. ✅ **No digits** - Cannot contain 0-9
3. ✅ **No reserved characters** - Cannot use: `~`, `|`, `/`, `\`, `:`, `,`, `@`
4. ✅ **Unique** - No duplicate delimiters (case-insensitive)
5. ✅ **No substring conflicts** - No delimiter can be a substring of another

**Special exception:**

- **Hash delimiter can be multi-character** in BYOD metadata
- Enables support for configurations not allowed locally
- Example: `>>`, `HASH`, `-->`

### Format Consistency Validation

#### Scenario A: Extra Delimiter (Valid)

**Link:**

```
path#L10-L20~#~L~-~C~
```

**Analysis:**

- Link is line-only (no columns)
- Metadata includes position delimiter (`C`)
- Position delimiter is unused

**Result:** ✅ **Valid** - Extra delimiter ignored

**Use case:** Sharing same BYOD config for multiple link types (some with columns, some without)

#### Scenario B: Missing Delimiter (Recovery)

**Link:**

```
path#L10C5-L20C10~#~L~-~
```

**Analysis:**

- Link has columns (`C5`, `C10`)
- Metadata missing position delimiter

**Recovery strategy (priority order):**

1. **Try local config** `delimiterPosition`
   - If present in link AND doesn't conflict with BYOD delimiters → Use it
   - Log: `[WARN] [WARN_2001] Position delimiter not in BYOD metadata. Used local setting 'C' to parse link.`
2. **Try default** `"C"`
   - If present in link AND doesn't conflict with BYOD delimiters → Use it
   - Log: `[WARN] [WARN_2002] Position delimiter not in BYOD metadata. Used default 'C' to parse link.`
3. **Fail**
   - Cannot determine position delimiter
   - Log: `[ERROR] [ERR_2005] BYOD position delimiter recovery failed: cannot parse columns`
   - Fall back to regular parsing

**Result:** ⚠️ **Warning** - Recoverable, but non-ideal

#### Scenario C: Malformed (Error)

**Invalid links:**

```
# Wrong delimiter order
path#L10-L20~L~#~-~

# Missing delimiter
path#L10-L20~~L~-~

# Reserved character
path#L10-L20~#~L|~-~

# Substring conflict
path#L10-L20~LINE~L~-~
```

**Result:** ❌ **Error** - Fall back to regular parsing

### Rectangular Mode Detection

**Algorithm:**

1. Count consecutive hash characters after path
2. Compare to metadata hash delimiter length

**Expected counts:**

- **Regular mode:** `hash_length × 1`
  - Hash=`#` → Expect 1 hash (`#`)
  - Hash=`>>` → Expect 2 chars (`>>`)
- **Rectangular mode:** `hash_length × 2`
  - Hash=`#` → Expect 2 hashes (`##`)
  - Hash=`>>` → Expect 4 chars (`>>>>`)

**Invalid counts:**

- Triple+ hash for single-char delimiter: `###`
- Mismatched length for multi-char delimiter
- Result: `[ERROR] [ERR_2006] BYOD rectangular mode detection failed: invalid hash sequence`

## Error Codes

See [ERROR-HANDLING.md](./ERROR-HANDLING.md#byod-parsing-errors-2xxx) for complete reference.

### Quick Reference

**Errors:**

- `ERR_2001` - BYOD_ERR_INVALID_FORMAT (malformed metadata structure)
- `ERR_2002` - BYOD_ERR_HASH_INVALID (hash delimiter validation failed)
- `ERR_2003` - BYOD_ERR_DELIMITER_VALIDATION (delimiter validation failed)
- `ERR_2004` - BYOD_ERR_FORMAT_MISMATCH (link format doesn't match metadata)
- `ERR_2005` - BYOD_ERR_POSITION_RECOVERY_FAILED (missing position delimiter)
- `ERR_2006` - BYOD_ERR_RECTANGULAR_MODE_DETECTION (invalid hash sequence)

**Warnings:**

- `WARN_2001` - BYOD_WARN_POSITION_FROM_LOCAL (used local position delimiter)
- `WARN_2002` - BYOD_WARN_POSITION_FROM_DEFAULT (used default position delimiter)
- `WARN_2003` - BYOD_WARN_EXTRA_DELIMITER (unused delimiter in metadata)

## Error Handling

### User Notifications

**When parsing fails:**

1. **Notification toast** with actionable buttons:
   - "View Details" → Opens RangeLink output channel
   - "Copy Link" → Copies malformed link to clipboard (for debugging)
2. **Output channel log** with detailed error message:
   ```
   [ERROR] [ERR_2003] Invalid BYOD line delimiter "L1" (cannot contain digits)
   ```
3. **Status bar** shows error icon with extended display time (2× normal)

### Recovery Strategy

**All BYOD errors trigger fallback:**

1. Log detailed error to output channel
2. Show user notification (if appropriate)
3. **Fall back to regular parsing** using recipient's local delimiters
4. Continue operation (non-fatal)

**Rationale:** Portable link parsing is optional. If BYOD metadata is malformed, regular parsing may still work (if sender and recipient happen to have compatible configs).

## Usage Guide

### Creating Portable Links

**VSCode Extension:**

1. Select text in editor
2. Use one of these commands:
   - `Cmd+R Cmd+P` (Mac) / `Ctrl+R Ctrl+P` (Win/Linux) - Relative path
   - `Cmd+R Cmd+Shift+P` (Mac) / `Ctrl+R Ctrl+Shift+P` (Win/Linux) - Absolute path
3. Portable link copied to clipboard!

**Command Palette:**

- `RangeLink: Copy Portable Link` - Relative path
- `RangeLink: Copy Portable Link (Absolute)` - Absolute path

**Context Menu:**

- Right-click selection → `Copy Portable RangeLink`
- Right-click selection → `Copy Portable RangeLink (Absolute)`

### Receiving Portable Links

**No action required!**

When you receive a portable RangeLink:

1. Extension automatically detects `~` separator
2. Extracts and validates delimiter metadata
3. Parses link using embedded delimiters
4. Your local configuration is completely ignored

**If parsing fails:**

- Check RangeLink output channel for detailed error
- Report issue with malformed link to sender

## Design Rationale

### Why `~` as Separator?

**Requirements:**

- Must not conflict with common delimiters (`#`, `L`, `C`, `-`)
- Must not conflict with file paths (`/`, `\`)
- Must not conflict with future features (`|` for multi-range)
- Should be visually distinct from other delimiters

**Choice:** `~` (tilde)

- Rarely used in delimiters
- Visually distinct
- Single character (compact format)
- Available on all keyboards

### Why Embed Delimiters After the Range?

**Alternatives considered:**

1. **Prefix format:** `~#~L~-~C~path#L10-L20`
   - ❌ Breaks file path parsing
   - ❌ Less intuitive
2. **Suffix format:** `path#L10-L20~#~L~-~C~` ← **Chosen**
   - ✅ Path parses naturally
   - ✅ Standard link is readable without metadata
   - ✅ Easy to detect (check for `~` after range)

### Why Allow Multi-Character Hash in BYOD?

**Requirement:** Support links generated by users with multi-character hash configs

**Problem:** Local config validation requires single-character hash (for rectangular mode detection)

**Solution:** Relax validation for BYOD metadata only

- Local config: `delimiterHash` must be exactly 1 character
- BYOD metadata: `hash` can be any length

**Rectangular mode handling:**

- Single-char hash: `#` → `##` for rectangular mode
- Multi-char hash: `>>` → `>>>>` for rectangular mode
- Algorithm: Double the hash length

### Why Case-Insensitive Validation?

**Problem:** Users might inconsistently use `"L"` and `"l"`

**Solution:** Treat delimiters as case-insensitive during validation

- Prevents user confusion
- Avoids subtle parsing bugs

**Example:**

```json
{
  "delimiterLine": "L",
  "delimiterPosition": "l"  ← Error: Duplicate (case-insensitive)
}
```

## Best Practices

### When to Use Portable Links

**Use portable links when:**

- ✅ Sharing with external collaborators (unknown configs)
- ✅ Publishing in documentation (future-proof)
- ✅ Posting in public forums (wide audience)
- ✅ Saving in issue trackers (long-term storage)
- ✅ Sharing with AI assistants (unpredictable parsing)

**Use standard links when:**

- Team has coordinated delimiter configuration
- Sharing within a single tool/editor environment
- Link format consistency is guaranteed
- Shorter links preferred (less visual noise)

### Choosing Delimiters

**Guidelines for custom delimiters:**

1. **Keep them short** - Minimize link length
2. **Make them distinctive** - Easy to visually parse
3. **Avoid conflicts** - Check reserved characters
4. **Consider audience** - Use familiar notation when possible

**Good choices:**

- `#`, `@`, `>`, `<`, `!`, `*`
- Single letters: `L`, `l`, `C`, `c`, `P`, `p`
- Short words: `line`, `col`, `pos`

**Bad choices:**

- Reserved: `~`, `|`, `/`, `\`, `:`, `,`, `@`
- Digits: `L1`, `C2` (confuses parsing)
- Whitespace: `L `, `-` (breaks parsing)
- Substrings: `L` + `LINE` (parsing ambiguity)

## Testing Strategy

### Portable Link Generation Tests

Coverage includes:

- ✅ Line-only format (3 metadata fields)
- ✅ Line and position format (4 metadata fields)
- ✅ Rectangular mode format (double hash)
- ✅ Custom delimiters (all combinations)
- ✅ Default delimiters
- ✅ Edge cases (line 1, position 1, large numbers)

### Portable Link Parsing Tests

Coverage includes:

- ✅ Valid 3-field and 4-field formats
- ✅ Invalid field counts (0, 1, 2, 5+)
- ✅ Malformed metadata (wrong order, missing separators)
- ✅ Invalid delimiters (reserved chars, digits, empty, conflicts)
- ✅ Format mismatches (columns vs metadata)
- ✅ Position recovery (local, default, failure)
- ✅ Rectangular mode detection (single, double, triple hash)
- ✅ Extra delimiter fields (graceful ignore)
- ✅ Multi-character hash delimiters
- ✅ Case-insensitive validation
- ✅ Fallback to regular parsing on error

## FAQ

### Why is it called BYODELI?

**BYOD** = Bring Your Own Delimiters
**BYODELI** = Bring Your Own Deli...miters 🥪

It's a playful reference to "bring your own device" (BYOD) and "delicatessen" (deli). Slice your own delis — er, delimiters. Your sandwich, your specs.

### Do I need to enable BYOD?

No. Portable link generation and parsing are always available. Use the "Portable" commands when you need them.

### What if recipient doesn't have RangeLink?

Portable links only work with tools that support RangeLink format. If recipient doesn't have RangeLink extension installed, the link is just text.

**For human readers:** The link is still human-readable:

```
src/file.ts#L10C5-L20C10~#~L~-~C~
→ src/file.ts, lines 10-20, columns 5-10
```

### Can I use portable links as my default?

Not currently. Standard links are the default for brevity. Use portable link commands explicitly when needed.

**Future consideration:** Configuration option to always generate portable links (see [ROADMAP.md](./ROADMAP.md#phase-5-enhanced-byod-support)).

### What happens if BYOD parsing fails?

1. Error logged to RangeLink output channel
2. User notification (if appropriate)
3. **Fallback:** Try parsing with local delimiters
4. Operation continues (non-fatal)

### Are portable links longer?

Yes. Portable links add metadata suffix:

- **Standard:** `path#L10-L20` (15 chars)
- **Portable:** `path#L10-L20~#~L~-~` (24 chars, +9 chars)

The extra length ensures compatibility.

### Can I customize the BYOD separator?

No. The `~` separator is fixed and cannot be configured. This ensures all portable links are parseable by all RangeLink installations.

## Related Documentation

- **[LINK-FORMATS.md](./LINK-FORMATS.md)** - Link format specifications and notation
- **[ERROR-HANDLING.md](./ERROR-HANDLING.md)** - Error codes and validation rules
- **[LOGGING.md](./LOGGING.md)** - Structured logging approach
- **[ROADMAP.md](./ROADMAP.md#phase-5-enhanced-byod-support)** - Future BYOD enhancements
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Core library design and parsing logic

## Examples

### Real-World Scenarios

**Scenario 1: Cross-Team Collaboration**

Alice (Team A) uses default delimiters. Bob (Team B) uses custom delimiters `@l:p`.

```
# Alice shares portable link:
recipes/baking/chickenpie.ts#L3C14-L15C9~#~L~-~C~

# Bob receives and parses correctly using embedded delimiters
# Even though his local config is: @l10p5:l20p10
```

**Scenario 2: Documentation**

Tech writer creates docs with portable links. Future readers parse correctly regardless of their config:

```markdown
See the implementation in [RangeLink.ts#L3C14-L15C9~#~L~-~C~](recipes/baking/chickenpie.ts#L3C14-L15C9~#~L~-~C~)
```

**Scenario 3: AI Assistant**

Developer shares code location with claude-code using portable link. AI parses correctly regardless of delimiter expectations:

```text
"Check the bug in recipes/baking/chickenpie.ts#L3C14-L15C9~#~L~-~C~"
```

**Scenario 4: Issue Tracker**

Bug report includes portable link. Link works months later even if team changes delimiter configuration:

```text
Issue #123: Bug in link formatting
Location: recipes/baking/chickenpie.ts#L3-L15~#~L~-~
```

---

**Version:** 0.1.0
**Last Updated:** 2025-01-31
**Status:** Current specification for RangeLink v0.1.0
