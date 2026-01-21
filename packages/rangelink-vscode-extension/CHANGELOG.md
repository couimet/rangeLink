# Changelog

All notable changes to the RangeLink VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Paste File Path Commands** - Send file paths directly to bound destinations (#243)
  - **Context menu commands** - See "Context Menu Integrations" section below for full details
  - **Command palette commands** - For the currently active editor
    - "Paste Current File Path" - Sends workspace-relative path (default)
    - "Paste Current File Path (Absolute)" - Sends absolute path
  - **Keyboard shortcuts** - `Cmd+R Cmd+F` for relative, `Cmd+R Cmd+Shift+F` for absolute
  - **Shell-safe quoting for terminals** - Paths with special characters (spaces, parentheses, etc.) are automatically quoted when sent to terminal destinations. Clipboard retains unquoted path for non-shell contexts.
  - Includes separate `smartPadding.pasteFilePath` setting (default: `both`) for controlling whitespace around pasted paths
  - Copies to clipboard + sends to bound destination (like other paste commands)
  - Shows quick pick to bind a destination when unbound
- **Go to Link Command (R-G)** - Paste or type a RangeLink to go directly to that code location
  - **Keyboard shortcut:** `Cmd+R Cmd+G` (Mac) / `Ctrl+R Ctrl+G` (Win/Linux)
  - Input any RangeLink format (`recipes/baking/chickenpie.ts#L3C14-L15C9`) and jump to that location
  - Also available via Command Palette and status bar menu for discoverability
- **Context Menu Integrations** - Right-click access to RangeLink commands (#73, #243, #246)
  - **Explorer** (right-click on files):
    - "RangeLink: Paste File Path" - Send absolute path to bound destination
    - "RangeLink: Paste Relative File Path" - Send relative path to bound destination
  - **Editor Tab** (right-click on tabs):
    - "RangeLink: Paste File Path" - Send absolute path to bound destination
    - "RangeLink: Paste Relative File Path" - Send relative path to bound destination
    - "RangeLink: Bind Here" - Bind this editor as paste destination (file/untitled only)
    - "RangeLink: Unbind" - Unbind current paste destination (when bound)
  - **Editor Content** (right-click inside editor):
    - "RangeLink: Copy Range Link" - Create relative path link (has selection)
    - "RangeLink: Copy Range Link (Absolute)" - Create absolute path link (has selection)
    - "RangeLink: Copy Portable Link" - Create BYOD portable link (has selection)
    - "RangeLink: Copy Portable Link (Absolute)" - Create BYOD portable link (has selection)
    - "RangeLink: Paste Selected Text" - Send selected text to bound destination (has selection)
    - "RangeLink: Save Selection as Bookmark" - Save selection for quick access (has selection)
    - ─── _visual separator_ ───
    - "RangeLink: Paste This File's Path" - Send absolute path to bound destination
    - "RangeLink: Paste This File's Relative Path" - Send relative path to bound destination
    - "RangeLink: Bind Here" - Bind this editor as paste destination (file/untitled only)
    - "RangeLink: Unbind" - Unbind current paste destination (when bound)
  - **Terminal** (right-click on terminal tabs or inside terminal):
    - "RangeLink: Bind Here" - Bind this terminal as paste destination
    - "RangeLink: Unbind" - Unbind current paste destination (when bound)
- **Status Bar Menu** - Click the `🔗 RangeLink` status bar item to access ⚡ quick actions
  - Jump to Bound Destination (shows quick pick of available destinations when unbound)
  - Go to Link
  - List Bookmarks / Manage Bookmarks
  - Show Version Info
- **Bookmarks System** - Save code locations for quick access later
  - **Save Selection as Bookmark (R-B-S)** - `Cmd+R Cmd+B Cmd+S` (Mac) / `Ctrl+R Ctrl+B Ctrl+S` (Win/Linux)
    - Save current selection as a reusable bookmark with custom label
    - Also available via Command Palette and editor context menu (right-click)
  - **List Bookmarks (R-B-L)** - `Cmd+R Cmd+B Cmd+L` (Mac) / `Ctrl+R Ctrl+B Ctrl+L` (Win/Linux)
    - Select a bookmark to paste its link to bound destination (or clipboard if unbound)
    - Manage bookmarks via the gear icon action in the bookmark list

### Changed

- **Cleaner command titles** - Removed redundant "RangeLink" from command palette titles (#243)
  - **Before:** "RangeLink: Bind RangeLink to Terminal Destination"
  - **After:** "RangeLink: Bind to Terminal"
  - Category "RangeLink" already provides the namespace; titles now focus on the action
- **Editor context menu labels** - Selection items now have "RangeLink:" prefix (#243)
  - **Before:** "Copy Range Link [⌘R ⌘L]" (command palette title with keybinding in title)
  - **After:** "RangeLink: Copy Range Link" (consistent prefix, cleaner appearance)
- **Jump to Bound Destination UX** - Quick pick when no destination bound (#173)
  - **Before:** Error message "No destination bound. Bind a destination first."
  - **After:** Select destination → binds and jumps in one action
  - Dismisses silently when user presses Escape
  - Edge case: Shows info notification if no destinations exist (e.g., no terminal, single tab group, no AI extensions)
- **Paste Selected Text UX** - Quick pick when no destination bound (#90)
  - **Before:** Silently copied to clipboard with no indication
  - **After:** Select destination → binds and pastes in one action
  - Dismisses silently when user presses Escape (no clipboard fallback — user can retry)
  - Edge case: Shows info notification if no destinations exist

### Fixed

- **Text editor paste to hidden tabs** - Bound text editor no longer needs to be the topmost tab in its pane. Paste now works even when the bound file is hidden behind other tabs—RangeLink automatically brings it to the foreground during paste. (#181)
- **Text editor binding validation** - Prevents binding to read-only editors (git diff views, output panels, settings UI) that would cause paste operations to fail with confusing errors. Now shows clear error messages: "Cannot bind to read-only editor (git)" or "Cannot bind to file.png - binary file".
- **Full-line navigation selection** - Fixed `#L10` selecting only first character instead of entire line. Full-line links (`#L10`, `#L10-L15`) now correctly select from start of first line to end of last line.
- **Full-line link generation with newline** - Fixed link generation when selection includes trailing newline. Selecting "line 20 + newline" now correctly generates `#L20` instead of `#L20-L21`.
- **Smart padding preserves whitespace-only text** - Fixed `applySmartPadding()` incorrectly trimming whitespace-only strings to empty. Now whitespace-only content is preserved when using paste destinations.

## [1.0.0]

### Added

- **Fully automatic paste for Claude Code and Cursor AI** - Zero-friction workflow completes the v0.3.0 vision
  - v0.3.0 required manual `Cmd+V` paste after link was copied — that friction is gone
  - Now uses clipboard + programmatic paste technique for seamless auto-insertion
  - All AI chat destinations now provide identical UX: select code → link appears → keep typing
  - "One Keybinding to Rule Them All" — now it truly does
  - Switch AI assistants without relearning shortcuts — same R-keybindings, any AI
- **GitHub Copilot Chat Integration** - Paste destination for GitHub Copilot Chat
  - Automatically inserts links and selected text directly into GitHub Copilot Chat
  - Command: "Bind RangeLink to GitHub Copilot Chat Destination"
  - Requires GitHub Copilot Chat extension
  - Consistent with RangeLink's unified paste destination workflow (auto-focus, cursor positioning)
- **Smart bind with confirmation** - Quick switching between paste destinations
  - Run any "Bind to..." command when already bound to automatically replace with confirmation
  - QuickPick dialog shows current and new destination before replacing
  - No need to manually unbind first - flow handles unbind → bind seamlessly
  - Prevents accidental binding to same destination (shows info message instead)
  - Toast notifications show replacement info: "Unbound X, now bound to Y"
  - Integrated with all bind commands (Claude Code, Cursor AI, GitHub Copilot Chat, Terminal, Text Editor)
- **Paste Selected Text to Destination (R-V) 🚐** - Send selected text directly to bound destinations, not just links
  - New command: "Paste Selected Text to Bound Destination" (`Cmd+R Cmd+V` / `Ctrl+R Ctrl+V`)
  - Works with all destination types: Claude Code Extension, Cursor AI, GitHub Copilot Chat, Terminal, Text Editor
  - Supports single and multi-selection (concatenates with newlines)
  - Clipboard fallback when no destination bound
  - Perfect for quickly sharing code snippets with AI assistants
  - Consistent with existing paste destination workflow (auto-focus, cursor positioning)
  - **Why 🚐 (RV emoji)?** Keybinding preserves `R` prefix (like RangeLink's `R+L`), and `V` mirrors the standard paste gesture (`Cmd+V`). The RV/camper emoji is a playful reminder of this mnemonic.
- **Jump to Bound Destination (R-J)** - Quickly focus your currently bound destination
  - New command: "Jump to Bound Destination" (`Cmd+R Cmd+J` / `Ctrl+R Ctrl+J`)
  - Instantly brings focus to terminal, text editor, or AI chat destination
  - No more hunting for bound destinations buried under tabs or panes
- **RangeLink Clipboard-Only Mode (R-C)** - Generate RangeLinks directly to clipboard, bypassing paste destinations
  - New commands: "Copy Range Link (Clipboard Only)" (`Cmd+R Cmd+C` / `Ctrl+R Ctrl+C`)
  - Generates formatted RangeLinks (e.g., `src/auth.ts#L42C10-L58C25`) with relative or absolute paths
  - Useful for sharing absolute-path links across projects or IDE instances without requiring to unbind a destination first.
  - Gives explicit control over when links paste to bound destinations vs clipboard only
- **i18n foundation** - Message code system for future localization support. English only currently.

### Changed

- **Less intrusive auto-unbind notifications** - When a bound text editor document closes, the auto-unbind notification now appears in the status bar (2 seconds) instead of as a popup dialog. This makes the background cleanup less disruptive to your workflow.

### Fixed

- **Single-position navigation** - Fixed regression introduced in v0.3.0 where navigating to single-position links (e.g., `file.ts#L32C1`) showed invisible cursors instead of visible 1-character selections.

## [0.3.0]

### Added

- **Paste Destinations System** - Universal paste destination framework for auto-sending links
  - Unified architecture supports AI chat integrations, terminal and text editor
  - One destination active at a time (Claude Code OR Cursor AI OR terminal OR text editor)
  - Seamless workflow: select code → link appears where you need it
- **Claude Code Extension Integration** - Streamlined clipboard workflow for Anthropic's official Claude extension
  - Automatically copies link and opens Claude Code chat panel
  - Works in both VSCode and Cursor IDE
  - One-paste workflow: user pastes with Cmd/Ctrl+V (workaround for API limitation)
  - Command: "Bind RangeLink to Claude Code Destination"
- **Cursor AI Integration** - Streamlined clipboard workflow for Cursor IDE
  - Automatically copies link and opens Cursor chat panel
  - One-paste workflow: user pastes with Cmd/Ctrl+V (workaround for API limitation)
  - Command always discoverable in Command Palette for both VSCode and Cursor
  - Shows helpful message in VSCode directing users to Cursor IDE
  - Command: "Bind RangeLink to Cursor AI"
- **Text Editor Destination** - Paste generated links directly into any text-based editor
  - Works with untitled/scratch files, markdown, code files, any text document
  - Perfect for drafting AI prompts before sending to AI assistants
  - Bind any text editor as paste destination (Command Palette → "Bind RangeLink to Text Editor Destination")
  - Requires split editor (2+ tab groups) and bound file must be topmost tab for auto-paste
  - Auto-paste links at cursor position with smart padding
  - Auto-focuses bound editor after paste (RangeLink's unified UX pattern across all destinations)
  - Clipboard fallback with reminder when bound file hidden behind other tabs
  - Blocks binary files (images, PDFs, archives) - only text-like files
  - Auto-unbinds when editor closes with notification
  - See README for full workflow details
- **Editor Link Navigation** - Click RangeLinks in any editor file to navigate
  - Primary use case: Validate links in scratchpad files before sending to claude-code
  - Works in all file types: markdown, text, code, untitled files
  - Hover tooltips show full navigation details
  - Supports all link formats: single-line, ranges, columns, rectangular mode
  - Reuses terminal navigation logic for consistency

### Changed

- **Unified Paste Destination Management** - Single manager replaces separate terminal/chat systems
  - Command renamed: `rangelink.unbindTerminal` → `rangelink.unbindDestination`
  - Simplified bind/unbind commands work consistently across all destination types
  - Improved error handling and user feedback
- **Terminology Updates** - Harmonized vocabulary across extension
  - "Terminal Binding" → "Terminal Paste Destination"
  - Consistent "Paste Destinations" terminology in UI and docs

## [0.2.1]

### Fixed

- **Critical packaging bug** - Fixed "Cannot find module" errors in v0.2.0
  - Separated `dist/` (production bundle) from `out/` (development output)
  - Follows official VSCode extension conventions
  - Prevents TypeScript compiler from overwriting esbuild's production bundle
  - Eliminates root cause of runtime module loading failures

## [0.2.0]

### Added

- **Terminal Link Navigation** - The killer feature for AI-assisted workflows
  - Click RangeLinks in your terminal to jump directly to code
  - **Cmd+Click** (Mac) or **Ctrl+Click** (Windows/Linux) to navigate
  - Instant file opening with precise cursor positioning
  - Works with single-line, and multi-line ranges
  - Smart path resolution for workspace-relative and absolute paths
  - Helpful tooltips showing the exact location that will be opened
  - Parse validation prevents navigation on invalid links
- **Terminal Binding** - Auto-send generated links to integrated terminal
  - Zero copy/paste friction for AI-assisted development
  - Links appear instantly where claude-code and other tools can see them
- Link validation with informative tooltips displaying full range context

### Changed

- **Broader VSCode compatibility** - Minimum version lowered from 1.80.0 to 1.49.0
  - Now supports 31 additional VSCode versions (3 years of releases)
  - Benefits users on stable corporate environments and older machines
  - Based on `registerTerminalLinkProvider` API availability (introduced in v1.49.0)
- Centralized asset management with build-time sync from monorepo `/assets/` directory
- `README` significantly streamlined: combined redundant sections, added compelling opening quote, removed overpromising claims
- Tool mentions now lead with claude-code (origin story) before other editors
- Refactored internal architecture with `RangeLinkService` for better maintainability

### Fixed

- Extension `README` now uses GitHub raw URL for logo (displays correctly in installed extensions, marketplace, and GitHub)
- Fixed ESLint configuration for better monorepo build reliability
- Fixed marketplace version badge URL in `README` (was using wrong publisher/extension name)
- Build process now explicitly deletes target files to prevent stale artifacts
- `CHANGELOG` now focuses only on extension changes (removed monorepo/internal documentation items)

## [0.1.0]

### Added

- Initial release to VS Code Marketplace
- Link generation with relative and absolute paths
- GitHub-style notation support (`#L10-L25` format)
- Rectangular selection support with `##` notation
- BYOD (Bring Your Own Delimiters) portable links for cross-configuration compatibility
- Custom delimiter configuration with comprehensive validation
- Reserved character validation preventing parsing ambiguities
- Delimiter conflict detection (substring and uniqueness checks)
- Comprehensive error handling with fallback to defaults
- Structured logging with stable error codes for i18n readiness
- Status bar feedback for link creation
- Command palette integration with four main commands:
  - Copy Range Link (relative path)
  - Copy Range Link (absolute path)
  - Copy Portable Link (relative path)
  - Copy Portable Link (absolute path)
- Context menu integration for all commands
- Keyboard shortcuts:
  - `Cmd+R Cmd+L` / `Ctrl+R Ctrl+L` - Copy Range Link
  - `Cmd+R Cmd+Shift+L` / `Ctrl+R Ctrl+Shift+L` - Copy Range Link (Absolute)
  - `Cmd+R Cmd+P` / `Ctrl+R Ctrl+P` - Copy Portable Link
  - `Cmd+R Cmd+Shift+P` / `Ctrl+R Ctrl+Shift+P` - Copy Portable Link (Absolute)

[Unreleased]: https://github.com/couimet/rangelink/compare/vscode-extension-v1.0.0...HEAD
[1.0.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.3.0...vscode-extension-v1.0.0
[0.3.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.2.1...vscode-extension-v0.3.0
[0.2.1]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.2.0...vscode-extension-v0.2.1
[0.2.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.1.0...vscode-extension-v0.2.0
[0.1.0]: https://github.com/couimet/rangelink/releases/tag/vscode-extension-v0.1.0
