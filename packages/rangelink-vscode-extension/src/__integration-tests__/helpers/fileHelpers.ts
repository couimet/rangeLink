import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { getWorkspaceRoot, settle } from './testEnv';

let fileCounter = 0;

let fileCleanupRegistry: vscode.Uri[] = [];

const registerFileForCleanup = (uri: vscode.Uri): void => {
  fileCleanupRegistry.push(uri);
};

export const cleanupTrackedFiles = (): void => {
  cleanupFiles(fileCleanupRegistry);
  fileCleanupRegistry = [];
};

const ensureParentDir = (filePath: string): void => {
  const dir = path.dirname(filePath);
  if (dir !== getWorkspaceRoot()) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const createWorkspaceFile = (descriptor: string, content: string): vscode.Uri => {
  fileCounter++;
  const filePath = path.join(
    getWorkspaceRoot(),
    `__rl-test-${descriptor}-${Date.now()}-${fileCounter}.txt`,
  );
  fs.writeFileSync(filePath, content, 'utf8');
  const uri = vscode.Uri.file(filePath);
  registerFileForCleanup(uri);
  return uri;
};

export const createAndOpenFile = async (
  descriptor: string,
  content: string,
  viewColumn?: vscode.ViewColumn,
): Promise<vscode.Uri> => {
  const uri = createWorkspaceFile(descriptor, content);
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
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  const uri = vscode.Uri.file(filePath);
  registerFileForCleanup(uri);
  return uri;
};

const PNG_MAGIC_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type PngFixtureMode = 'real-image' | 'magic-only';

export const createPngFixture = (
  descriptor: string,
  mode: PngFixtureMode = 'real-image',
): vscode.Uri => {
  fileCounter++;
  const pngPath = path.join(
    getWorkspaceRoot(),
    `__rl-test-${descriptor}-${Date.now()}-${fileCounter}.png`,
  );
  if (mode === 'real-image') {
    const extension = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');
    if (!extension) {
      throw new Error(
        'createPngFixture(real-image) requires the RangeLink extension to be registered',
      );
    }
    fs.copyFileSync(path.join(extension.extensionPath, 'icon.png'), pngPath);
  } else {
    fs.writeFileSync(pngPath, PNG_MAGIC_BYTES);
  }
  const uri = vscode.Uri.file(pngPath);
  registerFileForCleanup(uri);
  return uri;
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

/**
 * Open a file as a source editor with a text selection, using a viewColumn
 * that avoids the VS Code test runner's focus-steal issue.
 *
 * In the automated test host, showTextDocument in an already-used column may
 * not transfer focus — the prior dest editor stays active. Using a fresh
 * column (one not occupied by dest-setup editors) works around this.
 *
 * Returns the editor so callers can dispatch paste/navigate commands.
 */
export const openSourceWithSelection = async (
  uri: vscode.Uri,
  viewColumn: vscode.ViewColumn,
): Promise<vscode.TextEditor> => {
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, viewColumn);
  const lastLine = doc.lineAt(doc.lineCount - 1);
  const endPos = lastLine.range.end;
  editor.selection = new vscode.Selection(new vscode.Position(0, 0), endPos);
  await settle();
  return editor;
};
