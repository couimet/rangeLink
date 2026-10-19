# ADR-0004: Text Fragment Links: Shortcut and Specification Status

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** @couimet

## Context

RangeLink now generates links that point at a block of text instead of a line range. The link uses the `:~:text=` directive and looks like `recipes/baking/chickenpie.ts:~:text=Preheat%20the%20oven`.

The feature has two names, and the names disagree on the shortcut.

- **Chrome's name.** Chrome calls the user-facing action "Copy link to Highlight". This feature was the first inspiration for the RangeLink feature, before the specification was investigated.
- **The web grammar's name.** The underlying grammar is called "text fragments". That name contains no `H`. It does contain a `T` and an `F`.

The specification status also matters for the documentation. The text fragment grammar is a WICG draft. It is not an official W3C or WHATWG standard. MDN documents the grammar and points to the WICG draft. Browsers adopted the feature before the specification reached a final state. The documentation must state this status without implying that the feature is standard.

The shortcut must fit inside the existing `Cmd+R,*` family on macOS and the `Ctrl+R,*` family on Windows and Linux. The following letters are not available.

- **`T`** stays free for a future `Cmd-T,*` keybinding family. That family sends to the active terminal, in parallel with the `Cmd-R,*` family that sends to the bound destination. See the proposal at https://github.com/couimet/rangeLink/issues/526#issuecomment-5857833841.
- **`F`** already sends the current file path (`Cmd+R Cmd+F`).
- **`M`** opens the status bar menu (`Cmd+R Cmd+M`).

## Decision

### 1. Keep `H` for the text fragment commands

| Command                            | macOS                   | Windows / Linux           |
| ---------------------------------- | ----------------------- | ------------------------- |
| Send Text Fragment Link            | `Cmd+R Cmd+H`           | `Ctrl+R Ctrl+H`           |
| Send Text Fragment Link (Absolute) | `Cmd+R Cmd+Shift+H`     | `Ctrl+R Ctrl+Shift+H`     |
| Copy Text Fragment Link            | `Cmd+R Cmd+Alt+C`       | `Ctrl+R Ctrl+Alt+C`       |
| Copy Text Fragment Link (Absolute) | `Cmd+R Cmd+Alt+Shift+C` | `Ctrl+R Ctrl+Alt+Shift+C` |

`H` stands for Highlight. It matches Chrome's "Copy link to Highlight", which was the first inspiration for this feature and which users already know.

`T` is the better mnemonic for "text", and `F` is the better mnemonic for "fragment". The existing and planned keybinding families already claim both letters. A new letter is necessary, and `H` is the only free letter with a user-facing mnemonic that people already associate with this feature.

### 2. Document the grammar and its status together

`docs/LINK-FORMATS.md` puts the MDN reference and the WICG draft next to each other in the Text Fragment Links section. The text says that the feature is not an official standard yet, that MDN points to the WICG draft, and that browsers adopted the feature before the specification became official.

### 3. Keep the reasoning out of the user-facing README

This record holds the full reasoning. The package README holds the feature summary and links to `docs/LINK-FORMATS.md`. A short pointer to this record is the only addition that the README needs.

## Alternatives Considered

- **Use `T` for text** — rejected: the letter stays free for the active-terminal family from issue #526.
- **Use `F` for fragment** — rejected: `Cmd+R Cmd+F` already sends the current file path.
- **Use `S` for scroll** — rejected: it matches Chrome's internal "Scroll to Text Fragment" name, but users do not know that name.
- **Use `N` for fragment** — rejected: the mnemonic is weak, and users do not know the name.
- **Use `M` for mark** — rejected: `Cmd+R Cmd+M` opens the status bar menu.
- **Rename the feature to "highlights" in the documentation** — rejected: the generated links use the standard `:~:text=` grammar, and the documentation must use the name of the grammar.
- **Describe the feature as a standard** — rejected: the WICG draft is not an official standard.

## Consequences

### Positive

- The shortcut has a mnemonic that users already know from Chrome.
- The `T` letter stays free for the planned active-terminal family.
- The reasoning survives the merge, and later readers do not need to reconstruct it from the PR history.
- The README stays short, and the full reasoning lives in the ADR directory with the other design records.

### Negative

- Users who know the grammar as "text fragments" may expect `T` or `F`. The documentation must explain the `H` choice.
- The specification may change. The status sentence in `docs/LINK-FORMATS.md` needs an update when the WICG draft becomes an official standard.

### Neutral

- The `H` chord is stable across the four text fragment commands. The copy commands use `Alt+C` because they skip the destination, in the same way as the existing copy commands.
- If the `Cmd-T,*` family ships, it does not collide with the text fragment commands.
- Generation uses the `start`-only form today. Issue https://github.com/couimet/rangeLink/issues/763 tracks context-aware generation with the `prefix`, `suffix`, and `end` terms. The shortcut choice holds for both forms.
