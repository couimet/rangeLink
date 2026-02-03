# The Feature Cemetery 🪦

_"Where good ideas come to rest in peace"_

> Looking for a feature that didn't make it? It might be here. We honor these fallen friends — rejected not from cruelty, but from wisdom.
>
> This document also archives features and code that were implemented but ultimately abandoned, along with the rationale for their removal.

---

## Link History / Recent Links

**Born:** 2025-01-03
**Died:** 2025-01-03 (lived 30 minutes)
**Cause of Death:** Redundancy

### Epitaph

_"I wanted to remember your links, but Alfred already does."_

### The Dream

A command to show recently generated RangeLinks with:

- Quick pick with fuzzy search
- Last 10-20 links
- Select to copy or resend to terminal
- Perfect for iterative AI conversations

### Why It Failed

OS-level clipboard managers already do this **better**:

- ✅ Universal clipboard history (not just RangeLinks)
- ✅ Fuzzy search that Actually Works™
- ✅ Sync across devices
- ✅ Export/import
- ✅ Categories and favorites
- ✅ Users already have them installed

**What would RangeLink add?** Context about which file/when? Too niche. Users won't switch from their battle-tested clipboard manager for one app's specific links.

### The Lesson

**Don't compete with OS-level tools that do one thing exceptionally well.**

Instead, focus on what only RangeLink can do: seamless editor ↔ terminal integration for AI workflows.

### Where The Energy Went Instead

→ **Terminal Link Provider** (click links in claude-code output)
→ **Terminal Binding** (auto-send links to AI)
→ **Link Navigation** (click to jump to code)

These features create unique value that clipboard managers can't provide.

---

## Phase 4.6A: Keybinding Conflict Awareness Notification (Abandoned 2025-01-04)

### Why It Was Abandoned

**Fundamental VSCode API Limitation:** After implementation, we discovered that this feature cannot work as intended because:

1. **No keybinding query API exists**
   - VSCode does not expose APIs to programmatically detect which keybindings are registered
   - Cannot query if our declared keybindings were superseded by conflicts
   - No callback when keybinding registration fails due to conflicts

2. **No post-registration validation**
   - Keybindings are declared in `package.json` and registered at extension load time (before `activate()`)
   - `vscode.commands.registerCommand()` only registers the command HANDLER, not the keybinding
   - No way to verify "did my keybinding actually get bound?"

3. **Timing doesn't help**
   - Calling check before or after `registerCommand()` makes no difference
   - The check happens in `activate()`, but keybindings are already registered by then
   - No event/callback to hook into for keybinding registration success/failure

4. **Feature request rejected**
   - GitHub issue #162433 requesting keybinding query API was closed as "not planned"
   - VSCode team has no intention of adding this capability

### The Core Problem

The implementation showed warnings **without detecting actual conflicts**:

- ❌ Shows warnings to users who may have no conflicts (noise)
- ❌ Cannot help users fix the problem programmatically
- ❌ Cannot provide accurate information about which keybindings conflicted
- ❌ Noisy logging on every activation

### What Was Attempted

**Goal:** Notify users if RangeLink's keybindings conflict with existing extensions.

**Problem:** Users reported `CMD+R CMD+L` already registered in Cursor, preventing the extension from working.

**Implementation approach:**

- Persistent warning on every activation (unless explicitly dismissed)
- Read keybindings dynamically from package.json (DRY principle)
- Show toast with "Open Keyboard Shortcuts" or "Don't Show Again" buttons
- Track dismissal in globalState
- Platform-aware display (CMD on Mac, CTRL on Windows/Linux)

**Key architectural decisions:**

- Extracted to standalone module `checkKeybindingConflicts.ts` for SOLID principles
- Created utility `utils/keybindings.ts` for dynamic keybinding reading
- Injected logger as dependency for testability
- Extracted constants to avoid copy-pasta bugs

### Alternatives Considered

1. **README documentation only** - Document that users should check for conflicts manually
2. **Opt-in command** - Add `rangelink.checkKeybindings` command users can run manually
3. **Wait for VSCode API** - Don't implement until proper detection is possible

### Files Archived Below

1. `src/checkKeybindingConflicts.ts` - Main warning module
2. `src/utils/keybindings.ts` - Keybinding display utility
3. Changes to `src/extension.ts` - Integration code
4. JOURNEY.md entry - Documentation of attempt

---

## Archived Code

### `src/checkKeybindingConflicts.ts` (95 lines)

````typescript
/**
 * Keybinding conflict awareness notification
 *
 * Shows persistent warning to users about potential keybinding conflicts
 * until they explicitly opt out via "Don't Show Again".
 */

import type { Logger } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { getKeybindingDisplayStrings } from './utils/keybindings';

/**
 * Constants for keybinding warning feature
 */
