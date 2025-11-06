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

## Navigation Features — High Priority

**Overview:** Making RangeLinks navigable across different contexts (terminal, editor, clipboard).

### ✅ Terminal Link Navigation — COMPLETE

RangeLinks in terminal output are clickable (Cmd/Ctrl+Click) with proper selection handling. See [Phase 5](#phase-5-terminal-link-navigation---planned) for details.

---

### 📋 Editor Link Navigation — HIGH PRIORITY (2-3 hours)

**Goal:** Make RangeLinks clickable in editor text files (any type: .md, .txt, code, untitled).

**Use Case:** Preparing prompts in editor scratch files. Click RangeLink to navigate without leaving editor.

**Iterations:**

1. **Document Link Provider** (1.5h) - Implement `vscode.DocumentLinkProvider`, reuse terminal navigation logic
2. **Testing & Edge Cases** (30min) - Test all file types, workspace paths, rectangular mode
3. **Polish & Documentation** (30min) - Hover tooltips, logging, README updates, demo GIF

**Done When:**

- [ ] RangeLinks clickable in any editor file
- [ ] Proper navigation with selection
- [ ] Rectangular mode support
- [ ] Tests cover all file types

**Benefits:** Seamless workflow - prepare prompts, click links to verify context. BYOD parsing (when added) works automatically.

---

### 📋 Navigate from Clipboard/Selection — Future

**Goal:** Command to navigate to RangeLink from clipboard/selection.

**Commands:**

- `RangeLink: Navigate to Link in Clipboard`
- `RangeLink: Navigate to Selected Link`

**Implementation:** Reuse `parseLink()` and navigation logic, handle text extraction, clear error messages.

---

## Phase 1C: BYOD Parsing — 📋 Deferred

**Status:** Generation complete (v0.1.0). Parsing deferred until after terminal navigation (Phase 5).

**Rationale:** Terminal navigation is higher priority for user workflow. Basic parsing with local delimiters unblocks terminal navigation. BYOD parsing adds complexity without immediate benefit.

**Parsing iterations (deferred):**

- 📋 **1C.1** (1.5h): Parse metadata, extract delimiters, format validation
- 📋 **1C.2** (1.5h): Validate extracted delimiters
- 📋 **1C.3** (2h): Recovery logic (missing delimiters, fallbacks)
- 📋 **1C.4** (1h): Rectangular mode detection with custom BYOD hash
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

## Phase 2E: CI/CD Pipeline — 📋 Planned (1 hour)

- GitHub Actions workflow
- Run tests on PR (per-package)
- Automated npm publish on tag (core only)
- **Done when:** CI passes on PR, publishes on tag

---

## Phase 3: VSCode Marketplace Launch — 📋 Remaining Items

**Completed:** Developer tooling, extension icon/logo (see [JOURNEY.md](./JOURNEY.md))

### 3I) GitHub Social Preview Banner

**Goal:** Create GitHub social preview banner showcasing RangeLink's bidirectional workflow for AI-assisted development.

**Banner Composition:**

Visual concept: IDE window (VSCode/Cursor aesthetic) demonstrating the link creation and navigation workflow.

**Core elements:**

- **IDE mockup** showing split view:
  - **Text editor panel** (top/larger): Code snippet with partial-line selection
    - Show lines 42-58 with visible line numbers
    - Selection spans multiple lines with different column start/end positions (e.g., L42C10-L58C25)
    - Highlight showing selection doesn't have to be full lines
  - **Integrated terminal panel** (bottom): Displays clickable RangeLink
    - Example: `src/auth.ts#L42C10-L58C25`
    - Subtle visual indicator showing link is clickable (cursor icon, underline, or hover state)
- **Bidirectional arrow**: Between editor and terminal showing two-way navigation flow
- **RangeLink logo**: Chicken mascot (top-left corner or as tasteful overlay)
- **Headline**: "RangeLink gives you `src/auth.ts#L42C10-L58C25` — precise, portable, and just works across editors, tools, and teams"
  - Adapt as needed for visual balance (can split into title + subtitle)
- **Tone**: Friendly and accessible (matching mascot personality)

**Visual Identity:**

**Logo description** (for DALL-E prompt; actual logo will be uploaded separately):

- Friendly cartoon chicken mascot
- Orange feathers (#FF6B35)
- Wearing an infinity necklace (∞ symbol pendant)
- Circular badge design with "RANGELINK" text curved at top
- Code reference "#L3C14-L314C16" curved at bottom
- Cream/beige background circle
- Dark brown border
- Overall vibe: Playful, approachable, tech-savvy

**Brand colors:**

- Primary: Orange #FF6B35
- Secondary: Cream/beige #F5E6D3
- Accent: Dark brown #3E2723
- UI elements: VSCode dark theme aesthetic (dark grays, subtle syntax highlighting)

**DALL-E Prompts:**

<details>
<summary><strong>Prescriptive Version (Click to expand)</strong></summary>

```
Create a 1280x640px GitHub social preview banner for RangeLink, a VSCode extension for AI-assisted development workflows.

LAYOUT & COMPOSITION:
- Canvas: 1280x640px
- Background: Subtle gradient from cream (#F5E6D3) on left to light orange tint on right
- Main element: Realistic IDE window mockup (VSCode or Cursor style), centered, occupying ~75% of banner width and height

IDE WINDOW MOCKUP STRUCTURE:
- Title bar: Dark (#1E1E1E), show "VSCode" or "Cursor" branding
- Split panel layout (horizontal split):
  * Top panel (60% height): Text editor
  * Bottom panel (40% height): Integrated terminal
  * Subtle divider line between panels

TEXT EDITOR PANEL (Top):
- Background: Dark theme (#1E1E1E or similar)
- Show code snippet (TypeScript or JavaScript):
  * Line numbers visible on left (lines 42-58)
  * Syntax highlighting (subtle blues, yellows, greens typical of VSCode dark theme)
  * Selection highlighted: Partial-line selection spanning multiple lines
  * Selection example: Line 42 starting at column 10, ending at line 58 column 25
  * Make it clear selection doesn't span full lines (different column positions)
  * Use standard VSCode selection highlight color (blue-ish overlay)
- Tab bar showing filename: "src/auth.ts"

TERMINAL PANEL (Bottom):
- Background: Very dark (#0C0C0C or similar)
- Show terminal prompt and RangeLink output:
  * Prompt: "$ " or ">" in typical terminal green
  * Link text: "src/auth.ts#L42C10-L58C25" in a clickable style
  * Visual indicator: Subtle underline or hand cursor icon near link
  * Optional: AI assistant response context (e.g., "claude: Check out this code:")

BIDIRECTIONAL ARROW:
- Position: Between editor and terminal (vertically centered on the divider)
- Style: Orange (#FF6B35), ~50-60px length, double-headed (⟷)
- Subtle glow or shadow for visibility
- Shows connection: "Select code → Generate link" and "Click link → Navigate back"

LOGO & BRANDING:
- RangeLink logo: Top-left corner (or bottom-right if composition works better)
- Size: ~100-120px
- Circular badge with friendly cartoon chicken:
  * Orange chicken with infinity necklace
  * "RANGELINK" text curved at top
  * "#L3C14-L314C16" at bottom
  * Cream background circle with dark brown border
- Logo should be prominent but not overwhelming

HEADLINE TEXT:
- Position: Bottom of banner (below IDE window) or integrated tastefully
- Text: "precise, portable, and just works"
- Alternative: "RangeLink: Precise code references for AI assistants"
- Font: Modern sans-serif (Inter, SF Pro, or similar)
- Color: Dark brown (#3E2723) for contrast, or white if positioned over darker area
- Size: ~32-40px, readable at social preview size

OVERALL STYLE:
- Professional but friendly (not corporate/sterile)
- Modern developer tools aesthetic
- Clean, approachable UI
- Realistic IDE mockup (should feel like a screenshot, but polished)
- Ensure text is readable when scaled down to thumbnail size

TECHNICAL REQUIREMENTS:
- Dimensions: 1280x640px (2:1 aspect ratio)
- Format: PNG with transparency where appropriate, or solid background
- Optimize for social media preview (clear even at small sizes)
```

</details>

<details>
<summary><strong>Open-Ended Version (Click to expand)</strong></summary>

```
Create a 1280x640px GitHub social preview banner for RangeLink, a VSCode extension that helps developers share precise code references with AI assistants.

CORE CONCEPT:
Show a modern code editor (VSCode or Cursor style) with an integrated terminal, demonstrating RangeLink's bidirectional workflow:
1. Developer selects code in the editor → generates a precise link
2. Link appears in the terminal (clickable)
3. Clicking the link navigates back to the exact code location

ESSENTIAL ELEMENTS TO INCLUDE:
- IDE window showing both text editor and integrated terminal
- Text editor: Code with a partial-line selection (not full lines — show different start/end column positions)
- Terminal: A clickable RangeLink like `src/auth.ts#L42C10-L58C25`
- Bidirectional arrow: Visual connector showing the two-way workflow
- RangeLink logo: Friendly orange chicken mascot with infinity necklace (circular badge design)
- Headline: Adapt from "precise, portable, and just works across editors, tools, and teams"

VISUAL DIRECTION:
- Tone: Friendly and accessible (not sterile or overly corporate)
- Style: Modern developer tools aesthetic, clean UI
- Colors: Orange (#FF6B35), cream (#F5E6D3), dark browns, VSCode dark theme
- Make it feel like a polished screenshot of a real workflow

LOGO DESCRIPTION (will be uploaded separately, but for context):
- Circular badge with friendly cartoon chicken
- Orange feathers, wearing infinity (∞) necklace
- "RANGELINK" text at top, "#L3C14-L314C16" at bottom
- Cream background, dark brown border
- Playful, approachable mascot

LAYOUT FREEDOM:
Feel free to interpret the composition creatively while keeping the core workflow concept clear. The goal is to instantly communicate: "This tool helps you share precise code with AI assistants and navigate back via clickable links."

TECHNICAL SPECS:
- Size: 1280x640px (2:1 ratio)
- Readable at thumbnail sizes
- Professional but friendly vibe
```

</details>

**Technical Specifications:**

- Dimensions: 1280×640px (2:1 aspect ratio)
- Format: PNG or JPG
- File size: Under 1MB
- Upload location: GitHub → Repo Settings → General → Social preview

**Upload & Testing:**

1. Generate banner using DALL-E with one of the prompts above
2. Upload to GitHub: Repository Settings → General → Social preview
3. Test by sharing repo link on Slack/messaging apps to verify preview appears correctly

**Done when:** Banner uploaded to GitHub and displays correctly in social media previews

---

## Phase 4: Post-Publishing Enhancements — 📋 Remaining Items

**Completed:** Git tagging, CHANGELOG, release strategy, README enhancements, logo, contributors (see [JOURNEY.md](./JOURNEY.md))

### 4D) GitHub Actions Release Workflow — 📋 Planned

- Create `.github/workflows/release.yml`
- Trigger on version tag push
- Automate GitHub release creation
- Extract changelog for release notes

### 4A.2) Configuration Change Detection (30 min) — 🔴 Critical Bug

**Problem:** Delimiter config loaded once at activation, never updated. Requires window reload.

**Implementation:**

1. Register config listener: `vscode.workspace.onDidChangeConfiguration()`
2. Extract `reloadConfiguration()` - reload delimiters, recreate RangeLinkService
3. **🔴 CRITICAL: Recreate TerminalLinkProvider** - pattern uses `buildLinkPattern(delimiters)`, stale pattern won't detect links with new delimiters
4. Handle edge cases: invalid config (fallback), debounce (500ms)

**Testing:**

- Change delimiter → Extension uses new delimiters immediately
- Terminal links detect new delimiter pattern
- Verify log shows provider recreation

**Done when:** User can change settings during session, extension updates immediately including terminal link detection.

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

## Phase 7: Productivity Features

### Strategic Context: AI-First Development Workflow

RangeLink is an **AI workflow integration tool** eliminating context-sharing friction for developers using external AI assistants (claude-code, ChatGPT, Gemini).

**Why AI-First:**

- Workflow frequency: 50-100+ link generations/day for AI vs 5-10 for team sharing
- Friction compounds: 2s manual paste × 100 = 200+ context switches eliminated
- Competitive positioning: Makes external AI feel integrated like Cursor while preserving model choice, context control, editor independence

**Feature Priority:** Bind to Terminal is killer feature (not nice-to-have). Link History amplifies it.

---

### Bind to Terminal — High Priority

**Problem:** Manual clipboard paste friction after generating links for claude-code in terminal.

**Solution:** Auto-paste generated links into bound terminal.

**Completed:** Iterations 1-2 (Terminal Binding, Lifecycle Management). See [JOURNEY.md](./JOURNEY.md).

**📋 Iteration 3: Enhanced Rebinding UX** (0.5h)

Allow rebinding without manual unbind. Show toast: "Already bound. Switch to [new]?"

**📋 Iteration 4: Persistent Status Bar** (1h)

Status bar item: `🔗→ [terminal]` (bound) or `🔗❌` (unbound). Click to manage.

**📋 Iteration 5: Terminal Selection Quick Pick** (2h)

Quick Pick of available terminals with name, position, process. Auto-select if only one.

**📋 Iteration 6: Context Menu** (1h)

"Bind RangeLink Here" on terminal tab with checkmark indicator.

**Future:** Visual indicator, persist across sessions, multi-terminal support, keyboard shortcuts, settings integration, auto-focus/auto-space after paste.

---

### 📋 Link History with Fuzzy Search — High Priority

**Problem:** Need to reference previous code locations without regenerating.

**AI Use Case:** "What was that auth function I showed claude-code 2 hours ago?"

**Iteration 1: Basic Storage** (1.5h)

- Store last 100 links in workspace state
- Command: "Show Link History"
- Quick Pick: `[2h ago] src/auth.ts:42-56`
- Copy selected link

**Iteration 2: Fuzzy Search** (2h)

- Search file names, paths, ranges, timestamps
- Real-time filtering, match highlights
- Keyboard shortcuts

**Iteration 3: Quick Re-Send** (1h)

- If terminal bound, add "Send to Terminal"
- `Cmd+Enter` to send vs `Enter` to copy

**Iteration 4: Smart Descriptions** (1.5h)

- Auto-generate from code (function/class names)
- Manual override option

**Iteration 5: Management** (1h)

- Export as markdown/CSV
- Clear history command
- Configurable size (default 100, max 500)

**Future:** Sync across devices, pin favorites, group by project, deduplicate, analytics.

---

### Other Productivity Features

- [ ] **Undo/redo support** - Track navigation history
- [ ] **Batch operations** - Multi-selection, function + usages
- [ ] **Documentation generation** - Links for public APIs

---

## Phase 8: User Experience

- [ ] **Settings validation UX** (1h) - Pre-save validation, "Test Configuration" command, better error notifications
- [ ] **Settings and preferences** - Opt-in/out, format preferences, keyboard customization, exclusion patterns
- [ ] **Visual feedback** - Link in notification, preview selection, highlight target, animated transitions
- [ ] **Accessibility** - Screen reader, keyboard navigation, high contrast

---

## Phase 9: Integration & Extensions

- [ ] **VSCode API integration** - Register as link provider
- [ ] **Terminal integration** - Parse links in terminal output
- [ ] **Extension compatibility** - GitLens, Copilot
- [ ] **Workspace trust** - Handle untrusted workspaces, security warnings

---

## Phase 10: Developer Experience

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
