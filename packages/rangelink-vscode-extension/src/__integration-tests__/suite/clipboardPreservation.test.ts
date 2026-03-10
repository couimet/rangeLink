import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const SENTINEL = 'rangelink-test-sentinel-value';

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

suite('Clipboard Preservation', () => {
  let testFileUri: vscode.Uri;
  let editor: vscode.TextEditor;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink');
    await ext?.activate();

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    const filePath = path.join(getWorkspaceRoot(), `__rl-test-clipboard-${Date.now()}.ts`);
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
    testFileUri = vscode.Uri.file(filePath);

    const doc = await vscode.workspace.openTextDocument(testFileUri);
    editor = await vscode.window.showTextDocument(doc);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    try {
      fs.unlinkSync(testFileUri.fsPath);
    } catch {
      // best-effort cleanup
    }
  });

  setup(async () => {
    await vscode.env.clipboard.writeText(SENTINEL);
    // Non-empty selection on line 1 (index 0)
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));
  });

  teardown(async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', undefined, vscode.ConfigurationTarget.Global);
  });

  // TC-043: R-C is exempt — clipboard IS the output
  test('TC-043: R-C always writes link to clipboard regardless of preserve setting (default)', async () => {
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(clipboard, SENTINEL, 'Expected clipboard to contain the generated link, not the sentinel');
    assert.ok(clipboard.includes('#L'), `Expected clipboard to contain a line reference but got: ${clipboard}`);
  });

  // TC-042: preserve=always — R-C still writes to clipboard (R-C is the preserve exception)
  test('TC-042: R-C writes link to clipboard even when clipboard.preserve is "always"', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(clipboard, SENTINEL, 'Expected clipboard to contain the generated link, not the sentinel');
    assert.ok(clipboard.includes('#L'), `Expected clipboard to contain a line reference but got: ${clipboard}`);
  });

  // TC-046: preserve=never — R-C still writes to clipboard
  test('TC-046: R-C writes link to clipboard even when clipboard.preserve is "never"', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(clipboard, SENTINEL, 'Expected clipboard to contain the generated link, not the sentinel');
    assert.ok(clipboard.includes('#L'), `Expected clipboard to contain a line reference but got: ${clipboard}`);
  });

  // TC-044, TC-045, TC-047: R-L clipboard preservation (preserve=always restores, preserve=never does not)
  // Skipped: R-L (rangelink.copyLinkWithRelativePath) requires a bound destination. Without one, it opens
  // QuickPick which blocks indefinitely in the extension host. Binding a text editor destination requires
  // splitting the editor and calling rangelink.bindToTextEditorHere from that split context — more than
  // 10 lines of setup and a text editor destination does not use clipboard as transport anyway (it inserts
  // text directly), so it would not exercise the preserve=always save/restore path. Manual testing required
  // per the QA plan (TC-044, TC-045, TC-047).
  test.skip('TC-044: R-L with preserve=always restores sentinel to clipboard after send — requires bound destination (manual)', () => {});
  test.skip('TC-045: R-L with preserve=always and no prior clipboard content — requires bound destination (manual)', () => {});
  test.skip('TC-047: R-L with preserve=never leaves clipboard with last RangeLink output — requires bound destination (manual)', () => {});
});
