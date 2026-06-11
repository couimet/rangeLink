import type * as vscode from 'vscode';

/**
 * Narrow interface for components that only need to look up visible
 * editors by document URI.
 */
export interface VisibleEditorProvider {
  findVisibleEditorsByUri(uri: vscode.Uri): readonly vscode.TextEditor[];
}
