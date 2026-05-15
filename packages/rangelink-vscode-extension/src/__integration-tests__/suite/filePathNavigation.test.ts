import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  assertToastLogged,
  cleanupFiles,
  createWorkspaceFile,
  getLogCapture,
  getWorkspaceRoot,
  openEditor,
  settle,
  standardSuite,
} from '../helpers';

const NON_EXISTENT_PATH_SETTLE_MS = 1000;

standardSuite('File Path Navigation', (_log) => {
  let testFileUri: vscode.Uri;
  let anchorFileUri: vscode.Uri;

  suiteSetup(async () => {
    testFileUri = createWorkspaceFile('filepath', '// rangelink file path nav test\n');
    anchorFileUri = createWorkspaceFile('filepath-anchor', '// anchor\n');
    await openEditor(anchorFileUri);
  });

  suiteTeardown(async () => {
    cleanupFiles([testFileUri, anchorFileUri]);
  });

  test('clickable-file-paths-010: handleFilePathClick opens the file in the active editor', async () => {
    await vscode.commands.executeCommand('rangelink.handleFilePathClick', {
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
    await openEditor(anchorFileUri);
    const editorBefore = vscode.window.activeTextEditor?.document.uri.fsPath;

    const nonExistentPath = path.join(getWorkspaceRoot(), '__rl-nonexistent-file-12345.ts');

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-011');

    void vscode.commands.executeCommand('rangelink.handleFilePathClick', {
      filePath: nonExistentPath,
    });

    await settle(NON_EXISTENT_PATH_SETTLE_MS);

    const editorAfter = vscode.window.activeTextEditor?.document.uri.fsPath;
    assert.strictEqual(
      editorAfter,
      editorBefore,
      `Expected active editor to remain ${editorBefore} but got ${editorAfter}`,
    );

    const lines = logCapture.getLinesSince('before-fp-011');
    assertToastLogged(lines, {
      type: 'warning',
      message: `Cannot find file: ${nonExistentPath}`,
    });
  });
});
