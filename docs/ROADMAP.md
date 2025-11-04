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

## Phase 1.5: Selection Architecture Refactoring — ✅ Complete

Major refactoring to improve selection semantics, validation, and error handling in core library and VSCode extension.

**Architectural Improvements:**

- **InputSelection interface**: Extension explicitly tells core the selection type (Normal vs Rectangular), eliminating heuristics
- **SelectionCoverage field**: Each selection tracks whether it's FullLine or PartialLine for accurate range formatting
- **RangeNotation enum**: Auto, EnforceFullLine, EnforcePositions - gives users explicit control over link format
- **FormattedLink return type**: Rich object (link, linkType, delimiters, computedSelection, etc.) instead of plain string
- **Hybrid error handling**: Exceptions internally for validation, Result<T, E> at API boundaries

**Implementation Phases (Completed):**

- ✅ Phase 0-2: Enums (RangeNotation, SelectionCoverage, SelectionType), InputSelection interface, Selection.coverage field
- ✅ Phase 3-4: FormatOptions.notation system, computeRangeSpec updates, comprehensive validation (ERR_3001-ERR_3011)
- ✅ Phase 5: FormattedLink return type implementation with comprehensive testing
- ✅ Phase 6: VSCode extension refactoring - file structure cleanup
  - Extracted RangeLinkService to separate file (constructor injection pattern)
  - Extracted toInputSelection utility as arrow function
  - Updated CLAUDE.md: Added arrow function and undefined preferences
- ✅ Phase 7: VSCode extension updates
  - InputSelection adapter with coverage detection
  - Rectangular selection detection via isRectangularSelection
  - Terminal binding MVP (bind/unbind commands, auto-send to terminal)
  - Comprehensive error logging throughout
  - Test structure aligned with Jest conventions

**Recent Commits:**

- feat: Add Terminal Binding feature (MVP - Iterations 1-2)
- refactor: Extract RangeLinkService and toInputSelection to separate files
- test: Add comprehensive unit tests for isRectangularSelection
- refactor: Align VSCode extension test structure with Jest conventions
- feat: Update VSCode extension to use FormattedLink API

**Status:** Complete - All phases delivered, 130 tests passing, file structure clean, ready for new features

**Key Decisions:**

1. **Breaking API changes accepted** (pre-1.0 status)
2. **100% test coverage maintained** throughout refactoring
3. **Micro-incremental commits** for reviewability
4. **Test infrastructure modernized** (ES6 imports, TypeScript types, custom matchers)

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
- "From VSCode to claude-code - Links That Just Work"

**Supporting text:**

- "GitHub-style notation • Portable links • AI-ready"
- "Works with VSCode, Cursor, claude-code & more"
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

| Task                                | Estimate | Cumulative |
| ----------------------------------- | -------- | ---------- |
| Icon/logo                           | 1h       | 1h         |
| CHANGELOG                           | 20m      | 1h 20m     |
| Publisher account                   | 30m      | 1h 50m     |
| Testing                             | 45m      | 2h 35m     |
| Metadata check                      | 15m      | 2h 50m     |
| Package                             | 10m      | 3h         |
| Publish                             | 20m      | 3h 20m     |
| Post-launch                         | 30m      | 3h 50m     |
| **GitHub social banner (optional)** | **45m**  | **4h 35m** |

**Total:** ~4 hours for launch (up to 4.5 hours with optional banner)

---

## Phase 4: Post-Publishing Enhancements — 🔨 In Progress

Following the successful publication of the VSCode extension to the marketplace, this phase addresses critical gaps in release management, documentation, and tooling discovered during the publishing process.

**Development Approach:** Slow and steady iterations with manual review between each commit. Focus on quality and completeness over speed.

**Status:** 📋 Ready to start

### Priority 1: Release Management & Tracking

#### 4A) Git Tagging for Published Release — ✅ Complete

**Goal:** Retroactively tag the published v0.1.0 release for version tracking.

**Tasks:**

- ✅ Identify commit hash for published v0.1.0 (ff52f9a)
- ✅ Create annotated tag: `vscode-extension-v0.1.0`
- ✅ Push tag to remote
- ✅ Create GitHub release from tag
- ✅ Verify tag appears correctly in GitHub

**Deliverables:**

- ✅ Git tag for published release: `vscode-extension-v0.1.0` → ff52f9a
- ✅ GitHub release entry: https://github.com/couimet/rangelink/releases/tag/vscode-extension-v0.1.0

