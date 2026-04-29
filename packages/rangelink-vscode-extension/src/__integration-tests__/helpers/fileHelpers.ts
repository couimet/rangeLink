import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { getWorkspaceRoot, settle } from './testEnv';

let fileCounter = 0;

export const createWorkspaceFile = (descriptor: string, content: string): vscode.Uri => {
  fileCounter++;
  const filePath = path.join(
    getWorkspaceRoot(),
    `__rl-test-${descriptor}-${Date.now()}-${fileCounter}.txt`,
  );
  fs.writeFileSync(filePath, content, 'utf8');
  return vscode.Uri.file(filePath);
};

export const createAndOpenFile = async (
  descriptor: string,
  content: string,
  viewColumn?: vscode.ViewColumn,
  trackingArray?: vscode.Uri[],
): Promise<vscode.Uri> => {
  const uri = createWorkspaceFile(descriptor, content);
  trackingArray?.push(uri);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, {
    viewColumn: viewColumn ?? vscode.ViewColumn.One,
    preview: false,
  });
  await settle();
  return uri;
};

export const findTestItemsByPrefix = (
  items: Record<string, unknown>[],
  prefix: string,
): Record<string, unknown>[] =>
  items.filter(
    (item) =>
      item.itemKind === 'bindable' &&
      typeof item.label === 'string' &&
      (item.label as string).includes(prefix),
  );

export const createFileAt = (filename: string, content: string): vscode.Uri => {
  const filePath = path.join(getWorkspaceRoot(), filename);
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
