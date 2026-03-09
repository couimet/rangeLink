# RangeLink QA Testing Plan — v1.0.0 → Unreleased

**Scope:** Changes accumulated between the `vscode-extension-v1.0.0` release tag and the current `main` branch tip, as documented in the `[Unreleased]` section of `CHANGELOG.md`. This file was created at commit `a4d56b9c71be755a532af178b607d3f768363af9`.

Each release cycle should produce a new `QA-TESTING-PLAN-<version>.md` + `qa-test-cases-<version>.yaml` pair for that release window, so the test history is preserved per release.

A companion structured YAML test case file for this cycle lives at [`docs/qa-test-cases-v1.0.0-unreleased.yaml`](./qa-test-cases-v1.0.0-unreleased.yaml) (also frozen at the same commit).

## Automation Approach

### Tool Survey

The VSCode extension ecosystem offers several testing options. None provide a YAML/JSON-declarative UI automation harness — the question "can we drive tests from a YAML file?" is addressed in the **Recommendation** section below.

| Tool | What it is | YAML/JSON input? | Verdict |
| --- | --- | --- | --- |
| **`@vscode/test-cli`** | Official Microsoft tool. Downloads a pinned VS Code version, installs the extension into it, runs a Mocha/Jest test runner inside the extension host. Tests are TypeScript and can import the full `vscode` API. Replaces the older `vscode-test` package. | No — TypeScript/JavaScript only | **Recommended for future automation** |
| **`vscode-extension-tester`** (Red Hat) | Uses `selenium-webdriver` + `chromedriver` to drive VS Code's Electron shell like a browser. Supports clicking buttons, reading labels, and asserting UI state. | No — TypeScript API, not YAML | Not recommended — brittle (breaks on every VS Code UI update), slow, requires matching chromedriver version |
| **`vscode-test-web`** | Official tool for extensions that run in `vscode.dev` (the browser-based VS Code). Only applicable to web extensions. | No | Not applicable — RangeLink targets desktop VS Code |
| **`@playwright/test`** | Playwright drives web browsers. There is no official Playwright adapter for desktop VS Code extensions (only for VS Code's web-based variant). | No | Not applicable |
| **Custom YAML runner** | Build a custom harness that reads YAML definitions and executes them via `@vscode/test-cli` integration test APIs. | Yes, but you build it | High implementation cost; no ecosystem support; maintenance burden grows with each VS Code API change |

### Recommendation

For the upcoming release, use **manual testing** driven by this document. The test cases are also exported to [`docs/qa-test-cases.yaml`](./qa-test-cases.yaml) as a machine-readable list (status tracking, filtering by feature/platform) — but execution remains human-driven.

For future automation investment, the right tool is **`@vscode/test-cli`** (TypeScript integration tests). It runs inside a real VS Code process, has access to the full extension API, and is officially supported. Good candidates for automation are flows that can be verified programmatically without UI clicks (configuration changes, command execution results, status bar item state, error message codes). Pixel-level UI flows (quick-pick appearance, context menu rendering) should remain manual.

**YAML-driven automation is not feasible without building custom infrastructure from scratch.** The ecosystem does not provide it today.

---

## Test Environment

Before running any test cases, verify the following:

- VS Code version: latest stable (test against the same version used for the release)
- RangeLink extension: installed from the `.vsix` build (not from the marketplace)
- Extension settings reset to defaults before each test session unless noted otherwise
- Platform: tests marked `[mac]`, `[win]`, or `[all]` indicate platform applicability

**Keyboard shortcuts used in test cases use Mac notation (`Cmd`). Substitute `Ctrl` on Windows/Linux.**

---

---

## Test Case Index

149 test cases across 14 sections. Status column tracks per-tester pass/fail during the release cycle. Detailed steps and expected results are filled in per section (S003–S006 of the QA plan build process).

**Status key:** `pending` → not yet run · `pass` · `fail` · `skip`

---

## Section 0 — Core Send Commands (R-L, R-C)

The primary send commands. R-L delivers a RangeLink to the bound destination (and opens a picker when unbound). R-C copies to clipboard only and never interacts with a destination.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-144 | R-L (`Cmd+R Cmd+L`) sends RangeLink to bound terminal destination | mac | pending |
| TC-145 | R-L sends RangeLink to bound text editor destination | all | pending |
| TC-146 | R-L sends RangeLink to bound AI assistant destination | all | pending |
| TC-147 | R-C (`Cmd+R Cmd+C`) copies RangeLink to clipboard and does NOT send to destination | mac | pending |
| TC-148 | `RangeLink: Send RangeLink` in Command Palette behaves identically to R-L | all | pending |
| TC-149 | `RangeLink: Copy RangeLink` in Command Palette behaves identically to R-C | all | pending |

### Test Case Details

#### TC-144 — R-L sends RangeLink to bound terminal

**Preconditions:**
1. Extension installed from `.vsix` build
2. A workspace is open with at least one TypeScript/JavaScript file containing 10+ lines
3. A terminal is open and bound as the RangeLink destination

**Steps:**
1. Select lines 2–5 in the TypeScript file
2. Press `Cmd+R Cmd+L` (Mac) / `Ctrl+R Ctrl+L` (Win/Linux)
3. Observe the terminal output
4. Observe the VS Code status bar or notification area

**Expected result:** The terminal receives the workspace-relative RangeLink (e.g., `src/utils/helper.ts#L2-L5`). A success toast appears (e.g., `✓ RangeLink & sent to Terminal`).

---

#### TC-145 — R-L sends RangeLink to bound text editor

**Preconditions:**
1. Extension installed from `.vsix` build
2. Two files open: file A (source) and file B (destination) — in any tab group arrangement
3. File B is bound as the text editor destination
4. Cursor is positioned in file B at the intended paste location

**Steps:**
1. Click in file A and select 3 lines of code
2. Press `Cmd+R Cmd+L`
3. Observe file B

**Expected result:** The RangeLink text is inserted at the cursor position in file B. A success toast confirms the send.

---

#### TC-146 — R-L sends RangeLink to bound AI assistant

**Preconditions:**
1. Extension installed from `.vsix` build
2. Claude Code extension (or GitHub Copilot Chat) is installed, active, and bound as destination
3. AI chat panel is open

**Steps:**
1. Select 3–5 lines of code in any file
2. Press `Cmd+R Cmd+L`
3. Observe the AI chat input area

**Expected result:** The RangeLink appears in the AI chat input. A success toast confirms the send. The AI session is ready for the user to continue typing.

---

#### TC-147 — R-C copies to clipboard only, no destination send

**Preconditions:**
1. Extension installed from `.vsix` build
2. A terminal is open and bound (to verify it does NOT receive anything)

**Steps:**
1. Select 3 lines in any file
2. Press `Cmd+R Cmd+C` (Mac) / `Ctrl+R Ctrl+C` (Win/Linux)
3. Observe the terminal — nothing should arrive
4. Press `Cmd+V` in any text field to inspect the clipboard

**Expected result:** The clipboard contains the RangeLink. The terminal received nothing. No destination picker was shown.

---

#### TC-148 — `Send RangeLink` in Command Palette

**Preconditions:** Extension installed, terminal bound.

**Steps:**
1. Select text in a file
2. Open Command Palette (`Cmd+Shift+P`)
3. Type `Send RangeLink` and press Enter on `RangeLink: Send RangeLink`
4. Observe terminal

**Expected result:** Terminal receives the RangeLink — identical behavior to the R-L keybinding.

---

#### TC-149 — `Copy RangeLink` in Command Palette

**Preconditions:** Extension installed, terminal bound.

**Steps:**
1. Select text in a file
2. Open Command Palette (`Cmd+Shift+P`)
3. Type `Copy RangeLink` and press Enter on `RangeLink: Copy RangeLink`
4. Observe terminal — nothing should arrive
5. Press `Cmd+V` in any text field

**Expected result:** Terminal received nothing. Clipboard contains the RangeLink. Behavior is clipboard-only regardless of bound destination.

---

## Section 1 — R-M Status Bar Menu

New in this release: `Cmd+R Cmd+M` / `Ctrl+R Ctrl+M` or clicking `🔗 RangeLink` in the status bar opens a context-aware QuickPick menu.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-001 | Status bar item visible with correct text `$(link) RangeLink` and tooltip `RangeLink Menu` | all | pending |
| TC-002 | Clicking the status bar item opens the R-M menu | all | pending |
| TC-003 | `Cmd+R Cmd+M` keybinding opens the R-M menu | mac | pending |
| TC-004 | `Ctrl+R Ctrl+M` keybinding opens the R-M menu | win/linux | pending |
| TC-005 | R-M menu shows `Jump to Bound Destination` when a destination is bound | all | pending |
| TC-006 | R-M menu shows destination picker when no destination is bound | all | pending |
| TC-007 | R-M menu shows `Unbind Destination` when a destination is bound | all | pending |
| TC-008 | R-M menu `Go to Link` item opens R-G input box | all | pending |
| TC-009 | R-M menu `Show Version Info` displays version, commit, branch, and build date | all | pending |

---

## Section 2 — R-D Bind to Destination

New in this release: dedicated `Cmd+R Cmd+D` / `Ctrl+R Ctrl+D` keybinding to open the destination picker directly.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-010 | `Cmd+R Cmd+D` opens the destination picker showing terminals, files, and AI assistants | mac | pending |
| TC-011 | `Ctrl+R Ctrl+D` opens the destination picker | win/linux | pending |
| TC-012 | `RangeLink: Bind to Destination` in Command Palette opens destination picker | all | pending |
| TC-013 | Selecting a terminal destination binds it and shows success toast | all | pending |
| TC-014 | Selecting a text editor destination binds it and shows success toast | all | pending |
| TC-015 | Selecting an AI assistant destination binds it and shows success toast | all | pending |
| TC-016 | When already bound, destination picker shows smart-bind confirmation dialog | all | pending |
| TC-017 | Smart-bind confirmation "Yes, replace" switches the binding to the new destination | all | pending |
| TC-018 | Smart-bind confirmation "No, keep current binding" retains existing binding | all | pending |
| TC-019 | Escape from destination picker dismisses without changing binding | all | pending |

---

## Section 3 — Terminal Picker

New in this release: QuickPick list of terminals instead of auto-binding the active one.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-020 | Active terminal is marked with `active` badge | all | pending |
| TC-021 | Bound terminal is marked with `bound` badge | all | pending |
| TC-022 | Terminal that is both active and bound shows dual `bound · active` badge | all | pending |
| TC-023 | Bound terminal always appears first in the terminal picker list | all | pending |
| TC-024 | Active (non-bound) terminal appears second in the list | all | pending |
| TC-025 | Hidden IDE terminals (e.g. Cursor's background terminal) are absent from the picker | all | pending |
| TC-026 | With ≤ `maxInline` terminals, all are shown inline (no "More terminals..." item) | all | pending |
| TC-027 | With > `maxInline` terminals, extras collapse into `More terminals...` | all | pending |
| TC-028 | Selecting `More terminals...` opens the secondary full terminal picker | all | pending |
| TC-029 | Escaping the secondary terminal picker returns to the parent destination picker | all | pending |
| TC-030 | `rangelink.terminalPicker.maxInline` setting changes the overflow threshold | all | pending |
| TC-031 | Terminal picker appears inline in the R-M menu (unbound state) | all | pending |
| TC-032 | Terminal picker appears inline in the R-D destination picker | all | pending |

---

## Section 4 — File Picker

New in this release: open files appear as individual destinations in the picker.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-033 | Bound file appears first in the list with `bound` badge | all | pending |
| TC-034 | Active (frontmost) file per tab group appears before other files in that group | all | pending |
| TC-035 | Files with the same base name show path disambiguation | all | pending |
| TC-036 | Open files appear as inline items in the destination picker | all | pending |
| TC-037 | With more open files than the inline limit, extras collapse into `More files...` | all | pending |
| TC-038 | Secondary file picker shows `Active Files` section | all | pending |
| TC-039 | Secondary file picker shows `Tab Group N` sections for each editor group | all | pending |
| TC-040 | Escaping the secondary file picker returns to the parent destination picker | all | pending |
| TC-041 | File picker appears inline in the R-M menu (unbound state) | all | pending |

---

## Section 5 — Clipboard Preservation

New in this release: `rangelink.clipboard.preserve` setting (`"always"` | `"never"`, default `"always"`).

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-042 | `always` mode: clipboard content before R-L is restored after the operation | all | pending |
| TC-043 | `always` mode: clipboard content before R-V is restored after the operation | all | pending |
| TC-044 | `always` mode: clipboard content before R-F is restored after the operation | all | pending |
| TC-045 | `always` mode: clipboard content before AI assistant paste is restored after | all | pending |
| TC-046 | `always` mode: clipboard content before terminal paste is restored after | all | pending |
| TC-047 | `never` mode: clipboard contains the last RangeLink output after R-L (previous behavior) | all | pending |
| TC-048 | `never` mode: clipboard contains last output after R-V | all | pending |
| TC-049 | R-C (Copy RangeLink) always writes to clipboard regardless of preserve setting | all | pending |
| TC-050 | `always` mode: no preserve when no destination is bound (ClipboardOnly path skips preserve) | all | pending |

### Test Case Details

> **Setup for all Clipboard Preservation tests:** Before each test, copy the sentinel text `CLIPBOARD_SENTINEL` to your clipboard. This lets you verify whether the clipboard was preserved (you paste and see `CLIPBOARD_SENTINEL`) or overwritten (you paste and see the RangeLink/path).
> The `rangelink.clipboard.preserve` setting is in VS Code Settings (`Cmd+,`) under **Extensions → RangeLink → Clipboard → Preserve**.

#### TC-042 — `always` mode: R-L restores clipboard

**Preconditions:**
1. `rangelink.clipboard.preserve` = `"always"` (default — verify in settings)
2. Terminal open and bound as destination
3. A TypeScript file open with 5+ lines

**Steps:**
1. Copy `CLIPBOARD_SENTINEL` to clipboard
2. Select lines 2–4 in the TypeScript file
3. Press `Cmd+R Cmd+L`
4. Verify the terminal received the RangeLink
5. Press `Cmd+V` in any text field

**Expected result:** Clipboard contains `CLIPBOARD_SENTINEL`. The RangeLink was delivered to the terminal, but the clipboard was silently restored.

---

#### TC-043 — `always` mode: R-V restores clipboard

**Preconditions:** `always` mode, a second terminal or text editor bound as destination, terminal open with visible output text.

**Steps:**
1. Copy `CLIPBOARD_SENTINEL` to clipboard
2. Focus the terminal
3. Select a line of terminal output (drag to highlight)
4. Press `Cmd+R Cmd+V`
5. Verify bound destination received the selected text
6. Press `Cmd+V` anywhere

**Expected result:** Clipboard contains `CLIPBOARD_SENTINEL`. The terminal text was sent to the destination; clipboard was preserved.

---

#### TC-044 — `always` mode: R-F restores clipboard

**Preconditions:** `always` mode, terminal bound, any file open.

**Steps:**
1. Copy `CLIPBOARD_SENTINEL` to clipboard
2. Focus the active editor
3. Press `Cmd+R Cmd+F`
4. Verify terminal received the file path
5. Press `Cmd+V` anywhere

**Expected result:** Clipboard contains `CLIPBOARD_SENTINEL`. The path was sent to the terminal; clipboard was preserved.

---

#### TC-045 — `always` mode: AI assistant paste restores clipboard

**Preconditions:** `always` mode, Claude Code or Copilot Chat bound, AI panel open.

**Steps:**
1. Copy `CLIPBOARD_SENTINEL` to clipboard
2. Select 3 lines of code
3. Press `Cmd+R Cmd+L`
4. Verify RangeLink appeared in AI chat
5. Press `Cmd+V` anywhere

**Expected result:** Clipboard contains `CLIPBOARD_SENTINEL`. RangeLink delivered to AI chat; clipboard was preserved.

---

#### TC-046 — `always` mode: terminal paste restores clipboard

**Preconditions:** `always` mode, terminal bound as destination (same scenario as TC-042 verifies terminal path specifically).

Same steps as TC-042. This TC exists to explicitly name the terminal-paste transport path as tested (vs. text editor or AI in TC-043–045).

---

#### TC-047 — `never` mode: clipboard contains last RangeLink output after R-L

**Preconditions:** `rangelink.clipboard.preserve` = `"never"`, terminal bound.

**Steps:**
1. Copy `CLIPBOARD_SENTINEL` to clipboard
2. Select 3 lines of code
3. Press `Cmd+R Cmd+L`
4. Press `Cmd+V` anywhere

**Expected result:** Clipboard contains the RangeLink (e.g., `src/utils/helper.ts#L2-L4`). `CLIPBOARD_SENTINEL` is gone. This is the previous pre-v1.0.0 behavior.

---

#### TC-048 — `never` mode: clipboard contains terminal selection after R-V

**Preconditions:** `never` mode, another terminal or editor bound as destination.

**Steps:**
1. Copy `CLIPBOARD_SENTINEL` to clipboard
2. Select text in a terminal
3. Press `Cmd+R Cmd+V`
4. Press `Cmd+V` anywhere

**Expected result:** Clipboard contains the terminal text that was sent. `CLIPBOARD_SENTINEL` is gone.

---

#### TC-049 — R-C always writes to clipboard regardless of preserve setting

**Preconditions:** `rangelink.clipboard.preserve` = `"always"` (this should NOT apply to R-C), terminal bound.

**Steps:**
1. Copy `CLIPBOARD_SENTINEL` to clipboard
2. Select 3 lines of code
3. Press `Cmd+R Cmd+C` (Copy RangeLink — clipboard-only)
4. Press `Cmd+V` anywhere

**Expected result:** Clipboard contains the RangeLink, NOT `CLIPBOARD_SENTINEL`. R-C explicitly requests clipboard output; preserve does not apply because the clipboard IS the intended output.

---

#### TC-050 — `always` mode: no preserve when no destination is bound

**Preconditions:** `always` mode, NO destination bound (unbind first if needed).

**Steps:**
1. Copy `CLIPBOARD_SENTINEL` to clipboard
2. Select 3 lines of code
3. Press `Cmd+R Cmd+L` — destination picker appears
4. Press `Escape` to dismiss the picker (do not select a destination)
5. Press `Cmd+V` anywhere

**Expected result:** Clipboard contains `CLIPBOARD_SENTINEL`. Because the operation did not complete (user dismissed), the clipboard was not written. (If user completes the binding in step 4, the preserve behavior follows TC-042 rules.)

---

## Section 6 — Send File Path Commands

New in this release: `Cmd+R Cmd+F` (relative) and `Cmd+R Cmd+Shift+F` (absolute) send current file path.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-051 | `Cmd+R Cmd+F` sends workspace-relative path to bound terminal destination | mac | pending |
| TC-052 | `Cmd+R Cmd+Shift+F` sends absolute path to bound terminal destination | mac | pending |
| TC-053 | `Ctrl+R Ctrl+F` sends relative path on Win/Linux | win/linux | pending |
| TC-054 | Terminal destination: path with spaces auto-quoted in single quotes | all | pending |
| TC-055 | Terminal destination: path with parentheses auto-quoted in single quotes | all | pending |
| TC-056 | Text editor destination: path sent unquoted | all | pending |
| TC-057 | Clipboard always contains the unquoted path regardless of destination type | all | pending |
| TC-058 | Self-paste (sending path of the currently active file to that same file) shows info + clipboard copy | all | pending |
| TC-059 | Unbound: R-F opens destination picker to bind before sending | all | pending |
| TC-060 | `RangeLink: Send Current File Path` in Command Palette | all | pending |
| TC-061 | `RangeLink: Send Current File Path (Absolute)` in Command Palette | all | pending |

### Test Case Details

> **Setup for all Send File Path tests:** Open a workspace (not a loose file) so that workspace-relative paths resolve correctly. Have a terminal bound as the destination unless TC notes otherwise.

#### TC-051 — `Cmd+R Cmd+F` sends relative path to terminal

**Preconditions:**
1. Workspace open at a known root
2. Terminal bound as destination
3. A file is active at e.g. `src/utils/helper.ts`

**Steps:**
1. Focus the file in the editor
2. Press `Cmd+R Cmd+F` (Mac) / `Ctrl+R Ctrl+F` (Win/Linux)
3. Observe terminal output
4. Observe VS Code notification area

**Expected result:** Terminal receives `src/utils/helper.ts` (workspace-relative). Success toast confirms the send.

---

#### TC-052 — `Cmd+R Cmd+Shift+F` sends absolute path to terminal

**Preconditions:** Same as TC-051.

**Steps:**
1. Focus the file
2. Press `Cmd+R Cmd+Shift+F`
3. Observe terminal

**Expected result:** Terminal receives the full absolute path (e.g., `/Users/you/project/src/utils/helper.ts`).

---

#### TC-053 — `Ctrl+R Ctrl+F` on Win/Linux

**Preconditions:** Windows or Linux, terminal bound.

**Steps:** Same as TC-051 using `Ctrl` modifier.

**Expected result:** Same as TC-051.

---

#### TC-054 — Terminal: path with spaces auto-quoted

**Preconditions:**
1. Terminal bound as destination
2. Active file has spaces in its path (e.g., `src/my folder/helper.ts`)

**Steps:**
1. Focus the file with spaces in its path
2. Press `Cmd+R Cmd+F`
3. Observe terminal output

**Expected result:** Terminal receives `'src/my folder/helper.ts'` — single-quoted. Without quoting, the shell would split the path on the space.

---

#### TC-055 — Terminal: path with parentheses auto-quoted

**Preconditions:** Terminal bound, active file has parentheses in path (e.g., `src/utils (v2)/helper.ts`).

**Steps:** Same as TC-054.

**Expected result:** Terminal receives `'src/utils (v2)/helper.ts'` — single-quoted.

---

#### TC-056 — Text editor destination: path sent unquoted

**Preconditions:**
1. Text editor (not terminal) bound as destination
2. Active file has spaces in its path (e.g., `src/my folder/helper.ts`)

**Steps:**
1. Focus the file with spaces
2. Press `Cmd+R Cmd+F`
3. Observe bound text editor

**Expected result:** Text editor receives `src/my folder/helper.ts` — **unquoted**. Shell-quoting only applies to terminal destinations.

---

#### TC-057 — Clipboard always contains unquoted path

**Preconditions:** Terminal bound, active file has spaces in path.

**Steps:**
1. Press `Cmd+R Cmd+F`
2. Observe terminal (receives quoted path)
3. Press `Cmd+V` in any text field

**Expected result:** Clipboard contains the **unquoted** path (`src/my folder/helper.ts`). Terminal received the quoted version. Clipboard is always unquoted for non-shell contexts.

---

#### TC-058 — Self-paste shows info notification + clipboard copy

**Preconditions:**
1. The currently active file is bound as the text editor destination (bind `src/utils/helper.ts` and keep it focused)

**Steps:**
1. With the bound file active and focused, press `Cmd+R Cmd+F`
2. Observe VS Code notifications
3. Check that the file content was NOT modified
4. Press `Cmd+V` in any text field

**Expected result:** An info notification appears (e.g., `Selected text copied to clipboard. Cannot paste to same file.`). Clipboard contains the path. The active file was not modified.

---

#### TC-059 — Unbound: R-F opens destination picker

**Preconditions:** No destination bound.

**Steps:**
1. Press `Cmd+R Cmd+F`
2. Observe the UI

**Expected result:** The destination picker opens. Selecting a destination binds it and sends the file path.

---

#### TC-060 & TC-061 — Command Palette variants

Run via `Cmd+Shift+P` → `Send Current File Path` (relative) and `Send Current File Path (Absolute)` respectively. Expected results match TC-051 and TC-052.

---

## Section 7 — Context Menu Integrations

New in this release: right-click access across Explorer, Editor Tab, Editor Content, and Terminal surfaces.

### Explorer (right-click on files)

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-062 | Explorer → `RangeLink: Send File Path` sends absolute path to bound destination | all | pending |
| TC-063 | Explorer → `RangeLink: Send Relative File Path` sends relative path | all | pending |
| TC-064 | Explorer → `RangeLink: Bind Here` opens the file and binds it as text editor destination | all | pending |
| TC-065 | Explorer → `RangeLink: Unbind` is visible when a destination is bound and unbinds it | all | pending |
| TC-066 | Explorer → `RangeLink: Unbind` is hidden when no destination is bound | all | pending |

### Editor Tab (right-click on tab)

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-067 | Editor tab → `RangeLink: Send File Path` | all | pending |
| TC-068 | Editor tab → `RangeLink: Send Relative File Path` | all | pending |
| TC-069 | Editor tab → `RangeLink: Bind Here` binds that editor | all | pending |
| TC-070 | Editor tab → `RangeLink: Unbind` visible when bound, unbinds | all | pending |

### Editor Content (right-click inside editor)

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-071 | Editor content (with selection) → `RangeLink: Send RangeLink` | all | pending |
| TC-072 | Editor content (with selection) → `RangeLink: Send RangeLink (Absolute)` | all | pending |
| TC-073 | Editor content (with selection) → `RangeLink: Send Portable Link` | all | pending |
| TC-074 | Editor content (with selection) → `RangeLink: Send Portable Link (Absolute)` | all | pending |
| TC-075 | Editor content (with selection) → `RangeLink: Send Selected Text` | all | pending |
| TC-076 | Visual separator is visible in editor content context menu | all | pending |
| TC-077 | Editor content → `RangeLink: Send This File's Path` (absolute) | all | pending |
| TC-078 | Editor content → `RangeLink: Send This File's Relative Path` | all | pending |
| TC-079 | Editor content → `RangeLink: Bind Here` | all | pending |
| TC-080 | Editor content → `RangeLink: Unbind` visible when bound | all | pending |
| TC-081 | Selection-dependent items (`Send RangeLink`, etc.) are hidden when no text is selected | all | pending |

### Terminal (right-click on terminal tab or inside terminal)

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-082 | Terminal tab → `RangeLink: Bind Here` binds that terminal | all | pending |
| TC-083 | Terminal content → `RangeLink: Bind Here` binds the terminal | all | pending |
| TC-084 | Terminal → `RangeLink: Unbind` is visible when a destination is bound | all | pending |

---

## Section 8 — Dirty Buffer Warning

New in this release: dialog when generating a link from a file with unsaved changes.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-085 | Generating a link from a file with unsaved changes shows the dirty buffer dialog | all | pending |
| TC-086 | Dirty buffer dialog shows three options: `Save & Generate`, `Generate Anyway`, and dismiss | all | pending |
| TC-087 | `Save & Generate`: saves the file then generates the link | all | pending |
| TC-088 | `Generate Anyway`: generates the link without saving | all | pending |
| TC-089 | Dismissing the dialog aborts link generation | all | pending |
| TC-090 | `rangelink.warnOnDirtyBuffer: false` disables the dirty buffer warning entirely | all | pending |
| TC-091 | Clean file (no unsaved changes) generates link immediately without dialog | all | pending |

### Test Case Details

> **Setup:** `rangelink.warnOnDirtyBuffer` setting is under **Extensions → RangeLink → Warn On Dirty Buffer** (`Cmd+,`). Default is `true`.

#### TC-085 — Dirty buffer dialog appears

**Preconditions:**
1. `rangelink.warnOnDirtyBuffer` = `true` (default)
2. Terminal bound as destination

**Steps:**
1. Open any file and make a small edit (add a space) **without saving**
2. Select 2–3 lines of code
3. Press `Cmd+R Cmd+L`

**Expected result:** A warning dialog appears before the RangeLink is generated. The dialog title or body references unsaved changes.

---

#### TC-086 — Dialog shows three options

**Preconditions:** Same as TC-085 — file must be dirty when R-L is pressed.

**Steps:** Same as TC-085 — focus on the dialog appearance.

**Expected result:** Three choices are visible: **Save & Generate**, **Generate Anyway**, and a cancel/dismiss option.

---

#### TC-087 — `Save & Generate` saves then generates

**Preconditions:** Terminal bound, file is dirty (unsaved change).

**Steps:**
1. Make an unsaved change to a file
2. Select 2–3 lines, press `Cmd+R Cmd+L`
3. Click **Save & Generate** in the dialog
4. Observe file state (title bar) and terminal

**Expected result:** The file is saved (modified indicator gone from tab title). The RangeLink is generated and sent to the terminal. Success toast shown.

---

#### TC-088 — `Generate Anyway` generates without saving

**Preconditions:** Terminal bound, file is dirty.

**Steps:**
1. Make an unsaved change
2. Select 2–3 lines, press `Cmd+R Cmd+L`
3. Click **Generate Anyway**
4. Observe file state and terminal

**Expected result:** The file is still dirty (modified indicator remains). The RangeLink is generated from the current unsaved state and sent to the terminal.

---

#### TC-089 — Dismiss aborts link generation

**Preconditions:** Terminal bound, file is dirty.

**Steps:**
1. Make an unsaved change
2. Select 2–3 lines, press `Cmd+R Cmd+L`
3. Press `Escape` or click `×` to dismiss the dialog

**Expected result:** No RangeLink is generated. Terminal unchanged. File still dirty.

---

#### TC-090 — `warnOnDirtyBuffer: false` disables the warning

**Preconditions:** `rangelink.warnOnDirtyBuffer` = `false` (set in VS Code settings), terminal bound.

**Steps:**
1. Make an unsaved change to a file
2. Select 2–3 lines, press `Cmd+R Cmd+L`
3. Observe — no dialog should appear

**Expected result:** The RangeLink is generated and sent immediately, without a warning dialog. (Behavior matches a clean file.)

---

#### TC-091 — Clean file generates link immediately

**Preconditions:** `rangelink.warnOnDirtyBuffer` = `true` (default), terminal bound, file is **saved** (no pending changes).

**Steps:**
1. Save the file (`Cmd+S`) to ensure no dirty state
2. Select 2–3 lines, press `Cmd+R Cmd+L`

**Expected result:** No dialog appears. RangeLink generated and sent immediately. Success toast shown.

---

## Section 9 — R-V Send Terminal Selection

New in this release: `Cmd+R Cmd+V` / `Ctrl+R Ctrl+V` sends terminal selection to bound destination.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-092 | `Cmd+R Cmd+V` with terminal focused and text selected sends to bound destination | mac | pending |
| TC-093 | `Ctrl+R Ctrl+V` on Win/Linux | win/linux | pending |
| TC-094 | R-V with no text selected in terminal shows error message | all | pending |
| TC-095 | R-V with no bound destination (behavior: picker or clipboard fallback) | all | pending |
| TC-096 | Terminal content context menu `Send Selection to Destination` (when text selected and bound) | all | pending |
| TC-097 | R-L keybinding pressed while terminal has focus shows guidance message suggesting R-V | all | pending |
| TC-098 | R-C keybinding pressed while terminal has focus shows guidance message suggesting R-V | all | pending |

### Test Case Details

#### TC-092 — `Cmd+R Cmd+V` with terminal focused and text selected

**Preconditions:**
1. Extension installed from `.vsix` build
2. A terminal is open with visible output (run any command, e.g. `ls`)
3. A second terminal **or** any other destination is open and bound

**Steps:**
1. Click in the terminal to focus it
2. Drag to select a line of terminal output
3. Press `Cmd+R Cmd+V` (Mac) / `Ctrl+R Ctrl+V` (Win/Linux)
4. Observe the bound destination

**Expected result:** The bound destination receives the selected terminal text. A success toast appears.

---

#### TC-093 — `Ctrl+R Ctrl+V` on Win/Linux

**Preconditions:** Windows or Linux, terminal with text selected, destination bound.

**Steps:** Same as TC-092 using `Ctrl` modifier.

**Expected result:** Same as TC-092.

---

#### TC-094 — R-V with no text selected in terminal shows error

**Preconditions:** Terminal focused, **nothing highlighted**, destination bound.

**Steps:**
1. Click in terminal (ensure no text is highlighted)
2. Press `Cmd+R Cmd+V`

**Expected result:** Error notification: "No text selected in the terminal. Select text and try again." Nothing sent to destination.

---

#### TC-095 — R-V with no bound destination

**Preconditions:** No destination bound, terminal focused, text selected in terminal.

**Steps:**
1. Unbind any destination
2. Select text in terminal
3. Press `Cmd+R Cmd+V`

**Expected result:** Destination picker opens (bind-and-send flow). On selection, the terminal text is sent to the newly-bound destination. On Escape, nothing is sent.

---

#### TC-096 — Terminal context menu `Send Selection to Destination`

**Preconditions:** Terminal focused, text selected, destination bound.

**Steps:**
1. Select text in the terminal
2. Right-click in the terminal
3. Look for and click `RangeLink: Send Selection to Destination`

**Expected result:** Selected text sent to bound destination. Same behavior as R-V keybinding.

---

#### TC-097 — R-L while terminal focused shows guidance

**Preconditions:** Terminal has focus (you clicked in the terminal).

**Steps:**
1. Click in terminal to focus it
2. Press `Cmd+R Cmd+L` (the editor link command)

**Expected result:** An error or info notification guides the user: R-L generates code-location links and requires an editor selection; use R-V to send terminal text. Terminal is not modified.

---

#### TC-098 — R-C while terminal focused shows guidance

**Preconditions:** Terminal has focus.

**Steps:**
1. Click in terminal to focus it
2. Press `Cmd+R Cmd+C`

**Expected result:** Notification guides the user to use R-V instead. No clipboard write occurs for an empty or invalid selection state.

---

## Section 10 — R-G Go to Link

New in this release: `Cmd+R Cmd+G` / `Ctrl+R Ctrl+G` pastes or types a RangeLink to navigate to it.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-099 | `Cmd+R Cmd+G` opens the Go to Link input box | mac | pending |
| TC-100 | `Ctrl+R Ctrl+G` on Win/Linux | win/linux | pending |
| TC-101 | Valid RangeLink in input box navigates to the file and selects the range | all | pending |
| TC-102 | Supports range format: `path/to/file.ts#L3C14-L15C9` | all | pending |
| TC-103 | Invalid link format shows error message | all | pending |
| TC-104 | Empty input dismisses with info notification | all | pending |
| TC-105 | File not found shows warning message | all | pending |
| TC-106 | `RangeLink: Go to Link` available in Command Palette | all | pending |
| TC-107 | `Go to Link` item in R-M menu opens the same input box | all | pending |

---

## Section 11 — R-U Unbind

New in this release: dedicated `Cmd+R Cmd+U` / `Ctrl+R Ctrl+U` keybinding to unbind.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-108 | `Cmd+R Cmd+U` unbinds the current destination when bound | mac | pending |
| TC-109 | `Ctrl+R Ctrl+U` on Win/Linux | win/linux | pending |
| TC-110 | R-U with no bound destination shows no-op or appropriate info message | all | pending |
| TC-111 | `RangeLink: Unbind Destination` available in Command Palette | all | pending |

---

## Section 12 — Changed Behaviors

Behavior changes and renames shipped in this release.

### Two-Verb Vocabulary (Send vs Copy)

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-112 | `RangeLink: Send RangeLink` appears in Command Palette (replaces "Copy Range Link") | all | pending |
| TC-113 | `RangeLink: Send RangeLink (Absolute)` in Command Palette | all | pending |
| TC-114 | `RangeLink: Send Portable Link` in Command Palette | all | pending |
| TC-115 | `RangeLink: Send Selected Text` in Command Palette | all | pending |
| TC-116 | `RangeLink: Copy RangeLink` in Command Palette (clipboard-only, no destination picker) | all | pending |
| TC-117 | `RangeLink: Copy RangeLink (Absolute)` in Command Palette | all | pending |
| TC-118 | `RangeLink: Send Current File Path` in Command Palette | all | pending |

### Picker-When-Unbound

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-119 | R-L with no bound destination opens destination picker (does not fall back to clipboard silently) | all | pending |
| TC-120 | Send Portable Link with no bound destination opens picker | all | pending |
| TC-121 | Jump to Bound Destination with no bound destination opens picker | all | pending |
| TC-122 | Send Selected Text with no bound destination opens picker | all | pending |

### Text Editor — No Split Required

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-123 | Binding a text editor in a single tab group (no split) succeeds | all | pending |
| TC-124 | Self-paste (pasting R-L to the same file you're selecting from) copies to clipboard and shows info message | all | pending |
| TC-125 | Self-paste info message for R-L suggests using R-C as alternative | all | pending |

### Editor Binding Validation

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-126 | Binding a git diff view (read-only) shows clear rejection message | all | pending |
| TC-127 | Binding an output panel (read-only) shows clear rejection message | all | pending |
| TC-128 | Binding the Settings UI (read-only) shows clear rejection message | all | pending |
| TC-129 | Binding a binary file (e.g. `.png`) shows rejection message `Cannot bind to [file] - binary file` | all | pending |

### Selected Test Case Details (R-L / R-C related)

#### TC-116 — `Copy RangeLink` is clipboard-only even when unbound

**Preconditions:** No destination bound.

**Steps:**
1. Select text in any file
2. Press `Cmd+R Cmd+C` (or use `RangeLink: Copy RangeLink` in Command Palette)
3. Observe — no picker should appear
4. Press `Cmd+V`

**Expected result:** Clipboard contains the RangeLink. No destination picker appeared. R-C is unconditionally clipboard-only.

---

#### TC-119 — R-L opens destination picker when no destination is bound

**Preconditions:** No destination bound.

**Steps:**
1. Select text in a file
2. Press `Cmd+R Cmd+L`
3. Observe — destination picker should appear

**Expected result:** Destination picker opens (not a silent clipboard fallback). Selecting a destination binds it and sends the RangeLink. Pressing `Escape` dismisses silently with no clipboard write.

---

#### TC-124 — Self-paste R-L shows info notification

**Preconditions:**
1. Open `src/utils/helper.ts`
2. Bind it as the text editor destination (so source and destination are the same file)

**Steps:**
1. With the bound file focused, select 2–3 lines
2. Press `Cmd+R Cmd+L`
3. Observe notifications and file content

**Expected result:** Info notification appears (e.g., "Selected text copied to clipboard. Cannot paste to same file."). The file is not modified. Clipboard contains the RangeLink.

---

#### TC-125 — Self-paste message for R-L suggests R-C

**Preconditions:** Same as TC-124 (same file bound as destination).

**Steps:** Same as TC-124.

**Expected result:** The info notification message specifically mentions R-C as an alternative (e.g., "Use R-C for clipboard-only links" or similar guidance).

---

## Section 13 — Bug Fix Regressions

Verify each fixed bug has not regressed.

| TC | Scenario | Platform | Status |
| --- | --- | --- | --- |
| TC-130 | `#L10` navigates and selects the entire line (not just the first character) | all | pending |
| TC-131 | `#L10-L15` selects from the start of line 10 to the end of line 15 | all | pending |
| TC-132 | Selecting a line including its trailing newline generates `#L20` (not `#L20-L21`) | all | pending |
| TC-133 | Backtick-wrapped RangeLink in terminal is clickable and navigates correctly | all | pending |
| TC-134 | Single-quote-wrapped RangeLink in terminal is clickable | all | pending |
| TC-135 | Double-quote-wrapped RangeLink in terminal is clickable | all | pending |
| TC-136 | Angle-bracket-wrapped RangeLink in terminal is clickable | all | pending |
| TC-137 | Markdown link `[label](path/to/file.ts#L10)` in a document is clickable and navigates correctly | all | pending |
| TC-138 | `https://example.com/path/file.ts#L10` in terminal is NOT captured as a RangeLink | all | pending |
| TC-139 | `https://example.com/path/file.ts#L10` in a document is NOT captured as a RangeLink | all | pending |
| TC-140 | Moving bound editor between tab groups → subsequent paste targets the correct new group | all | pending |
| TC-141 | Bound editor hidden behind other tabs → paste succeeds and brings the tab to the foreground | all | pending |
| TC-142 | Hovering over a clickable document link shows clean tooltip text (not raw JSON or command URI) | all | pending |
| TC-143 | Using `Ctrl+L` (select full line) then R-L generates link without `SELECTION_ZERO_WIDTH` error | all | pending |