**Done when:** Can map marketplace version 0.1.0 to specific git commit via tag

**Status:** Complete - v0.1.0 is now properly tagged and released on GitHub

---

#### 4B) Extension CHANGELOG.md — ✅ Complete

**Goal:** Create package-specific CHANGELOG for tracking extension releases.

**Tasks:**

- ✅ Create `packages/rangelink-vscode-extension/CHANGELOG.md`
- ✅ Follow Keep a Changelog format
- ✅ Document v0.1.0 with all features:
  - Link generation (relative/absolute)
  - Rectangular mode support
  - BYOD (portable links)
  - Custom delimiters
  - Validation and error handling
- ✅ Create signpost root CHANGELOG pointing to package changelogs
- ✅ Add ADR placeholder documentation

**Deliverables:**

- ✅ `packages/rangelink-vscode-extension/CHANGELOG.md` with v0.1.0 and v0.1.1 (unreleased)
- ✅ Root `CHANGELOG.md` updated to signpost style (no maintenance overhead)
- ✅ `docs/ADR/README.md` placeholder for future architectural decisions
- ✅ Roadmap updated with ADR nice-to-have feature

**Done when:** CHANGELOG.md exists, follows semver + keepachangelog standards, ready for v0.1.1

**Status:** Complete - Package and signpost changelogs in place, ADR framework documented

---

#### 4C) Monorepo Release Strategy Documentation — ✅ Complete (Phase 4A)

**Goal:** Define and document release/tagging strategy for monorepo with multiple publishable packages.

**Tasks:**

- ✅ Define tagging convention: `{package-name}-v{version}` (e.g., `vscode-extension-v0.1.0`)
- ✅ Document version management: independent versioning per package
- ✅ Explain how to map published versions to git history
- ✅ Document release workflow (manual for now)
- ✅ Create `docs/RELEASE-STRATEGY.md`

**Out of Scope:**

- GitHub Actions workflow (deferred to follow-up item 4D)

**Deliverables:**

- ✅ `docs/RELEASE-STRATEGY.md` with comprehensive tagging conventions and workflows
- ✅ Step-by-step instructions for retroactive tagging and future releases

**Done when:** Clear, documented process for tagging and tracking releases across packages

**Status:** Complete - Comprehensive 544-line strategy document created in Phase 4A

---

#### 4D) GitHub Actions Release Workflow — 📋 Future

**Goal:** Automate release tagging and GitHub release creation.

**Deferred from:** Iteration 4C (Monorepo Release Strategy Design)

**Tasks:**

- Create `.github/workflows/release.yml`
- Trigger on version tag push
- Automate GitHub release creation
- Extract changelog for release notes

**Done when:** Pushing a tag automatically creates GitHub release

---

### Priority 1.5: Test Coverage Improvements

#### 4A.5) Error Logging Verification in Tests — 📋 Planned

**Goal:** Add test coverage to verify that all catch blocks properly log errors via getLogger().

**Background:** Phase 7 refactoring added comprehensive error logging to all catch blocks in the extension, but tests only verify that error messages are shown to users - they don't verify that errors are logged for debugging.

**Current Gap:**

- ✅ Tests verify `showErrorMessage()` is called with correct messages
- ✅ Tests verify clipboard not written on errors
- ❌ Tests DO NOT verify `getLogger().error()` or `getLogger().warn()` is called
- ❌ No verification of logged context (fn, error object, metadata)

**Tasks:**

- Mock `getLogger()` in test setup
- Add assertions for `mockLogger.error()` calls in error handling tests
- Verify proper context is logged (function name, error object, additional metadata)
- Add tests for all 4 catch blocks in extension.ts:
  1. `toInputSelection()` error (document modified) - should call `getLogger().error()`
  2. `generateLinkFromSelection()` catch - should call `getLogger().error()`
  3. `showVersion` command failure - should call `getLogger().error()`
  4. `activate()` version load failure - should call `getLogger().warn()`

**Deliverables:**

- Mock logger in test harness
- Test assertions for error logging in all error paths
- Documentation of logging test patterns in CONTRIBUTING.md

**Done when:** Tests fail if error logging is removed from catch blocks, all 4 catch blocks covered

**Estimated Time:** 1.5 hours

---

### Priority 2: Documentation Content Strategy

#### 4E) Root README Enhancement - Hero Section — ✅ Complete

**Goal:** Rewrite intro to be engaging, fun, and sell the product's real value.

