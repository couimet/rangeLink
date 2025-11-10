# Implementation Plan: Universal Paste Destinations

**Status:** In Progress - Phase 1 Complete
**Created:** 2025-11-08
**Updated:** 2025-01-09
**Related Docs:**

- Research findings: `docs/RESEARCH-UNIVERSAL-PASTE.md`
- Claude Code integration research: `docs/RESEARCH-CLAUDE-CODE-INTEGRATION.md`
- Claude Code workaround findings: `docs/RESEARCH-CLAUDE-CODE-INTEGRATION-UPDATE.md`
- User questions: `.claude-questions/0013-universal-paste-destinations-design.txt`
- Phase 2 questions: `.claude-questions/0018-phase2-chat-destinations-implementation.txt`

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [High-Level Architecture](#high-level-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Detailed Technical Design](#detailed-technical-design)
5. [File Structure Changes](#file-structure-changes)
6. [Testing Strategy](#testing-strategy)
7. [Migration & Backward Compatibility](#migration--backward-compatibility)
8. [Documentation Updates](#documentation-updates)
9. [Marketing & Positioning](#marketing--positioning)
10. [Success Criteria](#success-criteria)

---

## Vision & Goals

### Problem Statement

**Current limitation:** RangeLink only auto-pastes to bound terminals.

**User pain point:** When working with AI assistants (Claude Code, Cursor AI), users must manually copy RangeLinks and paste them into chat inputs, breaking flow state.

### Vision

Enable RangeLink to paste automatically to **any writable destination** in VSCode/Cursor:

- Terminal (existing)
- Text Editor at cursor position (new)
- Cursor AI assistant
- GitHub Copilot Chat
- Claude Code chat (experimental - hybrid approach)
- Future: Any extension-provided input

**Key principle:** Extend, don't replace. Terminal binding remains a first-class feature.

### Goals

#### Phase 1 MVP ✅ Complete

1. ✅ **Generic destination abstraction** - Support multiple paste targets
2. ✅ **Backward compatibility** - Terminal binding continues working
3. ✅ **Plain text paste** - Simple, consistent format (padded link text)
4. ✅ **One destination at a time** - User explicitly binds preferred target
5. ✅ **Comprehensive tests** - 99%+ coverage maintained

#### Phase 2 Chat & Editor Destinations (In Progress)

1. **Text Editor integration** - Paste at cursor position in active editor
2. **Cursor AI integration** - Paste to Cursor's assistant (standard VSCode chat API)
3. **GitHub Copilot integration** - Paste to Copilot Chat (standard VSCode chat API)
4. **Claude Code integration** - Experimental hybrid approach (focus + paste command)

#### Phase 2 Future Enhancements

- Enhanced link clickability in chat webviews
- OS-wide protocol handler for external tools (ChatGPT web, Claude.ai)
- Template system for destination-specific formatting
- Multi-destination paste (e.g., clipboard + chat simultaneously)

### Non-Goals (Explicitly Out of Scope)

❌ Automatic destination detection (no "smart paste")
❌ Markdown-formatted paste with code blocks (plain text only)
❌ Modifying clipboard content (clipboard still gets plain link)
❌ Supporting non-VSCode editors (Sublime, Notepad++, etc.)

---

## High-Level Architecture

### Current Architecture (Terminal-Only)

```
┌─────────────────────────────────────────────────────┐
│ extension.ts                                        │
│   - Creates RangeLinkService                        │
│   - Creates TerminalBindingManager                  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ RangeLinkService                                    │
│   - Generates link from selection                   │
│   - Copies to clipboard                             │
│   - Calls terminalBindingManager.sendToTerminal()   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ TerminalBindingManager                              │
│   - Binds to active terminal                        │
│   - Sends text: terminal.sendText()                 │
│   - Focuses terminal: terminal.show()               │
└─────────────────────────────────────────────────────┘
```

### Proposed Architecture (Universal Paste)

```
┌─────────────────────────────────────────────────────┐
│ extension.ts                                        │
│   - Creates RangeLinkService                        │
│   - Creates PasteDestinationManager (NEW)           │
│   - Migrates legacy terminal binding (NEW)          │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ RangeLinkService                                    │
│   - Generates link from selection                   │
│   - Copies to clipboard                             │
│   - Calls manager.sendToDestination() (CHANGED)     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ PasteDestinationManager (NEW)                       │
│   - Manages bound destination (generic)             │
│   - Factory: creates destination instances          │
│   - Delegates paste to active destination           │
└─────────────────────────────────────────────────────┘
       │           │           │             │            │
       ▼           ▼           ▼             ▼            ▼
┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Terminal   │ │TextEditor│ │CursorAI  │ │Copilot   │ │ClaudeCode│
│           │ │          │ │          │ │          │ │          │
│.paste()   │ │.paste()  │ │.paste()  │ │.paste()  │ │.paste()  │
│sendText() │ │insertText│ │chat.open │ │chat.open │ │focus +   │
│show()     │ │atCursor  │ │(command) │ │(command) │ │pasteCmd  │
└───────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Key Design Decisions

#### 1. Interface-Based Abstraction

**Why:** Enables adding new destinations without modifying core logic.

```typescript
interface PasteDestination {
  readonly id: DestinationType;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  paste(text: string): Promise<boolean>;
}
```

**Benefits:**

- Open/closed principle (open for extension, closed for modification)
- Easy to test (mock destinations)
- Future-proof (GitHub Copilot Chat, other extensions)

#### 2. Factory Pattern for Destination Creation

**Why:** Centralizes destination instantiation logic.

```typescript
class DestinationFactory {
  create(type: DestinationType, context: ExtensionContext): PasteDestination {
    switch (type) {
      case 'terminal':
        return new TerminalDestination();
      case 'claude-code':
        return new ClaudeCodeDestination();
      case 'cursor-ai':
        return new CursorAIDestination();
    }
  }
}
```

**Benefits:**

- Single source of truth for supported destinations
- Easy to add destination-specific dependencies (logger, config)

#### 3. Backward Compatible Settings Migration

**Why:** Existing users have `rangelink.autoPaste.boundTerminal` setting.

**Strategy:**

- Check for legacy setting on activation
- Auto-migrate: `boundTerminal: "bash"` → `destinationType: "terminal"`
- Preserve terminal name for future use
- Show migration notification once

---

## Implementation Phases

### Phase 0: Preparation & Validation (0.5 days)

**Goal:** Ensure foundation is solid before refactoring.

**Tasks:**

1. Run full test suite to establish baseline ✅
2. Review current terminal binding implementation ✅
3. Document API contracts for destinations ✅
4. ~~Create feature branch: `feature/universal-paste`~~ I don't want a feature branch; I'll go straight in `main`

**Deliverables:**

- All tests passing
- Research document (`RESEARCH-UNIVERSAL-PASTE.md`)
- Implementation plan (this document)

---

### Phase 1: Core Abstraction (1-2 days)

**Goal:** Extract terminal binding into generic destination interface.

#### Step 1.1: Define Destination Interface

**New file:** `packages/rangelink-vscode-extension/src/destinations/PasteDestination.ts`

```typescript
export type DestinationType = 'terminal' | 'text-editor' | 'cursor-ai' | 'github-copilot' | 'claude-code';

export interface PasteDestination {
  /** Unique identifier for this destination type */
  readonly id: DestinationType;

  /** User-friendly display name (e.g., "Claude Code Chat") */
  readonly displayName: string;

  /**
   * Check if destination is currently available
   * @returns true if paste can succeed, false otherwise
   */
  isAvailable(): Promise<boolean>;

  /**
   * Paste text to destination with padding and focus
   * @param text - The text to paste
   * @returns true if paste succeeded, false otherwise
   */
  paste(text: string): Promise<boolean>;
}
```

**Design notes:**

- Async methods (some destinations need command execution)
- Boolean return (success/failure), not throwing (silent failure pattern from terminal)
- Readonly properties (immutable after construction)

#### Step 1.2: Implement TerminalDestination

**New file:** `packages/rangelink-vscode-extension/src/destinations/TerminalDestination.ts`

**Purpose:** Migrate existing terminal logic into new interface.

```typescript
export class TerminalDestination implements PasteDestination {
  readonly id: DestinationType = 'terminal';
  readonly displayName = 'Terminal';

  constructor(
    private readonly logger: Logger,
    private boundTerminal?: vscode.Terminal,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.boundTerminal !== undefined;
  }

  async paste(text: string): Promise<boolean> {
    if (!this.boundTerminal) {
      this.logger.warn({ fn: 'TerminalDestination.paste' }, 'No terminal bound');
      return false;
    }

    const paddedText = ` ${text} `;
    this.boundTerminal.sendText(paddedText, false);
    this.boundTerminal.show(false);

    this.logger.info(
      { fn: 'TerminalDestination.paste', terminalName: this.boundTerminal.name },
      `Pasted to terminal: ${this.boundTerminal.name}`,
    );

    return true;
  }

  /**
   * Update bound terminal reference
   * Called by manager when user binds/unbinds
   */
  setTerminal(terminal: vscode.Terminal | undefined): void {
    this.boundTerminal = terminal;
  }

  getTerminalName(): string | undefined {
    return this.boundTerminal?.name;
  }
}
```

**Key changes from TerminalBindingManager:**

- Extracted `sendToTerminal()` → `paste()`
- Terminal reference managed externally (by manager)
- No binding logic (manager handles that)

#### Step 1.3: Create Destination Factory

**New file:** `packages/rangelink-vscode-extension/src/destinations/DestinationFactory.ts`

```typescript
export class DestinationFactory {
  constructor(private readonly logger: Logger) {}

  create(type: DestinationType): PasteDestination {
    this.logger.debug({ fn: 'DestinationFactory.create', type }, `Creating destination: ${type}`);

    switch (type) {
      case 'terminal':
        return new TerminalDestination(this.logger);

      case 'text-editor':
        return new TextEditorDestination(this.logger);

      case 'cursor-ai':
        return new CursorAIDestination(this.logger);

      case 'github-copilot':
        return new GitHubCopilotDestination(this.logger);

      case 'claude-code':
        return new ClaudeCodeDestination(this.logger);

      default:
        throw new Error(`Unknown destination type: ${type}`);
    }
  }

  /**
   * Get all available destination types (for UI pickers)
   */
  getSupportedTypes(): DestinationType[] {
    return ['terminal', 'text-editor', 'cursor-ai', 'github-copilot', 'claude-code'];
  }

  /**
   * Get display names for UI (e.g., QuickPick menu)
   */
  getDisplayNames(): Record<DestinationType, string> {
    return {
      terminal: 'Terminal',
      'text-editor': 'Text Editor',
      'cursor-ai': 'Cursor AI Assistant',
      'github-copilot': 'GitHub Copilot Chat',
      'claude-code': 'Claude Code Chat',
    };
  }
}
```

#### Step 1.4: Tests for Phase 1

**New file:** `packages/rangelink-vscode-extension/src/__tests__/destinations/TerminalDestination.test.ts`

```typescript
describe('TerminalDestination', () => {
  it('should return false when no terminal bound', async () => {
    const dest = new TerminalDestination(mockLogger);
    expect(await dest.isAvailable()).toBe(false);
  });

  it('should paste with padding and focus terminal', async () => {
    const mockTerminal = {
      sendText: jest.fn(),
      show: jest.fn(),
      name: 'bash',
    };
    const dest = new TerminalDestination(mockLogger);
    dest.setTerminal(mockTerminal as any);

    const result = await dest.paste('src/file.ts#L10');

    expect(result).toBe(true);
    expect(mockTerminal.sendText).toHaveBeenCalledWith(' src/file.ts#L10 ', false);
    expect(mockTerminal.show).toHaveBeenCalledWith(false);
  });
});
```

**Testing coverage:**

- Interface contract (isAvailable, paste)
- Padding behavior (spaces before/after)
- Terminal focus after paste
- Failure cases (no terminal bound)

---

### Phase 2: Editor & Chat Destinations (2-3 days)

**Goal:** Add Text Editor, Cursor AI, GitHub Copilot, and Claude Code paste targets.

**Updated Priority (based on research findings):**
1. **High:** Text Editor (user request, straightforward implementation)
2. **High:** Cursor AI (standard VSCode chat API)
3. **High:** GitHub Copilot (standard VSCode chat API, documented)
4. **Medium:** Claude Code (experimental hybrid approach, requires testing)

**Research Notes:** See `docs/RESEARCH-CLAUDE-CODE-INTEGRATION.md` and `docs/RESEARCH-CLAUDE-CODE-INTEGRATION-UPDATE.md` for Claude Code integration findings.

**Known Limitation - Command Visibility:**
Currently, IDE-specific binding commands (e.g., `rangelink.bindToCursorAI`) are visible in all IDEs but fail gracefully with error messages when not running in the correct environment. Future Phase 3 work should implement conditional command visibility based on IDE detection (see extension.ts:165-167 TODO comments).

#### Step 2.1: Implement TextEditorDestination

**New file:** `packages/rangelink-vscode-extension/src/destinations/TextEditorDestination.ts`

```typescript
export class TextEditorDestination implements PasteDestination {
  readonly id: DestinationType = 'text-editor';
  readonly displayName = 'Text Editor';

  constructor(private readonly logger: Logger) {}

  async isAvailable(): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      this.logger.debug(
        { fn: 'TextEditorDestination.isAvailable' },
        'No active text editor',
      );
      return false;
    }

    return true;
  }

  async paste(text: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      this.logger.warn(
        { fn: 'TextEditorDestination.paste' },
        'Cannot paste: No active text editor',
      );
      return false;
    }

    try {
      const paddedText = ` ${text} `;
      const position = editor.selection.active;

      await editor.edit((editBuilder) => {
        editBuilder.insert(position, paddedText);
      });

      this.logger.info(
        { fn: 'TextEditorDestination.paste', textLength: text.length },
        'Successfully pasted to text editor at cursor',
      );

      return true;
    } catch (error) {
      this.logger.error(
        { fn: 'TextEditorDestination.paste', error },
        'Failed to paste to text editor',
      );
      return false;
    }
  }
}
```

**Key implementation details:**

- Checks for active text editor
- Inserts at cursor position (selection.active)
- Consistent padding with terminal
- User-requested feature for pasting into documents/comments

#### Step 2.2: Implement CursorAIDestination

**New file:** `packages/rangelink-vscode-extension/src/destinations/CursorAIDestination.ts`

```typescript
export class CursorAIDestination implements PasteDestination {
  readonly id: DestinationType = 'cursor-ai';
  readonly displayName = 'Cursor AI Assistant';

  constructor(private readonly logger: Logger) {}

  async isAvailable(): Promise<boolean> {
    // Cursor is a fork of VSCode, so chat command should exist
    // No extension check needed (it's built-in to Cursor)

    // Runtime check: try to detect Cursor environment
    const isCursor = this.detectCursorEnvironment();

    this.logger.debug(
      { fn: 'CursorAIDestination.isAvailable', isCursor },
      isCursor ? 'Running in Cursor' : 'Not running in Cursor',
    );

    return isCursor;
  }

  async paste(text: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn(
        { fn: 'CursorAIDestination.paste' },
        'Cannot paste: Not running in Cursor IDE',
      );
      return false;
    }

    try {
      const paddedText = ` ${text} `;

      // Cursor uses same VSCode command architecture
      await vscode.commands.executeCommand(CHAT_OPEN_COMMAND, {
        query: paddedText,
      });

      this.logger.info({ fn: 'CursorAIDestination.paste' }, 'Successfully pasted to Cursor AI');

      return true;
    } catch (error) {
      this.logger.error({ fn: 'CursorAIDestination.paste', error }, 'Failed to paste to Cursor AI');

      // TODO: Try cursor-specific command if standard one fails
      // await vscode.commands.executeCommand('cursor.chat.open', ...);

      return false;
    }
  }

  /**
   * Detect if running in Cursor IDE
   * Cursor sets specific environment variables and extension ID patterns
   */
  private detectCursorEnvironment(): boolean {
    // Method 1: Check app name
    const appName = vscode.env.appName.toLowerCase();
    if (appName.includes('cursor')) {
      return true;
    }

    // Method 2: Check for Cursor-specific extensions
    const cursorExtensions = vscode.extensions.all.filter((ext) => ext.id.startsWith('cursor.'));
    if (cursorExtensions.length > 0) {
      return true;
    }

    // Method 3: Check URIScheme (Cursor uses 'cursor')
    if (vscode.env.uriScheme === 'cursor') {
      return true;
    }

    return false;
  }
}
```

**Cursor-specific considerations:**

- No extension check (AI assistant is built-in)
- Environment detection (multiple heuristics)
- Fallback to cursor-specific commands (TODO for testing)

#### Step 2.3: Implement GitHubCopilotDestination

**New file:** `packages/rangelink-vscode-extension/src/destinations/GitHubCopilotDestination.ts`

```typescript
const COPILOT_EXTENSION_ID = 'GitHub.copilot-chat';
const CHAT_OPEN_COMMAND = 'workbench.action.chat.open';

export class GitHubCopilotDestination implements PasteDestination {
  readonly id: DestinationType = 'github-copilot';
  readonly displayName = 'GitHub Copilot Chat';

  constructor(private readonly logger: Logger) {}

  async isAvailable(): Promise<boolean> {
    const extension = vscode.extensions.getExtension(COPILOT_EXTENSION_ID);

    if (!extension) {
      this.logger.debug(
        { fn: 'GitHubCopilotDestination.isAvailable' },
        'GitHub Copilot extension not installed',
      );
      return false;
    }

    if (!extension.isActive) {
      this.logger.debug(
        { fn: 'GitHubCopilotDestination.isAvailable' },
        'GitHub Copilot extension not active',
      );
      return false;
    }

    return true;
  }

  async paste(text: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn(
        { fn: 'GitHubCopilotDestination.paste' },
        'Cannot paste: GitHub Copilot not available',
      );
      return false;
    }

    try {
      const paddedText = ` ${text} `;

      // GitHub Copilot uses standard VSCode chat API
      await vscode.commands.executeCommand(CHAT_OPEN_COMMAND, {
        query: paddedText,
      });

      this.logger.info(
        { fn: 'GitHubCopilotDestination.paste', textLength: text.length },
        'Successfully pasted to GitHub Copilot Chat',
      );

      return true;
    } catch (error) {
      this.logger.error(
        { fn: 'GitHubCopilotDestination.paste', error },
        'Failed to paste to GitHub Copilot Chat',
      );
      return false;
    }
  }
}
```

**Key implementation details:**

- Extension detection (GitHub.copilot-chat)
- Uses standard VSCode chat API (well-documented)
- Consistent with other chat destinations
- High priority (large user base, stable API)

#### Step 2.4: Implement ClaudeCodeDestination (Experimental)

**New file:** `packages/rangelink-vscode-extension/src/destinations/ClaudeCodeDestination.ts`

```typescript
const CLAUDE_CODE_EXTENSION_ID = 'anthropic.claude-code';
const CLAUDE_CODE_FOCUS_COMMAND = 'claude-vscode.focus';

export class ClaudeCodeDestination implements PasteDestination {
  readonly id: DestinationType = 'claude-code';
  readonly displayName = 'Claude Code Chat';

  constructor(private readonly logger: Logger) {}

  async isAvailable(): Promise<boolean> {
    const extension = vscode.extensions.getExtension(CLAUDE_CODE_EXTENSION_ID);

    if (!extension || !extension.isActive) {
      this.logger.debug(
        { fn: 'ClaudeCodeDestination.isAvailable' },
        'Claude Code extension not available',
      );
      return false;
    }

    return true;
  }

  async paste(text: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn(
        { fn: 'ClaudeCodeDestination.paste' },
        'Cannot paste: Claude Code not available',
      );
      return false;
    }

    try {
      // Hybrid approach: focus + paste command
      // See docs/RESEARCH-CLAUDE-CODE-INTEGRATION-UPDATE.md

      // 1. Focus Claude Code input
      await vscode.commands.executeCommand(CLAUDE_CODE_FOCUS_COMMAND);

      // 2. Try programmatic paste
      try {
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        this.logger.info(
          { fn: 'ClaudeCodeDestination.paste' },
          'Successfully pasted to Claude Code (automatic)',
        );
        return true;
      } catch (pasteError) {
        // 3. Fallback: Show notification for manual paste
        this.logger.warn(
          { fn: 'ClaudeCodeDestination.paste', error: pasteError },
          'Automatic paste failed, prompting user for manual paste',
        );

        vscode.window.showInformationMessage(
          'RangeLink focused in Claude Code - press Cmd+V (Mac) or Ctrl+V (Win/Linux) to paste',
          { modal: false },
        );

        return true; // Still count as success (focused)
      }
    } catch (error) {
      this.logger.error(
        { fn: 'ClaudeCodeDestination.paste', error },
        'Failed to paste to Claude Code',
      );
      return false;
    }
  }
}
```

**Key implementation details (experimental approach):**

- **Hybrid strategy:** Focus + paste command with manual fallback
- Uses `claude-vscode.focus` command (discovered via reverse engineering)
- Attempts `editor.action.clipboardPasteAction` (may not work in webview)
- Graceful degradation: shows notification if automatic paste fails
- **Requires testing** in Cursor environment
- See research docs for architectural details

**Why experimental:**

- Claude Code uses custom sidebar (not VSCode native chat)
- No public API for external extensions
- Workaround relies on internal commands that may change
- User may need to manually paste (Cmd+V)

#### Step 2.5: Tests for All Destinations

**New file:** `packages/rangelink-vscode-extension/src/__tests__/destinations/ClaudeCodeDestination.test.ts`

```typescript
describe('ClaudeCodeDestination', () => {
  it('should detect Claude Code extension', async () => {
    vscode.extensions.getExtension = jest.fn().mockReturnValue({
      isActive: true,
    });

    const dest = new ClaudeCodeDestination(mockLogger);
    expect(await dest.isAvailable()).toBe(true);
  });

  it('should execute workbench.action.chat.open with padded text', async () => {
    vscode.extensions.getExtension = jest.fn().mockReturnValue({ isActive: true });
    vscode.commands.executeCommand = jest.fn().mockResolvedValue(undefined);

    const dest = new ClaudeCodeDestination(mockLogger);
    const result = await dest.paste('src/file.ts#L10');

    expect(result).toBe(true);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.action.chat.open', {
      query: ' src/file.ts#L10 ',
    });
  });

  it('should return false if extension not installed', async () => {
    vscode.extensions.getExtension = jest.fn().mockReturnValue(undefined);

    const dest = new ClaudeCodeDestination(mockLogger);
    expect(await dest.paste('src/file.ts#L10')).toBe(false);
  });
});
```

---

### Phase 3: Destination Manager (1-2 days)

**Goal:** Replace TerminalBindingManager with generic PasteDestinationManager.

#### Step 3.1: Implement PasteDestinationManager

**New file:** `packages/rangelink-vscode-extension/src/destinations/PasteDestinationManager.ts`

```typescript
export class PasteDestinationManager implements vscode.Disposable {
  private boundDestination: PasteDestination | undefined;
  private boundTerminal: vscode.Terminal | undefined; // For terminal destination
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly factory: DestinationFactory,
    private readonly logger: Logger,
  ) {
    // Listen for terminal closure (backward compatibility)
    const terminalCloseListener = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (this.boundTerminal === closedTerminal) {
        this.logger.info(
          { fn: 'PasteDestinationManager.onDidCloseTerminal' },
          'Bound terminal closed - auto-unbinding',
        );
        this.unbind();
        vscode.window.setStatusBarMessage('Destination binding removed (terminal closed)', 3000);
      }
    });

    this.disposables.push(terminalCloseListener);
  }

  /**
   * Bind to a destination type
   * For terminal: requires active terminal
   * For chat: extension must be installed
   */
  async bind(type: DestinationType): Promise<boolean> {
    // Check if already bound
    if (this.boundDestination) {
      const currentType = this.boundDestination.id;
      this.logger.warn(
        { fn: 'bind', currentType, requestedType: type },
        'Already bound to a destination',
      );
      vscode.window.showErrorMessage(
        `RangeLink: Already bound to ${this.boundDestination.displayName}. Unbind first.`,
      );
      return false;
    }

    // Special handling for terminal (needs active terminal)
    if (type === 'terminal') {
      return this.bindTerminal();
    }

    // Generic destination binding
    const destination = this.factory.create(type);

    if (!(await destination.isAvailable())) {
      this.logger.warn(
        { fn: 'bind', type },
        `Cannot bind: ${destination.displayName} not available`,
      );
      vscode.window.showErrorMessage(
        `RangeLink: ${destination.displayName} is not available. ` +
          `Make sure the extension is installed and active.`,
      );
      return false;
    }

    this.boundDestination = destination;

    this.logger.info({ fn: 'bind', type }, `Successfully bound to ${destination.displayName}`);

    vscode.window.setStatusBarMessage(`✓ RangeLink bound to ${destination.displayName}`, 3000);

    return true;
  }

  /**
   * Special terminal binding (backward compatibility)
   * Requires active terminal reference
   */
  private async bindTerminal(): Promise<boolean> {
    const activeTerminal = vscode.window.activeTerminal;

    if (!activeTerminal) {
      this.logger.warn({ fn: 'bindTerminal' }, 'No active terminal');
      vscode.window.showErrorMessage(
        'RangeLink: No active terminal. Open a terminal and try again.',
      );
      return false;
    }

    const destination = this.factory.create('terminal') as TerminalDestination;
    destination.setTerminal(activeTerminal);

    this.boundDestination = destination;
    this.boundTerminal = activeTerminal; // Track for closure events

    this.logger.info(
      { fn: 'bindTerminal', terminalName: activeTerminal.name },
      `Successfully bound to terminal: ${activeTerminal.name}`,
    );

    vscode.window.setStatusBarMessage(
      `✓ RangeLink bound to terminal: ${activeTerminal.name}`,
      3000,
    );

    return true;
  }

  /**
   * Unbind current destination
   */
  unbind(): void {
    if (!this.boundDestination) {
      this.logger.info({ fn: 'unbind' }, 'No destination bound');
      vscode.window.setStatusBarMessage('RangeLink: No destination bound', 2000);
      return;
    }

    const displayName = this.boundDestination.displayName;
    this.boundDestination = undefined;
    this.boundTerminal = undefined;

    this.logger.info({ fn: 'unbind', displayName }, `Successfully unbound from ${displayName}`);

    vscode.window.setStatusBarMessage(`✓ RangeLink unbound from ${displayName}`, 2000);
  }

  /**
   * Check if any destination is bound
   */
  isBound(): boolean {
    return this.boundDestination !== undefined;
  }

  /**
   * Get current bound destination (for status display)
   */
  getBoundDestination(): PasteDestination | undefined {
    return this.boundDestination;
  }

  /**
   * Send text to bound destination
   * @returns true if sent successfully, false if no destination bound or paste failed
   */
  async sendToDestination(text: string): Promise<boolean> {
    if (!this.boundDestination) {
      this.logger.warn({ fn: 'sendToDestination' }, 'Cannot send: No destination bound');
      return false;
    }

    const result = await this.boundDestination.paste(text);

    if (!result) {
      this.logger.error(
        { fn: 'sendToDestination', destinationType: this.boundDestination.id },
        'Paste failed',
      );
      // Don't show error toast (paste() already logged, user sees no action)
    }

    return result;
  }

  /**
   * Get terminal name (for backward compatibility / status display)
   */
  getTerminalName(): string | undefined {
    if (this.boundDestination?.id === 'terminal') {
      return (this.boundDestination as TerminalDestination).getTerminalName();
    }
    return undefined;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
```

**Key features:**

- Generic binding for all destination types
- Special terminal handling (needs terminal reference)
- Terminal closure detection (backward compatibility)
- Consistent error messages and logging

#### Step 3.2: Update RangeLinkService

**File:** `packages/rangelink-vscode-extension/src/RangeLinkService.ts`

**Changes:**

```typescript
// BEFORE
constructor(
  private readonly delimiters: DelimiterConfig,
  private readonly terminalBindingManager: TerminalBindingManager,
) {}

// AFTER
constructor(
  private readonly delimiters: DelimiterConfig,
  private readonly destinationManager: PasteDestinationManager,
) {}
```

```typescript
// BEFORE (lines 120-138)
private async copyAndNotify(link: string, linkTypeName: string): Promise<void> {
  await vscode.env.clipboard.writeText(link);

  let statusMessage = `✓ ${linkTypeName} copied to clipboard`;

  if (this.terminalBindingManager && this.terminalBindingManager.isBound()) {
    const sent = this.terminalBindingManager.sendToTerminal(link);
    if (sent) {
      const terminal = this.terminalBindingManager.getBoundTerminal();
      const terminalName = terminal?.name || 'terminal';
      vscode.window.setStatusBarMessage(`${statusMessage} & sent to ${terminalName}`, 2000);
    } else {
      vscode.window.showWarningMessage(`${statusMessage}; BUT failed to send to bound terminal.`);
    }
  } else {
    vscode.window.setStatusBarMessage(statusMessage, 2000);
  }
}

// AFTER
private async copyAndNotify(link: string, linkTypeName: string): Promise<void> {
  await vscode.env.clipboard.writeText(link);

  let statusMessage = `✓ ${linkTypeName} copied to clipboard`;

  if (this.destinationManager && this.destinationManager.isBound()) {
    const sent = await this.destinationManager.sendToDestination(link);
    if (sent) {
      const destination = this.destinationManager.getBoundDestination();
      const destName = destination?.displayName || 'destination';
      vscode.window.setStatusBarMessage(`${statusMessage} & sent to ${destName}`, 2000);
    } else {
      vscode.window.showWarningMessage(`${statusMessage}; BUT failed to send to bound destination.`);
    }
  } else {
    vscode.window.setStatusBarMessage(statusMessage, 2000);
  }
}
```

**Note:** Minimal changes - just swap manager reference and method names.

#### Step 3.3: Update extension.ts

**File:** `packages/rangelink-vscode-extension/src/extension.ts`

**Changes:**

```typescript
// BEFORE (lines 59-60)
const terminalBindingManager = new TerminalBindingManager(context);
const service = new RangeLinkService(delimiters, terminalBindingManager);

// AFTER
const factory = new DestinationFactory(getLogger());
const destinationManager = new PasteDestinationManager(context, factory, getLogger());
const service = new RangeLinkService(delimiters, destinationManager);
```

```typescript
// BEFORE (lines 137-148)
context.subscriptions.push(
  vscode.commands.registerCommand('rangelink.bindToTerminal', () => {
    terminalBindingManager.bind();
  }),
);

context.subscriptions.push(
  vscode.commands.registerCommand('rangelink.unbindTerminal', () => {
    terminalBindingManager.unbind();
  }),
);

// AFTER - Register commands for each destination type
context.subscriptions.push(
  vscode.commands.registerCommand('rangelink.bindToTerminal', async () => {
    await destinationManager.bind('terminal');
  }),
);

context.subscriptions.push(
  vscode.commands.registerCommand('rangelink.bindToClaudeCode', async () => {
    await destinationManager.bind('claude-code');
  }),
);

context.subscriptions.push(
  vscode.commands.registerCommand('rangelink.bindToCursorAI', async () => {
    await destinationManager.bind('cursor-ai');
  }),
);

context.subscriptions.push(
  vscode.commands.registerCommand('rangelink.unbindDestination', () => {
    destinationManager.unbind();
  }),
);
```

**Additional command (optional):** QuickPick for user-friendly binding

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('rangelink.bindToDestination', async () => {
    const items = factory.getSupportedTypes().map((type) => ({
      label: factory.getDisplayNames()[type],
      description: type,
      type: type,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select destination for RangeLink auto-paste',
    });

    if (selected) {
      await destinationManager.bind(selected.type);
    }
  }),
);
```

---

### Phase 4: Settings & Configuration (0.5-1 day)

**Goal:** Update configuration schema and implement migration.

#### Step 4.1: Update package.json

**File:** `packages/rangelink-vscode-extension/package.json`

**New configuration:**

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "rangelink.autoPaste.destinationType": {
          "type": "string",
          "enum": ["none", "terminal", "claude-code", "cursor-ai"],
          "default": "none",
          "description": "Where to automatically paste RangeLinks when created",
          "enumDescriptions": [
            "Disabled - Copy to clipboard only",
            "Active terminal (must be bound via command)",
            "Claude Code chat input",
            "Cursor AI assistant input"
          ]
        },
        "rangelink.autoPaste.boundTerminal": {
          "type": ["string", "null"],
          "default": null,
          "description": "(Internal) Name of bound terminal - managed by extension",
          "markdownDeprecationMessage": "**Deprecated:** This setting is now managed automatically. Use `rangelink.autoPaste.destinationType` instead."
        }
      }
    },
    "commands": [
      {
        "command": "rangelink.bindToTerminal",
        "title": "RangeLink: Bind terminal for auto-paste"
      },
      {
        "command": "rangelink.bindToClaudeCode",
        "title": "RangeLink: Bind Claude Code chat for auto-paste"
      },
      {
        "command": "rangelink.bindToCursorAI",
        "title": "RangeLink: Bind Cursor AI for auto-paste"
      },
      {
        "command": "rangelink.bindToDestination",
        "title": "RangeLink: Choose paste destination..."
      },
      {
        "command": "rangelink.unbindDestination",
        "title": "RangeLink: Unbind paste destination"
      }
    ]
  }
}
```

**Backward compatibility:**

- Keep `boundTerminal` setting (mark deprecated)
- Migration reads it once and updates `destinationType`

#### Step 4.2: Implement Settings Migration

**New file:** `packages/rangelink-vscode-extension/src/utils/migrateSettings.ts`

```typescript
const MIGRATION_KEY = 'rangelink.settingsMigrated.v2';

