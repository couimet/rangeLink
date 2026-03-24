import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  cleanupFiles,
  CLIPBOARD_SENTINEL,
  closeAllEditors,
  createAndBindTerminal,
  createWorkspaceFile,
  openEditor,
  writeClipboardSentinel,
} from '../helpers';

suite('Clipboard Preservation', () => {
  let testFileUri: vscode.Uri;
  let editor: vscode.TextEditor;
  let terminal: vscode.Terminal;

  suiteSetup(async () => {
    await activateExtension();

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    testFileUri = createWorkspaceFile('clipboard', lines.join('\n') + '\n');

    editor = await openEditor(testFileUri);

    terminal = await createAndBindTerminal('rl-clipboard-test');
    editor = await openEditor(testFileUri);
  });

  suiteTeardown(async () => {
    terminal.dispose();
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  setup(async () => {
    editor = await vscode.window.showTextDocument(editor.document);
    await writeClipboardSentinel();
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));
  });

  teardown(async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', undefined, vscode.ConfigurationTarget.Global);
  });

  test('clipboard-preservation-008: R-C writes link to clipboard with preserve=always (R-C is exempt from preserve)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      CLIPBOARD_SENTINEL,
      'Expected clipboard to contain the generated link, not the sentinel',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );
  });

  test('clipboard-preservation-008 (variant): R-C writes link to clipboard with default preserve setting', async () => {
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      CLIPBOARD_SENTINEL,
      'Expected clipboard to contain the generated link, not the sentinel',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );
  });

  test('clipboard-preservation-008 (variant): R-C writes link to clipboard with preserve=never', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      CLIPBOARD_SENTINEL,
      'Expected clipboard to contain the generated link, not the sentinel',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );
  });

  test('clipboard-preservation-003: R-F with preserve=always restores clipboard to sentinel after send', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.pasteCurrentFileRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.strictEqual(
      clipboard,
      CLIPBOARD_SENTINEL,
      `Expected clipboard to be restored to sentinel after R-F with preserve=always, but got: ${clipboard}`,
    );
  });

  test('clipboard-preservation-006: R-L with preserve=never leaves clipboard with the generated link', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      CLIPBOARD_SENTINEL,
      'Expected clipboard NOT to be restored to sentinel when preserve=never',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain the generated link but got: ${clipboard}`,
    );
  });
});
