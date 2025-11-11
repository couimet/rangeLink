# Research: VSCode and Cursor Chat Commands

**Date:** 2025-01-09
**Status:** Research Complete
**Purpose:** Verify chat commands for CursorAIDestination and GitHubCopilotDestination implementations

---

## Research Question

What commands can be used to programmatically open chat interfaces in VSCode and Cursor IDE for RangeLink auto-paste functionality?

## Findings

### 1. GitHub Copilot Chat Command

**Command:** `workbench.action.chat.open`

**Status:** ✅ Confirmed working (not officially documented in VSCode API reference, but widely used)

**Usage:**

```typescript
// Simple usage (string prompt)
vscode.commands.executeCommand('workbench.action.chat.open', 'Your prompt here');

// Advanced usage (object with options)
vscode.commands.executeCommand('workbench.action.chat.open', {
  query: '@participant /hello friend',
  previousRequests: [...], // Optional conversation context
});
```

**Parameters:**

- **String form:** Direct prompt text
- **Object form:**
  - `query: string` - The prompt text (can include participant references like `@workspace`)
  - `previousRequests?: []` - Optional array for conversation context

**Source:** [Stack Overflow: How to call GitHub Copilot Chat from my VS Code extension?](https://stackoverflow.com/questions/77739243/how-to-call-github-copilot-chat-from-my-vs-code-extension)

---

### 2. Official VSCode Chat Command

**Command:** `vscode.editorChat.start`

**Status:** ✅ Officially documented

**Description:** "Invoke a new editor chat session"

**Source:** [VSCode Built-in Commands Documentation](https://code.visualstudio.com/api/references/commands)

**Note:** This command is documented but less commonly used than `workbench.action.chat.open` for opening chat interfaces with pre-filled text.

---

### 3. Cursor IDE Compatibility

**Status:** ✅ VSCode commands should work (Cursor is a VSCode fork)

**Findings:**

- Cursor IDE is built on VSCode, maintaining compatibility with VSCode extensions
- Extensions work across "VS Code forks such as Insiders, Cursor, or Windsurf" (source: Codex IDE extension)
- Cursor uses `Cmd+L` / `Ctrl+L` as keyboard shortcut to open chat
- Forum reports mention "Show Cursor AI Chat" command works
- Some users reported issues with "Cursor: Open Chat" command (bug report from community forum)

**Cursor-Specific Commands:**

- No documented `cursor.chat` or `cursor.chat.open` commands found in official Cursor docs
- Cursor docs focus on user-defined slash commands (e.g., `/fix`, `/explain`), not programmatic extension commands
- **Assumption:** Cursor likely uses standard VSCode chat commands due to fork architecture

**Sources:**

- [Cursor Community Forum: Open Chat command not working](https://forum.cursor.com/t/cursor-open-chat-command-not-working/13921)
- [Cursor Docs: Commands](https://cursor.com/docs/agent/chat/commands) (no extension API info)

---

### 4. Related Commands

**Command:** `workbench.action.chat.newChat`

**Status:** Exists but not fully documented

**Purpose:** Start a new chat session (clears context)

**Issue:** GitHub issue #261118 mentions this command doesn't always reset chat on first run

**Source:** [GitHub Issue #261118](https://github.com/microsoft/vscode/issues/261118)

---

## Recommendations for Implementation

### For GitHubCopilotDestination

✅ **Use:** `workbench.action.chat.open` with object form

```typescript
await vscode.commands.executeCommand('workbench.action.chat.open', {
  query: paddedText,
});
```

**Why:**

- Confirmed working for GitHub Copilot Chat
- Widely used pattern in extensions
- Supports pre-filling chat input

---

### For CursorAIDestination

❌ **Update (Jan 2025):** `workbench.action.chat.open` does NOT work in Cursor

**Testing revealed:** The command `workbench.action.chat.open` is not available in Cursor IDE.

**Actual Cursor commands found:**

- `aichat.newchataction` - Opens chat panel (Cmd/Ctrl+L) but **cannot accept text parameters**
- `workbench.action.toggleAuxiliaryBar` - Toggles secondary sidebar (fallback)
- `aichat.opensidebar` - Opens chat sidebar with most recent session
- `cursor.startComposerPrompt` - Exists but doesn't accept prompt arguments

**Limitation:** No working command exists to programmatically send text to Cursor chat as of Jan 2025.

**Workaround implemented:**

1. Copy text to clipboard using `vscode.env.clipboard.writeText()`
2. Open chat panel using `aichat.newchataction` (with fallback to `toggleAuxiliaryBar`)
3. Show notification prompting user to paste with Cmd/Ctrl+V

**Detection:** Use `vscode.env.appName` check (primary method per Q3 answer: Option A)

---

## Implementation Status

### GitHubCopilotDestination

✅ **Uses:** `workbench.action.chat.open` with object parameter `{ query: text }`

- Status: Not yet implemented (planned)

### CursorAIDestination

✅ **Implemented** with clipboard workaround (Jan 2025)

- Clipboard API: `vscode.env.clipboard.writeText()`
- Chat commands: `aichat.newchataction` (primary) → `workbench.action.toggleAuxiliaryBar` (fallback)
- User notification: Shows "RangeLink copied to clipboard. Paste (Cmd/Ctrl+V) in Cursor chat to use."
- Tests: Full coverage with 11 test cases

---

## Risks and Mitigations

| Risk                                                | Likelihood            | Status      | Mitigation                                          |
| --------------------------------------------------- | --------------------- | ----------- | --------------------------------------------------- |
| `workbench.action.chat.open` doesn't work in Cursor | ~~Low~~ **CONFIRMED** | ✅ Resolved | Implemented clipboard workaround                    |
| Command is undocumented and may change              | Medium                | Ongoing     | Wrap in try/catch; graceful failure pattern         |
| Chat opens but doesn't focus input                  | Low                   | Acceptable  | User sees chat opened with notification             |
| Clipboard workaround adds friction                  | Medium                | Acceptable  | One extra keystroke (Cmd/Ctrl+V) is minimal UX cost |

---

## Lessons Learned (Jan 2025)

1. **VSCode fork ≠ full API compatibility:** Cursor doesn't support all VSCode commands
2. **Extension APIs limited:** Cursor's chat API is not exposed to extensions as of Jan 2025
3. **Clipboard workaround is standard:** Multiple extensions use this pattern when direct API unavailable
4. **Community forums valuable:** Found actual command names (`aichat.newchataction`) through forum research
5. **Test early:** Initial assumption about `workbench.action.chat.open` was incorrect

---

## Future Improvements

**If Cursor adds extension API for chat:**

- Monitor Cursor changelog for chat API additions
- Replace clipboard workaround with direct API call
- Keep tests for both implementations (backward compatibility)

**References for tracking:**

- Cursor Feature Request: [Adding text to chat from extension](https://forum.cursor.com/t/adding-text-to-chat-from-extension/43555)
- Cursor Feature Request: [Command for passing prompt to chat](https://forum.cursor.com/t/a-command-for-passing-a-prompt-to-the-chat/138049)