export const migrateSettingsIfNeeded = async (
  context: vscode.ExtensionContext,
  logger: Logger,
): Promise<void> => {
  const migrated = context.globalState.get<boolean>(MIGRATION_KEY, false);

  if (migrated) {
    logger.debug({ fn: 'migrateSettingsIfNeeded' }, 'Settings already migrated');
    return;
  }

  const config = vscode.workspace.getConfiguration('rangelink');
  const boundTerminal = config.get<string | null>('autoPaste.boundTerminal');

  if (boundTerminal) {
    logger.info(
      { fn: 'migrateSettingsIfNeeded', boundTerminal },
      'Migrating legacy terminal binding setting',
    );

    // Migrate: boundTerminal set → destinationType = 'terminal'
    await config.update('autoPaste.destinationType', 'terminal', vscode.ConfigurationTarget.Global);

    // Keep terminal name for future reference (don't delete)
    // User might want to rebind to same terminal later

    vscode.window.showInformationMessage(
      'RangeLink: Your terminal binding has been migrated to the new system. ' +
        'Use "RangeLink: Bind terminal" to re-bind.',
    );
  } else {
    logger.debug({ fn: 'migrateSettingsIfNeeded' }, 'No legacy settings to migrate');
  }

  // Mark migration complete
  await context.globalState.update(MIGRATION_KEY, true);
  logger.info({ fn: 'migrateSettingsIfNeeded' }, 'Settings migration complete');
};
```

**Call from extension.ts:**

```typescript
export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('RangeLink');
  const vscodeLogger = new VSCodeLogger(outputChannel);
  setLogger(vscodeLogger);

  // Migrate settings from v1 to v2
  await migrateSettingsIfNeeded(context, getLogger());

  // ... rest of activation
}
```

---

### Phase 5: Documentation & Polish (1 day)

**Goal:** Update all documentation to reflect universal paste feature.

#### Step 5.1: Update README

**File:** `packages/rangelink-vscode-extension/README.md`

**New sections:**

```markdown
### Auto-Paste to AI Assistants

