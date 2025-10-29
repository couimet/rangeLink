# Phase 1 Plan: Column Mode, Reserved Characters, Portable Links (BYOD)

This document captures the agreed approach and recommendations for Phase 1, split into sub-phases A, B, and C.

## 1A) Column-mode format (double hash)

- Use two consecutive `delimHash` to indicate column-mode selections.
  - Regular selection: `path#L10C5-L20C10`
  - Column-mode selection: `path##L10C5-L20C10`
- Rationale: delimiter-agnostic; works with multi-character `delimHash` and does not hardcode a special token.
- **Future compatibility**: This approach scales to multi-range; circular ranges are incompatible with column mode:
  - Multi-range column-mode: `path##L10C5-L20C10,L30C5-L40C10`
  - Circular ranges are mutually exclusive with column mode (see 1B.5 precedence rule)

### 1A Test Coverage (100% branches)

- Single-line, multi-line, and column-mode outputs
- Column-mode detection with multiple selections having identical character ranges across consecutive lines
- Custom, multi-character delimiters (e.g., `hash="##"`, `range="--"`) still produce a detectable double-hash column mode notation
- Triple or more leading hash sequences (e.g., `###`) are treated as error and fallback to single-hash behavior with a logged warning
- Malformed inputs (out-of-bounds numbers, missing end) should log and fall back gracefully

---

## 1B) Reserved character validation and delimiter constraints

### Reserved Characters

For delimiter settings, forbid the following characters:

- `~` (portable link metadata separator)
- `|` (reserved for future expansion)
- `/` (path separator)
- `\\` (path separator and shell escape)
- `:` (used in single-line format: `path:42`)
- Whitespace (spaces, tabs, newlines)
- `,` (reserved for multi-range separator: `path#L10-L20,L30-L40`)
- `@` (reserved for circular/radius selection: `path#L10C5@radius:15` or `path#L10C5@15`)

**Future format considerations:**

- Multi-range: uses `,` to separate ranges (e.g., `path#L10-L20,L30-L40`)
- Circular/radius selection: uses `@` to indicate radius (format TBD, see analysis below)

### Core Validation Rules

