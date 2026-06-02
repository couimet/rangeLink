import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_HANDLE_FILE_PATH_CLICK } from '../../constants/commandIds';
import { getWorkspaceRoot, openEditor, standardSuite } from '../helpers';

const NON_EXISTENT_PATH_SETTLE_MS = 1000;

standardSuite('File Path Navigation', (ss) => {
  test('clickable-file-paths-010: handleFilePathClick opens the file in the active editor', async () => {
    const testFileUri = ss.createWorkspaceFile('filepath', '// rangelink file path nav test\n');

    await vscode.commands.executeCommand(CMD_HANDLE_FILE_PATH_CLICK, {
      filePath: testFileUri.fsPath,
    });

    const activeUri = vscode.window.activeTextEditor?.document.uri.fsPath;
    assert.strictEqual(
      activeUri,
      testFileUri.fsPath,
      `Expected active editor to be ${testFileUri.fsPath} but got ${activeUri}`,
    );
  });

  test('clickable-file-paths-011: handleFilePathClick with non-existent path does not change active editor', async () => {
    const anchorFileUri = ss.createWorkspaceFile('filepath-anchor', '// anchor\n');
    await openEditor(anchorFileUri);
    const editorBefore = vscode.window.activeTextEditor?.document.uri.fsPath;

    const nonExistentPath = path.join(getWorkspaceRoot(), '__rl-nonexistent-file-12345.ts');

    ss.expectToastMessages([{ level: 'warning', message: `Cannot find file: ${nonExistentPath}` }]);

    void vscode.commands.executeCommand(CMD_HANDLE_FILE_PATH_CLICK, {
      filePath: nonExistentPath,
    });

    await ss.settle(NON_EXISTENT_PATH_SETTLE_MS);

    const editorAfter = vscode.window.activeTextEditor?.document.uri.fsPath;
    assert.strictEqual(
      editorAfter,
      editorBefore,
      `Expected active editor to remain ${editorBefore} but got ${editorAfter}`,
    );
  });
});