RangeLink can automatically paste generated links to your preferred destination:

- **Terminal** - Paste to active terminal (original feature)
- **Claude Code** - Paste directly to Claude Code chat input
- **Cursor AI** - Paste to Cursor's integrated AI assistant

**How to use:**

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run `RangeLink: Choose paste destination...`
3. Select your preferred destination (Terminal, Claude Code, or Cursor AI)
4. Create a RangeLink - it will automatically paste to your chosen destination!

**Why use RangeLink with AI tools?**

✅ **Precise references** - Line and column numbers, not vague selections
✅ **Universal format** - One notation works across all tools (Cursor, Claude Code, terminal, ChatGPT)
✅ **Validation workflow** - Click RangeLinks in your prompts to verify code before sending
✅ **Productivity boost** - Faster than CMD+L, more accurate than screenshots

**Comparison: CMD+L vs RangeLink**

| Feature               | CMD+L (Cursor/VSCode)     | RangeLink                                     |
| --------------------- | ------------------------- | --------------------------------------------- |
| Line precision        | ❌ Captures visible range | ✅ Exact line/column ranges                   |
| Multi-range           | ❌ Continuous blocks only | ✅ Multiple disjoint ranges                   |
| Cross-editor          | ❌ Editor-specific        | ✅ Works everywhere (terminal, ChatGPT, etc.) |
| Click to verify       | ❌ No link back to code   | ✅ Clickable links in prompts                 |
| Rectangular selection | ❌ Not supported          | ✅ Column-based selections                    |