1. **Delimiters cannot be empty**
2. **Delimiters cannot contain digits** - Critical: ensures line numbers, column positions, and radius values (all numeric) always have parsing priority over delimiter matching
3. **All delimiters must be unique** - No two delimiters can be identical
4. **No subset/superset relationships** - A delimiter cannot be a substring of another delimiter (prevents ambiguous parsing)
   - ❌ Invalid: `line="L"` and `hash="#L"` (L is subset of #L)
   - ❌ Invalid: `line="LINE"` and `hash="LINE10"` (conflict potential)
   - ✅ Valid: `line="L"` and `hash="##"` (no overlap)
   - ✅ Valid: `line="LINE"` and `hash="##"` (no overlap)

### Delimiter Subset/Superset Detection Algorithm

When validating delimiters, check all pairs:

- For each delimiter pair (A, B), verify that A is not a substring of B and B is not a substring of A
- Case-sensitive comparison (e.g., `"L"` ≠ `"l"`)
- Multi-character delimiters must not start/end with another delimiter
  - Example: If `line="L"`, then `hash="L#"` is invalid (L is at start)
  - Example: If `range="-"`, then `hash="#-"` is invalid (- is at end)

**Rationale:** Prevents parsing ambiguity. If `line="L"` and `hash="#L"`, the parser can't unambiguously decide whether `L10` is a line number or part of a hash delimiter.

### 1B Test Coverage (100% branches)

- Each reserved character across all four delimiters (line, column, hash, range)
- Multiple invalid delimiters at once
- Duplicate delimiter conflicts (with and without reserved chars)
- Subset/superset conflicts (one delimiter is substring of another)
- Digits in delimiters (should always fail)
- Empty delimiters
- Valid multi-character delimiters (including non-ASCII) accepted
- Edge cases: single character delimiters, Unicode characters, special symbols
- Logging and fallback to defaults verified
- Verify numeric values (line numbers, columns) always parse correctly even with complex delimiters

---

## 1B.5) Delimiter Flexibility and Constraints (Deep Dive)

### Flexibility Goals

We want to provide maximum flexibility for users while ensuring:

1. **Unambiguous parsing** - Links must parse correctly regardless of delimiter configuration
2. **Backwards compatibility** - Older links must continue working
3. **Future compatibility** - New formats (multi-range, circular) must work with existing delimiters
4. **Portable links** - BYOD format enables cross-configuration sharing

### Constraint Categories

#### 1. Structural Constraints

- **No numeric delimiters**: Ensures numeric tokens (line numbers, columns, radius) always parse first
- **No subset/superset**: Prevents ambiguous token boundaries
- **Reserved characters**: Characters with semantic meaning cannot be delimiters

#### 2. Parsing Priority Rules

When parsing, apply in this order:

1. Numeric values (line, column, radius) - highest priority
2. Reserved characters with semantic meaning (`:`, `~`, `@`, `,`)
3. Delimiters (hash, line, column, range) - lowest priority (matched after numbers)

This ensures `L10C5-L20C10` always parses as:

- `L` (delimiter)
- `10` (number - line)
- `C` (delimiter)
- `5` (number - column)
- `-` (delimiter)
- etc.

#### 3. Future Format Considerations

**Multi-range format:** `path#L10-L20,L30-L40`

- `,` is hardcoded as multi-range separator (not configurable)
- Each range uses the same delimiter configuration
- BYOD format: `path#L10-L20,L30-L40~#~L~-~` (commas preserved, metadata once)

**Circular/radius format (analysis):**

- **Option A**: `path#L10C5@radius:15` (fixed syntax with literal "radius:" text)
  - `@` is hardcoded
  - `radius:` is literal semantic text
  - Simple but less flexible
- **Option B**: `path#L10C5@15` (just delimiter + number)
  - `@` is hardcoded
  - Implicitly means radius
  - Shorter but less self-documenting
- **Option C**: `path#L10C5@R15` (configurable delimiter + number)
  - `@` is hardcoded separator
  - `R` would be `delimiterRadius` (configurable, default "R")
  - Most flexible but more complex
  - **Recommendation: Option B** (`path#L10C5@15`) - Simple, short, clear enough

**Decision:** Use `@` as hardcoded separator for radius, format: `path#L10C5@15`

- Reserve `@` as reserved character
- Keep format simple: just `@` + number
- No need for `delimiterRadius` for now (can add later if needed)

**Mutual Exclusivity & Precedence:**

- Circular and column-mode selections are conceptually incompatible
- If both are signaled (e.g., column-mode indicator present along with `@radius`), circular takes precedence
- Behavior: treat as circular range, ignore column-mode, and log an informational warning

#### 4. BYOD Compatibility Strategy

When generating portable links with future formats:

- Multi-range: Preserve all commas, embed delimiter metadata once
  - Example: `path#L10-L20,L30-L40~#~L~-~`
- Circular: Preserve `@` and radius value
  - Example: `path#L10C5@15~#~L~-~C~` (if columns present)

The metadata format remains extensible:

- Current: `~<hash>~<line>~<range>~` (line-only) or `~<hash>~<line>~<range>~<column>~` (with columns)
- Future: Could add `~<hash>~<line>~<range>~<column>~<radius>~` if we make radius delimiter configurable

---

## 1C) Portable link (BYOD) generation

Embed delimiter metadata after the range using `~` separators so recipients can parse links irrespective of their local delimiter configuration.

- Line-only portable link: `path#L10-L20~#~L~-~`
- With columns portable link: `path#L10C5-L20C10~#~L~-~C~`
- Column-mode portable link: `path##L10C5-L20C10~#~L~-~C~` (note the double hash)

Metadata order (after the range):

1. `delimHash`
2. `delimLine`
3. `delimRange`
4. `delimColumn` (only when columns are present)

### 1C Exposure (commands, menus, keybindings)

- Add command: "RangeLink: Create Portable Link"
- Context menu: "Copy Portable RangeLink"
- Keybinding recommendation (two-key chord):
  - macOS: `Cmd+R Cmd+P` (P = Portable)
  - Windows/Linux: `Ctrl+R Ctrl+P`
- Notes: three-chord sequences (e.g., `Cmd+R Cmd+L Cmd+B`) are uncommon and awkward; two-chord sequences are standard and well supported.

### 1C Test Coverage (100% branches)

- Generate all three portable variants (line-only, columns, column-mode)
- Custom, multi-character delimiters embedded and parsed back
- Missing/extra metadata fields → log and fallback
- Conflicts between current settings and embedded metadata → use embedded values
- Very large line/column numbers
- Non-ASCII delimiters

---

## Parsing rules and error recovery (applicable across 1A–1C)

- Single `#` → regular selection
- Double `##` → column-mode selection
- `###` or more → error; treat as single `#`; log warning
- Presence of `~` after range → BYOD metadata present; use embedded delimiters
- Any parsing error logs a warning and falls back gracefully without crashing

---

## Open Questions / Future Items

- Terminal link provider to detect and handle RangeLinks in terminal output
- Quick pick to choose output format (regular vs portable) before copying
- Settings toggles: default to portable links, prefer relative vs absolute paths, etc.
- Navigation commands: Go to Range from Clipboard/Input (reconstruct column-mode selections)
