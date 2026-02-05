import type * as vscode from 'vscode';

import type { DestinationKind } from './DestinationKind';
import type { WithDestinationKind } from './WithDestinationKind';

/**
 * Bind to a specific terminal.
 * Caller must provide the terminal reference (from activeTerminal or picker selection).
 */
export interface TerminalBindOptions extends WithDestinationKind {
  readonly kind: Extract<DestinationKind, 'terminal'>;
  readonly terminal: vscode.Terminal;
}

/**
 * Bind to text editor.
 * Future: may include editor reference for specific editor targeting.
 */
export interface TextEditorBindOptions extends WithDestinationKind {
  readonly kind: Extract<DestinationKind, 'text-editor'>;
}

/**
 * Bind to Cursor AI composer panel.
 * Future: may include editor reference for specific panel targeting.
 */
export interface CursorAIBindOptions extends WithDestinationKind {
  readonly kind: Extract<DestinationKind, 'cursor-ai'>;
}

/**
 * Bind to GitHub Copilot Chat panel.
 * Future: may include editor reference for specific panel targeting.
 */
export interface CopilotChatBindOptions extends WithDestinationKind {
  readonly kind: Extract<DestinationKind, 'github-copilot-chat'>;
}

/**
 * Bind to Claude Code terminal.
 * Future: may include terminal reference for specific instance targeting.
 */
export interface ClaudeCodeBindOptions extends WithDestinationKind {
  readonly kind: Extract<DestinationKind, 'claude-code'>;
}

/**
 * Discriminated union for bind() method options.
 * Each destination kind can have its own specific fields.
 *
 * This pattern enables future-proof extensibility:
 * - Adding new fields to existing kinds (e.g., editor reference for text-editor)
 * - Adding new destination kinds with their own specific fields
 * - TypeScript enforces valid combinations at compile time
 *
 * Type safety: Each interface's kind field uses Extract<DestinationKind, 'x'>
 * which ensures compile-time failure if the literal doesn't exist in DestinationKind.
 */
export type BindOptions =
  | TerminalBindOptions
  | TextEditorBindOptions
  | CursorAIBindOptions
  | CopilotChatBindOptions
  | ClaudeCodeBindOptions;