### Commands

| Command                                   | Description                      | Keyboard Shortcut |
| ----------------------------------------- | -------------------------------- | ----------------- |
| `RangeLink: Choose paste destination...`  | Select where to auto-paste links | -                 |
| `RangeLink: Bind terminal for auto-paste` | Bind active terminal             | -                 |
| `RangeLink: Bind Claude Code chat`        | Bind Claude Code input           | -                 |
| `RangeLink: Bind Cursor AI`               | Bind Cursor assistant            | -                 |
| `RangeLink: Unbind paste destination`     | Disable auto-paste               | -                 |
```

#### Step 5.2: Update DEVELOPMENT.md

Add troubleshooting section:

```markdown
## Troubleshooting: Universal Paste

### Claude Code paste not working

1. Check extension is installed: `code --list-extensions | grep anthropic.claude-code`
2. Check extension is active: Open Claude Code panel first
3. Check logs: Output → RangeLink → Look for "ClaudeCodeDestination.paste"

### Cursor AI paste not working

1. Verify you're running Cursor (not VSCode): Check `vscode.env.appName`
2. Try standard chat command: `workbench.action.chat.open`
3. Check logs for Cursor-specific command failures

### Links not clickable in chat

**Expected behavior:** Plain text links in chat input won't be clickable until message is sent.