**Content Tone:** Fun and engaging for developers, with nerdy humor. Show real value, not just a toy.

**Tasks:**

- ✅ Rewrite punchline emphasizing range links and interoperability
- ✅ Add compelling problem → solution quote hook
- ✅ Add marketplace badge with clickable install link
- ✅ Add "Ready to use it?" call-to-action with History link
- ✅ Improve scannable format with emojis and bullet points
- ✅ Keep it developer-focused with personality

**Deliverables:**

- ✅ Rewritten hero section with punchy tagline: "Range links that work everywhere — Cursor, VSCode, claude-code, GitHub, your team."
- ✅ VS Code Marketplace badge with live link
- ✅ Origin story section explaining claude-code → RangeLink journey
- ✅ Breadcrumb links connecting root README ↔ extension README
- ✅ Simplified development setup to use `./setup.sh`

**Done when:** README opening is engaging, clearly communicates value, includes marketplace link, tells the origin story

**Status:** Complete - Root and extension READMEs work seamlessly together, glamorous and share-worthy

---

#### 4F) Logo Display Fix in Installed Extension — ✅ Complete

**Goal:** Make the RangeLink logo display in the installed extension's README view.

**Problem:** VS Code's extension view doesn't render markdown images with relative paths (`./icon.png`) in the installed extension details panel. Works on GitHub but not locally.

**Solution:** Use GitHub raw content URL instead of relative path or data URI. This works everywhere (marketplace, GitHub, installed extensions) and gracefully falls back to alt text when offline.

**Tasks:**

- ✅ Update extension README to use GitHub raw content URL
- ✅ Logo displays on GitHub and VS Code marketplace

**Tradeoffs:**

- **Pro:** Clean solution, no bloat, works in all online contexts
- **Pro:** Falls back to alt text when offline
- **Con:** Requires internet connection to display logo

**Deliverables:**

- ✅ GitHub raw URL in extension README: `https://raw.githubusercontent.com/couimet/rangelink/main/icon.png`
- ✅ Logo displays across marketplace, GitHub, and installed extensions (when online)

**Done when:** Logo displays correctly in marketplace and GitHub, graceful alt text fallback when offline

**Status:** Complete - Logo now uses GitHub raw content URL, displays everywhere with graceful offline fallback

---

#### 4G) Logo Strategy for Multi-Extension Monorepo — ✅ Complete

**Goal:** Define and implement centralized logo sourcing to avoid duplication across future extensions.

**Approach:**

- Store canonical icons at `/assets/` (root level)
- Create `scripts/sync-assets.sh` to copy to package directories during build
- Gitignore copied icons (build-time artifacts)
- Validate checksums to ensure consistency

**Tasks:**

- ✅ Create `/assets/` directory with icon files
- ✅ Write `scripts/sync-assets.sh` bash script with validation
- ✅ Add to vscode-extension pre-package workflow
- ✅ Gitignore copied icons in package directories
- ✅ Document strategy in `docs/ASSET-MANAGEMENT.md`
- ✅ Update root README to use `/assets/icon.png`

**Deliverables:**

- ✅ `/assets/icon.png` + `/assets/icon_large.png` (canonical sources)
- ✅ `scripts/sync-assets.sh` with checksum validation
- ✅ `docs/ASSET-MANAGEMENT.md` (concise documentation)
- ✅ Updated package.json pre-package hook
- ✅ `.gitignore` entries for build-time icons

**Done when:** Icons managed centrally, copied during build, validation ensures consistency

**Status:** Complete - Single source of truth for assets, no duplication in git, build validates consistency

---

#### 4H) Logo Origins - Nerdy Humor Section — ✅ Complete

**Goal:** Add story about logo design with the Pi precision joke.

**Content Tone:** Light, fun, nerdy humor - celebrates the thought behind the design.

**Tasks:**

- ✅ Add "About the Logo" section to root README (before Known Issues)
- ✅ Explain design elements:
  - Free range chicken (code roams free across editors)
  - Links (chains of collaboration)
  - Pi precision: 3.14 vs 3.1416 (because precision matters!)
- ✅ Add teaser to vscode-extension README linking back to root

**Deliverables:**

- ✅ "About the Logo" section in root README
- ✅ Teaser link in extension README with chicken emoji 🐔

**Done when:** Logo story told, designer credited, links work

**Status:** Complete - Logo origins explained with nerdy humor, designer credited

---

#### 4I) Contributors Section — ✅ Complete

