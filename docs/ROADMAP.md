# RangeLink Roadmap

This document outlines the development roadmap for RangeLink across all packages (core library, VSCode extension, and future plugins).

> **Development Approach:** We use **micro-iterations** (1-2 hours each) to prevent feature creep and maintain momentum. Each iteration has clear scope, time estimates, and "done when" criteria. This allows for frequent commits, easy progress tracking, and natural stopping points.

## Development Principles

Our roadmap follows these core principles to ensure sustainable, high-quality development:

1. **Micro-Iterations (1-2 hours max)**
   - Each iteration is small enough to complete in one focused session
   - Clear "done when" criteria prevent scope creep
   - Time estimates help with planning and prioritization

2. **One Focus Per Iteration**
   - Feature work and refactoring are separate iterations
   - Never mix unrelated changes in a single iteration
   - Keeps commits clean and reviewable

3. **Commit Early, Commit Often**
   - Commit after each micro-iteration, even if incomplete
   - Use `[WIP]` or `[PARTIAL]` tags when appropriate
   - Git history reflects incremental progress

4. **Explicit Scope Definition**
   - Document what IS and IS NOT in scope upfront
   - Prevents "just one more thing" syndrome
   - Makes it easy to defer work to next iteration

5. **Test-Driven Quality**
   - Aim for 100% branch coverage
   - Write tests during iteration, not after
   - Skipped tests are documented with tracking issues

---

## Phase 1: Core Enhancements — ✅ Mostly Complete

Phase 1 is split into three iterative sub-phases focusing on rectangular mode support, robust delimiter validation, and portable link generation. Each sub-phase uses micro-iterations for focused, incremental progress.

**Overall Status:**

- ✅ 1A: Rectangular Mode format (double hash) - Complete
- ✅ 1B: Reserved character validation and delimiter constraints - Complete
- 🔨 1C: Portable link (BYOD) generation - Complete; parsing in progress
- 📦 Major refactoring: Test modernization with ES6 imports and TypeScript types - Complete

### 1A) Rectangular Mode Format (Double Hash) — ✅ Completed

**Objective:** Use double `delimHash` to indicate rectangular mode selections in a delimiter-agnostic way.

**Implementation:**

- Detects rectangular mode: multiple selections with identical character ranges across consecutive lines
- Format: `path##L10C5-L20C10` (double hash indicates rectangular mode)
- Works with any `delimHash` value (single or multi-character)
- Example: if `delimHash="##"`, rectangular mode uses `####` (4 hash characters)

**Test Coverage Achieved:**

- ✅ Default delimiters, custom single-character, and multi-character delimiters
- ✅ Edge cases: line 0, column 0, large numbers, min/max selections
- ✅ Negative cases: non-consecutive lines, different ranges, single selection
- ✅ Path handling: relative and absolute paths

**Future Compatibility:**

- Scales to multi-range rectangular mode: `path##L10C5-L20C10,L30C5-L40C10`
- Circular ranges are mutually exclusive with rectangular mode (circular takes precedence)

---

### 1B) Reserved Character Validation and Delimiter Constraints — ✅ Completed

**Objective:** Enforce strict validation rules to prevent parsing ambiguities and ensure forward compatibility.

**Reserved Characters** (cannot be used in delimiter configurations):

- `~` - Portable link metadata separator (BYOD format)
- `|` - Reserved for future expansion
- `/`, `\` - File path separators
- `:` - Single-line reference format (`path:42`)
- Whitespace (spaces, tabs, newlines) - Would break parsing
- `,` - Reserved for multi-range separator: `path#L10-L20,L30-L40`
- `@` - Reserved for circular/radius selection: `path#L10C5@15`

**Core Validation Rules:**

1. **Delimiters cannot be empty**
2. **Delimiters cannot contain digits** - Critical: ensures numeric tokens (line numbers, column positions, radius values) always parse with priority over delimiter matching
3. **All delimiters must be unique** - No two delimiters can be identical
4. **No subset/superset relationships** - A delimiter cannot be a substring of another delimiter