**After sending message:** Links should be clickable in chat history (markdown rendering).

**Workaround:** Use markdown syntax manually:
```

[src/file.ts#L10](src/file.ts#L10)

```

```

#### Step 5.3: Update ROADMAP.md

Mark Phase 1 complete, add Phase 2 plans:

```markdown
## Phase 1: Universal Paste Destinations ✅ Complete

- ✅ Generic destination abstraction (`PasteDestination` interface)
- ✅ Claude Code chat integration
- ✅ Cursor AI assistant integration
- ✅ Terminal binding (backward compatible)
- ✅ Settings migration from v1 to v2
- ✅ Command palette integration
- ✅ Comprehensive documentation

## Phase 2: Enhanced Clickability & External Tools (Future)

- ⏳ Custom webview link handlers (if VSCode API supports)
- ⏳ OS-wide `rangelink://` protocol handler (macOS, Windows, Linux)
- ⏳ Browser extension for ChatGPT/Claude.ai integration
- ⏳ Template system for destination-specific formatting
- ⏳ Multi-destination paste (clipboard + chat simultaneously)
```

---

## File Structure Changes

### New Files

```
packages/rangelink-vscode-extension/src/
├── destinations/
│   ├── PasteDestination.ts              # Interface definition
│   ├── DestinationFactory.ts            # Factory for creating destinations
│   ├── PasteDestinationManager.ts       # Generic binding manager
│   ├── TerminalDestination.ts           # Terminal paste implementation
│   ├── ClaudeCodeDestination.ts         # Claude Code chat implementation
│   └── CursorAIDestination.ts           # Cursor AI implementation
├── utils/
│   └── migrateSettings.ts               # Settings migration utility
└── __tests__/
    └── destinations/
        ├── TerminalDestination.test.ts
        ├── ClaudeCodeDestination.test.ts
        ├── CursorAIDestination.test.ts
        ├── DestinationFactory.test.ts
        └── PasteDestinationManager.test.ts
