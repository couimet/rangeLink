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

## Phase 3: VSCode Marketplace Launch — 📋 Ready to Start

**Goal:** Publish RangeLink extension to VSCode Marketplace and make it available to users.

**Total Time Estimate:** 4 hours across 8 micro-iterations

**Status:** 📋 Ready to start

### Developer Tooling — ✅ Complete

#### Local Installation Script (30 minutes) — ✅ Completed

**Goal:** Simplify local testing of extension builds across VS Code and Cursor.

**Achievements:**

- ✅ Created `packages/rangelink-vscode-extension/scripts/install-local.sh`
- ✅ Dynamic version detection from `package.json` (changeset-ready!)
- ✅ Auto-builds extension if `.vsix` is missing
- ✅ Support for both VS Code and Cursor
- ✅ Helpful error messages when CLI tools not found
- ✅ Exposed via pnpm scripts at package and root level

**Usage:**

```bash
# From root
pnpm install-local:vscode-extension:both    # Install in both editors
pnpm install-local:vscode-extension:cursor  # Cursor only
pnpm install-local:vscode-extension:vscode  # VS Code only

# From package directory
cd packages/rangelink-vscode-extension
pnpm install-local         # Both editors (default)
pnpm install-local:cursor  # Cursor only
pnpm install-local:vscode  # VS Code only
```

**Benefits:**

- No more hardcoded version numbers in commands
- Works seamlessly with changesets version bumps
- Clear, explicit editor targeting (`:both`, `:vscode`, `:cursor`)
- YAGNI-compliant: package-level script, scalable for future extensions

**Documentation:** Updated in `PUBLISHING.md` with quick install section

### Pre-Launch Status

- ✅ Extension functionality complete (link generation, BYOD, rectangular mode)
- ✅ Comprehensive tests (96% passing, 100% coverage target)
- ✅ Documentation complete and professional
- ✅ README marketplace-ready
- ✅ Commands and keybindings configured
- ✅ **Extension icon/logo** (icon.png and icon_large.png present)
- ✅ **Local installation tooling** (`install-local.sh` script with pnpm integration)
- ⚠️ **Known Issue:** README logo doesn't display in installed extension view (see Phase 3J)
- ⚠️ **Missing:** Publisher account setup
- ⚠️ **Missing:** CHANGELOG.md
- ⚠️ **Missing:** Final testing on clean install

### 3A) Create Extension Icon/Logo (1 hour) — ✅ Completed

**Goal:** Design and add professional icon for marketplace listing.

**Status:** ✅ Complete

- ✅ `icon.png` (35KB) and `icon_large.png` (1.1MB) created
- ✅ `package.json` updated with `"icon": "icon.png"`
- ✅ Icon meets VSCode requirements

### 3B) Create CHANGELOG.md (20 minutes)

**Goal:** Document version history for marketplace and users.

**Tasks:**
- Create `packages/rangelink-vscode-extension/CHANGELOG.md`
- Document v0.1.0 initial release with all features
- Follow Keep a Changelog format

**Done when:** CHANGELOG.md exists with v0.1.0 documented

### 3C) Publisher Account Setup (30 minutes)

**Goal:** Create publisher account for VSCode Marketplace.

**Tasks:**
- Visit https://marketplace.visualstudio.com/manage
- Sign in with Microsoft account (or create one)
- Create new publisher with chosen publisher ID
- Update `package.json`: `"publisher": "your-publisher-id"`
- Save personal access token securely

**Done when:** Publisher account created, ID updated in package.json, token saved

### 3D) Pre-Publishing Testing (45 minutes)

**Goal:** Test extension thoroughly on clean VSCode install.

**Testing Checklist:**
- [ ] All commands execute without errors
- [ ] Links copied to clipboard correctly
- [ ] Status bar feedback appears
- [ ] Custom delimiters work
- [ ] Invalid config falls back to defaults
- [ ] Output channel shows structured logs
- [ ] README displays correctly
- [ ] Icon displays correctly
- [ ] Commands appear in Command Palette
- [ ] Context menu items appear
- [ ] Keybindings work

**Test all selection types:**
- Single line, multi-line, with columns, rectangular (Alt+drag)

**Done when:** All tests pass on clean install, no critical bugs

### 3E) Version and Metadata Check (15 minutes)

**Goal:** Verify all metadata is correct before publishing.

**Review package.json fields:**
- `publisher`: "[your-publisher-id]" ← UPDATE
- `icon`: "icon.png" ← ADD
- All other fields verified (name, version, description, repository, etc.)

**Done when:** All package.json fields verified and correct

