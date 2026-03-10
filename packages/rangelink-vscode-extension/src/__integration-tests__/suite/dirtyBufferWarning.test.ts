import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

suite('Dirty Buffer Warning', () => {
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink');
    await ext?.activate();

    const filePath = path.join(getWorkspaceRoot(), `__rl-test-dirty-${Date.now()}.ts`);
    fs.writeFileSync(filePath, 'const x = 1;\n', 'utf8');
    testFileUri = vscode.Uri.file(filePath);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    try {
      fs.unlinkSync(testFileUri.fsPath);
    } catch {
      // best-effort cleanup
    }
  });

  teardown(async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', undefined, vscode.ConfigurationTarget.Global);
  });

  // TC-088: warnOnDirtyBuffer: false → no dialog, link generated immediately
  test('TC-088: warnOnDirtyBuffer=false — R-C generates link without showing warning dialog', async () => {
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    const editor = await vscode.window.showTextDocument(doc);

    // Make the document dirty
    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// dirty\n');
    });
    assert.ok(doc.isDirty, 'Expected document to be dirty after edit');

    // Select line 1 (the inserted line, index 0)
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Global);

    // Sentinel so we can detect that R-C actually wrote to clipboard
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

  // TC-085, TC-086, TC-087: dirty buffer warning dialog paths (Save & Generate, Generate Anyway, Dismiss)
  // Skipped: handleDirtyBufferWarning calls ideAdapter.showWarningMessage with modal buttons ("Save & Generate",
  // "Generate Anyway"). The real VS Code API (vscode.window.showWarningMessage) blocks until the user clicks
  // a button — there is no programmatic way to click those buttons in @vscode/test-cli integration tests
  // without a UI automation framework (e.g., Playwright). Manual testing required per the QA plan.
  test.skip('TC-085: dirty buffer → invoke send → warning dialog appears (manual — dialog blocks in extension host)', () => {});
  test.skip('TC-086: dirty buffer → click "Save & Generate" → file saved and link generated (manual — dialog blocks)', () => {});
  test.skip('TC-087: dirty buffer → click "Generate Anyway" → file still dirty, link generated (manual — dialog blocks)', () => {});
});
