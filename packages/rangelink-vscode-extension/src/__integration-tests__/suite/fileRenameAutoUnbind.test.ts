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
});