**Goal:** Add contributors section acknowledging logo designer and future contributors.

**Tasks:**

- ✅ Add "Contributors" section to root README
- ✅ Credit Yan Bohler for logo design (Instagram: @ybohler)
- ✅ Clarify DALL-E generation + Yan's refinement
- ✅ Add call-to-action for code contributors
- ✅ Link to `CONTRIBUTING.md`

**Deliverables:**

- ✅ Contributors section in root README
- ✅ Link to CONTRIBUTING.md
- ✅ Proper attribution for logo work

**Done when:** Designer credited, contributor framework in place

**Status:** Complete - Yan Bohler properly credited for logo refinement, contributor pathway established

---

#### 4J) Content Drift Prevention Strategy — 📋 Planned

**Goal:** Define strategy to prevent root and package READMEs from drifting apart.

**Approach:**

- **Root README:** Comprehensive, monorepo-focused, covers all packages/features
- **Package README:** Marketplace-optimized, user-focused, package-specific features only
- Document what content belongs where and when to update both

**Tasks:**

- Create `docs/README-CONTENT-STRATEGY.md`
- Define "shared content" sections (features, use cases)
- Define "package-specific" sections (installation, quickstart)
- Create checklist for README updates
- Update `CONTRIBUTING.md` with README guidelines

**Deliverables:**

- `docs/README-CONTENT-STRATEGY.md`
- Updated CONTRIBUTING.md

**Done when:** Clear guidelines exist, easy to maintain consistency

---

### Priority 3: Build Tooling & Metadata

#### 4K) Enhanced Build Output with Metadata — 📋 Planned

**Goal:** Display version, commit hash, date during package build for debugging.

**Tasks:**

- Enhance `scripts/generate-version.js` to output build metadata
- Modify `package` script to show metadata table after build:
  - Version
  - Commit hash
  - Commit date
  - Branch name
  - File count
- Test output formatting

**Deliverables:**

- Enhanced build script with metadata output
- Cleaner console output during packaging

**Done when:** Running `pnpm package` shows useful metadata, helps debug published versions

---

#### 4L) Embed Commit Hash in Extension Metadata — 📋 Planned

**Goal:** Add build metadata to extension for runtime debugging.

**Tasks:**

- Extend `version.json` to include:
  - Commit hash (short and full)
  - Build date/time
  - Branch name
  - Dirty working tree flag
- Add "Show Version Info" command to display build metadata
- Update README with debugging section: "Finding version info"

**Note:** VS Code marketplace doesn't expose custom metadata in UI. This is for runtime debugging only.

**Deliverables:**

- Enhanced version.json with git metadata
- Command: "RangeLink: Show Version Info"
- Documentation on debugging published versions

**Done when:** Can identify exact commit used to build any installed extension

---

#### 4M) Separate Dev vs. Production Package Scripts — 📋 Planned

**Goal:** Create distinct packaging workflows for development and marketplace publishing.

**Tasks:**

- Create `package:dev` script:
  - Allows dirty working tree
  - Adds `-dev` suffix to version
  - Faster iteration during development
- Keep `package` script strict:
  - Fails on uncommitted changes
  - Clean build only
  - For marketplace publishing
- Add `package:force` for emergency overrides
- Document when to use each in `PUBLISHING.md` and `DEVELOPMENT.md`

**Deliverables:**

- Three packaging scripts with clear semantics
- Updated documentation

**Done when:** Clear separation between dev and production builds, prevents accidental dirty publishes

---

### Known Limitations (Documented)

#### Repository Link in Marketplace

**Issue:** Marketplace "Repository" link points to monorepo root, not package directory.

**Status:** VS Code marketplace limitation - cannot override.

**Explanation:** The `repository.url` field in package.json determines the "Repository" link. The `homepage` field (correctly set) provides the package-specific "Homepage" link. This is expected behavior.

**Action:** Document in `PUBLISHING.md` as expected behavior.

---

#### Commit Hash Display on Marketplace Page

**Issue:** Cannot add commit hash or custom metadata to marketplace UI.

**Status:** Not supported by VS Code marketplace.

**Workaround:** Extension includes runtime command to show build metadata (see iteration 4L).

**Action:** Already addressed via "Show Version Info" command.

---

## Phase 4.5: Technical Debt & Refactoring — 📋 Planned

### 4.5A) Remove Test Re-exports from extension.ts (30 minutes)

