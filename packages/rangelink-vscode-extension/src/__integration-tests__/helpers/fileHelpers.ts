import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { getWorkspaceRoot } from './testEnv';

export const createWorkspaceFile = (descriptor: string, content: string): vscode.Uri => {
  const filePath = path.join(getWorkspaceRoot(), `__rl-test-${descriptor}-${Date.now()}.txt`);
  fs.writeFileSync(filePath, content, 'utf8');
  return vscode.Uri.file(filePath);
};

export const openEditor = async (
  uri: vscode.Uri,
  viewColumn?: vscode.ViewColumn,
): Promise<vscode.TextEditor> => {
  const doc = await vscode.workspace.openTextDocument(uri);
  return vscode.window.showTextDocument(doc, viewColumn);
};

export const cleanupFiles = (uris: vscode.Uri[]): void => {
  for (const uri of uris) {
    try {
      fs.unlinkSync(uri.fsPath);
    } catch {
      // best-effort cleanup
    }
  }
};

export const closeAllEditors = async (): Promise<void> => {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
};