```

### Modified Files

```
packages/rangelink-vscode-extension/
├── src/
│   ├── extension.ts                     # Update to use PasteDestinationManager
│   └── RangeLinkService.ts              # Update copyAndNotify() method
├── package.json                         # New commands, settings, deprecated fields
└── README.md                            # Add universal paste documentation
```

### Deleted Files

```
packages/rangelink-vscode-extension/src/
└── TerminalBindingManager.ts            # Replaced by PasteDestinationManager + TerminalDestination
```

**Note:** Delete after migration complete and tests passing.

---

## Testing Strategy

### Unit Test Coverage

**Target:** 99%+ coverage (maintain current standard)

**New test files:**

1. **TerminalDestination.test.ts** (25 tests)
   - Interface contract (isAvailable, paste)
   - Padding behavior
   - Terminal focus
   - Error handling (no terminal bound)

2. **ClaudeCodeDestination.test.ts** (20 tests)
   - Extension detection
   - Command execution
   - Error handling (extension not installed)
   - Graceful failure

3. **CursorAIDestination.test.ts** (20 tests)
   - Environment detection
   - Command execution
   - Fallback behavior
   - Non-Cursor environment handling

4. **DestinationFactory.test.ts** (10 tests)
   - Factory creates correct destination types
   - Display names mapping
   - Supported types list

5. **PasteDestinationManager.test.ts** (30 tests)
   - Binding/unbinding
   - Destination switching
   - Terminal closure events
   - Status messages

**Total:** ~105 new unit tests

### Integration Testing

**Manual test scenarios:**

1. **Terminal binding (regression)**
   - [ ] Bind terminal via command
   - [ ] Create link → verify paste to terminal
   - [ ] Close terminal → verify auto-unbind
   - [ ] Create link → verify no paste (destination gone)

2. **Claude Code binding**
   - [ ] Install Claude Code extension
   - [ ] Bind via command
   - [ ] Create link → verify paste to chat input
   - [ ] Verify padding (can continue typing)
   - [ ] Uninstall Claude Code → verify error message

3. **Cursor AI binding**
   - [ ] Open Cursor IDE
   - [ ] Bind Cursor AI destination
   - [ ] Create link → verify paste to AI assistant
   - [ ] Run in VSCode → verify error message

4. **Destination switching**
   - [ ] Bind terminal → paste → unbind
   - [ ] Bind Claude Code → paste
   - [ ] Try to bind Cursor while Claude bound → verify error
   - [ ] Unbind → bind terminal again

5. **Settings migration**
   - [ ] Set `boundTerminal: "bash"` in settings
   - [ ] Reload window
   - [ ] Verify migration message
   - [ ] Verify `destinationType: "terminal"` set
   - [ ] Verify terminal binding works

6. **QuickPick command**
   - [ ] Run "Choose paste destination"
   - [ ] Verify 3 options shown
   - [ ] Select Claude Code
   - [ ] Verify binding succeeds

### Performance Testing

**Metrics to track:**

- Extension activation time (should not increase significantly)
- Paste latency (< 100ms for terminal, < 300ms for chat commands)
- Memory usage (destination instances should be lightweight)

**Benchmarks:**

```bash
# Before refactor
Extension activation: 120ms

