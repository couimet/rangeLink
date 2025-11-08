# Research: Universal Paste Destinations

**Date:** 2025-11-08
**Status:** Complete
**Related Questions:** `.claude-questions/0013-universal-paste-destinations-design.txt`, `.claude-questions/0014-universal-paste-technical-feasibility.txt`

## Executive Summary

Universal paste destinations for RangeLink are **technically feasible** using VSCode's built-in APIs. The implementation can be achieved by extending the current `TerminalBindingManager` pattern to support multiple destination types.

**Key Finding:** VSCode provides `workbench.action.chat.open` command that accepts a `query` parameter, enabling programmatic text insertion into chat inputs with automatic focus handling.

## Current Implementation Analysis

### Terminal Binding Pattern (Baseline)

**File:** `packages/rangelink-vscode-extension/src/TerminalBindingManager.ts#L109-L136`

```typescript
sendToTerminal(text: string): boolean {
  const paddedText = ` ${text} `;
  this.boundTerminal.sendText(paddedText, false); // false = don't auto-submit
  this.boundTerminal.show(false); // Auto-focus terminal
  return true;
}
```

**Key behaviors:**
- Front/back space padding for UX
- No auto-submit (user must press Enter)
- Automatic focus to destination after paste
- Silent failure if terminal closed

### Link Provider System

**File:** `packages/rangelink-vscode-extension/src/extension.ts#L74-L86`

DocumentLinkProvider registered for:
- `{ scheme: 'file' }` - Regular files
- `{ scheme: 'untitled' }` - Unsaved/scratchpad files

**Important limitation:** DocumentLinkProvider only works for TextDocument schemes, NOT webview-based chat panels.

## VSCode API Research Findings

### 1. Chat Input Text Insertion ✅ FEASIBLE

**Command:** `workbench.action.chat.open`

**Signature:**
```typescript
vscode.commands.executeCommand('workbench.action.chat.open', {
  query: string;  // Pre-filled text in chat input
  previousRequests?: any[];  // Optional chat history
});
```

