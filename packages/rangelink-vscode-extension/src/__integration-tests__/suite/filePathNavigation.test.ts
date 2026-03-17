import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

suite('File Path Navigation', () => {
  let tempFilePath: string;
  let anchorFileUri: vscode.Uri;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');

    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();

    tempFilePath = path.join(getWorkspaceRoot(), `__rl-test-filepath-${Date.now()}.ts`);
    fs.writeFileSync(tempFilePath, '// rangelink file path nav test\n', 'utf8');

    // Open a different file as the anchor so the temp file is not already active
    const anchorPath = path.join(getWorkspaceRoot(), `__rl-test-filepath-anchor-${Date.now()}.ts`);
    fs.writeFileSync(anchorPath, '// anchor\n', 'utf8');
    anchorFileUri = vscode.Uri.file(anchorPath);
    await vscode.window.showTextDocument(anchorFileUri);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    try {
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(anchorFileUri.fsPath);
    } catch {
      // best-effort cleanup
    }
  });

  // clickable-file-paths-010: handleFilePathClick opens a real workspace file in the editor
  test('clickable-file-paths-010: handleFilePathClick opens the file in the active editor', async () => {
    await vscode.commands.executeCommand('rangelink.handleFilePathClick', {
      filePath: tempFilePath,
    });

    const activeUri = vscode.window.activeTextEditor?.document.uri.fsPath;
    assert.strictEqual(
      activeUri,
      tempFilePath,
      `Expected active editor to be ${tempFilePath} but got ${activeUri}`,
    );
  });

  // clickable-file-paths-011: handleFilePathClick with non-existent path — no editor change
  test('clickable-file-paths-011: handleFilePathClick with non-existent path does not change active editor', async () => {
    // Ensure anchor file is the active editor before the test
    await vscode.window.showTextDocument(anchorFileUri);
    const editorBefore = vscode.window.activeTextEditor?.document.uri.fsPath;

    const nonExistentPath = path.join(getWorkspaceRoot(), '__rl-nonexistent-file-12345.ts');

    await vscode.commands.executeCommand('rangelink.handleFilePathClick', {
      filePath: nonExistentPath,
    });

    const editorAfter = vscode.window.activeTextEditor?.document.uri.fsPath;
    assert.strictEqual(
      editorAfter,
      editorBefore,
      `Expected active editor to remain ${editorBefore} but got ${editorAfter}`,
    );
  });
});