**Problem:** `extension.ts` contains re-exports for backward compatibility with tests:
```typescript
// Re-export for backward compatibility with tests
export { PathFormat, DelimiterValidationError, RangeLinkMessageCode, RangeLinkService };
```

**Goal:** Tests should import from actual source files, not from `extension.ts`

**Changes:**
- Update all test imports to use direct paths (`./RangeLinkService`, `rangelink-core-ts`)
- Remove re-export line from `extension.ts`
- Verify all 130 tests still pass

**Done when:** No re-exports exist in `extension.ts` for test compatibility

---

### 4.5B) Eliminate getErrorCodeForTesting Function (1 hour)

**Problem:** The `getErrorCodeForTesting` function in `extension.ts` maps between two enum systems (`DelimiterValidationError` → `RangeLinkMessageCode`). This mapping layer is ugly and shouldn't exist.

**Root cause:** Two separate validation/error systems that need reconciliation

**Options to evaluate:**
1. Core library returns `RangeLinkMessageCode` directly (eliminate `DelimiterValidationError` enum)
2. Extension maps errors at the boundary layer (config loading) instead of separate function
3. Core library returns rich error objects that include both error type and message code

**Changes:**
- Evaluate which enum should be source of truth
- Refactor validation to return correct type directly
- Remove `getErrorCodeForTesting` function entirely
- Update tests to not depend on this mapping function

**Done when:**
- `getErrorCodeForTesting` function deleted
- All 130 tests pass
- Error handling is cleaner and more direct

---

### 4.5C) Remove or Refactor Link Interface (15 minutes)

**Problem:** `extension.ts` contains a `Link` interface marked as "kept for extension API" but it's unclear if it's actually used:

```typescript
/**
 * VSCode-specific link interface (kept for extension API)
 */
export interface Link {
  path: string;
  startLine: number;
  endLine: number;
  startPosition?: number;
  endPosition?: number;
  isAbsolute: boolean;
}
```

**Goal:** Determine if this interface is necessary and either remove it or document its purpose

**Changes:**
- Search codebase for all usages of `Link` interface
- If unused: delete it
- If used: move to appropriate file with clear documentation
- Update tests if needed

**Done when:** `Link` interface is either removed or properly documented with clear ownership

---

### 4.5D) Refactor Module-Level outputChannel Dependency (30 minutes)

**Problem:** `getErrorCodeForTesting` function depends on module-level `outputChannel` variable:

```typescript
default: {
  outputChannel.appendLine(
    `[CRITICAL] Unhandled DelimiterValidationError in getErrorCodeForTesting: ${error}`,
  );
  return RangeLinkMessageCode.CONFIG_ERR_UNKNOWN;
}
```

**Goal:** Eliminate implicit dependency on module-level global state

**Note:** This will likely be resolved by 4.5B (eliminating the function entirely), but if the function remains, it should receive logger as parameter instead of accessing global.

**Done when:** No functions in `extension.ts` directly access module-level variables (prefer dependency injection)

---

### 4.5E) Extract RangeLinkService Tests to Separate File (45 minutes)

**Problem:** `RangeLinkService` class was extracted to `RangeLinkService.ts` but its 1116 lines of tests remain in `extension.test.ts` (lines 129-1244)

**Goal:** Test file structure should mirror source file structure

**Current structure:**
```
src/
  extension.ts
  RangeLinkService.ts              ← Extracted
  __tests__/
    extension.test.ts               ← Contains RangeLinkService tests (1116 lines)
```

**Target structure:**
```
src/
  extension.ts
  RangeLinkService.ts
  __tests__/
    extension.test.ts               ← Config, lifecycle tests only
    RangeLinkService.test.ts        ← Dedicated test file for service
```

**Changes:**
- Create `__tests__/RangeLinkService.test.ts`
- Move `describe('RangeLinkService', ...)` block and related helpers from `extension.test.ts`
- Move `createMockTerminalBindingManager` helper if only used by RangeLinkService tests
- Update imports in extracted test file
- Ensure all 130 tests still pass

**Done when:**
- `RangeLinkService.test.ts` exists with ~1116 lines of tests
- `extension.test.ts` reduced to ~2070 lines (config, lifecycle, portable link tests)
- All tests pass with same coverage

---

## Phase 5: Navigation Features — 📋 Planned

Navigate to code using RangeLinks (local workspace and BYOD).

### 5A) Basic Navigation from Clipboard

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

### Strategic Context: AI-First Development Workflow

**RangeLink's Primary Value Proposition:**

