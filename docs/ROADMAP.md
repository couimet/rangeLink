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

**Status:** Fully implemented in Phase 5

RangeLinks in terminal output are clickable (Cmd/Ctrl+Click) and navigate to the correct location with proper selection handling (single-line, multi-line, rectangular mode).

See [Phase 5: Terminal Link Navigation](#phase-5-terminal-link-navigation---planned) for implementation details.

---

### 📋 Editor Link Navigation — HIGH PRIORITY (Planned: 2-3 hours)

**Goal:** Make RangeLinks clickable in editor text files (any file type: .md, .txt, code files, untitled/unsaved buffers).

**Use Case:** Preparing prompts for claude-code in editor scratch files. Click a RangeLink to navigate to that location without leaving the editor.

**Scope:**
- VSCode/Cursor only (first iteration)
- Any text file type (markdown, code, untitled files)
- Same navigation behavior as terminal links (proper selection, rectangular mode support)

**Implementation Approach:**

#### Iteration 1: Document Link Provider (1.5h)
- Implement `vscode.DocumentLinkProvider` for all file types
- Reuse existing `parseLink()` from core (same as terminal navigation)
- Reuse existing `handleTerminalLink()` navigation logic from Phase 5
- Register provider for all text documents (`{ scheme: '*', language: '*' }`)

**Tasks:**
- Create `src/navigation/DocumentLinkProvider.ts`
- Register in `extension.ts` activation
- Add tests for link detection in various file types
- Handle relative vs absolute paths (reuse `resolveWorkspacePath()`)

#### Iteration 2: Testing & Edge Cases (30min)
- Test in .md, .txt, code files, untitled files
- Test with workspace-relative and absolute paths
- Verify rectangular mode links work (`##` prefix)
- Test BYOD links (when parsing is available)

#### Iteration 3: Polish & Documentation (30min)
- Add hover tooltips showing target location
- Log link clicks with structured context
- Update README with editor navigation examples
- Add demo GIF showing click-to-navigate in editor

**Done When:**
- [ ] RangeLinks clickable in any editor text file
- [ ] Clicking navigates to correct location with proper selection
- [ ] Works with rectangular mode links
- [ ] Tests cover all file types and edge cases
- [ ] Documentation updated with examples

**Benefits:**
- Seamless workflow: Prepare prompts in editor, click links to verify context
- No context switching between terminal and editor for navigation
- BYOD parsing (when added) will work automatically in both terminal and editor

---

### 📋 Navigate from Clipboard/Selection — Future Enhancement

**Goal:** Command to navigate to a RangeLink from clipboard or current selection.

**Use Case:**
- Paste RangeLink in editor, select it, run command to navigate
- Copy RangeLink elsewhere, return to editor, navigate from clipboard

**Commands:**
- `RangeLink: Navigate to Link in Clipboard`
- `RangeLink: Navigate to Selected Link`

**Implementation Notes:**
- Reuse existing `parseLink()` and navigation logic
- Handle clipboard/selection text extraction
- Validate link format before attempting navigation
- Provide clear error messages for invalid links

**Status:** Captured for future implementation. Will prioritize after editor link navigation is complete.

---

## Phase 1C: BYOD Parsing — 📋 Deferred

**Objective:** Parse links with embedded delimiter metadata so teams can consume code references seamlessly regardless of delimiter configurations.

For comprehensive BYOD documentation, see [BYOD.md](./BYOD.md).

**Status:** Generation complete (v0.1.0). **Parsing deferred until after terminal navigation** (Phase 5) to deliver user value faster.

**Rationale for deferral:**

- Terminal link navigation is higher priority for user workflow (click links in terminal output)
- BYOD parsing adds complexity without immediate benefit (most users use default delimiters)
- Basic parsing with local delimiters unblocks terminal navigation feature
- BYOD parsing can be added later without breaking existing functionality

**Parsing iterations (deferred):**

- 📋 **1C.1** (1.5h): Parse metadata structure, extract delimiters, format validation
- 📋 **1C.2** (1.5h): Validate extracted delimiters (reserved chars, digits, conflicts)
- 📋 **1C.3** (2h): Recovery logic (missing delimiters, fallbacks, error UI)
- 📋 **1C.4** (1h): Rectangular mode detection with custom BYOD hash
- 📋 **1C.5** (30m): Documentation and cleanup

**When to revisit:** After Phase 5 (Terminal Link Navigation) is complete and stable.

**Format Examples:**

- Line-only: `path#L10-L20~#~L~-~`
- With columns: `path#L10C5-L20C10~#~L~-~C~`
- Rectangular Mode: `path##L10C5-L20C10~#~L~-~C~` (note double hash in range part)

For detailed format specifications, see [LINK-FORMATS.md](./LINK-FORMATS.md) and [BYOD.md](./BYOD.md).

---

## Phase 2D: Neovim Plugin Shell — 📋 Planned (1 hour)

- Create `packages/rangelink-neovim-plugin/` with basic Lua structure
- Implement one command: `:RangeLinkCopy` (calls core via Node CLI)
- Basic README and installation instructions
- **Done when:** Can install plugin and copy a basic link in Neovim

For Neovim integration details, see [neovim-integration.md](./neovim-integration.md).

---

## Phase 2E: CI/CD Pipeline — 📋 Planned (1 hour)

- Add GitHub Actions workflow
- Run tests on PR (per-package)
- Automated npm publish on tag (core package only)
- **Done when:** CI passes on PR, publishes on tag

---

## Phase 3: VSCode Marketplace Launch — 📋 Remaining Items

**Goal:** Complete remaining publishing tasks for VSCode Marketplace.

**Completed:** Developer tooling, extension icon/logo (see [JOURNEY.md](./JOURNEY.md) for details)

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

## Phase 4: Post-Publishing Enhancements — 📋 Remaining Items

**Completed:** Git tagging, CHANGELOG, release strategy, README enhancements, logo work, contributors section (see [JOURNEY.md](./JOURNEY.md) for details)

### Priority 1: Release Management & Tracking

#### 4D) GitHub Actions Release Workflow — 📋 Planned

**Goal:** Automate release tagging and GitHub release creation.

**Deferred from:** Iteration 4C (Monorepo Release Strategy Design)

**Tasks:**

- Create `.github/workflows/release.yml`
- Trigger on version tag push
- Automate GitHub release creation
- Extract changelog for release notes

**Done when:** Pushing a tag automatically creates GitHub release

---

### Priority 1.5: Extension Lifecycle & Configuration

#### 4A.2) Configuration Change Detection (30 minutes) — 🔴 Critical Bug

**Goal:** React to VSCode configuration changes without requiring window reload.

**Current Problem:** Delimiter configuration is loaded once at activation (extension.ts:165) and never updated. If user changes `rangelink.*` settings during a session, the extension continues using stale config until window reload. This is poor UX.

**VSCode API:** `vscode.workspace.onDidChangeConfiguration(event)`

**Implementation:**

1. **Register config listener in activate():**

   ```typescript
   context.subscriptions.push(
     vscode.workspace.onDidChangeConfiguration((event) => {
       if (event.affectsConfiguration('rangelink')) {
         reloadConfiguration();
       }
     }),
   );
   ```

2. **Extract reloadConfiguration() function:**
   - Reload delimiter config (call loadDelimiterConfig())
   - Recreate RangeLinkService with new delimiters
   - **🔴 CRITICAL: Recreate TerminalLinkProvider with new delimiters**
   - Log to output channel: "Configuration reloaded"
   - Show status bar notification (optional)

3. **Handle RangeLinkService recreation:**
   - Store service reference in module-level variable
   - Dispose old service (if needed)
   - Create new service with updated delimiters
   - Commands continue to work seamlessly

4. **🔴 CRITICAL: Handle TerminalLinkProvider recreation:**
   - **Location:** `extension.ts:173-178` (registered during activation)
   - **Problem:** Provider stores delimiter config in constructor and builds regex pattern once
   - **Current code:** `new RangeLinkTerminalProvider(delimiters, getLogger())`
   - **Why critical:** Pattern uses `buildLinkPattern(delimiters)` - stale pattern won't detect links with new delimiters
   - **Solution:**
     - Dispose old provider registration (store Disposable from `registerTerminalLinkProvider`)
     - Create new TerminalLinkProvider with updated delimiters
     - Re-register with `vscode.window.registerTerminalLinkProvider()`
     - Add to `context.subscriptions` for cleanup
   - **Example:**

     ```typescript
     // Store disposable at module level
     let terminalLinkProviderDisposable: vscode.Disposable;

     // On config change:
     terminalLinkProviderDisposable?.dispose();
     const newProvider = new RangeLinkTerminalProvider(newDelimiters, getLogger());
     terminalLinkProviderDisposable = vscode.window.registerTerminalLinkProvider(newProvider);
     context.subscriptions.push(terminalLinkProviderDisposable);
     ```

**Edge Cases:**

- Terminal binding persists (doesn't need recreation)
- **TerminalLinkProvider MUST be recreated** - regex pattern is built in constructor
- If invalid config, fall back to defaults and notify user
- Multiple rapid changes: debounce with 500ms delay

**Testing:**

- Change delimiter in settings → Extension uses new delimiters immediately
- Change to invalid delimiter → Falls back to defaults, shows notification
- Terminal binding survives config reload
- **TerminalLinkProvider recreation:**
  - Change delimiter from `#` to `@` → Terminal links use new `@` pattern
  - Type `echo "file.ts#L10"` → No longer detected (old pattern)
  - Type `echo "file.ts@L10"` → Now detected and clickable (new pattern)
  - Verify log shows: "RangeLinkTerminalProvider initialized with delimiter config"

**Done when:**

- User can change settings during session without window reload, extension updates immediately
- **TerminalLinkProvider detects links with new delimiters in terminal output**

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

### 4.5A) Remove Test Re-exports from extension.ts — ✅ Complete

**Completed:** 2025-11-05

**Summary:** Updated test and public API imports to use direct source file paths instead of re-exporting through extension.ts. Tests now import from actual source files for clearer dependencies.

**See [JOURNEY.md](./JOURNEY.md#phase-45a-remove-test-re-exports-from-extensionts--complete) for full details.**

---

### 4.5B) Separate Extension Config Loading from Core Validation (3-4 hours)

**ARCHITECTURAL PROBLEM:** Extension and core responsibilities are badly intertwined. Extension tests are testing core validation logic instead of extension concerns. This created technical debt including `getErrorCodeForTesting()` mapping function.

**Current Problems:**

1. **Improperly scoped tests** (`extension.test.ts` lines 1347-2635, now skipped):
   - Tests check core validation logic (digits, whitespace, reserved chars)
   - Tests check core error codes (`ERR_1002`, `ERR_1003`)
   - Should test extension behavior (config source, delimiter usage)

2. **`getErrorCodeForTesting()` is a symptom**:
   - Maps `DelimiterValidationError` → `RangeLinkMessageCode`
   - Exists because extension does validation instead of delegating to core
   - Brittle: breaks when enum values change (Phase 4.5J)

3. **`loadDelimiterConfig()` does too much** (`extension.ts` lines 67-162):
   - Calls core validation directly (`validateDelimiter()`)
   - Maps validation errors to message codes
   - Logs errors using extension's `outputChannel`
   - Should just: load config, call core, log result

**Extension Responsibilities (What SHOULD Be Tested):**

- ✅ **Config source priority**: Workspace folder > Workspace > User > Default
- ✅ **Source logging**: "Loaded from workspace folder", "Using defaults"
- ✅ **Resulting delimiters**: "Using: line='L', position='C', hash='#', range='-'"
- ❌ **NOT validation logic**: That's core's job

**Refactoring Plan:**

**Step 1: Core provides validation result with message code (1h)**

- Core's `validateDelimiter()` returns: `Result<string, RangeLinkMessageCode>`
- Eliminates `DelimiterValidationError` enum
- Core includes message code directly in error result

**Step 2: Extension delegates validation to core (1h)**

- `loadDelimiterConfig()` becomes thin wrapper:

  ```typescript
  function loadDelimiterConfig(): DelimiterConfig {
    const config = vscode.workspace.getConfiguration('rangelink');
    const userDelimiters = {
      /* ... load from config ... */
    };

    // Delegate to core for validation
    const validationResult = core.validateDelimiterConfig(userDelimiters);

    if (!validationResult.success) {
      logValidationErrors(validationResult.errors); // Just log, don't validate
      return DEFAULT_DELIMITERS;
    }

    logConfigSource(config); // Extension-specific logging
    return validationResult.value;
  }
  ```

**Step 3: Delete `getErrorCodeForTesting()` (15min)**

- No longer needed - core provides message codes directly
- Remove function and all references

**Step 4: Rewrite extension tests (1-2h)**

- Un-skip the 73 tests
- Focus on extension concerns:
  - Mock core validation (success/failure)
  - Test config source detection
  - Test logging of results
  - NOT validation logic itself

**Files Modified:**

- `packages/rangelink-core-ts/src/validation/validateDelimiter.ts` - Return message codes
- `packages/rangelink-vscode-extension/src/extension.ts` - Thin config loading
- `packages/rangelink-vscode-extension/src/__tests__/extension.test.ts` - Proper scope

**Benefits:**

- Clear separation of concerns (extension vs core)
- Tests test the right layer
- No more brittle mapping function
- Easier to maintain and extend
- Eliminates technical debt

**Done when:**

- `getErrorCodeForTesting()` deleted
- Core returns `Result<T, RangeLinkMessageCode>` for validation
- Extension delegates validation to core
- All tests pass (including un-skipped ones)
- Tests properly scoped to extension concerns

---

### 4.5C) Remove or Refactor Link Interface — ✅ Complete

**Completed:** 2025-11-05

**Summary:** Removed unused Link interface from extension.ts and index.ts. Investigation confirmed it was exported as public API but not used anywhere in the codebase - pure dead code. Removal verified by tests passing unchanged.

**See [JOURNEY.md](./JOURNEY.md#phase-45c-remove-link-interface--complete) for full details.**

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

### 4.5E) Replace outputChannel.appendLine with getLogger() (30 minutes)

**Problem:** `extension.ts` has inconsistent logging - some code uses `getLogger()` (proper abstraction) while other code uses raw `outputChannel.appendLine()` directly

**Examples of raw outputChannel usage:**

- `loadDelimiterConfig()` function (lines 151-160 and throughout)
- Other config loading/validation code

**Why it's wrong:**

- Logger is initialized BEFORE these functions run (no lifecycle issue)
- Bypasses the structured logging abstraction (`getLogger()` from core)
- Inconsistent with rest of codebase
- Makes code harder to test (implicit dependency on module-level variable)

**Goal:** All logging should go through `getLogger()` for consistency

**Changes:**

- Replace all `outputChannel.appendLine()` calls with `getLogger().info()` / `.warn()` / `.error()`
- Ensure structured logging format is maintained
- Update any tests that mock `outputChannel` directly

**Done when:**

- No direct `outputChannel.appendLine()` calls remain in `extension.ts`
- All logging goes through `getLogger()` abstraction
- All tests pass

---

### 4.5F) Extract Command Registration from activate() Function (30 minutes)

**Problem:** The `activate()` function is 90 lines long with 60+ lines of inline command registration. This creates:

- Poor testability (can't test command registration separately)
- High coupling (activate does setup + registration + logging)
- Poor scoping (7 commands registered inline with duplicated patterns)

**Current structure:**

```typescript
export function activate(context: vscode.ExtensionContext): void {
  // Setup (lines 174-182)
  outputChannel = ...
  setLogger(...)
  const service = ...
  const terminalBindingManager = ...

  // Command registration (lines 184-244) - 60 lines inline!
  context.subscriptions.push(vscode.commands.registerCommand(...))
  context.subscriptions.push(vscode.commands.registerCommand(...))
  context.subscriptions.push(vscode.commands.registerCommand(...))
  // ... 7 total commands

  // Activation logging (lines 246-261)
  getLogger().info(...)
}
```

**Target structure:**

```typescript
export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('RangeLink');
  setLogger(new VSCodeLogger(outputChannel));

  const delimiters = loadDelimiterConfig();
  const terminalBindingManager = new TerminalBindingManager(context);
  const service = new RangeLinkService(delimiters, terminalBindingManager);

  registerCommands(context, service, terminalBindingManager);

  logActivation();
}

function registerCommands(
  context: vscode.ExtensionContext,
  service: RangeLinkService,
  terminalBindingManager: TerminalBindingManager,
): void {
  // All command registration logic here
  // Can be tested separately
  // Clear function boundary
}

function logActivation(): void {
  // Activation logging logic
}
```

**Benefits:**

- ✅ Activate function becomes ~15 lines (setup → register → log)
- ✅ Command registration testable in isolation
- ✅ Clear separation of concerns
- ✅ Easier to add new commands
- ✅ Reduced coupling

**Changes:**

- Create `registerCommands()` helper function
- Create `logActivation()` helper function
- Update `activate()` to call helpers
- Consider: Move helpers to separate file (`src/commands.ts`) if they grow

**Done when:**

- `activate()` function is ~15 lines
- Command registration extracted to `registerCommands()`
- All tests pass

---

### 4.5G) Fix TerminalBindingManager Resource Leak — ✅ Complete

**Completed:** 2025-11-05

**Summary:** Fixed resource leak by adding `context.subscriptions.push(terminalBindingManager)` to ensure VSCode automatically calls `dispose()` on deactivation. Terminal close event listeners are now properly cleaned up.

**See [JOURNEY.md](./JOURNEY.md#phase-45g-fix-terminalbindingmanager-resource-leak--complete) for full details.**

---

### 4.5H) Extract RangeLinkService Tests to Separate File (45 minutes)

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

### 4.5I) Eliminate CONFIG_UNKNOWN Catch-All Error Code (1 hour)

**Problem:** `CONFIG_UNKNOWN = 'CONFIG_UNKNOWN'` is a catch-all error code that defeats the purpose of descriptive error handling.

**Why this is tech debt:**

- Catch-all codes make debugging difficult - you can't tell what actually went wrong
- When someone sees `CONFIG_UNKNOWN` in logs, they have no context
- Goes against our architectural principle: "descriptive values provide immediate context"
- Forces developers to read full error messages instead of recognizing the error by code

**Root cause:** Defensive programming without identifying all specific error cases upfront.

**Goal:** Replace `CONFIG_UNKNOWN` with specific error codes for each actual failure scenario.

**Investigation needed:**

- Audit all code paths that could throw `CONFIG_UNKNOWN`
- Identify distinct error scenarios (e.g., `CONFIG_VALIDATION_FAILED`, `CONFIG_PARSE_ERROR`, `CONFIG_UNSUPPORTED_VALUE`)
- Create specific error codes with clear names
- Update error handling to use specific codes

**Changes:**

- Analyze usage of `CONFIG_UNKNOWN` in codebase
- Define specific error codes for each scenario
- Update `RangeLinkErrorCodes` enum with new codes
- Replace all `CONFIG_UNKNOWN` throws with specific codes
- Remove `CONFIG_UNKNOWN` from enum
- Update tests to expect specific error codes
- Update documentation

**Done when:**

- `CONFIG_UNKNOWN` deleted from `RangeLinkErrorCodes`
- All error scenarios have descriptive, specific error codes
- Tests verify specific error codes (not catch-all)
- Error logs provide immediate clarity about what went wrong

**Reference:** See `SharedErrorCodes` pattern - even generic codes like `VALIDATION` are more specific than "UNKNOWN".

---

### 4.5J) Convert RangeLinkMessageCode to Descriptive Values — ✅ Complete

**Completed:** 2025-11-05

**Summary:** Converted `RangeLinkMessageCode` from numeric values (MSG*1001) to descriptive values matching keys exactly (CONFIG_LOADED). Removed 11 obsolete SELECTION*\* codes, organized by human-readable categories (CONFIG, BYOD), and updated VSCode extension references. Coverage insight: enum will achieve natural test coverage when i18n is implemented via `Record<RangeLinkMessageCode, string>` translation maps.

**See [JOURNEY.md](./JOURNEY.md#phase-45j-convert-rangelinkmessagecode-to-descriptive-values--complete) for full details.**

---

### 4.5K) Logger Verification Feature (debug + pingLog) — ✅ Complete

**Completed:** 2025-11-05

**Summary:** Added automatic logger initialization verification via setLogger() calling debug(), and created standalone pingLog() function to exercise all 4 logger levels. Logger interface stays clean - pingLog() is a standalone function that doesn't add methods to the interface. VSCodeLogger achieves 100% test coverage.

**See [JOURNEY.md](./JOURNEY.md#phase-45k-logger-verification-feature-debug--pinglog--complete) for full details.**

---

### 4.5L) Consolidate Extension Types to Standalone Modules (1-2 hours) — 📋 Planned

**Goal:** Organize all TypeScript types/interfaces in the extension package following core's pattern (standalone type files in `types/` folder with index.ts re-exports).

**Current State:**

- ✅ `RangeLinkTerminalLink` already moved to `types/` folder (Phase 5 Iteration 3.1 Subset 4)
- ❌ Other types scattered across source files

**Why This Matters:**

- Consistency with core architecture
- Better separation of concerns (types vs implementation)
- Easier imports and reusability
- Clear API surface

**Implementation:**

1. **Identify all interfaces/types in extension** (~15 min)
   - Audit `src/` files for type definitions
   - Document which types should be extracted
   - Note any types that should stay co-located with implementations

2. **Create standalone type files** (~30-45 min)
   - Move each type to `src/types/TypeName.ts`
   - Add comprehensive JSDoc comments
   - Follow core's naming and documentation patterns

3. **Update `src/types/index.ts`** (~15 min)
   - Add exports for all new types
   - Maintain alphabetical order

4. **Update imports across extension** (~30 min)
   - Replace inline type imports with `from '../types'`
   - Verify all files compile
   - Check for any circular dependencies

5. **Tests and verification** (~15 min)
   - Run full test suite
   - Verify extension compiles and runs
   - Check manual functionality

**Done When:**

- [ ] All reusable types moved to `types/` folder
- [ ] All source files updated to import from `types/`
- [ ] Extension compiles with no errors
- [ ] All tests passing
- [ ] Documentation updated

**Deferred to:** After Phase 5 completion (post-terminal navigation feature)

---

## Phase 4.6: Go-To-Market Readiness — 📋 High Priority

Critical items for marketplace launch and user adoption. These should be tackled soon to improve user experience and reduce friction.

### 4.6A) Keybinding Conflict Detection — 🪦 Abandoned

**Status:** Abandoned due to fundamental VSCode API limitations.

**Why abandoned:** VSCode does not expose APIs to programmatically detect keybinding conflicts. GitHub issue #162433 requesting this capability was closed as "not planned". Implementation would show warnings without actual detection, creating noise rather than value.

**See:** [CEMETERY.md](./CEMETERY.md#phase-46a-keybinding-conflict-awareness-notification-abandoned-2025-01-04) for full implementation, rationale, and lessons learned.

**Alternative:** Document keybinding conflicts in README with manual resolution steps.

---

### 4.6B) Cross-File Context Positioning — ✅ Complete

**Goal:** Highlight RangeLink's cross-file context advantage vs built-in claude-code extension.

**Problem:** Built-in claude-code extension only supports single selection from current file. RangeLink lets you generate multiple links from different files and paste all in one prompt for richer context.

**What was done:**

**VSCode Extension README:**

- Added: "🔗 **Cross-file context** — Generate links from multiple files, paste all in one prompt. Built-in claude-code: single selection, current file only."

**Root README:**

- Updated: "🤖 **AI assistants** — Multi-file context in one prompt. Generate RangeLinks from auth.ts, tests.ts, config.ts — paste all. Built-in claude-code: single selection, current file only."

**Messaging:** Direct comparison with practical workflow example. Technical, concise, no fluff.

---

## Phase 5: Terminal Link Navigation — 📋 Planned

**Goal:** Make RangeLinks in terminal output clickable (Cmd+Click to navigate)

**Total Time:** ~4.5 hours (1 prerequisite + 7 micro-iterations)

**Why This Matters:** Completes the AI workflow loop:

1. Generate link → Terminal binding sends to claude-code
2. claude-code responds with code reference
3. **Click link in terminal → Jump to code** ← THIS

---

### Iteration 1: Link Parser (PREREQUISITE - 1.5h) — ✅ Complete

**Completed:** 2025-11-05 (see [JOURNEY.md](./JOURNEY.md#iteration-1-link-parser-with-custom-delimiter-support--complete) for full details)

**Summary:** Added custom delimiter support to parseLink(). Parser now accepts optional DelimiterConfig parameter and dynamically builds regex patterns. Supports single/multi-character delimiters, rectangular mode, and special regex characters. 43 tests passing, 100% coverage maintained.

**Key Changes:**

- parseLink() signature: added optional `delimiters` parameter
- Dynamic regex pattern building with proper escaping
- Multi-character hash delimiter support (e.g., ">>", "HASH")
- 7 new test cases for custom delimiter scenarios

**Next:** Iteration 3.1 (Terminal Link Provider - Pattern Detection)

---

### Iteration 1.1: Structured Error Handling for Parsing — ✅ Complete

**Completed:** 2025-11-05 (see [JOURNEY.md](./JOURNEY.md#iteration-11-structured-error-handling--complete) for full details)

**Summary:** Replaced string errors with rich RangeLinkError objects containing codes, messages, functionName, and contextual details. Went beyond original plan by implementing full RangeLinkError (better than just codes) with debugging-friendly details like `{ received, minimum }` for validation errors.

**Key Changes:**

- Added 8 parsing error codes: PARSE_EMPTY_LINK, PARSE_NO_HASH_SEPARATOR, PARSE_EMPTY_PATH, PARSE_INVALID_RANGE_FORMAT, PARSE_LINE_BELOW_MINIMUM, PARSE_LINE_BACKWARD, PARSE_CHAR_BELOW_MINIMUM, PARSE_CHAR_BACKWARD_SAME_LINE
- Updated parseLink signature: `Result<ParsedLink, RangeLinkError>`
- All errors include rich context (received/minimum values, delimiter info, etc.)
- All 43 tests updated to use `.toBeRangeLinkError()` matcher
- 100% test coverage maintained

**Next:** Iteration 3.1 (Terminal Link Provider - Pattern Detection)

---

### Iteration 1.2: Richer ParsedLink Interface (30 min) — 📋 Planned

**Goal:** Return full metadata to match FormattedLink structure (symmetry between generation and parsing).

**Current limitation:** `ParsedLink` only returns path, start/end positions, and linkType. Missing delimiter config, range format, selection type, computed selection.

**What to do:**

1. Create enhanced `ParsedLink` interface:

```typescript
export interface ParsedLink {
  /**
   * File path extracted from link
   */
  path: string;

  /**
   * Delimiter configuration used/detected in the link
   */
  delimiters: DelimiterConfig;

  /**
   * Computed selection with normalized coordinates
   */
  computedSelection: ComputedSelection;

  /**
   * Range format detected (LineOnly or WithPositions)
   */
  rangeFormat: RangeFormat;

  /**
   * Selection type (Normal or Rectangular)
   */
  selectionType: SelectionType;

  /**
   * Link type (Regular or Portable)
   */
  linkType: LinkType;
}
```

2. Update `parseLink` to construct `ComputedSelection`:

```typescript
const computedSelection: ComputedSelection = {
  startLine: startLine,
  endLine: endLine,
  startPosition: startChar,
  endPosition: endChar,
  rangeFormat: startChar !== undefined ? RangeFormat.WithPositions : RangeFormat.LineOnly,
  selectionType: linkType === 'Rectangular' ? SelectionType.Rectangular : SelectionType.Normal,
};
```

3. Update all tests to expect richer interface

**Benefits:**

- Symmetry with `FormattedLink` (generation ↔ parsing)
- Enables round-trip testing (generate → parse → generate)
- Provides full context for navigation and validation

**Done when:**

- `ParsedLink` includes all metadata fields
- Tests validate complete parsed structure
- 100% coverage maintained

---

### Iteration 1.3: DelimiterConfig Support (1 hour) — 📋 Planned

**Goal:** Accept DelimiterConfig parameter to parse links with custom delimiters.

**Current limitation:** Parser hardcodes `#`, `L`, `C`, `-` delimiters.

**What to do:**

1. Add `delimiters` parameter to `parseLink`:

```typescript
export const parseLink = (
  link: string,
  delimiters: DelimiterConfig = DEFAULT_DELIMITERS,
): Result<ParsedLink, RangeLinkMessageCode> => {
  // Use delimiters.hash, delimiters.line, delimiters.position, delimiters.range
};
```

2. Update regex pattern to use delimiter config:
   - Extract path using `delimiters.hash` (single or multi-char)
   - Detect rectangular mode: `delimiters.hash` repeated twice
   - Parse range using `delimiters.line`, `delimiters.position`, `delimiters.range`

3. Example with custom delimiters:

```typescript
const customDelimiters = { hash: '@', line: 'line', position: 'col', range: '..' };
parseLink('file.ts@line10col5..line20col10', customDelimiters);
// Should parse correctly
```

**Key challenges:**

- Multi-character delimiter support (e.g., `hash: "##"` for regular links)
- Regex escaping for special characters
- Rectangular mode detection with custom hash delimiter

**Tests:**

- Parse with default delimiters (existing tests pass)
- Parse with single-character custom delimiters
- Parse with multi-character custom delimiters
- Rectangular mode with custom hash delimiter
- Edge case: `delimHash="#"` regular vs `delimHash="##"` (rectangular uses 4 hashes)

**Done when:**

- Parser accepts optional `DelimiterConfig` parameter
- All delimiter characters are configurable
- Tests cover default and custom delimiter scenarios
- 100% coverage maintained

---

### Iteration 1.4: Round-Trip Integration Tests (1 hour) — 📋 Planned

**Goal:** Verify parsing and generation are inverses of each other (round-trip integrity).

**What to do:**

1. Create `src/__tests__/integration/roundTrip.test.ts`:

```typescript
describe('Round-trip integration', () => {
  describe('Generate → Parse → Generate', () => {
    it('should produce identical link for single-line selection', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 0,
            endLine: 10,
            endCharacter: 0,
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      // Generate
      const formatted = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);
      expect(formatted.success).toBe(true);
      const originalLink = formatted.value.link;

      // Parse
      const parsed = parseLink(originalLink, DEFAULT_DELIMITERS);
      expect(parsed.success).toBe(true);

      // Regenerate from parsed data
      const regenerated = formatLink(
        parsed.value.path,
        toInputSelection(parsed.value.computedSelection),
        parsed.value.delimiters,
      );

      expect(regenerated.value.link).toStrictEqual(originalLink);
    });
  });

  describe('Parse → Generate → Parse', () => {
    it('should produce identical parsed structure', () => {
      const originalLink = 'src/auth.ts#L42C10-L58C25';

      // Parse
      const parsed1 = parseLink(originalLink);
      expect(parsed1.success).toBe(true);

      // Generate
      const formatted = formatLink(
        parsed1.value.path,
        toInputSelection(parsed1.value.computedSelection),
        parsed1.value.delimiters,
      );

      // Re-parse
      const parsed2 = parseLink(formatted.value.link);

      expect(parsed2.value).toStrictEqual(parsed1.value);
    });
  });
});
```

2. Test all formats:
   - Single-line (`#L10`)
   - Multi-line (`#L10-L20`)
   - With columns (`#L10C5-L20C10`)
   - Rectangular (`##L10C5-L20C10`)
   - Custom delimiters
   - BYOD links (when supported)

3. Create helper: `toInputSelection(computedSelection: ComputedSelection): InputSelection`

**Edge cases to test:**

- Line-only vs with-positions round-trip
- Rectangular mode preservation
- Custom delimiter round-trip
- Zero-indexed to one-indexed conversion correctness

**Done when:**

- Generate → Parse → Generate preserves original link
- Parse → Generate → Parse preserves parsed structure
- All link formats tested
- Custom delimiters tested
- Tests pass with 100% reliability

---

### Iteration 3.1: Terminal Link Provider — In Progress (Subsets 1-5 Complete)

**Started:** 2025-11-05 (see [JOURNEY.md](./JOURNEY.md#phase-5-iteration-31-terminal-link-provider) for full details)

**Completed Subsets:**

**Subset 1: Pattern Builder Foundation** — ✅ Complete

- Created `buildLinkPattern()` utility that generates RegExp patterns for detecting RangeLinks
- Supports custom delimiters, hash-in-filename, multiple links per line
- Hybrid strategy: non-greedy for single-char hash, negative lookahead for multi-char
- 35 tests, 100% coverage
- Manual testing verified with 8 realistic terminal scenarios

**Subset 2: Terminal Link Provider Skeleton + Detection** — ✅ Complete

- Implemented `RangeLinkTerminalProvider` class with dependency injection
- **Link detection fully implemented** - Uses `buildLinkPattern()` with `pattern.matchAll()`
- Links are clickable in terminal output with proper tooltips
- Shows info message on click (navigation comes in Subset 5)
- Proper structured logging with LoggingContext
- Registered in extension.ts activation
- **Note:** Subset 3 merged into Subset 2 - detection was implemented as part of provider

**Subset 4: Link Validation & Parsing** — ✅ Complete

**Core Features:**

- Parse detected links using `parseLink()` from core
- Store `ParsedLink` data in `RangeLinkTerminalLink.parsed` field
- Enhanced tooltips show parsed path and FULL RANGE (platform-aware)
  - Shows `10-20` not just `10` - highlights value prop immediately!
- Parse failures handled gracefully (still clickable, warning message)
- Logging shows parse success/failure counts with full error details
- Info messages display formatted parsed data

**Architectural Improvements:**

- Moved `RangeLinkTerminalLink` to `src/types/` folder (follows core's pattern)
- Extracted `formatLinkPosition()` utility (position range formatting)
- Extracted `formatLinkTooltip()` utility (platform-aware tooltip generation)
- Created `getPlatformModifierKey()` utility (Cmd on macOS, Ctrl on Windows/Linux)
- All presentation logic testable in isolation
- 100% test coverage for all new utilities (34 tests)

**Subset 5: Link Handler Implementation** — ✅ Complete

- Implemented full file opening and navigation in `handleTerminalLink()`
- Created `resolveWorkspacePath()` utility (workspace-relative and absolute paths)
- Created `convertRangeLinkPosition()` utility (coordinate conversion + clamping)
- All selection types: single position, ranges, rectangular mode (multi-cursor)
- Comprehensive error handling (file not found, open failures, invalid positions)
- 35 tests for utilities (12 path resolution + 23 coordinate conversion), 100% coverage
- Total: 135 tests passing (7 test suites)

**Remaining Subsets:**

- ~~Subset 3: Link Detection Implementation~~ — ✅ Complete (merged into Subset 2)
- ~~Subset 4: Link Validation & Parsing~~ — ✅ Complete
- ~~Subset 5: Link Handler Implementation~~ — ✅ Complete
- Subset 6: Configuration Integration (30 min) — **NEXT**

**Future UX Enhancement (deferred):**

- **Subset 7: Rectangular Mode Tooltip Indicator** (15 min) — 📋 Planned
  - **Goal:** Indicate rectangular mode in tooltips to highlight unique feature
  - **Current:** `Open data.csv:10:5-20:10 (Cmd+Click)` - no indication of rectangular mode
  - **Options:**
    - `Open data.csv:10:5-20:10 [Block] (Cmd+Click)`
    - `Open data.csv:10:5-20:10 (column) (Cmd+Click)`
    - `Select column data.csv:10:5-20:10 (Cmd+Click)`
  - **Implementation:** Update `formatLinkTooltip()` to check `parsed.selectionType === 'Rectangular'`
  - **When:** After Subset 6, if tooltip space allows without overwhelming users
  - **Rationale:** Shows RangeLink's unique rectangular selection capability vs built-in features

---

### Iteration 3.2: Terminal Link Provider Registration (20 min)

**File:** `packages/rangelink-vscode-extension/src/navigation/TerminalLinkProvider.ts`

**What:** Minimal provider that detects links but doesn't navigate yet

**Implementation:**

```typescript
export class RangeLinkTerminalProvider implements vscode.TerminalLinkProvider {
  provideTerminalLinks(
    context: vscode.TerminalLinkContext,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<RangeLinkTerminalLink[]> {
    const line = context.line;
    const matches = detectRangeLinkPatterns(line); // From 3.1

    return matches.map((match) => ({
      startIndex: match.start,
      length: match.end - match.start,
      tooltip: 'Open in editor',
      data: match.text, // Full link text
    }));
  }

  handleTerminalLink(link: RangeLinkTerminalLink): void {
    // Log for now - navigation comes in 3.4
    getLogger().info({ link: link.data }, 'Terminal link clicked');
    vscode.window.showInformationMessage(`Clicked: ${link.data}`);
  }
}
```

**Register in `extension.ts`:**

```typescript
context.subscriptions.push(
  vscode.window.registerTerminalLinkProvider(new RangeLinkTerminalProvider()),
);
```

**Done when:**

- Links appear in terminal (underlined/hoverable)
- Click shows info message
- No navigation yet (that's next!)

---

### Iteration 3.3: Path Resolution (30 min)

**File:** `packages/rangelink-vscode-extension/src/navigation/pathResolver.ts`

**What:** Given a path from link, resolve to actual file URI

**Complexity:**

- Workspace-relative: `src/file.ts` → `/Users/name/project/src/file.ts`
- Already absolute: `/Users/name/project/src/file.ts` → use as-is
- Multi-folder workspace: which folder?
- File doesn't exist: error handling

**Tests:**

- ✅ Absolute paths resolve correctly
- ✅ Workspace-relative paths resolve
- ✅ Multi-folder workspace (tries each)
- ✅ File not found returns null
- ✅ No workspace open returns null

**Done when:** Path resolution works for all scenarios with tests

---

### Iteration 3.4: Basic Navigation (Single Line) (20 min)

**File:** Update `TerminalLinkProvider.handleTerminalLink()`

**What:** Navigate to file and select range (single-line only for now)

**Tests:**

- ✅ Opens file
- ✅ Selects correct line
- ✅ Reveals in viewport
- ✅ Error handling (file not found, invalid link)

**Done when:** Can click `src/file.ts#L10` and jump to line 10

---

### Iteration 3.5: Multi-Line & Column Precision (20 min)

**What:** Support multi-line ranges and column precision

**Tests:**

- ✅ `#L10-L20` selects lines 10-20
- ✅ `#L10C5-L20C15` selects with column precision
- ✅ `#L10` selects single line
- ✅ Edge cases (end of file, long lines)

**Done when:** All link formats navigate correctly (except rectangular)

---

### Iteration 3.6: Rectangular Mode Support (30 min)

**What:** Detect double hash, create multiple cursors for rectangular selection

**Challenge:** VSCode doesn't have native "rectangular selection" API. Need to create multiple cursors.

**Tests:**

- ✅ `##L10C5-L20C10` creates multi-cursor
- ✅ Each line selected from column 5 to 10
- ✅ Viewport shows first selection

**Done when:** Rectangular links create proper multi-cursor selection

---

### Iteration 3.7: Error Handling & Polish (20 min)

**What:** Comprehensive error handling and user feedback

**Error scenarios:**

1. File not found
2. Invalid link format
3. Line out of range (clamp to document bounds)
4. Column out of range (clamp to line length)

**Logging:**

- All navigation attempts (success/failure)
- User actions (which links clicked)
- Performance (time to open file)

**Done when:**

- Robust error handling
- Clear user feedback
- Comprehensive logging

---

### Testing Strategy

**Unit Tests:**

- Pattern detection (3.1)
- Path resolution (3.3)
- Selection creation logic

**Integration Tests:**

- Mock terminal context
- Mock file system
- Verify end-to-end flow

**Manual Testing Checklist:**

- [ ] Generate link with terminal binding
- [ ] claude-code prints link in response
- [ ] Link is underlined/hoverable
- [ ] Cmd+Click navigates to correct location
- [ ] Works with relative paths
- [ ] Works with absolute paths
- [ ] Works with multi-line ranges
- [ ] Works with column precision
- [ ] Works with rectangular mode
- [ ] Error messages are clear
- [ ] File not found handled gracefully

---

### Feature Creep Prevention 🚧

**NOT in these iterations:**

❌ BYOD link parsing (defer to Phase 1C)
❌ Link preview on hover (future enhancement)
❌ Configurable link patterns (future enhancement)
❌ History of clicked links (cemetery resident - see [CEMETERY.md](./CEMETERY.md))
❌ Link validation before navigation (nice-to-have)

**Stay focused:** Detect → Parse → Resolve → Navigate. That's it.

---

### Deliverable

After these 8 iterations (1 prerequisite + 7 terminal link provider):

✅ **Clickable terminal links** for RangeLink output
✅ **Full format support** (single-line, multi-line, columns, rectangular)
✅ **Robust error handling** (file not found, invalid format, etc.)
✅ **Comprehensive tests** (unit + integration)
✅ **AI workflow complete** (generate → send → click → navigate)

**This is the killer feature** that makes RangeLink competitive with Cursor's AI integration.

---

## Phase 5.1: Terminal Link Navigation Bug Fixes & Improvements — 📋 Planned

**Context:** During manual testing of terminal link navigation (Phase 5 Iteration 3.1), discovered issues with line wrapping and same-position selections. These tasks address UX issues and test coverage gaps.

**Discovery:** User clicked `Hack/LICENSE.txtOM32DS11_M49DS32` but terminal wrapped it:

```
Hack/LICENSE.txtOM32DS1
1_M49DS32
```

Only first line was detected/parsed, leading to navigation to `32:1` instead of `32:11-49:32`, with no visible selection.

**Total Time:** ~2 hours (5 tasks, can be tackled independently for incremental releases)

---

### Task 1: Research VSCode Terminal Link API Multi-Line Capabilities (15 min) — 📋 Planned

**Goal:** Determine if VSCode's Terminal Link Provider API can detect links spanning multiple lines.

**Questions to Answer:**

1. Does `TerminalLinkContext` ever include multi-line content?
2. Is there a way to detect terminal line wrapping?
3. Do other VSCode extensions handle wrapped links? (search GitHub/VSCode source)
4. Can we request multi-line context from VSCode API?

**What to Do:**

- Read VSCode Terminal Link Provider API documentation
- Search VSCode source code for `TerminalLinkProvider` implementation details
- Search GitHub for extensions using `registerTerminalLinkProvider`
- Check VSCode issues for terminal link wrapping discussions
- Test with VSCode built-in terminal link detection (URLs, file paths)

**Document Findings:**

- Update JOURNEY.md with API capabilities/limitations
- If multi-line detection is impossible, document why
- If workarounds exist, document them with examples

**Done When:**

- [ ] API capabilities/limitations documented
- [ ] Findings added to JOURNEY.md
- [ ] Decision made: implement workaround OR document limitation

**Priority:** Medium (helps inform other task implementations)

**Research Findings (2025-01-05):**

Investigated VSCode v1.80's "multi-line link support" feature to determine if it solves terminal line wrapping issues.

**Key Discoveries:**

1. **`TerminalLinkContext` Provides Single Lines Only**
   - API signature: `context.line: string` (singular)
   - Called once per terminal line
   - No API to request adjacent lines or multi-line context
   - Confirmed in RangeLinkTerminalProvider.ts:70

2. **v1.80's "Multi-Line Link Support" ≠ Wrapped Link Detection**
   - v1.80 feature refers to links that **REFERENCE multi-line source ranges**, NOT links that **SPAN multiple terminal lines**
   - Example: `File 'src/cli.js', lines 15-19, characters 1-5:` (link on ONE terminal line referencing lines 15-19 in source)
   - Supported formats: Git range links (`@@ - + @@`), OCaml Dune, ESLint, Ripgrep output
   - These are all single-line terminal output that reference multi-line source code

3. **Terminal Line Wrapping is Unsolvable with Current API**
   - When terminal wraps `Hack/LICENSE.txt#L32C11_M49DS32`:
     - Line 1: `Hack/LICENSE.txtOM32DS1` (detected, incomplete)
     - Line 2: `1_M49DS32` (NOT detected - no pattern match, no context)
   - Provider never sees both lines together
   - No VSCode API to detect wrapping or request multi-line context

4. **API Design Rationale** (from GitHub issue #91290)
   - Original proposal uses `LinkHoverContext` with `line: string` (singular)
   - Documented: "files deal with ranges, the terminal doesn't"
   - Intentionally line-based, not multi-line

**Conclusion:**

- ✅ **Limitation is platform-level** - not solvable by extensions
- ✅ **Minimum version remains 1.49.0** - v1.80 doesn't add APIs we need
- ✅ **Must document limitation** - Task 4 (user-facing docs)
- ✅ **Workarounds:** Shorter delimiters, wider terminal, quote links, add newlines

**Sources:**

- VSCode v1.80 release notes: https://code.visualstudio.com/updates/v1_80
- GitHub issue #91290: Terminal Link Provider API proposal
- RangeLinkTerminalProvider.ts implementation (line 70: `context.line`)

---

### Task 2: Fix Same-Position Selection Visual Feedback (30 min) — ✅ Complete

**Goal:** Make single-position selections visible by extending them by 1 character.

**Problem:** When `startPos == endPos` (e.g., `32:1` to `32:1`), VSCode creates zero-width selection (just cursor), which is invisible. Users expect to see something highlighted.

**Example:**

- Link: `file.ts#L32C1` (single position)
- Current behavior: Cursor at line 32, column 1, nothing visible
- Desired behavior: Character at 32:1 is highlighted

**Subtasks:**

1. **Update `handleTerminalLink()` logic** (15 min)
   - Detect when `startPos.line == endPos.line && startPos.character == endPos.character`
   - Extend `endPos.character` by 1 to create 1-character selection
   - Handle edge cases:
     - End of line: don't extend beyond line length
     - Empty line: select nothing (keep cursor)
     - Single character remaining: extend by 1

2. **Add logging** (5 min)
   - Log when extending single position: `"Extended single-position selection"`
   - Include original and extended positions in log context

3. **Add tests** (10 min)
   - Test single position → extended selection
   - Test end of line (no extension beyond line length)
   - Test empty line (no selection)
   - Update existing tests if they rely on same-position behavior

**Edge Cases to Handle:**

- End of line: `startPos.character == lineLength` → don't extend
- Empty line: `lineLength == 0` → keep cursor only
- Last character in line: extend by 1 (select that character)
- Document bounds: `endPos.line == document.lineCount - 1` → no issue

**Implementation Example:**

```typescript
// After creating startPos and endPos
if (startPos.line === endPos.line && startPos.character === endPos.character) {
  // Single position - extend by 1 character for visibility
  const lineLength = document.lineAt(startPos.line).text.length;
  if (startPos.character < lineLength) {
    endPos = { line: endPos.line, character: endPos.character + 1 };
    this.logger.debug(
      {
        ...logCtx,
        originalPos: `${startPos.line + 1}:${startPos.character + 1}`,
        extendedTo: `${endPos.line + 1}:${endPos.character + 1}`,
      },
      'Extended single-position selection for visibility',
    );
  }
}
```

**Files to Modify:**

- `packages/rangelink-vscode-extension/src/navigation/RangeLinkTerminalProvider.ts`
- `packages/rangelink-vscode-extension/src/__tests__/navigation/RangeLinkTerminalProvider.test.ts`

**Done When:**

- [x] Single-position selections show 1-character highlight
- [x] Edge cases handled (end of line, empty line)
- [x] Tests cover single-position scenarios
- [x] Logging includes position extension details

**Priority:** HIGH (user-facing bug, affects usability)

**Completed:** Phase 5.1 Task 2 - Single-position terminal link selections now extend by 1 character for visibility (see JOURNEY.md for details)

**Questions:**

1. **Extension strategy:** Should we extend forward (32:1 → 32:1-32:2) or backward (32:1 → 32:0-32:1)?
   - Recommendation: Forward (matches reading direction)
2. **Empty lines:** Should we show error or just leave cursor?
   - Recommendation: Just leave cursor (user can see cursor location)
3. **Whole word extension:** Should we extend to end of word instead of 1 char?
   - Recommendation: No, keep it simple (1 char is predictable)

---

### Task 3: Audit Test Coverage for Same-Position Scenarios (45 min) — 📋 Planned

**Goal:** Ensure all parsing, formatting, and navigation modules have comprehensive tests for single-position selections.

**Problem:** Current tests may not explicitly cover `start == end` scenarios, which is a common case (single cursor position).

**Subtasks:**

1. **Audit `rangelink-core-ts` parsing tests** (10 min)
   - Check if `parseLink.test.ts` has tests for single positions
   - Expected: `file.ts#L32` and `file.ts#L32C1` scenarios
   - Add missing tests if needed
   - Verify: `start.line == end.line && start.char == end.char`

2. **Audit `formatLinkTooltip.test.ts`** (5 min)
   - Check if it formats single positions correctly
   - Expected: `"Open file.ts:32:1 • RangeLink"`
   - Test exists: ✅ Already has single position tests

3. **Audit `formatLinkPosition.test.ts`** (5 min)
   - Check if it handles `start == end` correctly
   - Expected: Returns `"32:1"` not `"32:1-32:1"`
   - Test exists: Needs verification

4. **Audit `convertRangeLinkPosition.test.ts`** (5 min)
   - Check if it converts single positions correctly
   - Expected: Same conversion logic for start/end when equal
   - Test exists: Needs verification

5. **Audit `RangeLinkTerminalProvider.test.ts`** (10 min)
   - Check if it tests navigation with single positions
   - Expected: Mock link with `start == end`, verify navigation
   - Test exists: Needs verification
   - Add test for single-position → extended selection (after Task 2)

6. **Add missing tests** (10 min)
   - For each module missing single-position tests
   - Use `.toStrictEqual()` for assertions
   - Test both with and without character position: `#L32` vs `#L32C1`

**Test Scenarios to Cover:**

- Parse: `file.ts#L32` → `{ start: {line:32}, end: {line:32} }`
- Parse: `file.ts#L32C1` → `{ start: {line:32,char:1}, end: {line:32,char:1} }`
- Format tooltip: Single position shows correctly
- Format position: Returns single position not range format
- Convert position: Handles same start/end correctly
- Navigate: Single position works (will extend after Task 2)

**Files to Check:**

- `packages/rangelink-core-ts/src/__tests__/parseLink.test.ts`
- `packages/rangelink-vscode-extension/src/__tests__/utils/formatLinkTooltip.test.ts`
- `packages/rangelink-vscode-extension/src/__tests__/utils/formatLinkPosition.test.ts`
- `packages/rangelink-vscode-extension/src/__tests__/utils/convertRangeLinkPosition.test.ts`
- `packages/rangelink-vscode-extension/src/__tests__/navigation/RangeLinkTerminalProvider.test.ts`

**Documentation:**

- List all missing tests found in commit message
- Document coverage improvement (e.g., "Added 8 tests for single-position scenarios")

**Done When:**

- [ ] All modules have explicit single-position tests
- [ ] Test coverage audit documented in commit message
- [ ] No gaps in same-position scenario coverage

**Priority:** Medium (technical debt, prevents future bugs)

---

### Task 4: Document Terminal Line Wrapping Limitation (15 min) — 📋 Planned

**Goal:** Document VSCode Terminal Link Provider API limitation in user-facing and developer documentation.

**Problem:** Terminal link detection operates per-line only. When terminal wraps long links, only the first line is detected, leading to truncated/invalid links.

**Subtasks:**

1. **Add to JOURNEY.md** (5 min)
   - Document the line wrapping discovery
   - Explain VSCode API limitation (per-line context only)
   - Include the specific example: `Hack/LICENSE.txtOM32DS11_M49DS32` wrapped

2. **Add "Known Limitations" to README** (5 min)
   - Create "Known Limitations" section in VSCode extension README
   - Explain terminal line wrapping issue
   - Provide workarounds:
     - Use shorter delimiter configurations
     - Manually rewrap terminal to avoid splitting links
     - Add quotes around links (if shell supports)

3. **Add to ARCHITECTURE.md or new doc** (5 min)
   - Document technical limitation in architecture docs
   - Explain `TerminalLinkContext` API constraint
   - Note: This is a VSCode platform limitation, not RangeLink bug

**Workarounds to Suggest:**

1. **Use shorter delimiters:**
   - Default: `#`, `L`, `C`, `-` (short)
   - Bad: `HASH`, `LINE`, `COLUMN`, `RANGE` (long, more likely to wrap)

2. **Wider terminal window:**
   - Increase terminal width to prevent wrapping
   - Use split terminal with wider pane

3. **Quote links in output:**
   - If generating links programmatically, wrap in quotes
   - Example: `"Hack/LICENSE.txt#L32C11-L49C32"` (shell-safe, less likely to wrap)
   - Note: Quotes visible but worth it for reliability

4. **Break links before path:**
   - Better: `\nHack/LICENSE.txt#L32C11-L49C32\n` (newlines before/after)
   - Terminal will wrap whole link to next line if it doesn't fit

**Files to Update:**

- `docs/JOURNEY.md` (add section to Phase 5 Iteration 3.1 findings)
- `packages/rangelink-vscode-extension/README.md` (add Known Limitations)
- `docs/ARCHITECTURE.md` or create `docs/TERMINAL-LIMITATIONS.md`

**Example Documentation:**

```markdown
## Known Limitations

### Terminal Line Wrapping

**Problem:** Long RangeLinks may be split across multiple lines when terminal wraps text.

**Cause:** VSCode's Terminal Link Provider API provides context one line at a time.
Multi-line link detection is not supported by the platform.

**Example:**
Terminal output:
```

Check this: Hack/LICENSE.txt#L32C11
-L49C32

```

Only `Hack/LICENSE.txt#L32C11` is detected (incomplete link).

**Workarounds:**
1. Use shorter delimiter configurations
2. Widen terminal window to prevent wrapping
3. Wrap links in quotes: `"file.ts#L10-L20"` (shell-safe)
4. Add newlines before links to prevent mid-link wrapping
```

**Done When:**

- [ ] Limitation documented in JOURNEY.md
- [ ] Limitation documented in extension README
- [ ] Workarounds provided for users
- [ ] Technical explanation in architecture docs

**Priority:** Low (documentation only, no code changes)

---

### Task 5: Add Link Truncation Detection Heuristic (30 min) — 📋 Planned (Optional)

**Goal:** Detect when a parsed link appears truncated and warn the user.

**Problem:** Terminal wrapping causes links to be truncated mid-parse. Clicking truncated links navigates to wrong location with no indication why.

**Heuristics to Detect Truncation:**

1. **Link ends with delimiter prefix:**
   - `Hack/LICENSE.txtOM32DS1` ends with `1` (expected digit after `DS`)
   - `file.ts#L10-` ends with `-` (expected line number after range separator)
   - `file.ts#L10C` ends with `C` (expected column number after position prefix)

2. **Path contains partial position data:**
   - Path ends with delimiter character: `file.txt#` or `file.txtO`
   - Suggests link was cut off during wrapping

3. **Incomplete range:**
   - Has start but looks cut mid-range: `#L10-` or `#L10_` (no end position)

**Subtasks:**

1. **Create truncation detector** (15 min)
   - Function: `isPossiblyTruncated(link: string, delimiters: DelimiterConfig): boolean`
   - Check if link ends with delimiter-related characters
   - Check for incomplete range patterns
   - Location: `src/utils/detectLinkTruncation.ts`

2. **Integrate into `provideTerminalLinks()`** (10 min)
   - After successful parse, check if link is possibly truncated
   - If yes, log warning with `WARN` level
   - Include: `{ linkText, possibleTruncation: true, reason: "..." }`

3. **Show warning toast (optional)** (5 min)
   - When user clicks truncated link, show warning
   - Message: "Link may be truncated due to terminal wrapping. Try rewrapping terminal."
   - Only show once per session (avoid spam)

**Implementation Example:**

```typescript
export const isPossiblyTruncated = (link: string, delimiters: DelimiterConfig): boolean => {
  // Check if ends with delimiter prefixes (incomplete)
  if (link.endsWith(delimiters.line) || link.endsWith(delimiters.position)) {
    return true;
  }

  // Check if ends with range separator (incomplete range)
  if (link.endsWith(delimiters.range)) {
    return true;
  }

  // Check if ends with incomplete digit sequence (wrapped mid-number)
  const lastChar = link[link.length - 1];
  const secondLastChar = link[link.length - 2];
  if (
    /\d/.test(lastChar) &&
    (secondLastChar === delimiters.line || secondLastChar === delimiters.position)
  ) {
    // Ends with single digit after delimiter - suspicious
    return true;
  }

  return false;
};
```

**Files to Create/Modify:**

- Create: `packages/rangelink-vscode-extension/src/utils/detectLinkTruncation.ts`
- Create: `packages/rangelink-vscode-extension/src/__tests__/utils/detectLinkTruncation.test.ts`
- Modify: `packages/rangelink-vscode-extension/src/navigation/RangeLinkTerminalProvider.ts`

**Test Cases:**

- `file.ts#L10-` → truncated (ends with range separator)
- `file.ts#L` → truncated (ends with line prefix)
- `file.ts#L10C` → truncated (ends with column prefix)
- `file.ts#L10C5` → NOT truncated (complete)
- `file.ts#L10-L20` → NOT truncated (complete range)

**Warning Message Examples:**

- Info message: "Link may be incomplete (terminal wrapping?): file.ts#L10-"
- Tooltip: "⚠️ Open file.ts:10 (link may be truncated)"
- Toast: "Navigated to file.ts:10 (link appears truncated - check terminal wrapping)"

**Done When:**

- [ ] Truncation detector implemented and tested
- [ ] Warning logged when truncation detected
- [ ] User sees indication of possible truncation
- [ ] Tests cover truncation detection heuristics

**Priority:** Low (nice-to-have, doesn't fix underlying issue)

**Questions:**

1. **Show toast or just log?**
   - Option A: Just log at WARN level (less intrusive)
   - Option B: Show warning toast once (more visible)
   - Recommendation: Option A (log only) - avoid alert fatigue

2. **Heuristics accuracy?**
   - May have false positives (link legitimately ends with delimiter)
   - Example: `config#L10` where filename is `config#L10` (rare)
   - Recommendation: Accept false positives, use "may be" language

3. **Worth implementing?**
   - Doesn't fix the issue (API limitation)
   - Helps debugging but adds complexity
   - Recommendation: Defer unless users frequently report this issue

---

## Phase 5.2: Configuration Integration — 📋 Planned

**Note:** This was originally "Phase 5 Iteration 3.1 Subset 6" but being promoted to its own phase section for clarity.

**Goal:** Integrate terminal link provider with Phase 4A.2 configuration change detection.

**Time:** 30 minutes

**Implementation:**

- Terminal provider needs to rebuild pattern when delimiter config changes
- Listen to config change events from Phase 4A.2
- Recreate `RangeLinkTerminalProvider` with new delimiters
- Re-register provider (dispose old, register new)

**Done When:**

- [ ] Config changes update terminal link detection
- [ ] Tests verify pattern rebuilding
- [ ] No stale patterns after config change

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
  - Auto-focus terminal after pasting link: Automatically set focus to bound terminal after link is pasted
    - Improves workflow: Generate link → terminal focused → continue typing immediately
    - Setting: `rangelink.terminalBinding.autoFocusAfterPaste`: Enable auto-focus (default: true)
  - Auto-append space after link: Automatically add trailing space after pasting link to bound terminal
    - Improves workflow: Generate link with space → keep typing without manual space insertion
    - Setting: `rangelink.terminalBinding.appendSpaceAfterPaste`: Enable auto-space (default: true)
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

- [ ] **Settings validation and UX improvements** (1 hour)
  - **Pre-save validation:** Improve JSON Schema in package.json to catch invalid delimiters before save
    - Add pattern constraints for delimiters (no digits, no reserved chars)
    - Custom error messages in settings UI
  - **"Test Configuration" command:** Allow users to validate settings before applying
    - Command: "RangeLink: Validate Settings"
    - Shows validation result in notification
    - Lists any conflicts or invalid values
    - Suggests fixes
  - **Better error notifications:** When validation fails on load
    - Current: Errors only in output channel (users miss them)
    - Improved: Show error notification with "View Details" button
    - Include specific field name and reason
  - **Live validation feedback:** In settings editor (if VSCode API supports)
    - Show checkmark/warning icon next to each setting
    - Instant feedback as user types

- [ ] **Settings and preferences**
  - Opt-in/opt-out for portable link generation
  - Toggle rectangular mode auto-detection
  - Preferred link format (relative vs absolute)
  - Keyboard shortcut customization for all commands
  - Exclude certain file patterns from link generation
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

- [ ] **README logo and hero layout improvement**
  - Improve visual presentation of logo to blend better with header/hero section
  - Inspired by [awesome-readme examples](https://github.com/matiassingers/awesome-readme/blob/master/readme.md)
  - Apply to both root README.md and extension's README.md
  - Goal: More polished, professional visual appearance with better logo integration
  - Low priority, polish item for future refinement

---

## Related Documentation

- [JOURNEY.md](./JOURNEY.md) - Completed work, decisions, and milestones
- [CEMETERY.md](./CEMETERY.md) - Rejected features and why
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Monorepo structure and core architecture
- [LINK-FORMATS.md](./LINK-FORMATS.md) - Comprehensive link notation guide
- [BYOD.md](./BYOD.md) - Portable links (Bring Your Own Delimiters)
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Error codes and validation rules
- [LOGGING.md](./LOGGING.md) - Structured logging approach
- [neovim-integration.md](./neovim-integration.md) - Neovim plugin integration options
