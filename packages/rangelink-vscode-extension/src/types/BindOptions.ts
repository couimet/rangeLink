import type * as vscode from 'vscode';

import type { DestinationType } from './DestinationType';

/**
 * Bind to a specific terminal.
 * Caller must provide the terminal reference (from activeTerminal or picker selection).
 */
interface TerminalBindOptions {
  readonly type: Extract<DestinationType, 'terminal'>;
  readonly terminal: vscode.Terminal;
}

/**
 * Bind to text editor.
 * Future: may include editor reference for specific editor targeting.
 */
interface TextEditorBindOptions {
  readonly type: Extract<DestinationType, 'text-editor'>;
}

/**
 * Bind to Cursor AI composer panel.
 * Future: may include editor reference for specific panel targeting.
 */
interface CursorAIBindOptions {
  readonly type: Extract<DestinationType, 'cursor-ai'>;
}

/**
 * Bind to GitHub Copilot Chat panel.
 * Future: may include editor reference for specific panel targeting.
 */
interface CopilotChatBindOptions {
  readonly type: Extract<DestinationType, 'github-copilot-chat'>;
}

/**
 * Bind to Claude Code terminal.
 * Future: may include terminal reference for specific instance targeting.
 */
interface ClaudeCodeBindOptions {
  readonly type: Extract<DestinationType, 'claude-code'>;
}

/**
 * Discriminated union for bind() method options.
 * Each destination type can have its own specific fields.
 *
 * This pattern enables future-proof extensibility:
 * - Adding new fields to existing types (e.g., editor reference for text-editor)
 * - Adding new destination types with their own specific fields
 * - TypeScript enforces valid combinations at compile time
 *
 * Type safety: Each interface's type field uses Extract<DestinationType, 'x'>
 * which ensures compile-time failure if the literal doesn't exist in DestinationType.
 */
export type BindOptions =
  | TerminalBindOptions
  | TextEditorBindOptions
  | CursorAIBindOptions
  | CopilotChatBindOptions
  | ClaudeCodeBindOptions;
