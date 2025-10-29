# Phase 1 Plan: Column Mode, Reserved Characters, Portable Links (BYOD)

This document captures the agreed approach and recommendations for Phase 1, split into sub-phases A, B, and C.

## 1A) Column-mode format (double hash)

- Use two consecutive `delimHash` to indicate column-mode selections.
  - Regular selection: `path#L10C5-L20C10`
  - Column-mode selection: `path##L10C5-L20C10`
- Rationale: delimiter-agnostic; works with multi-character `delimHash` and does not hardcode a special token.

### 1A Test Coverage (100% branches)

- Single-line, multi-line, and column-mode outputs
- Column-mode detection with multiple selections having identical character ranges across consecutive lines
- Custom, multi-character delimiters (e.g., `hash="##"`, `range="--"`) still produce a detectable double-hash column mode notation
- Triple or more leading hash sequences (e.g., `###`) are treated as error and fallback to single-hash behavior with a logged warning
- Malformed inputs (out-of-bounds numbers, missing end) should log and fall back gracefully

---

## 1B) Reserved character validation

For delimiter settings, forbid the following characters:

- `~` (portable link metadata separator)
- `|` (reserved for future expansion)
- `/` (path separator)
- `\\` (path separator and shell escape)
- `:` (used in single-line format: `path:42`)
- Whitespace (spaces, tabs, newlines)

Additional rules (as today):

- Delimiters cannot be empty
- Delimiters cannot contain digits
- All delimiters must be unique

### 1B Test Coverage (100% branches)

- Each reserved character across all four delimiters (line, column, hash, range)
- Multiple invalid delimiters at once
- Duplicate delimiter conflicts (with and without reserved chars)
- Valid multi-character delimiters (including non-ASCII) accepted
- Logging and fallback to defaults verified

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