const GLOBALSTATE_KEY_DISMISSED = 'rangelink.keybindingWarningDismissed';
const FUNCTION_NAME = 'checkKeybindingConflicts';
const BUTTON_OPEN_SHORTCUTS = 'Open Keyboard Shortcuts';
const BUTTON_DONT_SHOW_AGAIN = "Don't Show Again";
const VSCODE_COMMAND_KEYBINDINGS = 'workbench.action.openGlobalKeybindings';
const KEYBINDINGS_FILTER = 'RangeLink';

/**
 * Checks if user has dismissed keybinding warning and shows notification if not.
 * Runs on every activation to ensure users are aware of potential conflicts.
 *
 * @param context - VSCode extension context for accessing globalState
 * @param logger - Logger instance for structured logging
 *
 * @example
 * ```typescript
 * import { getLogger } from 'rangelink-core-ts';
 *
 * export function activate(context: vscode.ExtensionContext): void {
 *   // Check for keybinding conflicts (fire-and-forget)
 *   void checkKeybindingConflicts(context, getLogger());
 * }
 * ```
 */
export const checkKeybindingConflicts = async (
  context: vscode.ExtensionContext,
  logger: Logger,
): Promise<void> => {
  const hasUserDismissed = context.globalState.get<boolean>(GLOBALSTATE_KEY_DISMISSED);

  if (hasUserDismissed) {
    logger.info(
      { fn: FUNCTION_NAME },
      'Keybinding warning not shown - user previously opted out via "Don'"'"'t Show Again"',
    );
    return;
  }

  // Read keybindings from package.json dynamically
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
  const packageJson = require('../package.json');
  const keybindings = getKeybindingDisplayStrings(packageJson);

  // Show notification to user
  const message =
    \`RangeLink uses keyboard shortcuts that might conflict with existing keybindings. \` +
    \`Please check: \${keybindings[0]}, \${keybindings[1]}, and \${keybindings.length - 2} more. \` +
    \`The extension won't work correctly until conflicts are resolved.\`;

  const action = await vscode.window.showWarningMessage(
    message,
    BUTTON_OPEN_SHORTCUTS,
    BUTTON_DONT_SHOW_AGAIN,
  );

  if (action === BUTTON_OPEN_SHORTCUTS) {
    await vscode.commands.executeCommand(VSCODE_COMMAND_KEYBINDINGS, KEYBINDINGS_FILTER);
    logger.info(
      { fn: FUNCTION_NAME },
      'User opened keyboard shortcuts editor from keybinding warning',
    );
  } else if (action === BUTTON_DONT_SHOW_AGAIN) {
    await context.globalState.update(GLOBALSTATE_KEY_DISMISSED, true);
    logger.info({ fn: FUNCTION_NAME }, 'User dismissed keybinding warning permanently');
  }
};
````

### `src/utils/keybindings.ts` (44 lines)

````typescript
/**
 * Utility functions for working with VSCode keybindings
 */

/**
 * Interface for keybinding configuration from package.json
 */
interface KeybindingConfig {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

/**
 * Get platform-specific keybinding display strings from package.json
 *
 * @param packageJson - The parsed package.json object
 * @returns Array of formatted keybinding strings (e.g., "CMD+R CMD+L - Copy Link To Selection With Relative Path")
 *
 * @example
 * ```typescript
 * const packageJson = require('../package.json');
 * const keybindings = getKeybindingDisplayStrings(packageJson);
 * // On Mac: ["CMD+R CMD+L - Copy Link To Selection With Relative Path", ...]
 * // On Windows/Linux: ["CTRL+R CTRL+L - Copy Link To Selection With Relative Path", ...]
 * ```
 */
export function getKeybindingDisplayStrings(packageJson: any): string[] {
  const keybindingsConfig: KeybindingConfig[] = packageJson.contributes?.keybindings || [];

  // eslint-disable-next-line no-undef
  const isMac = process.platform === 'darwin';

  return keybindingsConfig.map((kb: KeybindingConfig) => {
    const key = isMac ? kb.mac || kb.key : kb.key;
    const commandTitle = kb.command
      .replace('rangelink.', '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
    return \`\${key.toUpperCase()} - \${commandTitle}\`;
  });
}
````

### Changes to `src/extension.ts`

```diff
@@ -12,6 +12,7 @@ import {
 } from 'rangelink-core-ts';
 import * as vscode from 'vscode';

+import { checkKeybindingConflicts } from './checkKeybindingConflicts';
 import { PathFormat, RangeLinkService } from './RangeLinkService';
 import { TerminalBindingManager } from './TerminalBindingManager';
 import { VSCodeLogger } from './VSCodeLogger';
@@ -177,6 +178,9 @@ export function activate(context: vscode.ExtensionContext): void {
   const vscodeLogger = new VSCodeLogger(outputChannel);
   setLogger(vscodeLogger);

+  // Check for keybinding conflicts and show warning if not dismissed (fire-and-forget)
+  void checkKeybindingConflicts(context, getLogger());
+
   const delimiters = loadDelimiterConfig();
   const terminalBindingManager = new TerminalBindingManager(context);
   const service = new RangeLinkService(delimiters, terminalBindingManager);
```

### JOURNEY.md Entry (Abandoned)

```markdown
### 4.6A) Keybinding Conflict Awareness Notification — ✅ Complete

**Goal:** Notify users if RangeLink's keybindings conflict with existing extensions, suggest how to reconfigure.

**Problem:** Users reported that \`CMD+R CMD+L\` keybinding was already registered in Cursor, preventing the extension from working correctly without manual intervention. Keybindings may remain inactive until conflicts are resolved.

**Research findings:**

1. **VSCode API limitations discovered:**
   - No post-install hooks (only activation events like \`onStartupFinished\`)
   - No keybinding query APIs exposed (cannot programmatically detect conflicts)
   - Feature request (GitHub issue #162433) closed as "not planned"
   - Workarounds (parsing keybindings.json) are fragile and unreliable

**Key architectural decision:**

**Persistent warning vs. first-time-only:** Chose to show warning on EVERY activation (unless explicitly dismissed) rather than just first activation. Rationale: Keybindings may remain inactive until user resolves conflicts, so a one-time warning could be forgotten before the issue is fixed.

**Implementation approach:**

Given VSCode API constraints, implemented pragmatic "awareness notification" system:

- Runs \`checkKeybindingConflicts()\` on every extension activation
- Reads keybindings dynamically from package.json (DRY principle) via \`getKeybindingDisplayStrings()\` utility
- Checks \`globalState\` for user dismissal flag
- Logs at INFO level when user has opted out
- Logs at INFO level with platform-specific keybindings when showing warning (awareness notification, not conflict detection)
- Shows warning toast with two action buttons:
  - "Open Keyboard Shortcuts" - opens editor filtered to RangeLink (warning persists)
  - "Don't Show Again" - permanently dismisses (tracked in \`globalState\`)
- Platform-aware display (CMD on Mac, CTRL on Windows/Linux)

**User experience:**

1. Install RangeLink → warning toast appears on every activation
2. User can open keyboard shortcuts editor to check/resolve conflicts
3. Warning continues showing until user explicitly clicks "Don't Show Again"
4. Once dismissed, logs INFO message on each activation but no longer shows toast

**Limitations:**

- Cannot programmatically detect actual conflicts (VSCode API limitation)
- Shows warning even if no conflicts exist (acceptable trade-off)
- No auto-fix capability without keybinding query API
- Users must manually check and resolve conflicts

**Future enhancements (if VSCode adds API):**

- Programmatic conflict detection
- Auto-fix by reassigning conflicting keybindings
- Show only when actual conflicts exist

**Files modified:**

- \`src/extension.ts\` - Imports and calls warning logic from standalone module
- \`src/checkKeybindingConflicts.ts\` (NEW) - Self-contained warning module with arrow function
- \`src/utils/keybindings.ts\` (NEW) - Keybinding display string utility
- All modules use existing logger infrastructure

**Architectural decision - Module extraction:**

Extracted keybinding warning logic to standalone module (\`checkKeybindingConflicts.ts\`) rather than keeping it in extension.ts. Benefits:

- **SOLID principles**: Single Responsibility + Dependency Inversion (logger passed as param)
- **Testability**: Can test warning logic independently by mocking vscode, logger, and utilities
- **Encapsulation**: No global dependencies, all deps injected via function parameters
- **Maintainability**: Cleaner extension.ts focused on orchestration, not implementation details

**Deliverables:**

- ✅ Persistent keybinding conflict awareness notification
- ✅ Dynamic keybinding reading from package.json (DRY)
- ✅ Platform-aware keybinding display
- ✅ Explicit user opt-out mechanism
- ✅ Comprehensive logging (INFO/WARN levels)
- ✅ Reusable keybinding utility function

**Status:** Complete - Persistent warning system implemented, tests pending
```

---

## Lessons Learned

1. **Verify API capabilities BEFORE implementation** - Should have thoroughly researched VSCode keybinding APIs before coding
2. **Question "acceptable trade-offs" harder** - Showing warnings without detection isn't acceptable, it's just noise
3. **Timing assumptions need validation** - Assumed we could check after command registration, but that's not how VSCode works
4. **README documentation may be sufficient** - Sometimes the simple solution (document in README) is better than complex workarounds

---

## Future Residents

_This cemetery is open for new arrivals. Features are admitted by committee decision, usually after a vigorous debate and several cups of coffee._

_To nominate a feature for eternal rest, open an issue with the tag `cemetery-candidate`._
