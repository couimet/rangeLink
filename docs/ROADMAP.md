# RangeLink Roadmap

_Future development plans and in-progress work._

> **Looking for completed work?** See [JOURNEY.md](./JOURNEY.md)
>
> **Looking for rejected features?** See [CEMETERY.md](./CEMETERY.md)

---

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

## Phase 1C: BYOD Parsing — 📋 Planned

**Objective:** Parse links with embedded delimiter metadata so teams can consume code references seamlessly regardless of delimiter configurations.

For comprehensive BYOD documentation, see [BYOD.md](./BYOD.md).

**Status:** Generation complete, parsing split into focused micro-iterations:

- 📋 **1C.1** (1.5h): Parse metadata structure, extract delimiters, format validation
- 📋 **1C.2** (1.5h): Validate extracted delimiters (reserved chars, digits, conflicts)
- 📋 **1C.3** (2h): Recovery logic (missing delimiters, fallbacks, error UI)
- 📋 **1C.4** (1h): Rectangular mode detection with custom BYOD hash
- 📋 **1C.5** (30m): Documentation and cleanup

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

### 4.5G) Fix TerminalBindingManager Resource Leak (5 minutes) 🐛

**Problem:** `TerminalBindingManager` has a `dispose()` method but it's never called - **resource leak!**

**Root cause:**

- `terminalBindingManager` created as local variable in `activate()`
- Never added to `context.subscriptions`
- `deactivate()` has no reference to clean it up
- Terminal close event listener never disposed

**Current code:**

```typescript
export function activate(context: vscode.ExtensionContext): void {
  const terminalBindingManager = new TerminalBindingManager(context);
  // ← Not added to context.subscriptions!
}

export function deactivate(): void {
  // Cleanup if needed  ← Can't access terminalBindingManager
}
```

**Fix:**

```typescript
export function activate(context: vscode.ExtensionContext): void {
  const terminalBindingManager = new TerminalBindingManager(context);
  context.subscriptions.push(terminalBindingManager); // ← Add this line!
  // VSCode will auto-call dispose() on deactivation
}

export function deactivate(): void {
  // VSCode automatically disposes all items in context.subscriptions
  // No manual cleanup needed
}
```

**Changes:**

