import { getWorkspaceRoot, settle } from './testEnv';

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

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
  const filePath = path.join(getWorkspaceRoot(), `__rl-test-${descriptor}-${Date.now()}-${fileCounter}.txt`);
  fs.writeFileSync(filePath, content, 'utf8');
  const uri = vscode.Uri.file(filePath);
  registerFileForCleanup(uri);
  return uri;
};

export const createAndOpenFile = async (descriptor: string, content: string, viewColumn?: vscode.ViewColumn): Promise<vscode.Uri> => {
  const uri = createWorkspaceFile(descriptor, content);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, {
    viewColumn: viewColumn ?? vscode.ViewColumn.One,
    preview: false,
  });
  await settle();
  return uri;
};

export const findTestItemsByPrefix = (items: Record<string, unknown>[], prefix: string): Record<string, unknown>[] =>
  items.filter((item) => item.itemKind === 'bindable' && typeof item.label === 'string' && (item.label as string).includes(prefix));

export const createFileAt = (filename: string, content: string): vscode.Uri => {
  const filePath = path.join(getWorkspaceRoot(), filename);
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  const uri = vscode.Uri.file(filePath);
  registerFileForCleanup(uri);
  return uri;
};

/**
 * Create a disposable subdirectory under the workspace root and track it for
 * removal by cleanupTrackedFiles (cleanupFiles rmSyncs it recursively, so any
 * files written beneath it — including same-named siblings in subfolders —
 * disappear with it). Use when a test needs several files whose individual
 * removal would otherwise be manual.
 */
export const createTempDir = (descriptor: string): string => {
  fileCounter++;
  const dirPath = path.join(getWorkspaceRoot(), `__rl-test-${descriptor}-${Date.now()}-${fileCounter}`);
  fs.mkdirSync(dirPath, { recursive: true });
  registerFileForCleanup(vscode.Uri.file(dirPath));
  return dirPath;
};

/**
 * Create a unique file inside a fresh tracked temp subdirectory (never the
 * workspace root). Root-first resolution then misses it (stat fails), so the
 * resolver has to find it via findFiles — which is what the filename-fallback
 * tests exercise. The whole subdirectory is removed at cleanup.
 */
export const createNestedWorkspaceFile = (descriptor: string, content: string): { filename: string; filePath: string; relativePath: string } => {
  fileCounter++;
  const filename = `__rl-test-${descriptor}-${Date.now()}-${fileCounter}.ts`;
  const filePath = path.join(createTempDir(descriptor), filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return { filename, filePath, relativePath: path.relative(getWorkspaceRoot(), filePath) };
};

/**
 * Create two same-named files, one under an `a/` and one under a `b/`
 * subdirectory of a fresh tracked temp dir, so a bare-filename link matches
 * two files. The candidate picker sorts paths ascending, so the `a/` copy is
 * the default first candidate. Everything is removed with the temp dir at
 * cleanup.
 */
export const createDuplicateFiles = (descriptor: string, content: string): { filename: string; filePathA: string; filePathB: string } => {
  fileCounter++;
  const filename = `__rl-test-${descriptor}-${Date.now()}-${fileCounter}.ts`;
  const parentDir = createTempDir(descriptor);
  const dirA = path.join(parentDir, 'a');
  const dirB = path.join(parentDir, 'b');
  fs.mkdirSync(dirA, { recursive: true });
  fs.mkdirSync(dirB, { recursive: true });
  const filePathA = path.join(dirA, filename);
  const filePathB = path.join(dirB, filename);
  fs.writeFileSync(filePathA, content, 'utf8');
  fs.writeFileSync(filePathB, content, 'utf8');
  return { filename, filePathA, filePathB };
};

/**
 * Rename a workspace file via vscode.workspace.applyEdit — the only rename path
 * that fires onDidRenameFiles (workspace.fs.rename does not). Registers the new
 * URI for cleanup since cleanupTrackedFiles only knows registered URIs.
 */
export const renameWorkspaceFile = async (oldUri: vscode.Uri, newBasename: string): Promise<vscode.Uri> => {
  const newUri = vscode.Uri.file(path.join(path.dirname(oldUri.fsPath), newBasename));
  const edit = new vscode.WorkspaceEdit();
  edit.renameFile(oldUri, newUri);
  await vscode.workspace.applyEdit(edit);
  registerFileForCleanup(newUri);
  return newUri;
};

/**
 * Rename a workspace file directly on disk (fs.renameSync). External renames
 * never fire onDidRenameFiles — the binding auto-unbinds via the file-delete
 * watcher fallback instead. Registers the new URI for cleanup since
 * cleanupTrackedFiles only knows registered URIs.
 */
export const renameWorkspaceFileOnDisk = (oldUri: vscode.Uri, newBasename: string): vscode.Uri => {
  const newUri = vscode.Uri.file(path.join(path.dirname(oldUri.fsPath), newBasename));
  fs.renameSync(oldUri.fsPath, newUri.fsPath);
  registerFileForCleanup(newUri);
  return newUri;
};

const PNG_MAGIC_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type PngFixtureMode = 'real-image' | 'magic-only';

export const createPngFixture = (descriptor: string, mode: PngFixtureMode = 'real-image'): vscode.Uri => {
  fileCounter++;
  const pngPath = path.join(getWorkspaceRoot(), `__rl-test-${descriptor}-${Date.now()}-${fileCounter}.png`);
  if (mode === 'real-image') {
    const extension = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');
    if (!extension) {
      throw new Error('createPngFixture(real-image) requires the RangeLink extension to be registered');
    }
    fs.copyFileSync(path.join(extension.extensionPath, 'icon.png'), pngPath);
  } else {
    fs.writeFileSync(pngPath, PNG_MAGIC_BYTES);
  }
  const uri = vscode.Uri.file(pngPath);
  registerFileForCleanup(uri);
  return uri;
};

export const openEditor = async (uri: vscode.Uri, viewColumn?: vscode.ViewColumn): Promise<vscode.TextEditor> => {
  const doc = await vscode.workspace.openTextDocument(uri);
  return vscode.window.showTextDocument(doc, viewColumn);
};

export const cleanupFiles = (uris: vscode.Uri[]): void => {
  for (const uri of uris) {
    try {
      // recursive + force so renamed-folder URIs (registered by renameWorkspaceFile) are removed too
      fs.rmSync(uri.fsPath, { recursive: true, force: true });
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
export const openSourceWithSelection = async (uri: vscode.Uri, viewColumn: vscode.ViewColumn): Promise<vscode.TextEditor> => {
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, viewColumn);
  const lastLine = doc.lineAt(doc.lineCount - 1);
  const endPos = lastLine.range.end;
  editor.selection = new vscode.Selection(new vscode.Position(0, 0), endPos);
  await settle();
  return editor;
};