For detailed validation rules and implementation details, see [ERROR-HANDLING.md](./ERROR-HANDLING.md).

**Implementation:**

- Structured logging with stable error codes for each validation failure
- Aggregated error reporting: all issues shown at once, then defaults applied
- INFO log when defaults are used (`MSG_1002`)
- Defensive guard for unexpected validation states

For logging details, see [LOGGING.md](./LOGGING.md).

**Test Coverage Achieved:**

- Each reserved character across all four delimiters
- Digits, empty values, and whitespace detection
- Uniqueness and substring conflicts (start, end, middle)
- Aggregated errors when multiple problems occur simultaneously
- Confirmation that defaults are used and logged via INFO when config is invalid

---

### 1C) Portable Link (BYOD/BYODELI 🥪) Generation and Parsing — 🔨 Generation Complete, Parsing in Progress

**Objective:** Generate and parse links with embedded delimiter metadata so teams can share code references seamlessly regardless of delimiter configurations.

For comprehensive BYOD documentation, see [BYOD.md](./BYOD.md).

**Status (Micro-Iteration Approach):**

- ✅ **Generation: Complete** (commands, keybindings, context menu, metadata composition)
- ✅ **Single-character hash validation**: Enforced for user configuration
- ✅ **Test suite modernization**: ES6 imports, proper TypeScript types, 114 passing tests
- 📋 **Parsing** (broken into focused micro-iterations):
  - 📋 **1C.1** (1.5h): Parse metadata structure, extract delimiters, format validation
  - 📋 **1C.2** (1.5h): Validate extracted delimiters (reserved chars, digits, conflicts)
  - 📋 **1C.3** (2h): Recovery logic (missing delimiters, fallbacks, error UI)
  - 📋 **1C.4** (1h): Rectangular mode detection with custom BYOD hash
  - 📋 **1C.5** (30m): Documentation and cleanup
- 📋 **Navigation: Planned** (Phase 3)

**Micro-Iteration Benefits:**

- Each iteration is 1-2 hours (completable in one session)
- Clear scope and stopping points prevent feature creep
- Can commit after each micro-iteration
- Easy to track progress and estimate remaining work

**Format:**

- Line-only: `path#L10-L20~#~L~-~`
- With columns: `path#L10C5-L20C10~#~L~-~C~`
- Rectangular Mode: `path##L10C5-L20C10~#~L~-~C~` (note double hash in range part)

For detailed format specifications, see [LINK-FORMATS.md](./LINK-FORMATS.md) and [BYOD.md](./BYOD.md).

**Exposure:**

- Command: "RangeLink: Create Portable Link"
- Context menu: "Copy Portable RangeLink"
- Keybinding: `Cmd+R Cmd+P` / `Ctrl+R Ctrl+P` (two-key chord)

---

## Phase 2: Core Architecture and Monorepo — ✅ Complete

We modularized the project and adopted a monorepo to enable fast, iterative development with world-class code quality.

**High-Level Objectives:**

- ✅ Extract core logic into `rangelink-core-ts` (pure TypeScript, npm package)
- ✅ Keep IDE extensions as thin wrappers (VSCode, Neovim)
- ✅ Enable rapid iteration with 100% branch coverage

For architectural details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### 2A) Monorepo Setup — ✅ Complete (15 minutes)

- ✅ Created `pnpm-workspace.yaml` at root
- ✅ Moved `src/` to `packages/rangelink-vscode-extension/src/`
- ✅ Updated `package.json` (root workspace + extension package)
- ✅ Created `tsconfig.base.json` for shared configuration
- ✅ Verified compilation and all tests pass in new structure
- **Result:** Clean monorepo structure, no code changes, all tests green

### 2B) Extract Core Library Foundation — ✅ Complete (~45 minutes)

**Status:** ✅ Completed ahead of schedule (2h estimate → 45min actual)

**Achievements:**

