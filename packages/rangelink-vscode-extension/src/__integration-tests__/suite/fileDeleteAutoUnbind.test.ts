import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_BIND_TO_TEXT_EDITOR_HERE } from '../../constants/commandIds';
import { standardSuite } from '../helpers';

standardSuite('File Delete Auto-Unbind', (ss) => {
  test('file-delete-auto-unbind-001: deletes bound file from disk and verifies auto-unbind', async () => {
    const fileUri = ss.createWorkspaceFile('fda-001', 'line 1\nline 2\n');
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

    fs.unlinkSync(fileUri.fsPath);
    await ss.settle();

    ss.log('✓ File deleted from disk — auto-unbind status bar and toast verified');
  });
});
