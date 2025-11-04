# RangeLink Journey

_A chronological record of completed work, decisions, and milestones._

> **Looking for future plans?** See [ROADMAP.md](./ROADMAP.md)
>
> **Looking for rejected features?** See [CEMETERY.md](./CEMETERY.md)

---

## Phase 1: Core Enhancements — ✅ Complete

Phase 1 focused on three iterative sub-phases: rectangular mode support, robust delimiter validation, and portable link generation. Each sub-phase used micro-iterations for focused, incremental progress.

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

### 1C) Portable Link (BYOD/BYODELI 🥪) Generation — ✅ Complete

**Objective:** Generate links with embedded delimiter metadata so teams can share code references seamlessly regardless of delimiter configurations.

For comprehensive BYOD documentation, see [BYOD.md](./BYOD.md).

**Status:**

- ✅ **Generation: Complete** (commands, keybindings, context menu, metadata composition)
- ✅ **Single-character hash validation**: Enforced for user configuration
- ✅ **Test suite modernization**: ES6 imports, proper TypeScript types, 114 passing tests

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

---

## Phase 3: VSCode Marketplace Launch — Completed Items

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

### 3A) Create Extension Icon/Logo (1 hour) — ✅ Completed

**Goal:** Design and add professional icon for marketplace listing.

**Status:** ✅ Complete

- ✅ `icon.png` (35KB) and `icon_large.png` (1.1MB) created
- ✅ `package.json` updated with `"icon": "icon.png"`
- ✅ Icon meets VSCode requirements

---

## Phase 4: Post-Publishing Enhancements — Completed Items

Following the successful publication of the VSCode extension to the marketplace, this phase addressed critical gaps in release management, documentation, and tooling discovered during the publishing process.

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

**Status:** Complete - Package and signpost changelogs in place, ADR framework documented

---

#### 4C) Monorepo Release Strategy Documentation — ✅ Complete

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

**Status:** Complete - Comprehensive 544-line strategy document created

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

**Status:** Complete - Yan Bohler properly credited for logo refinement, contributor pathway established

---

### 4.6B) Cross-File Context Positioning — ✅ Complete

**Goal:** Position RangeLink's cross-file context capability as competitive advantage vs built-in claude-code extension.

**Problem:** Built-in claude-code extension limited to single selection from current file only. Users don't realize RangeLink enables multi-file context by generating multiple links and pasting all in one prompt.

**Solution implemented:**

Added concise competitive positioning to both READMEs with direct comparison:

**VSCode Extension README:**

- Added bullet: "🔗 **Cross-file context** — Generate links from multiple files, paste all in one prompt. Built-in claude-code: single selection, current file only."

**Root README:**

- Updated bullet: "🤖 **AI assistants** — Multi-file context in one prompt. Generate RangeLinks from auth.ts, tests.ts, config.ts — paste all. Built-in claude-code: single selection, current file only."

**Messaging strategy:**

For geek audience: Technical, direct, practical workflow example. No marketing fluff.

**Key differentiator:**

- Built-in claude-code: Single selection, current file
- RangeLink: Multiple links from multiple files → paste all → richer AI context

**Deliverables:**

- ✅ VSCode extension README updated with cross-file context positioning
- ✅ Root README updated with practical workflow example
- ✅ Direct comparison with built-in claude-code extension
- ✅ Concise, technical messaging for developer audience

**Status:** Complete - Clear competitive positioning established, 30 minutes

---

### 4.6C) Selection Type API Improvement with Position Interfaces — ✅ Complete

**Goal:** Improve Selection API ergonomics and type safety by replacing flat fields with nested Position interfaces, while solving 0-indexed vs 1-indexed inconsistencies.

**Problem:**

- Selection interface used flat fields (startLine, startCharacter, endLine, endCharacter) creating duplication
- Position interface was 1-indexed (for link parsing) but Selection was 0-indexed (internal), causing indexing confusion
- 335 occurrences of flat fields across 12 core library files

**Solution implemented:**

Created dual Position types with clear semantic boundaries:

1. **EditorPosition** (0-indexed, char REQUIRED):
   - For internal editor selections
   - `{ line: number, char: number }`
   - Char is required because editors always provide it (VSCode's `vscode.Position` always has line + char)

2. **LinkPosition** (1-indexed, char OPTIONAL):
   - For link format parsing/generation
   - `{ line: number, char?: number }`
   - Char is optional for full-line references like `#L10`

3. **Updated Selection interface:**

   ```typescript
   // Before:
   interface Selection {
     readonly startLine: number;
     readonly startCharacter: number;
     readonly endLine: number;
     readonly endCharacter: number;
     readonly coverage: SelectionCoverage;
   }

   // After:
   interface Selection {
     readonly start: EditorPosition;
     readonly end: EditorPosition;
     readonly coverage: SelectionCoverage;
   }
   ```

**Files modified (16 files):**

Core Library:

- Created: `EditorPosition.ts`
- Renamed: `Position.ts` → `LinkPosition.ts`
- Updated: `Selection.ts`, `InputSelection.ts`, `ParsedLink.ts`, `index.ts`
- Updated: `computeRangeSpec.ts`, `validateInputSelection.ts`, `parseLink.ts`
- Updated: 3 test files (formatLink, computeRangeSpec, validateInputSelection)

VSCode Extension:

- Updated: `toInputSelection.ts` (adapter)
- Updated: 2 test files (extension, isRectangularSelection)

**Benefits achieved:**

- ✅ **Better API ergonomics** - Nested position objects instead of flat fields (DRY principle)
- ✅ **Type safety** - Compiler enforces 0-indexed (editor) vs 1-indexed (links) usage
- ✅ **Required char** - EditorPosition makes char mandatory, matching editor reality
- ✅ **Clearer semantics** - Names document purpose (EditorPosition vs LinkPosition)
- ✅ **Better structured logging** - `{ selection: { start, end, coverage } }` instead of flat fields
- ✅ **Future-proof** - Can add metadata to position types once, all usages benefit

**Test results:**

- ✅ Core library: 144 tests passing (95.74% coverage)
- ✅ VSCode extension: 130 tests passing
- ✅ All functionality verified working

**Pre-release timing:** Perfect moment for breaking changes - no external users affected yet.

**Deliverables:**

- ✅ Two Position types with clear semantic boundaries (EditorPosition, LinkPosition)
- ✅ Updated Selection interface using EditorPosition
- ✅ 16 files updated across core library and VSCode extension
- ✅ All tests passing with no regressions
- ✅ ROADMAP.md updated with comprehensive analysis and decision rationale

**Status:** Complete - API improved with better ergonomics and type safety, 2.5 hours

---

## Related Documentation

- [ROADMAP.md](./ROADMAP.md) - Future development plans
- [CEMETERY.md](./CEMETERY.md) - Rejected features and why
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Monorepo structure and core architecture
- [LINK-FORMATS.md](./LINK-FORMATS.md) - Comprehensive link notation guide
- [BYOD.md](./BYOD.md) - Portable links (Bring Your Own Delimiters)
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Error codes and validation rules
- [LOGGING.md](./LOGGING.md) - Structured logging approach