- ✅ Created `packages/rangelink-core-ts/` with modular structure
- ✅ Implemented pure TypeScript core with **zero runtime dependencies**
- ✅ Anti-corruption layer: Core defines its own `Selection` interface (no VSCode coupling)
- ✅ Functional error handling with `Result<T, E>` type
- ✅ Portable logging infrastructure (`Logger`, `LogManager`, `NoOpLogger`)
- ✅ **100% branch coverage** (15 test suites, 95 passing tests)
- ✅ All validation, selection, and formatting logic extracted and tested

**Structure:**

```
packages/rangelink-core-ts/
  src/
    types/         # Domain types, enums (PathFormat, RangeFormat, etc.)
    constants/     # RESERVED_CHARS, DEFAULT_DELIMITERS, etc.
    validation/    # validateDelimiter, areDelimitersUnique, haveSubstringConflicts
    selection/     # isRectangularSelection, computeRangeSpec
    formatting/    # buildAnchor, formatLink, formatPortableLink
    logging/       # Logger interface, LogManager, NoOpLogger
```

**Test Coverage:** 100% branches, 100% functions, 100% lines

### 2C) VSCode Extension Refactor — ✅ Complete (~2 hours)

**Status:** ✅ Core integration complete and functional (96% tests passing)

**Achievements:**

- ✅ Removed **~500 lines** of duplicate code
- ✅ Extension now imports all core functionality from `rangelink-core-ts`
- ✅ Created `toCoreSelections()` adapter (Anti-Corruption Layer)
- ✅ Integrated `VSCodeLogger` with core's `LogManager`
- ✅ **112/117 tests passing (96%)** - all core functionality verified
- ✅ All VSCode-specific code properly isolated in extension
- ✅ Rectangular mode, multi-line, and full-line detection working correctly

### 2D) Neovim Plugin Shell — 📋 Planned (1 hour)

- Create `packages/rangelink-neovim-plugin/` with basic Lua structure
- Implement one command: `:RangeLinkCopy` (calls core via Node CLI)
- Basic README and installation instructions
- **Done when:** Can install plugin and copy a basic link in Neovim

For Neovim integration details, see [neovim-integration.md](./neovim-integration.md).

### 2E) CI/CD Pipeline — 📋 Planned (1 hour)

- Add GitHub Actions workflow
- Run tests on PR (per-package)
- Automated npm publish on tag (core package only)
- **Done when:** CI passes on PR, publishes on tag

---

## Phase 3: Navigation Features — 📋 Planned

Navigate to code using RangeLinks (local workspace and BYOD).

**Total Time Estimate:** 7 hours across 6 focused sessions

### 3A) Basic Navigation from Clipboard (1.5 hours)

- Command: "RangeLink: Go to Range from Clipboard"
- Parse clipboard for regular RangeLink (no BYOD yet)
- Validate file exists in workspace
- Open file and select range
- **Done when:** Can copy a link, run command, and jump to code

### 3B) BYOD Navigation Support (1 hour)

- Parse BYOD metadata from clipboard link
- Use embedded delimiters to parse range
- Handle validation and recovery (reuse Phase 1C parsing logic)
- **Done when:** BYOD links from clipboard work correctly

### 3C) Rectangular Mode Navigation (1 hour)

- Detect double hash in link
- Reconstruct multiple selections in VSCode
- Set editor to rectangular selection mode
- **Done when:** Rectangular Mode links navigate to correct rectangular selection

### 3D) Navigation from Input Dialog (1 hour)

- Command: "RangeLink: Go to Range from Input"
- Quick pick dialog for manual entry
- Real-time validation feedback
- Recent links history (last 10)
- **Done when:** Can paste/type link in dialog and navigate

### 3E) Terminal Link Detection (2 hours)

- Register terminal link provider
- Detect RangeLinks in terminal output
- Show hover: "Open in Editor (Cmd+Click)"
- Handle both regular and BYOD links
- **Done when:** Clicking link in terminal opens file

### 3F) Context Menu Integration (30 minutes)

- "Go to Range" when text selection looks like RangeLink
- Available in editor and terminal
- **Done when:** Right-click selection → navigate works