RangeLink is an **AI workflow integration tool** that eliminates context-sharing friction for developers using external AI assistants (claude-code, ChatGPT, Gemini). While link sharing and team collaboration are valuable secondary use cases, the primary driver is **high-frequency AI context feeding**.

**Why AI-First Matters:**

- **Workflow frequency:** Generating links for AI happens 50-100+ times per day (vs. sharing with teammates 5-10 times)
- **Friction compounds:** 2-second manual paste × 100 times/day = 200+ context switches eliminated
- **Competitive positioning:** Cursor's killer feature is integrated AI with automatic context. RangeLink makes external AI assistants feel just as integrated while preserving:
  - Choice of AI model (Claude, GPT, Gemini, local models)
  - Full control over context granularity (precise ranges, not full files)
  - Editor independence (works in VSCode, Cursor, Sublime, etc.)

**Feature Priority Implications:**

- **Bind to Terminal** is the killer feature (not "nice-to-have")
- **Link History** amplifies terminal binding by enabling reference reuse
- **Precision and portability** enable AI accuracy (AI gets exactly what you meant)
- **Navigation features** are secondary (AI already "navigates" when reading links)
- **Marketing narrative:** Position as "AI tooling extension" first, "code reference utility" second

**Post-Launch Messaging Strategy:**

After implementing Bind to Terminal MVP (Iterations 1-3), update both READMEs with AI-first narrative (see draft below in this phase). This repositions RangeLink from "yet another link generator" to "essential AI development workflow tool."

---

### **Draft README Messaging (Post Terminal Binding Implementation)**

**Hero Section Bullet Points:**

```markdown
- ⚡ **Zero-friction AI context** — Bind to your claude-code terminal. Links appear instantly, no copy/paste.
- 🎯 **Precise references** — Line ranges, columns, rectangular selections. AI gets exactly what you meant.
- 🔗 **Universal compatibility** — Paste into terminals, chat apps, comments, PRs, anywhere text works
```

**New Section: "Why RangeLink?"**

```markdown
## Why RangeLink?

### For AI-Assisted Development

Using claude-code or ChatGPT for development? RangeLink eliminates the context-sharing friction:

1. **Select code** → Generate link (Cmd+R Cmd+L)
2. **Bind to integrated terminal** → Link appears in claude-code instantly (within VSCode/Cursor)
3. **AI reads precise context** → No manual copy/paste, no lost focus

**Compete with Cursor's built-in AI** by making external AI assistants feel integrated. You get:

- Choice of AI model (Claude, GPT, Gemini)
- Full control over context (precise line ranges, not full files)
- Works across editors (VSCode, Cursor, Sublime)

### Workflow Demo

[GIF/video showing: Select code → Cmd+R Cmd+L → Link sends to bound terminal → AI responds with context-aware answer]
```

**Updated Feature Highlight:**

```markdown
## Features

### 🤖 AI Workflow Integration

- **Bind to integrated terminal:** Links appear instantly in claude-code/AI sessions (within VSCode/Cursor)
- **Zero context switches:** No manual copy/paste, no terminal focusing
- **Persistent binding:** Set once, send forever (until terminal closes)
- **Link history with fuzzy search:** Re-send past references instantly
- **Works everywhere:** claude-code, ChatGPT, any text-based AI

### 🎯 Precision Code References

[existing content...]
```

---