**Source:** [Built-in Commands documentation](https://code.visualstudio.com/api/references/commands)

**Behavior:**
- Opens chat panel if closed
- Pre-fills input field with provided query text
- Sets focus to chat input (user can continue typing)
- Does NOT auto-submit (matches terminal behavior ✅)

**Example:**
```typescript
await vscode.commands.executeCommand('workbench.action.chat.open', {
  query: ' src/auth.ts#L42C10-L55C15 '  // Note: padded with spaces
});
```

### 2. Extension Detection ✅ FEASIBLE

**API:** `vscode.extensions.getExtension(extensionId)`

**Claude Code Extension ID:** `Anthropic.claude-code`

**Usage:**
```typescript
const isClaudeCodeInstalled = (): boolean => {
  const extension = vscode.extensions.getExtension('Anthropic.claude-code');
  return extension !== undefined && extension.isActive;
};
```

**Note:** Extension ID is case-sensitive (`Anthropic` with capital A).

### 3. Cursor Compatibility ✅ COMPATIBLE

Cursor is built on VSCode (fork of Code OSS), so:
- All `vscode.*` APIs available
- `workbench.action.chat.open` should work for Cursor's AI assistant
- Same extension detection pattern applies

**Unknown:** Whether Cursor's AI panel uses a different command namespace. This requires runtime testing.

### 4. Link Clickability in Chat Views ⚠️ PARTIAL SUPPORT

**Current limitation:** DocumentLinkProvider does NOT work in chat webviews.

**Why:**
- DocumentLinkProvider only supports TextDocument schemes (`file`, `untitled`, `vscode-notebook-cell`)
- Chat panels use custom webviews (not TextDocuments)
- Webviews have isolated rendering contexts

**Workarounds:**

#### Option A: Markdown Link Syntax (Recommended)
Paste links as markdown to leverage VSCode's built-in markdown renderer:

```markdown
[src/auth.ts#L42C10](src/auth.ts#L42C10)
```

**Pros:**
- VSCode markdown renderer automatically makes file paths clickable
- Works in chat history after message sent
- No additional implementation needed

**Cons:**
- Requires markdown formatting (breaks simple text paste requirement from Q1)
- User specified plain text only in `.claude-questions/0013`

#### Option B: rangelink:// URI Protocol (Recommended for MVP)
Use custom URI scheme that VSCode already handles:

```
rangelink://src/auth.ts#L42C10
```

**Current implementation:** `packages/rangelink-vscode-extension/src/extension.ts` already registers `rangelink.handleDocumentLinkClick` command.

**Pros:**
- Clean syntax (no markdown wrapper)
- Consistent with portable link format
- Works across all contexts

**Cons:**
- Requires user to manually add `rangelink://` prefix if they want clickability
- Not automatically detected in chat webviews

#### Option C: Leave as Plain Text (MVP Approach - RECOMMENDED)
Per user requirements (Q1 answer): Paste plain text only.

**Implication:** Links in chat won't be clickable via DocumentLinkProvider, BUT:
- User can Cmd+Click on plain paths like `src/file.ts` (VSCode native behavior)
- User can copy/paste link to editor file for validation (current workflow)
- User can use terminal link provider if needed

**Conclusion:** Option C for MVP. Defer enhanced clickability to Phase 2.

## Implementation Pattern: Destination Abstraction

### Proposed Architecture

**Generic interface:**
```typescript
interface PasteDestination {
  readonly id: string;
  readonly displayName: string;

  isAvailable(): Promise<boolean>;
  paste(text: string): Promise<boolean>;
}
```

**Concrete implementations:**
```typescript
class TerminalDestination implements PasteDestination {
  async paste(text: string): Promise<boolean> {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) return false;
    terminal.sendText(` ${text} `, false);
    terminal.show(false);
    return true;
  }
}

class ChatDestination implements PasteDestination {
  async paste(text: string): Promise<boolean> {
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: ` ${text} `  // Padded like terminal
    });
    return true;
  }
}

class CursorAIDestination implements PasteDestination {
  async paste(text: string): Promise<boolean> {
    // Try VSCode chat command (Cursor uses same codebase)
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: ` ${text} `
      });
      return true;
    } catch {
      // Fallback: try cursor-specific command if exists
      return false;
    }
  }
}
```

### Binding Manager Refactor

**Current:** `TerminalBindingManager` (terminal-specific)

**Proposed:** `PasteDestinationManager` (generic)

```typescript
class PasteDestinationManager {
  private boundDestination: PasteDestination | undefined;

  async bind(destinationType: DestinationType): Promise<boolean> {
    const destination = this.createDestination(destinationType);
    if (!await destination.isAvailable()) {
      vscode.window.showErrorMessage(`${destination.displayName} not available`);
      return false;
    }
    this.boundDestination = destination;
    return true;
  }

  async sendToDestination(text: string): Promise<boolean> {
    if (!this.boundDestination) return false;
    return this.boundDestination.paste(text);
  }

  private createDestination(type: DestinationType): PasteDestination {
    switch (type) {
      case 'terminal': return new TerminalDestination();
      case 'claude-code': return new ChatDestination();
      case 'cursor-ai': return new CursorAIDestination();
    }
  }
}
```

## Configuration Schema

### Proposed Settings

**Option:** Keep it simple (per Q6 answer)

```json
{
  "rangelink.autoPaste.destinationType": {
    "type": "string",
    "enum": ["none", "terminal", "claude-code", "cursor-ai"],
    "default": "none",
    "description": "Where to automatically paste RangeLinks when created"
  },
  "rangelink.autoPaste.boundTerminal": {
    "type": "string",
    "description": "Name of bound terminal (only used if destinationType=terminal)"
  }
}
```

**Backward compatibility:**
- If `boundTerminal` exists, auto-migrate to `destinationType: "terminal"`
- Migration happens on extension activation

## Testing Strategy

### Unit Tests Required

1. **Destination abstraction:**
   - `ChatDestination.paste()` calls correct command with padded text
   - `TerminalDestination.paste()` preserves existing behavior
   - `isAvailable()` correctly detects extension presence

2. **Binding manager:**
   - Binding switches between destination types
   - Only one destination bound at a time
   - Unbinding clears state correctly

3. **Migration:**
   - Legacy `boundTerminal` setting migrates to new schema
   - No data loss during migration

### Integration Tests Required

1. **Command execution:**
   - `workbench.action.chat.open` successfully opens chat
   - Text appears in chat input with correct padding
   - Focus moves to chat input after paste

2. **Multi-destination switching:**
   - Bind terminal → paste → unbind → bind chat → paste
   - State persistence across window reloads

3. **Extension detection:**
   - Correctly identifies Claude Code installation
   - Handles missing extensions gracefully

### Manual Testing Checklist

- [ ] Paste to Claude Code chat in VSCode
- [ ] Paste to Cursor AI assistant
- [ ] Paste to terminal (regression test)
- [ ] Unbind and rebind different destinations
- [ ] Test with Claude Code not installed
- [ ] Test with Cursor (if available)
- [ ] Verify link clickability in chat history (observe native behavior)
- [ ] Test padding (can continue typing after paste)

## Open Questions & Phase 2 Considerations

### Q1: Cursor-specific commands

**Question:** Does Cursor use `workbench.action.chat.open` or custom commands?

**Resolution:** Implement with `workbench.action.chat.open`, add logging to detect command failures, document Cursor-specific adjustments if needed.

### Q2: Enhanced link clickability

**Deferred to Phase 2** (per Q7, Q8 answers):

- Custom webview link handler registration
- Browser extension for web-based AI tools (ChatGPT, Claude.ai)
- OS-wide `rangelink://` protocol handler

### Q3: Multi-destination paste

**Current scope:** One destination at a time (per Q9 answer)

**Future:** Allow simultaneous paste to clipboard + chat, or clipboard + terminal

### Q4: Template system

**Current scope:** Simple on/off toggle (per Q6 answer)

**Future:**
```json
{
  "rangelink.autoPaste.templates": {
    "claude-code": " ${link} ",
    "terminal": " ${link} ",
    "cursor-ai": "${link}\n" // Example: newline instead of trailing space
  }
}
```

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| `workbench.action.chat.open` command not available in older VSCode | Medium | Document minimum VSCode version requirement |
| Cursor uses different chat command | Medium | Implement try/catch fallback, log errors |
| Chat webview doesn't auto-focus after command | Low | Document as known limitation |
| Breaking change for terminal binding users | High | **AVOID**: Keep terminal binding backward compatible |

## Recommendations

### Phase 1 MVP Scope

1. ✅ Implement generic `PasteDestinationManager`
2. ✅ Add `ChatDestination` using `workbench.action.chat.open`
3. ✅ Keep `TerminalDestination` (backward compatible)
4. ✅ Add binding commands: `rangelink.bindToChat`, `rangelink.bindToCursorAI`
5. ✅ Migrate settings schema with backward compatibility
6. ✅ Plain text paste only (no markdown formatting)
7. ⚠️ Document link clickability limitation in README

### Phase 2 Enhancements

1. Custom webview link handlers (if VSCode API evolves)
2. OS-wide protocol handler for external tools
3. Template system for paste formatting
4. Multi-destination paste support

### Non-Goals (Out of Scope)

- Detecting active chat panel automatically (user explicitly binds)
- Inserting code blocks or formatted markdown (plain text only)
- Supporting non-VSCode editors in Phase 1

## References

- [VSCode Built-in Commands](https://code.visualstudio.com/api/references/commands)
- [VSCode Extension API](https://code.visualstudio.com/api/references/vscode-api)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Claude Code Marketplace](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code)
- Current implementation: `packages/rangelink-vscode-extension/src/TerminalBindingManager.ts`
