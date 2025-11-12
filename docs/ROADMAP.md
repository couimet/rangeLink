# RangeLink Roadmap

_Future development plans and in-progress work._

> **Looking for completed work?** See [JOURNEY.md](./JOURNEY.md)
>
> **Looking for rejected features?** See [CEMETERY.md](./CEMETERY.md)

---

> **Development Approach:** We use **micro-iterations** (1-2 hours each) to prevent feature creep and maintain momentum. Each iteration has clear scope, time estimates, and "done when" criteria.

## Development Principles

1. **Micro-Iterations (1-2 hours max)** - Clear "done when" criteria prevent scope creep
2. **One Focus Per Iteration** - Never mix unrelated changes
3. **Commit Early, Commit Often** - Use `[WIP]` or `[PARTIAL]` tags when appropriate
4. **Explicit Scope Definition** - Document what IS and IS NOT in scope upfront
5. **Test-Driven Quality** - Aim for 100% branch coverage

---

## Completed Work

**Looking for completed features?** See [JOURNEY.md](./JOURNEY.md) for full details on:

- ✅ **Universal Paste Destinations** - Terminal, text editor, and Cursor AI integration
- ✅ **Terminal Link Navigation** - Click RangeLinks in terminal output
- ✅ **Editor Link Navigation** - Click RangeLinks in scratchpad files
- ✅ **Terminal Auto-Focus** - Seamless workflow after link generation
- ✅ **Result Type Value Object** - Runtime type safety with validated getters

---

## Active Development — Navigation Enhancements

### 📋 Navigate from Clipboard/Selection — Future

**Goal:** Command to navigate to RangeLink from clipboard/selection.

**Commands:**

- `RangeLink: Navigate to Link in Clipboard`
- `RangeLink: Navigate to Selected Link`

**Implementation:** Reuse `parseLink()` and navigation logic, handle text extraction, clear error messages.

---

### 📋 Enhanced Navigation Feedback — [GitHub #47](https://github.com/couimet/rangeLink/issues/47)

**Goal:** Improve navigation feedback with contextual toasts and settings for clamping detection.

**Status:** See GitHub issue #47 for detailed breakdown and progress.

---

## BYOD Parsing — 📋 Deferred

**Status:** Generation complete (v0.1.0). Parsing deferred until after core navigation features.

**Rationale:** Navigation and paste destinations are higher priority for user workflow. Basic parsing with local delimiters unblocks navigation. BYOD parsing adds complexity without immediate benefit.

**Parsing iterations (deferred):**

- 📋 Parse metadata, extract delimiters, format validation
- 📋 Validate extracted delimiters
- 📋 Recovery logic (missing delimiters, fallbacks)
- 📋 Rectangular mode detection with custom BYOD hash
- 📋 **1C.5** (30m): Documentation and cleanup

**When to revisit:** After Phase 5 complete and stable.

For details see [BYOD.md](./BYOD.md) and [LINK-FORMATS.md](./LINK-FORMATS.md).

---

## Phase 2D: Neovim Plugin Shell — 📋 Planned (1 hour)

- Create `packages/rangelink-neovim-plugin/` with basic Lua structure
- Implement `:RangeLinkCopy` command (calls core via Node CLI)
- Basic README and installation instructions
- **Done when:** Can install and copy basic link in Neovim

See [neovim-integration.md](./neovim-integration.md).

---

## Phase 3: VSCode Marketplace Launch — 📋 Remaining Items

**Completed:** Developer tooling, extension icon/logo (see [JOURNEY.md](./JOURNEY.md))

### 3I) GitHub Social Preview Banner — [GitHub #74](https://github.com/couimet/rangeLink/issues/74)

**Goal:** Create GitHub social preview banner showcasing RangeLink's bidirectional workflow for AI-assisted development.

**Status:** See GitHub issue #74 for complete design specifications, DALL-E prompts, and implementation steps.

---

## Phase 4: Post-Publishing Enhancements — 📋 Remaining Items

**Completed:** Git tagging, CHANGELOG, release strategy, README enhancements, logo, contributors (see [JOURNEY.md](./JOURNEY.md))

### 4D) GitHub Actions Release Workflow — 📋 Planned

- Create `.github/workflows/release.yml`
- Trigger on version tag push
- Automate GitHub release creation
- Extract changelog for release notes

### 4A.2) Configuration Change Detection — [GitHub #43](https://github.com/couimet/rangeLink/issues/43)

**Goal:** Enable dynamic configuration reloading so users don't need to reload VSCode window when changing delimiter settings.

**Status:** See GitHub issue #43 for detailed implementation steps and progress.

### 4A.5) Error Logging Verification in Tests — 📋 Planned (1.5h)

**Goal:** Verify all catch blocks properly log errors via `getLogger()`.

**Gap:** Tests verify `showErrorMessage()` but NOT `getLogger().error()` calls.

**Tasks:**

