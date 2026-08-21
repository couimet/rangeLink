import { CMD_BIND_TO_TEXT_EDITOR_HERE } from '../../constants/commandIds';
import { renameWorkspaceFile, renameWorkspaceFileOnDisk, standardSuite } from '../helpers';

import * as path from 'node:path';
import * as vscode from 'vscode';

standardSuite('File Rename Auto-Unbind', (ss) => {
  test('file-rename-auto-unbind-001: renames bound file via applyEdit and verifies auto-unbind', async () => {
    const fileUri = ss.createWorkspaceFile('fra-001', 'line 1\nline 2\n');
    await ss.openEditor(fileUri, vscode.ViewColumn.One);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const destBasename = path.basename(fileUri.fsPath);
    const newBasename = `${path.basename(fileUri.fsPath, '.txt')}-renamed.txt`;
    const newUri = vscode.Uri.file(path.join(path.dirname(fileUri.fsPath), newBasename));

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `RangeLink: Unbound from Text Editor ("${destBasename}") — file renamed`,
    ]);
    ss.expectToastMessages([
      {
        level: 'warning',
        message: `Unbound from Text Editor ("${destBasename}") — file renamed: ${vscode.workspace.asRelativePath(fileUri, false)} → ${vscode.workspace.asRelativePath(newUri, false)}`,
      },
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': false });

    await renameWorkspaceFile(fileUri, newBasename);
    await ss.settle();

    ss.log('✓ File renamed via applyEdit — auto-unbind status bar and toast verified');
  });

  test('file-rename-auto-unbind-002: renaming an unrelated file keeps the binding', async () => {
    const boundUri = ss.createWorkspaceFile('fra-002', 'line 1\nline 2\n');
    const unrelatedUri = ss.createWorkspaceFile('fra-002-unrelated', 'unrelated content\n');
    await ss.openEditor(boundUri, vscode.ViewColumn.One);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const boundBasename = path.basename(boundUri.fsPath);

    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${boundBasename}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    await renameWorkspaceFile(unrelatedUri, `${path.basename(unrelatedUri.fsPath, '.txt')}-renamed.txt`);
    await ss.settle();

    ss.log('✓ Unrelated file renamed — binding retained, no unbind messages');
  });

  test('file-rename-auto-unbind-003: external rename of bound file auto-unbinds via file-deleted fallback', async () => {
    const fileUri = ss.createWorkspaceFile('fra-003', 'line 1\nline 2\n');
    await ss.openEditor(fileUri, vscode.ViewColumn.One);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const destBasename = path.basename(fileUri.fsPath);

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `RangeLink: Unbound from Text Editor ("${destBasename}") — file deleted`,
    ]);
    ss.expectToastMessages([
      {
        level: 'warning',
        message: `Unbound from Text Editor ("${destBasename}") — file was deleted from disk`,
      },
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': false });

    renameWorkspaceFileOnDisk(fileUri, `${path.basename(fileUri.fsPath, '.txt')}-renamed.txt`);
    await ss.settle();

    ss.log('✓ External rename — file-deleted fallback auto-unbind verified');
  });

  test('file-rename-auto-unbind-004: renaming a folder containing the bound file auto-unbinds via ancestor match', async () => {
    const boundUri = ss.createTrackedFile('__rl-test-fra-004/folder/bound.ts', 'line 1\nline 2\n');
    await ss.settle();
    await ss.openEditor(boundUri, vscode.ViewColumn.One);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    // Mirrors getResourceName in destinationBuilders.ts — a freshly-created nested
    // folder may not yet resolve via getWorkspaceFolder in the test host.
    const destBasename = vscode.workspace.getWorkspaceFolder(boundUri) ? vscode.workspace.asRelativePath(boundUri, false) : path.basename(boundUri.fsPath);
    const folderUri = vscode.Uri.file(path.dirname(boundUri.fsPath));
    const newFolderBasename = `${path.basename(folderUri.fsPath)}-renamed`;
    const newFolderUri = vscode.Uri.file(path.join(path.dirname(folderUri.fsPath), newFolderBasename));

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `RangeLink: Unbound from Text Editor ("${destBasename}") — file renamed`,
    ]);
    ss.expectToastMessages([
      {
        level: 'warning',
        message: `Unbound from Text Editor ("${destBasename}") — file renamed: ${vscode.workspace.asRelativePath(folderUri, false)} → ${vscode.workspace.asRelativePath(newFolderUri, false)}`,
      },
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': false });

    await renameWorkspaceFile(folderUri, newFolderBasename);
    await ss.settle();

    ss.log('✓ Folder renamed via applyEdit — ancestor auto-unbind status bar and toast verified');
  });

  test('file-rename-auto-unbind-005: renaming a prefix-overlapping sibling folder keeps the binding', async () => {
    const boundUri = ss.createTrackedFile('__rl-test-fra-005x.ts', 'line 1\nline 2\n');
    ss.createTrackedFile('__rl-test-fra-005/dummy.ts', 'dummy\n');
    await ss.openEditor(boundUri, vscode.ViewColumn.One);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const boundBasename = path.basename(boundUri.fsPath);
    const siblingFolderUri = vscode.Uri.file(path.join(path.dirname(boundUri.fsPath), '__rl-test-fra-005'));

    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${boundBasename}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    await renameWorkspaceFile(siblingFolderUri, '__rl-test-fra-005-folder');
    await ss.settle();

    ss.log('✓ Prefix-overlapping folder renamed — binding retained, no unbind messages');
  });
});