# After refactor (target)
Extension activation: < 150ms
```

---

## Migration & Backward Compatibility

### Breaking Changes

**NONE** - This is a non-breaking change.

### Deprecated Features

- `rangelink.autoPaste.boundTerminal` setting (still works, but deprecated)
- `rangelink.unbindTerminal` command (aliased to `unbindDestination`)

### Migration Path

**Scenario 1: User has terminal bound**

```json
// Before
{
  "rangelink.autoPaste.boundTerminal": "bash"
}

// After automatic migration
{
  "rangelink.autoPaste.boundTerminal": "bash",  // Kept for reference
  "rangelink.autoPaste.destinationType": "terminal"
}
```

**Migration notification:**

> "RangeLink: Your terminal binding has been migrated to the new system. Use 'RangeLink: Bind terminal' to re-bind."

**Scenario 2: User has no binding**

No migration needed. `destinationType` defaults to `"none"`.

### Rollback Plan

If critical issues arise post-release:

1. Keep `TerminalBindingManager.ts` in git history
2. Revert commits in reverse order:
   - Phase 5 (docs) - safe to revert
   - Phase 4 (settings) - requires careful schema revert
   - Phase 3 (manager) - restore `TerminalBindingManager`
   - Phase 2 (chat destinations) - delete chat classes
   - Phase 1 (abstraction) - delete interfaces

**Git strategy:**

- Merge phases as separate commits (atomic)
- Tag before each merge: `v1.x.0-phase1`, `v1.x.0-phase2`, etc.

---

## Documentation Updates

### Files to Update

1. **README.md** (packages/rangelink-vscode-extension/)
   - [ ] Add "Auto-Paste to AI Assistants" section
   - [ ] Add comparison table: CMD+L vs RangeLink
   - [ ] Update commands table
   - [ ] Add troubleshooting section

2. **DEVELOPMENT.md**
   - [ ] Add troubleshooting for chat destinations
   - [ ] Document Cursor detection logic
   - [ ] Add manual testing checklist

3. **ROADMAP.md**
   - [ ] Mark Phase 1 complete
   - [ ] Add Phase 2 plans
   - [ ] Move terminal binding to "completed" section

4. **JOURNEY.md** (after Phase 5 complete)
   - [ ] Copy completed work from ROADMAP
   - [ ] Document key architectural decisions
   - [ ] Include performance metrics

5. **New file: RESEARCH-UNIVERSAL-PASTE.md** ✅ Already created
   - Contains research findings
   - API investigation results
   - Technical feasibility analysis

6. **New file: PLAN-UNIVERSAL-PASTE.md** ✅ This document

### VSCode Marketplace Description

**New tagline:**

> "Precise code linking for AI tools, terminals, and editors. One notation, every destination."

**Updated features list:**

- ✅ Auto-paste to Claude Code, Cursor AI, or terminal
- ✅ Clickable links with exact line/column navigation
- ✅ Rectangular selections (column-based ranges)
- ✅ Multi-range links (disjoint code sections)
- ✅ Portable links with embedded delimiters
- ✅ Customizable delimiter configuration

---

## Marketing & Positioning

### Target Audience

1. **AI-assisted developers** (primary)
   - Use Claude Code, Cursor, GitHub Copilot Chat daily
   - Want precise references in prompts
   - Need to verify AI suggestions against original code

2. **Terminal power users** (existing)
   - Already use RangeLink for terminal workflows
   - Benefit from universal paste upgrade

3. **Code reviewers / pair programmers** (secondary)
   - Share exact code references in Slack, GitHub comments
   - Need clickable links that work across tools

### Value Proposition

**Tagline:** "RangeLink: Universal code references for AI tools and terminals"

**Elevator pitch:**

> "CMD+L is convenient but imprecise. RangeLink generates exact line and column references that work everywhere: Cursor, Claude Code, terminals, ChatGPT, and any text editor. Plus, links are clickable—verify your prompts instantly."

### Positioning Against Competitors

| Feature            | CMD+L (Cursor)                     | VSCode Selection  | RangeLink                |
| ------------------ | ---------------------------------- | ----------------- | ------------------------ |
| **Precision**      | Captures visible range (ambiguous) | No link format    | Exact L10C5-L20C15       |
| **Universality**   | Editor-specific                    | No sharing format | Works everywhere         |
| **Validation**     | No click-back                      | N/A               | Click to navigate        |
| **AI integration** | Inline only                        | Manual copy/paste | Auto-paste to chat       |
| **Multi-range**    | Continuous blocks                  | Manual selection  | Multiple disjoint ranges |

### Key Messages

**Message 1: Precision**

> "Stop sending ambiguous code references. RangeLink's line and column notation ensures AI knows exactly what you're referring to."

**Message 2: Universality**

> "One notation, every tool. RangeLink works in Cursor, Claude Code, terminals, ChatGPT, GitHub comments, and Slack."

**Message 3: Productivity**

> "Click RangeLinks in your prompts to jump back to code. Verify AI suggestions before applying changes."

### Content Ideas (Phase 2)

- [ ] Blog post: "Why CMD+L Isn't Enough: The Case for Precise Code References"
- [ ] Video demo: "RangeLink + Claude Code workflow"
- [ ] Comparison guide: "CMD+L vs RangeLink" (detailed)
- [ ] Tutorial: "Setting up RangeLink with Cursor AI"

---

## Success Criteria

### Functional Requirements

- [ ] Users can bind Claude Code chat destination
- [ ] Users can bind Cursor AI assistant destination
- [ ] Terminal binding continues working (backward compatible)
- [ ] Only one destination bound at a time
- [ ] Auto-paste includes padding (space before/after link)
- [ ] Destination focus after paste (user can continue typing)
- [ ] Settings migration from v1 to v2 succeeds
- [ ] All new commands appear in command palette

### Quality Requirements

- [ ] 99%+ test coverage maintained
- [ ] All existing tests pass (no regressions)
- [ ] Extension activation time < 150ms
- [ ] Paste latency < 300ms for chat commands
- [ ] No memory leaks (destination instances properly disposed)
- [ ] Error messages are user-friendly

### Documentation Requirements

- [ ] README updated with universal paste section
- [ ] Comparison table: CMD+L vs RangeLink
- [ ] Troubleshooting guide for chat destinations
- [ ] DEVELOPMENT.md updated with integration testing
- [ ] ROADMAP.md reflects Phase 1 completion

### User Experience Requirements

- [ ] Binding commands are intuitive (clear naming)
- [ ] Error messages guide users (e.g., "extension not installed")
- [ ] Status bar messages confirm actions (e.g., "✓ Bound to Claude Code")
- [ ] Migration is seamless (no manual intervention)
- [ ] QuickPick menu is user-friendly

### Release Checklist

- [ ] All phases complete and tested
- [ ] README and docs updated
- [ ] CHANGELOG.md entry added
- [ ] Version bump (e.g., 1.2.0 → 1.3.0)
- [ ] Git tags created for each phase
- [ ] VSCode marketplace description updated
- [ ] Release notes published

---

## Appendix

### API References

**VSCode Commands:**

- `workbench.action.chat.open` - [Documentation](https://code.visualstudio.com/api/references/commands)
- `vscode.extensions.getExtension()` - [API Reference](https://code.visualstudio.com/api/references/vscode-api#extensions)

**Extension IDs:**

- Claude Code: `Anthropic.claude-code`
- Cursor: Detection via `vscode.env.appName`

### Research Links

- Research document: `docs/RESEARCH-UNIVERSAL-PASTE.md`
- User questions: `.claude-questions/0013-universal-paste-destinations-design.txt`
- Technical feasibility: `.claude-questions/0014-universal-paste-technical-feasibility.txt`

### Timeline Estimate

| Phase                        | Estimated Time | Cumulative |
| ---------------------------- | -------------- | ---------- |
| Phase 0: Preparation         | 0.5 days       | 0.5 days   |
| Phase 1: Core Abstraction    | 1-2 days       | 2.5 days   |
| Phase 2: Chat Destinations   | 1-2 days       | 4.5 days   |
| Phase 3: Destination Manager | 1-2 days       | 6.5 days   |
| Phase 4: Settings & Config   | 0.5-1 day      | 7.5 days   |
| Phase 5: Documentation       | 1 day          | 8.5 days   |

**Total: ~8-9 days** (1.5-2 weeks)

### Risk Mitigation Summary

| Risk                   | Mitigation                                   |
| ---------------------- | -------------------------------------------- |
| VSCode API unavailable | Document minimum version requirement         |
| Cursor incompatibility | Fallback to standard commands, log errors    |
| Breaking changes       | Atomic commits, git tags, rollback plan      |
| User confusion         | Clear error messages, migration notification |
| Performance regression | Benchmark activation time, monitor metrics   |

---

## Next Steps

**Awaiting approval for:**

1. ✅ Research findings (docs/RESEARCH-UNIVERSAL-PASTE.md)
2. ✅ Implementation plan (this document)

**Upon approval:**

1. Create feature branch: `feature/universal-paste`
2. Begin Phase 1 implementation
3. Commit after each phase (atomic changes)
4. Tag releases: `v1.x.0-phase1`, etc.
5. Open PR for review after Phase 5

**Questions or concerns?** See `.claude-questions/0013` and `.claude-questions/0014` for detailed design discussions.