- [x] **Bind to Terminal** - ✅ MVP Complete (Iterations 1-2)
  - **Problem:** Manual workflow friction - After generating a link for claude-code (running in terminal), user must manually paste it from clipboard
  - **Solution:** Automatically paste generated links into a designated terminal, enabling seamless workflow
  - **Primary Use Case:** Running claude-code in VS Code/Cursor terminal - link generation automatically pastes into active claude-code session
  - **Behavior:** Copy to clipboard AND paste to terminal (both operations)
  - **Scope:** All link generation commands (selection, file, symbol, portable)
  - **Platform:** Works in VS Code and Cursor

  **✅ MVP (Iteration 1): Terminal Binding** (Completed)
  - Add command: "RangeLink: Bind to Terminal"
  - **Binding behavior:** Captures the terminal that is active when command is executed - this becomes the bound terminal
  - All subsequent link generation sends to the BOUND terminal (not "whichever terminal is active at send time")
  - Send using `terminal.sendText(link, false)` (no auto-submit - user presses Enter manually)
  - Store terminal reference in memory (session-scoped, not persisted)
  - Status bar feedback: "Bound: [terminal-name]"
  - Command to disable: "RangeLink: Unbind Terminal"
  - **Binding constraint:** If already bound, shows error toast requiring explicit unbind first
  - **Edge case:** If no terminal is active when binding, show error: "No active terminal. Open a terminal and try again."
  - **Done when:** Can bind/unbind terminal, links send to BOUND terminal consistently, status bar shows confirmation

  **✅ Iteration 2: Terminal Lifecycle Management** (Completed)
  - Listen to `window.onDidCloseTerminal` event
  - Auto-unbind when bound terminal closes
  - Show status bar message: "Terminal binding removed (terminal closed)"
  - Log terminal closure event
  - Clear stored terminal reference
  - Comprehensive logging for all bind/unbind/send operations via getLogger()
  - **Done when:** Feature auto-unbinds on terminal closure with user feedback

  **📋 Iteration 3: Enhanced Rebinding UX** (0.5h) - Low Priority
  - **Current limitation:** If already bound, bind command shows error toast requiring manual unbind
  - **Improvement:** Allow seamless rebinding without manual unbind
  - When bind command is invoked while already bound:
    - Show information toast: "Already bound to [current-terminal]. Switch to [new-terminal]?"
    - Two buttons: "Switch" and "Cancel"
    - If "Switch" clicked, perform rebinding automatically
    - Log: `Rebinding from [old] to [new]`
  - Alternative UX: Silent rebinding with info toast "Rebound: [old] → [new]"
  - **Done when:** User can rebind without explicit unbind, with clear feedback about the change

  **📋 Iteration 4: Persistent Status Bar Indicator** (1h) - Low Priority
  - Add persistent status bar item showing current binding state
  - Icon and text: `🔗→ [terminal-name]` when bound, `🔗❌` when unbound
  - Status bar item tooltip: "RangeLink bound to terminal: [name]. Click to rebind."
  - Click behavior:
    - When bound: Shows Quick Pick to switch terminals (or unbind option)
    - When unbound: Runs bind command
  - Registered with extension context for proper cleanup
  - **Done when:** User has persistent visual indicator of binding state, can click to manage binding

  **📋 Iteration 5: Terminal Selection with Quick Pick** (2h)
  - Enhance bind command to show Quick Pick menu of available terminals
  - Display terminal info: name, position/index in list, process name
  - Handle terminals with duplicate names: Show "zsh (1)", "zsh (2)" with indices
  - Allow user to select which terminal to bind to
  - Preview format: `[1] zsh - /Users/username/project`
  - **Re-binding behavior:** If already bound, show Quick Pick to switch to different terminal (no need to unbind first)
  - Confirmation message: "Binding switched from [old-terminal] to [new-terminal]"
  - **Edge case:** If only one terminal exists, auto-select it (skip Quick Pick UI)
  - **Done when:** User can pick specific terminal from list, can re-bind without unbinding, handles edge cases gracefully

  **📋 Iteration 6: Context Menu Integration** (1h)
  - Add "Bind RangeLink Here" to terminal tab context menu
  - Right-click on terminal name in terminal list to bind
  - Show checkmark indicator when terminal is the active binding target
  - **Done when:** Can bind via right-click on terminal, visual indicator shows bound terminal

  **Future Iterations (Defer):**
  - Visual indicator in terminal list (logo/icon next to bound terminal name) - VS Code API research needed
  - Persist terminal binding across sessions (complex: terminal IDs change on restart)
    - Potential approach: Store terminal name + cwd, attempt to match on startup
    - Show notification if stored terminal no longer exists: "Previously bound terminal not found. Bind again?"
  - Multi-terminal support: Bind different link types to different terminals
    - Example: Portable links → Terminal 1, Regular links → Terminal 2
  - Keyboard shortcut for quick toggle: `Cmd+R Cmd+T` / `Ctrl+R Ctrl+T` to bind/unbind
  - Settings integration:
    - `rangelink.terminalBinding.enabled`: Enable binding by default on startup
    - `rangelink.terminalBinding.defaultTerminal`: "active" | "first" | "last" | terminal name pattern
    - `rangelink.terminalBinding.showStatusBarItem`: Show persistent indicator (default: true)
  - Terminal profile integration: Auto-bind for specific terminal profiles (e.g., "claude-code")
  - Fallback to clipboard-only with graceful error handling improvements
  - Support for remote terminals (VS Code Remote Development)
  - Smart detection: If clipboard contains claude-code prompt, suggest enabling terminal binding

  **Technical Notes:**
  - VS Code Terminal API: `window.activeTerminal`, `window.terminals`
  - Terminal identification: `terminal.name` (user-facing), `terminal.processId` (unreliable across sessions)
  - Position tracking: Array index in `window.terminals` (reliable during session, changes on close)
  - Status bar API: `window.createStatusBarItem()` with `command` for click handling

  **Error Handling:**
  - Terminal closed: Auto-disable with status bar notification
  - No active terminal when enabling: Show error toast, guide to command palette
  - Terminal unavailable during paste: Show warning toast, clipboard still contains link
  - Multiple windows open: Feature scoped to window (VS Code window.terminals is window-specific)

