import type * as vscode from 'vscode';

/**
 * Auto-unbind events, discriminated by `reason`. Each variant carries exactly
 * the URI context its trigger provides: file deletion knows only the old URI,
 * rename knows both URIs, and the close reasons carry none.
 */
export type AutoUnbindDetails =
  | { reason: 'editor-closed' }
  | { reason: 'terminal-closed' }
  | { reason: 'file-deleted'; oldUri: vscode.Uri }
  | { reason: 'file-renamed'; oldUri: vscode.Uri; newUri: vscode.Uri };