- Add `context.subscriptions.push(terminalBindingManager)` in `activate()`
- Document that VSCode handles cleanup automatically
- Consider: Remove empty `deactivate()` function (optional, but it's valid to keep it)

**Done when:** `terminalBindingManager.dispose()` is called when extension deactivates

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

## Phase 4.6: Go-To-Market Readiness — 📋 High Priority

Critical items for marketplace launch and user adoption. These should be tackled soon to improve user experience and reduce friction.

### 4.6A) Keybinding Conflict Detection — 🪦 Abandoned

**Status:** Abandoned due to fundamental VSCode API limitations.

**Why abandoned:** VSCode does not expose APIs to programmatically detect keybinding conflicts. GitHub issue #162433 requesting this capability was closed as "not planned". Implementation would show warnings without actual detection, creating noise rather than value.

**See:** [CEMETERY.md](./CEMETERY.md#phase-46a-keybinding-conflict-awareness-notification-abandoned-2025-01-04) for full implementation, rationale, and lessons learned.

**Alternative:** Document keybinding conflicts in README with manual resolution steps.

---

### 4.6B) Multi-Selection Differentiator (README Update) (30 min) — 📋 High Priority

**Goal:** Highlight that RangeLink supports multiple selections, unlike claude-code extension.

**Problem:** Claude Code extension (built into IDE) only supports **single selection** at a time. RangeLink allows sending **multiple selections** to AI assistants simultaneously — a major differentiator that's not clearly communicated.

**What to update:**

1. **packages/rangelink-vscode-extension/README.md** - Add to "Why RangeLink?" section:

```markdown
### Why RangeLink?

**Multi-Selection Support**

The Claude Code extension in your IDE is limited to a **single selection** at a time. With RangeLink, you can:

- Select multiple code snippets from different parts of your file
- Select across multiple files
- Send all selections to your AI assistant in one link
- Provide richer context for AI-assisted development

**Example:**

Instead of copying/pasting 3 separate snippets, generate one RangeLink with:

- Function definition (`#L10-L25`)
- Test case (`#L50-L75`)
- Error handling (`#L100-L120`)

Your AI assistant sees the full picture.
```

2. **Root README.md** - Add similar messaging to "AI-Assisted Development" section

3. **Marketplace description** - Include "Multi-selection support" in feature list

**Benefits to highlight:**

- ✅ Multiple selections in single link
- ✅ Cross-file context sharing
- ✅ Richer AI context = better suggestions
- ✅ Fewer copy-paste cycles
- ✅ Works with any AI assistant (claude-code, ChatGPT, etc.)

**Done when:**

- README clearly states multi-selection advantage
- Comparison with claude-code extension is explicit
- Examples show practical multi-selection use cases
- Marketplace listing updated

---

### 4.6C) Enrich Selection Type with Position Interface (1 hour) — 📋 Technical Improvement

**Goal:** Evaluate using `Position` interface (from parsing) to improve `Selection` type ergonomics.

**Current state:**

`Selection` interface (packages/rangelink-core-ts/src/types/Selection.ts#L42-L45):

```typescript
export interface Selection {
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;
  readonly coverage: SelectionCoverage;
}
```

`Position` interface (packages/rangelink-core-ts/src/types/Position.ts):

```typescript
export interface Position {
  line: number;
  char?: number;
}
```

**Proposed enhancement:**

```typescript
export interface Selection {
  readonly start: Position;
  readonly end: Position;
  readonly coverage: SelectionCoverage;
}
```

**PROS:**

✅ **Symmetry with parsing** - ParsedLink uses Position, Selection would match
✅ **Cleaner API** - `selection.start.line` vs `selection.startLine` (more object-oriented)
✅ **Type reuse** - DRY principle, Position used in multiple contexts
✅ **Optional char support** - Position already handles optional `char` field
✅ **Easier refactoring** - Change Position definition, affects all usages consistently

**CONS:**

❌ **Breaking API change** - All existing code using Selection would break
❌ **Migration effort** - ~10+ files reference Selection fields directly
❌ **Test updates** - ~100+ test assertions would need updating
❌ **Nested access** - One more level of nesting (`selection.start.line` vs `selection.startLine`)
❌ **Not pre-1.0 blocking** - Can defer until major version bump
❌ **Ambiguous benefits** - Current API is clear and works well

**Implementation considerations:**

- Create `Selection2` or `RichSelection` interface for migration
- Provide adapter functions: `toSelection`, `fromSelection`
- Deprecate old Selection gradually
- Document migration path in CHANGELOG

**Decision factors:**

- Is symmetry with ParsedLink worth the migration cost?
- Do we gain enough from Position reuse to justify breaking changes?
- Can we defer this to v2.0 when we're ready for breaking changes?
- Would a v1.0 → v2.0 migration guide make this more palatable?

**Done when:**

- PROS/CONS documented in this roadmap (✅ Done above)
- Team decision made: implement now, defer to v2.0, or reject
- If implemented: migration guide created, all code updated, 100% tests passing

---

## Phase 5: Terminal Link Navigation — 📋 Planned

**Goal:** Make RangeLinks in terminal output clickable (Cmd+Click to navigate)

**Total Time:** ~4.5 hours (1 prerequisite + 7 micro-iterations)

**Why This Matters:** Completes the AI workflow loop:

1. Generate link → Terminal binding sends to claude-code
2. claude-code responds with code reference
3. **Click link in terminal → Jump to code** ← THIS

---

### Iteration 1: Link Parser (PREREQUISITE - 1.5h)

**Status:** ❌ No parsing code exists in codebase

**Build:** `packages/rangelink-core-ts/src/parsing/parseLink.ts`

**What it does:**

```typescript
// Input: "src/auth.ts#L42C10-L58C25"
// Output: {
//   path: "src/auth.ts",
//   start: { line: 42, char: 10 },
//   end: { line: 58, char: 25 },
//   linkType: 'Regular'
// }
```

**Formats to support:**

- `#L10` (single line)
- `#L10-L20` (multi-line)
- `#L10C5-L20C10` (with columns)
- `##L10C5-L20C10` (rectangular)

**NOT in scope:** BYOD parsing (defer to later)

**Done when:** Parser has 100% test coverage for all non-BYOD formats

**Status:** ✅ Complete (163 tests pass, 100% coverage on parseLink.ts)

---

### Iteration 1.1: Structured Error Codes for Parsing (30 min) — 📋 Planned

**Goal:** Replace string error messages with RangeLinkMessageCode enum for consistency and future i18n support.

**Current issue:** Parser returns `Result<ParsedLink, string>` with hardcoded error messages like `"Link cannot be empty"`.

**What to do:**

1. Add parsing error codes to `RangeLinkMessageCode` (4xxx range):

```typescript
// Add to src/types/RangeLinkMessageCode.ts
export enum RangeLinkMessageCode {
  // ... existing codes ...

  // Parsing errors (4xxx)
  PARSE_ERR_EMPTY_LINK = 'ERR_4001',
  PARSE_ERR_NO_HASH_SEPARATOR = 'ERR_4002',
  PARSE_ERR_EMPTY_PATH = 'ERR_4003',
  PARSE_ERR_INVALID_RANGE_FORMAT = 'ERR_4004',
  PARSE_ERR_LINE_TOO_SMALL = 'ERR_4005',
  PARSE_ERR_LINE_BACKWARD = 'ERR_4006',
  PARSE_ERR_CHAR_TOO_SMALL = 'ERR_4007',
  PARSE_ERR_CHAR_BACKWARD_SAME_LINE = 'ERR_4008',
}
```

2. Update `parseLink` signature:
   - From: `Result<ParsedLink, string>`
   - To: `Result<ParsedLink, RangeLinkMessageCode>`

3. Replace all `Err('message')` calls with `Err(RangeLinkMessageCode.PARSE_ERR_*)`

4. Update all 36 tests to check for error codes instead of strings:
   - From: `expect(error).toStrictEqual('Link cannot be empty')`
   - To: `expect(error).toStrictEqual(RangeLinkMessageCode.PARSE_ERR_EMPTY_LINK)`

**Tests:**

- All existing tests should pass with enum-based assertions
- Coverage remains 100%

**Done when:**

- All parsing errors use RangeLinkMessageCode
- Tests validate error codes (not strings)
- 100% test coverage maintained

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

### Iteration 3.1: Pattern Detection (30 min)

**File:** `packages/rangelink-vscode-extension/src/navigation/patterns.ts`

**What:** Create regex patterns to detect RangeLinks in terminal output

**Key challenge:** Distinguish RangeLinks from GitHub URLs

**Solution:**

```typescript
// RangeLink: starts with ./ or / or word chars (no protocol)
// GitHub URL: starts with http:// or https://
const rangeLinkPattern = /(?<!https?:\/\/[^\s]*)([\w\./\\-]+\.[\w]+)(#{1,2})L\d+/g;
```

**Tests:**

- ✅ Matches valid RangeLinks
- ✅ Ignores GitHub URLs
- ✅ Handles workspace-relative paths (`./src/file.ts`)
- ✅ Handles absolute paths (`/Users/name/project/file.ts`)
- ✅ Detects rectangular mode (`##`)

**Done when:** Pattern detection has 100% test coverage

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

- [JOURNEY.md](./JOURNEY.md) - Completed work, decisions, and milestones
- [CEMETERY.md](./CEMETERY.md) - Rejected features and why
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Monorepo structure and core architecture
- [LINK-FORMATS.md](./LINK-FORMATS.md) - Comprehensive link notation guide
- [BYOD.md](./BYOD.md) - Portable links (Bring Your Own Delimiters)
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Error codes and validation rules
- [LOGGING.md](./LOGGING.md) - Structured logging approach
- [neovim-integration.md](./neovim-integration.md) - Neovim plugin integration options