- [ ] **Link History with Fuzzy Search** (High Priority for AI Workflow)
  - **Problem:** Need to reference previously shared code locations without regenerating links
  - **AI Workflow Use Case:** "What was that auth function I showed claude-code 2 hours ago?"
  - **Solution:** Searchable history with quick re-send to bound terminal

  **Iteration 1: Basic History Storage** (1.5h)
  - Store last 100 generated links in workspace state
  - Track: link, timestamp, file path, range description
  - Command: "RangeLink: Show Link History"
  - Display in Quick Pick: `[2h ago] src/auth.ts:42-56 (login validation)`
  - Copy selected link to clipboard
  - **Done when:** Can view and copy from history

  **Iteration 2: Fuzzy Search** (2h)
  - Integrate fuzzy search library (fzy, fuse.js, or VSCode's built-in)
  - Search across: file names, paths, range descriptions, timestamps
  - Quick Pick with real-time filtering as you type
  - Show match highlights in results
  - Keyboard shortcuts: Up/Down to navigate, Enter to copy
  - **Done when:** Can type "auth log" and instantly find relevant links

  **Iteration 3: Quick Re-Send to Bound Terminal** (1h)
  - If terminal binding is active, add "Send to Terminal" action in history Quick Pick
  - Keyboard shortcut in history view: `Cmd+Enter` to send (vs `Enter` to copy)
  - Status bar feedback: "Link re-sent to [terminal-name]"
  - **Use case:** "Let me show claude-code that auth function again" → search → Cmd+Enter → done
  - **Done when:** Can re-send historical links without leaving history UI

  **Iteration 4: Smart Context Descriptions** (1.5h)
  - Auto-generate human-readable descriptions from code
  - Extract function/class names, variable declarations from selected ranges
  - Example: `src/auth.ts:42-56` → `validateLogin function (src/auth.ts:42-56)`
  - Fallback to first line of code if no clear symbol
  - Allow manual description override in history view
  - **Done when:** History is scannable without memorizing line numbers

  **Iteration 5: History Management** (1h)
  - Export history as markdown (for documentation/notes)
  - Export as CSV (for analysis/reporting)
  - Clear history command
  - Configurable history size (default: 100, max: 500)
  - Setting: `rangelink.history.enabled` (opt-out for privacy)
  - **Done when:** Can manage history, export for external use

  **Future Enhancements:**
  - Sync history across devices (VSCode Settings Sync)
  - Pin favorite links (persist separately from LRU history)
  - Group by project/workspace
  - Deduplicate identical links (merge timestamps)
  - History analytics: most-shared files, time-of-day patterns

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

- [ ] **Architecture Decision Records (ADR)**
  - Document architectural decisions chronologically in `docs/ADR/`
  - Standard format: Status, Context, Decision, Consequences
  - Track "why" behind major decisions (monorepo structure, versioning strategy, etc.)
  - Examples:
    - `0001-monorepo-structure.md` - Why we chose monorepo over multi-repo
    - `0002-independent-package-versioning.md` - Why packages version independently
    - `0003-git-tagging-convention.md` - Why we use `{package}-v{version}` format
    - `0004-core-library-extraction.md` - Why we extracted platform-agnostic core
  - Benefits: Onboarding new contributors, understanding trade-offs, preventing decision re-litigation
  - See: [ADR GitHub organization](https://adr.github.io/) for format and examples

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Monorepo structure and core architecture
- [LINK-FORMATS.md](./LINK-FORMATS.md) - Comprehensive link notation guide
- [BYOD.md](./BYOD.md) - Portable links (Bring Your Own Delimiters)
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Error codes and validation rules
- [LOGGING.md](./LOGGING.md) - Structured logging approach
- [neovim-integration.md](./neovim-integration.md) - Neovim plugin integration options
