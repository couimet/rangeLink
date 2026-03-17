import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
  let terminal: vscode.Terminal;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');

    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    const filePath = path.join(getWorkspaceRoot(), `__rl-test-clipboard-${Date.now()}.ts`);
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
    testFileUri = vscode.Uri.file(filePath);

    const doc = await vscode.workspace.openTextDocument(testFileUri);
    editor = await vscode.window.showTextDocument(doc);

    // Bind a terminal so R-L and R-F send to a destination without opening QuickPick.
    // bindToTerminalHere binds the focused terminal to the previously active text editor.
    terminal = vscode.window.createTerminal({ name: 'rl-clipboard-test' });
    terminal.show(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    editor = await vscode.window.showTextDocument(doc);
  });

  suiteTeardown(async () => {
    terminal.dispose();
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    try {
      fs.unlinkSync(testFileUri.fsPath);
    } catch {
      // best-effort cleanup
    }
  });

  setup(async () => {
    // Re-show the document to ensure it's the active text editor (not the terminal)
    // before commands that call getActiveTextEditorUri() run.
    editor = await vscode.window.showTextDocument(editor.document);
    await vscode.env.clipboard.writeText(SENTINEL);
    // Non-empty selection on line 1 (index 0)
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));
  });

  teardown(async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', undefined, vscode.ConfigurationTarget.Global);
  });

  // clipboard-preservation-008: R-C always writes to clipboard regardless of preserve setting
  test('clipboard-preservation-008: R-C writes link to clipboard with preserve=always (R-C is exempt from preserve)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      SENTINEL,
      'Expected clipboard to contain the generated link, not the sentinel',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );
  });

  // clipboard-preservation-008 (variant): R-C with default preserve setting
  test('clipboard-preservation-008 (variant): R-C writes link to clipboard with default preserve setting', async () => {
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      SENTINEL,
      'Expected clipboard to contain the generated link, not the sentinel',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );
  });

  // clipboard-preservation-008 (variant): R-C with preserve=never
  test('clipboard-preservation-008 (variant): R-C writes link to clipboard with preserve=never', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      SENTINEL,
      'Expected clipboard to contain the generated link, not the sentinel',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );
  });

  // clipboard-preservation-003: preserve=always — R-F sends file path to terminal and restores clipboard
  test('clipboard-preservation-003: R-F with preserve=always restores clipboard to sentinel after send', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.pasteCurrentFileRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.strictEqual(
      clipboard,
      SENTINEL,
      `Expected clipboard to be restored to sentinel after R-F with preserve=always, but got: ${clipboard}`,
    );
  });

  // clipboard-preservation-006: preserve=never — R-L leaves clipboard with the generated link, not the sentinel
  test('clipboard-preservation-006: R-L with preserve=never leaves clipboard with the generated link', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      SENTINEL,
      'Expected clipboard NOT to be restored to sentinel when preserve=never',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain the generated link but got: ${clipboard}`,
    );
  });
});
