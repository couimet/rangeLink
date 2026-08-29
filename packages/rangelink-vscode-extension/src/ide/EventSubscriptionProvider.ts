import type * as vscode from 'vscode';

/**
 * Narrow interface for components that only need to register lifecycle
 * event listeners on terminals, documents, tabs, and file renames.
 */
export interface EventSubscriptionProvider {
  onDidCloseTerminal(listener: (terminal: vscode.Terminal) => void): vscode.Disposable;
  onDidCloseTextDocument(listener: (document: vscode.TextDocument) => void): vscode.Disposable;
  onDidChangeTabs(listener: (event: vscode.TabChangeEvent) => void): vscode.Disposable;
  onDidRenameFiles: (listener: (event: vscode.FileRenameEvent) => void) => vscode.Disposable;
}