- Mock `getLogger()` in test setup
- Add assertions for `mockLogger.error()` in error tests
- Verify context logged (function name, error object, metadata)
- Cover all 4 catch blocks in extension.ts

**Done when:** Tests fail if error logging removed, all catch blocks covered.

### 4J) Content Drift Prevention Strategy — 📋 Planned

Define strategy to prevent root vs package README drift. Create `docs/README-CONTENT-STRATEGY.md` with guidelines.

### 4K) Enhanced Build Output with Metadata — 📋 Planned

Display version, commit hash, date during build. Enhance `scripts/generate-version.js` to output metadata table.

### 4L) Embed Commit Hash in Extension Metadata — 📋 Planned

Extend `version.json` with commit hash, build date, branch, dirty flag. Add "Show Version Info" command for runtime debugging.

### 4M) Separate Dev vs. Production Package Scripts — 📋 Planned

- `package:dev`: Allows dirty tree, adds `-dev` suffix
- `package`: Strict, clean build only, for marketplace
- `package:force`: Emergency overrides

### 4N) Unsaved File Warning — 📋 Future Exploration

**Problem:** Building RangeLinks from files with unsaved modifications leads to position mismatch.

**Scenario:**

- User edits file but doesn't save
- RangeLink generated from unsaved buffer positions (e.g., Line 50)
- claude-code interprets positions from saved file content
- Result: Link points to wrong code location (confusion)

**Potential Solutions (to be explored):**

1. **Prompt to save before building** - Show dialog: "Save file before generating link?"
   - Pro: Ensures accuracy
   - Con: Feels intrusive, interrupts workflow

2. **Warning toast** - Build link but show: "⚠️ Link generated from unsaved file"
   - Pro: Non-intrusive, user stays in flow
   - Con: User might ignore warning

3. **Auto-save on link generation** - Silently save file before building
   - Pro: Zero friction, always accurate
   - Con: Unexpected auto-save behavior

4. **Visual indicator in link** - Append marker like `~unsaved` to link
   - Pro: Explicit tracking
   - Con: Breaks link format, non-standard

**Decision:** Deferred for user feedback and testing. Track real-world frequency of this issue.

---

## Phase 4.5: Technical Debt & Refactoring

**Completed:** 4.5A (Test Re-exports), 4.5C (Link Interface), 4.5G (Resource Leak), 4.5J (MessageCode Values), 4.5K (Logger Verification). See [JOURNEY.md](./JOURNEY.md).

### 4.5B) Separate Extension Config from Core Validation (3-4h)

Extension tests check core validation logic. `getErrorCodeForTesting()` maps errors - symptom of bad separation.

**Plan:** Core `validateDelimiter()` returns `Result<T, RangeLinkMessageCode>` (1h) → Extension delegates (1h) → Delete mapping function (15min) → Rewrite tests (1-2h)

### 4.5D) Refactor Module-Level outputChannel (30 min)

Pass logger as parameter instead of accessing module-level `outputChannel`.

### 4.5E) Replace outputChannel with getLogger() (30 min)

Replace all `outputChannel.appendLine()` with `getLogger()` for consistency.

### 4.5F) Extract Command Registration (30 min)

Extract 60+ lines from `activate()` to `registerCommands()` helper. Reduce `activate()` to ~15 lines.

### 4.5H) Extract RangeLinkService Tests (45 min)

Move 1116 lines of tests from `extension.test.ts` to `RangeLinkService.test.ts`.

### 4.5I) Eliminate CONFIG_UNKNOWN (1h)

Replace catch-all error code with specific codes per failure scenario.

### 4.5L) Consolidate Extension Types (1-2h)

