import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createWorkspaceFile,
  openEditor,
} from '../helpers';

suite('Dirty Buffer Warning', () => {
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    await activateExtension();

    testFileUri = createWorkspaceFile('dirty', 'const x = 1;\n');
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  teardown(async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', undefined, vscode.ConfigurationTarget.Workspace);
  });

  test('dirty-buffer-warning-004: warnOnDirtyBuffer=false — R-C generates link without showing warning dialog', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// dirty\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

    await vscode.env.clipboard.writeText('rangelink-dirty-test-sentinel');

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      'rangelink-dirty-test-sentinel',
      'Expected clipboard to contain a generated link, not the sentinel — warnOnDirtyBuffer=false should bypass dialog',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );
  });
});