### 3F) Package for Publishing (10 minutes)

**Goal:** Create final VSIX package for marketplace submission.

**Tasks:**
```bash
# Clean and rebuild
pnpm -r clean
pnpm install
pnpm -r compile
pnpm -r test

# Package extension
cd packages/rangelink-vscode-extension
vsce package
```

**Done when:** Clean VSIX package created, installation test passes

### 3G) Publish to Marketplace (20 minutes)

**Goal:** Publish extension to VSCode Marketplace.

**Tasks:**
```bash
vsce login [your-publisher-id]
cd packages/rangelink-vscode-extension
vsce publish
```

**Verify:**
- Wait 5-10 minutes for marketplace to process
- Visit marketplace listing
- Test installation from marketplace

**Done when:** Extension published, appears in search, installation works

### 3H) Post-Launch Tasks (30 minutes)

**Goal:** Announce launch and set up monitoring.

**Tasks:**
- Create GitHub release (v0.1.0 tag)
- Update repository README with marketplace badge
- Set up monitoring (star extension, watch issues)
- Plan first patch/next features

**Success Metrics (First Week):**
- 10+ installs
- No critical bugs reported
- At least one positive review

**Done when:** GitHub release created, monitoring in place

### 3I) GitHub Social Preview Banner (45 minutes) — 📋 Optional Polish

**Goal:** Create custom social preview image for better link sharing on social media, messaging apps, and GitHub.

**Background:**
When someone shares your GitHub repo link on SMS, WhatsApp, Slack, Twitter, etc., GitHub generates a preview card. By default, it uses a generic layout. A custom banner makes your project stand out and drives more clicks/installs.