**Parser Requirements:**

- [ ] **Parser for all link types**
  - Single line: `path:42`
  - Multi-line: `path#L10-L20`
  - With columns: `path#L10C5-L20C10`
  - Rectangular Mode: `path##L10C5-L20C10`
  - Portable links: parse BYOD/BYODELI metadata
  - Graceful error handling and recovery

- [ ] **BYOD link consumption**
  - Detect portable links (contain `~`)
  - Extract delimiter metadata
  - Parse using embedded delimiters instead of user settings
  - Support custom delimiters in creator's configuration

- [ ] **Rectangular Mode reconstruction**
  - Detect `##` in link
  - Parse range coordinates
  - Create multiple cursors/selections
  - Apply rectangular selection across specified lines

---

## Phase 4: Advanced Generation

- [ ] **Multi-range selection support**
  - Support multiple non-contiguous ranges in a single link
  - Format: `path#L10-L20,L30-L40,L50C5-L60C10` (comma-separated ranges)
  - All `rangelink-core-*` implementations must support this
  - VSCode extension exposes multi-range UI
  - Other IDEs expose based on platform capabilities
  - BYOD compatibility: embed delimiters once and preserve comma-separated ranges
  - Validation: `,` already reserved as separator

- [ ] **Generate rectangular mode links from selection**
  - Detect when user has rectangular selection
  - Auto-format as `##...` instead of `#...`

- [ ] **Enhanced BYOD generation**
  - Generate link with delimiter metadata
  - Support all selection types (line, column, rectangular mode)
  - Add `~` separator and metadata fields

- [ ] **Contextual menu integration**
  - Add "Copy RangeLink" to editor context menu
  - Add "Copy Portable RangeLink" option
  - Show quick actions based on current selection
  - Enable/disable via settings

- [ ] **Quick pick for link generation**
  - Show all available link formats
  - Preview link before copying
  - Support multiple format selection

---

## Phase 5: Workspace & Collaboration

- [ ] **Multi-workspace support**
  - Detect which workspace file belongs to
  - Generate workspace-relative paths
  - Resolve paths across workspace boundaries

- [ ] **Path validation**
  - Check if target file exists before generating link
  - Suggest workspace-relative vs absolute paths
  - Handle files outside workspace gracefully

- [ ] **Git integration**
  - Support git links in addition to workspace links
  - Resolve paths relative to git root
  - Option to include commit hash in link

- [ ] **Markdown link format**
  - "Copy as Markdown Link" option
  - Format as `[description](path#L10-L20)`
  - Customizable description templates

- [ ] **Share integration**
  - "Share RangeLink..." command with platform selection
  - Email integration (mailto: with pre-filled message)
  - Messaging integration (Slack, Microsoft Teams)
  - Pre-formatted message includes:
    - The portable RangeLink
    - Brief explanation of what RangeLink is
    - Link to VSCode Marketplace for installation
    - Optional: code snippet preview
  - Customizable message templates per platform
  - Deep linking support for supported platforms

---

## Phase 6: Productivity Features

- [ ] **Link history**
  - Store recently generated links
  - Quick access via command palette
  - Search in history
  - Export history as markdown/csv

- [ ] **Undo/redo support**
  - Track navigation history
  - Navigate back to previous location after following RangeLink

- [ ] **Batch operations**
  - Generate links for multiple selections
  - Generate links for a function/method definition and all its usages
  - Multi-file link generation

- [ ] **Documentation generation**
  - Generate links for all public API methods
  - Create index of code references
  - Export as markdown documentation

---

## Phase 7: User Experience

- [ ] **Settings and preferences**
  - Opt-in/opt-out for portable link generation
  - Toggle rectangular mode auto-detection
  - Preferred link format (relative vs absolute)
  - Keyboard shortcut customization for all commands
  - Exclude certain file patterns from link generation
  - Custom settings panel with live delimiter validation
  - "Don't show again" option for BYOD recovery warnings