Move all types to `types/` folder (following core's pattern). Already done: `RangeLinkTerminalLink`.

---

## Phase 4.6: Go-To-Market Readiness

### 4.6A) Keybinding Conflict Detection — 🪦 Abandoned

VSCode doesn't expose keybinding conflict detection API. See [CEMETERY.md](./CEMETERY.md) for details.

### 4.6B) Cross-File Context Positioning — ✅ Complete

Highlighted RangeLink's cross-file context advantage vs built-in claude-code extension in both READMEs.

---

## Phase 5: Terminal Link Navigation — 📋 Planned

**Goal:** Make RangeLinks in terminal clickable (Cmd+Click).

**Completed:** Iterations 1, 1.1, 3.1 Subsets 1-5. See [JOURNEY.md](./JOURNEY.md).

### Iteration 1.2: Richer ParsedLink Interface (30 min)

Return full metadata (delimiter config, computed selection, range format, selection type) to match `FormattedLink` symmetry.

### Iteration 1.3: DelimiterConfig Support (1h)

Accept DelimiterConfig parameter. Update regex to use config. Handle multi-char delimiters, rectangular mode detection.

### Iteration 1.4: Round-Trip Integration Tests (1h)

Verify parsing and generation are inverses. Test: Generate → Parse → Generate and Parse → Generate → Parse. Cover all formats.

### Iteration 3.1 Subset 6: Configuration Integration (30 min)

Final subset to complete terminal link provider implementation.

---

## Phase 5.1: Terminal Link Navigation Bug Fixes — 📋 Planned (~2 hours)

**Completed:** Task 2 (Same-Position Selection). See [JOURNEY.md](./JOURNEY.md).

### Task 1: Research VSCode Multi-Line API (15 min)

**Findings:** `TerminalLinkContext` provides single lines only. Terminal line wrapping unsolvable with current API - platform limitation. Must document.

### Task 3: Audit Test Coverage (45 min)

Ensure parsing, formatting, navigation modules have comprehensive single-position tests.

### Task 4: Document Terminal Wrapping Limitation (15 min)

Document VSCode API limitation in JOURNEY.md, README (Known Limitations), architecture docs. Provide workarounds (shorter delimiters, wider terminal, quotes, newlines).

### Task 5: Link Truncation Detection (30 min) — Optional

Detect truncated links (end with delimiter prefix) and warn user. Low priority - doesn't fix underlying issue.

---

## Phase 5.2: Configuration Integration — 📋 Planned (30 min)

Integrate terminal link provider with Phase 4A.2 config change detection. Rebuild pattern when delimiters change, recreate and re-register provider.

---

## Phase 5: Advanced Generation

- [ ] **Multi-range selection** - `path#L10-L20,L30-L40` (comma-separated)
- [ ] **Rectangular mode auto-detection** - Detect rectangular selection, auto-format as `##...`
- [ ] **Enhanced BYOD generation** - All selection types with metadata
- [ ] **Context menu integration** - "Copy RangeLink", "Copy Portable RangeLink"
- [ ] **Quick pick for formats** - Preview before copying

---

## Phase 6: Workspace & Collaboration

- [ ] **Multi-workspace support** - Detect workspace, generate workspace-relative paths
- [ ] **Path validation** - Check file exists, suggest relative vs absolute
- [ ] **Git integration** - Git-relative paths, optional commit hash
- [ ] **Markdown format** - `[description](path#L10-L20)` with templates
- [ ] **Share integration** - Email, Slack, Teams with pre-formatted messages

---

## Phase 7: User Experience

- [ ] **Settings validation UX** (1h) - Pre-save validation, "Test Configuration" command, better error notifications
- [ ] **Settings and preferences** - Opt-in/out, format preferences, keyboard customization, exclusion patterns
- [ ] **Visual feedback** - Link in notification, preview selection, highlight target, animated transitions
- [ ] **Accessibility** - Screen reader, keyboard navigation, high contrast

---

## Phase 8: Integration & Extensions

- [ ] **VSCode API integration** - Register as link provider
- [ ] **Terminal integration** - Parse links in terminal output
- [ ] **Extension compatibility** - GitLens, Copilot
- [ ] **Workspace trust** - Handle untrusted workspaces, security warnings

---

## Phase 9: Developer Experience

- [ ] **Comprehensive tests** - 100% branch coverage, edge cases, performance, integration
- [ ] **Documentation** - API docs, contributing guidelines, video tutorials, best practices
- [ ] **Telemetry** (opt-in) - Usage stats, error reporting, BYOD failure tracking (paths redacted)
- [ ] **Performance** - Lazy loading, efficient resolution, optimized regex, caching

---

## Phase 10: Internationalization (i18n)

- [ ] **Translation Infrastructure** - VSCode i18n API, resource files, error code mapping, multiple languages
- [ ] **Error Message Localization** - All validation errors, status bar, commands, settings
- [ ] **Community Contributions** - Translation process, templates, credit translators
- [ ] **Testing** - Verify layout, test long translations, ensure code consistency

See [LOGGING.md](./LOGGING.md#internationalization-readiness).

---

## Nice-to-Have Features

- [ ] **Circular/radius selection** - `path#L10C5@15` (line 10, col 5, radius 15 chars)
- [ ] **Code review integration** - PR comment links, review discussions
- [ ] **Team collaboration** - Share preferences, team configs, analytics
- [ ] **IDE integrations** - JetBrains, Neovim, Emacs
- [ ] **AI assistant integration** - Generate from AI responses, parse AI references
- [ ] **Architecture Decision Records** - Document decisions chronologically in `docs/ADR/`
- [ ] **README hero layout** - Improve logo presentation, inspired by awesome-readme

---

## Related Documentation

- [JOURNEY.md](./JOURNEY.md) - Completed work, decisions, milestones
- [CEMETERY.md](./CEMETERY.md) - Rejected features and why
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Monorepo structure and core architecture
- [LINK-FORMATS.md](./LINK-FORMATS.md) - Link notation guide
- [BYOD.md](./BYOD.md) - Portable links (Bring Your Own Delimiters)
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Error codes and validation
- [LOGGING.md](./LOGGING.md) - Structured logging approach