**Tasks:**
- Design 1280×640px banner image featuring:
  - RangeLink logo (your chicken + BYODELI badge)
  - Project tagline: "Share Code Across Editors & Tools"
  - Example code reference: `#L3C14-L314C16` (Pi reference)
  - Visual elements: Code snippet background, subtle tech aesthetic
  - Color palette: Orange (#FF6B35), cream/beige, with dark/light versions for contrast
- Upload to GitHub: Repo Settings → General → Social preview
- Test the preview by sharing repo link in messaging apps

**Banner Description/Content Suggestions:**

Option A - Clean & Professional:
```
Top: RangeLink logo (centered or left-aligned)
Middle: Large tagline "Share Precise Code References"
Bottom: Example link "src/auth.ts#L3C14-L314C16" in monospace font
Background: Subtle gradient (cream to orange) or code snippet texture
```

Option B - Developer-Focused:
```
Left 40%: Large RangeLink logo + BYODELI badge
Right 60%:
  - "RangeLink" title
  - "Cross-editor code references"
  - Example: path#L3C14-L314C16
  - Small icons: VSCode + Cursor + GitHub logos
Background: Dark theme with syntax-highlighted code snippet
```

Option C - Minimal Hero:
```
Centered composition:
  - RangeLink logo (large, 200px)
  - "Share Code References That Just Work"
  - "#L3C14-L314C16" in highlighted badge
Background: Two-tone split (orange left, cream right) or solid with overlay
```

**Design Tools:**
- Figma (recommended for precise control)
- Canva (templates available, easier)
- Shopp-E + Photoshop (AI-generated base + manual composition)
- GitHub's own social preview generator (basic)

**Testing:**
After uploading, test by:
1. Sharing repo link in Slack/Discord (preview should show your banner)
2. Using Twitter Card Validator: https://cards-dev.twitter.com/validator
3. Using Facebook Debugger: https://developers.facebook.com/tools/debug/
4. Checking on mobile (SMS preview)

**Resources & References:**
- GitHub guide: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview
- Recommended size: 1280×640px (2:1 ratio)
- File size: Under 1MB (PNG or JPG)
- Repository topics to highlight: vscode-extension, developer-tools, productivity, code-navigation, ai-tools

**Banner Copy/Text Elements:**

**Primary headline options:**
- "Share Code Across Editors & Tools"
- "Precise Code References for Developers"
- "Cross-Editor Code Sharing Made Easy"
- "From VSCode to Claude Code - Links That Just Work"

**Supporting text:**
- "GitHub-style notation • Portable links • AI-ready"
- "Works with VSCode, Cursor, Claude Code & more"
- "Perfect for documentation, code reviews, and AI prompts"

**Call to action (optional):**
- "Available on VSCode Marketplace"
- "Install Extension →"

**Done when:** Banner uploaded to GitHub, preview tested and looks professional across platforms

### 3J) Fix README Logo Display in Installed Extension — 📋 Planned

**Goal:** Make the RangeLink logo display in the installed extension's README view for fully offline functionality.

**Problem:** VS Code's extension view doesn't render markdown images with relative paths (`./icon.png`) when displaying the README in the installed extension details panel. The image works on GitHub but not in the local extension view.

**Current Status:**
- ✅ `icon.png` (35KB) exists in package root
- ✅ `package.json` correctly specifies `"icon": "icon.png"` (this shows in marketplace listing)
- ✅ `.vscodeignore` explicitly includes `icon.png` in packaged extension
- ⚠️ README line 4 uses relative path: `<img src="./icon.png" alt="RangeLink Logo" width="128" />`

**Solution: Base64 Data URI Embedding**

Convert the icon to base64 and embed directly in the README markdown. This makes the README fully self-contained and works offline without any network requests.

**Implementation Steps:**
1. Generate base64 encoding of `icon.png`:
   ```bash
   base64 -i icon.png | tr -d '\n' > /tmp/icon_base64.txt
   ```

2. Create data URI format:
   ```bash
   echo -n "data:image/png;base64," > /tmp/data_uri.txt
   cat /tmp/icon_base64.txt >> /tmp/data_uri.txt
   ```

3. Update README.md line 4:
   ```markdown
   <img src="data:image/png;base64,iVBORw0KGgoAAAANS..." alt="RangeLink Logo" width="128" />
   ```

**Testing:**
- [ ] Logo displays in installed extension view (Extensions → RangeLink → Details)
- [ ] Logo still displays on GitHub repository
- [ ] Logo displays in VS Code marketplace listing
- [ ] Logo displays in Cursor marketplace listing

**Tradeoffs:**
- **Pros:** Works completely offline, no external dependencies, single source of truth
- **Cons:** Adds ~48KB to README file size (base64 encoding inflates by ~33%)

**Alternative Considered (Rejected):**
- Using absolute GitHub URL: `https://raw.githubusercontent.com/couimet/rangelink/main/packages/rangelink-vscode-extension/icon.png`
- **Rejected because:** Requires internet connection, fails for users without network access

**Done when:** Logo displays correctly in all contexts (installed extension, GitHub, marketplace), README is fully self-contained

### Time Summary

| Task | Estimate | Cumulative |
|------|----------|------------|
| Icon/logo | 1h | 1h |
| CHANGELOG | 20m | 1h 20m |
| Publisher account | 30m | 1h 50m |
| Testing | 45m | 2h 35m |
| Metadata check | 15m | 2h 50m |
| Package | 10m | 3h |
| Publish | 20m | 3h 20m |
| Post-launch | 30m | 3h 50m |
| **GitHub social banner (optional)** | **45m** | **4h 35m** |

**Total:** ~4 hours for launch (up to 4.5 hours with optional banner)

---

## Phase 4: Navigation Features — 📋 Planned

Navigate to code using RangeLinks (local workspace and BYOD).

**Total Time Estimate:** 7 hours across 6 focused sessions

### 4A) Basic Navigation from Clipboard (1.5 hours)

- Command: "RangeLink: Go to Range from Clipboard"
- Parse clipboard for regular RangeLink (no BYOD yet)
- Validate file exists in workspace
- Open file and select range
- **Done when:** Can copy a link, run command, and jump to code

### 4B) BYOD Navigation Support (1 hour)

- Parse BYOD metadata from clipboard link
- Use embedded delimiters to parse range
- Handle validation and recovery (reuse Phase 1C parsing logic)
- **Done when:** BYOD links from clipboard work correctly

### 4C) Rectangular Mode Navigation (1 hour)

- Detect double hash in link
- Reconstruct multiple selections in VSCode
- Set editor to rectangular selection mode
- **Done when:** Rectangular Mode links navigate to correct rectangular selection

### 4D) Navigation from Input Dialog (1 hour)

- Command: "RangeLink: Go to Range from Input"
- Quick pick dialog for manual entry
- Real-time validation feedback
- Recent links history (last 10)
- **Done when:** Can paste/type link in dialog and navigate

### 4E) Terminal Link Detection (2 hours)

- Register terminal link provider
- Detect RangeLinks in terminal output
- Show hover: "Open in Editor (Cmd+Click)"
- Handle both regular and BYOD links
- **Done when:** Clicking link in terminal opens file

### 4F) Context Menu Integration (30 minutes)

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

## Phase 5: Advanced Generation

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

## Phase 6: Workspace & Collaboration

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

## Phase 7: Productivity Features

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

## Phase 8: User Experience

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

## Phase 9: Integration & Extensions

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

## Phase 10: Developer Experience

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