- [ ] **Visual feedback**
  - Show generated link in notification instead of just status bar
  - Preview selection before generating link
  - Highlight target range when navigating to link
  - Animated transition to target location

- [ ] **Accessibility**
  - Screen reader support for link generation
  - Keyboard navigation for all features
  - High contrast mode support

---

## Phase 8: Integration & Extensions

- [ ] **VSCode API integration**
  - Register RangeLink as link provider for editors
  - Integration with built-in link providers
  - Respect VSCode's link detection settings

- [ ] **Terminal integration**
  - Detect and parse RangeLinks in terminal output
  - Support for external terminal integration
  - Context menu in terminal for detected links

- [ ] **Extension compatibility**
  - Work well with GitLens, GitHub Copilot, etc.
  - Respect other extensions' link handlers
  - Avoid conflicts with file path link providers

- [ ] **Workspace trust**
  - Handle untrusted workspaces
  - Security warnings for absolute paths
  - Sandboxed parsing

---

## Phase 9: Developer Experience

- [ ] **Comprehensive test coverage**
  - 100% branch coverage for parsing
  - Edge case testing (Unicode, special characters, very large numbers)
  - Performance testing for large files
  - Integration testing

- [ ] **Documentation**
  - API documentation for parser
  - Contributing guidelines
  - Video tutorials
  - Best practices guide

- [ ] **Telemetry**
  - Anonymous usage statistics (opt-in)
  - Most used features tracking
  - Error reporting
  - BYOD parsing failure tracking (anonymously, file paths ALWAYS redacted)
    - Track which delimiter combinations cause issues
    - Identify common malformed link patterns
    - Help improve error messages and recovery logic

- [ ] **Performance**
  - Lazy loading of link history
  - Efficient path resolution
  - Optimized regex patterns
  - Caching of workspace structure

---

## Phase 10: Internationalization (i18n)

- [ ] **Translation Infrastructure**
  - Integrate VSCode i18n extension API
  - Create translation resource files (`.json` format)
  - Map error codes to localized messages
  - Support for multiple languages (English, Spanish, French, German, Japanese, Chinese)

- [ ] **Error Message Localization**
  - Translate all validation error messages
  - Translate status bar feedback messages
  - Translate command descriptions and titles
  - Translate settings descriptions

- [ ] **Community Contributions**
  - Document translation contribution process
  - Provide translation templates
  - Credit translators in README

- [ ] **Testing**
  - Verify translations don't break layout
  - Test long translations in UI elements
  - Ensure error codes remain consistent across languages

For i18n design details, see [LOGGING.md](./LOGGING.md#internationalization-readiness).

---

## Nice-to-Have Features

- [ ] **Circular/radius-based selection**
  - Define selection based on starting point and character radius
  - Format: `path#L10C5@15` (line 10, column 5, radius of 15 chars)
  - `@` is hardcoded separator (reserved character), radius value follows immediately
  - Useful for contextual selections around a point
  - All `rangelink-core-*` implementations must support
  - BYOD compatibility: preserve `@` and radius value in portable links
  - Support note: Core always supports circular ranges; extensions/plugins may not

- [ ] **Code review integration**
  - Generate links for PR review comments
  - Share links in review discussions
  - Track link usage in reviews

- [ ] **Team collaboration**
  - Share link preferences with team
  - Team-specific delimiter configurations
  - Link usage analytics

- [ ] **IDE integrations**
  - JetBrains IDEs support
  - Neovim plugin
  - Emacs support

- [ ] **AI assistant integration**
  - Generate RangeLinks from AI responses
  - Parse AI-provided code references
  - Context-aware link generation

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Monorepo structure and core architecture
- [LINK-FORMATS.md](./LINK-FORMATS.md) - Comprehensive link notation guide
- [BYOD.md](./BYOD.md) - Portable links (Bring Your Own Delimiters)
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Error codes and validation rules
- [LOGGING.md](./LOGGING.md) - Structured logging approach
- [neovim-integration.md](./neovim-integration.md) - Neovim plugin integration options
