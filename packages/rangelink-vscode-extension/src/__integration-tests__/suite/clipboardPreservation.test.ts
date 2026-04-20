import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertClipboardChanged,
  assertClipboardRestored,
  assertTerminalBufferContains,
  type CapturingTerminal,
  cleanupFiles,
  closeAllEditors,
  createAndBindCapturingTerminal,
  createWorkspaceFile,
  openEditor,
  writeClipboardSentinel,
} from '../helpers';

suite('Clipboard Preservation', () => {
  let testFileUri: vscode.Uri;
  let editor: vscode.TextEditor;
  let capturing: CapturingTerminal;

  suiteSetup(async () => {
    await activateExtension();

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    testFileUri = createWorkspaceFile('clipboard', lines.join('\n') + '\n');

    editor = await openEditor(testFileUri);

    capturing = await createAndBindCapturingTerminal('rl-clipboard-test');
    editor = await openEditor(testFileUri);
  });

  suiteTeardown(async () => {
    capturing.terminal.dispose();
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
    const clipboard = await assertClipboardChanged('R-C with preserve=always');
    assert.ok(clipboard.includes('#L'), `Expected line reference but got: ${clipboard}`);
  });

  test('clipboard-preservation-008 (variant): R-C writes link to clipboard with default preserve setting', async () => {
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await assertClipboardChanged('R-C with default preserve');
    assert.ok(clipboard.includes('#L'), `Expected line reference but got: ${clipboard}`);
  });

  test('clipboard-preservation-008 (variant): R-C writes link to clipboard with preserve=never', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await assertClipboardChanged('R-C with preserve=never');
    assert.ok(clipboard.includes('#L'), `Expected line reference but got: ${clipboard}`);
  });

  test('clipboard-preservation-003: R-F with preserve=always restores clipboard to sentinel after send', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    capturing.clearCaptured();
    await vscode.commands.executeCommand('rangelink.pasteCurrentFileRelativePath');
    await assertClipboardRestored('R-F with preserve=always');
    assertTerminalBufferContains(capturing.getCapturedText(), 'clipboard');
  });

  test('clipboard-preservation-006: R-L with preserve=never leaves clipboard with the generated link', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    capturing.clearCaptured();
    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    const clipboard = await assertClipboardChanged('R-L with preserve=never');
    assert.ok(clipboard.includes('#L'), `Expected line reference but got: ${clipboard}`);
    const captured = capturing.getCapturedText();
    assertTerminalBufferContains(captured, 'clipboard');
    assert.ok(captured.includes('#L'), `Expected line reference in terminal buffer, got: ${captured}`);
  });
});
