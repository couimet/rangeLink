import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertStatusBarMsgLogged,
  cleanupFiles,
  closeAllEditors,
  createWorkspaceFile,
  getLogCapture,
  settle,
  TERMINAL_READY_MS,
} from '../helpers';

suite('Unbind Destination', () => {
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    await activateExtension();

    testFileUri = createWorkspaceFile('unbind', 'line 1 content\nline 2 content\n');
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  test('unbind-001: unbindDestination unbinds a currently bound terminal destination', async () => {
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    const editor = await vscode.window.showTextDocument(doc);

    const terminal = vscode.window.createTerminal({ name: 'rl-unbind-test' });
    terminal.show(true);
    await settle(TERMINAL_READY_MS);

    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-001');

    await vscode.commands.executeCommand('rangelink.unbindDestination');

    const lines = logCapture.getLinesSince('before-unbind-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink unbound from Terminal ("rl-unbind-test")',
    });

    await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));

    await vscode.env.clipboard.writeText('unbind-test-sentinel');
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      'unbind-test-sentinel',
      'Expected clipboard to contain the generated link after unbind + R-C, not the sentinel',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );

    terminal.dispose();
  });

  test('unbind-004: RangeLink: Unbind Destination available in Command Palette', async () => {
    const terminal = vscode.window.createTerminal({ name: 'rl-unbind-004-test' });
    terminal.show(true);
    await settle(TERMINAL_READY_MS);

    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-004');

    await vscode.commands.executeCommand('rangelink.unbindDestination');

    const lines = logCapture.getLinesSince('before-unbind-004');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink unbound from Terminal ("rl-unbind-004-test")',
    });

    terminal.dispose();
  });

  test('unbind-003: unbindDestination is a safe no-op when no destination is bound', async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-003-noop');

    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await settle();

    const lines = logCapture.getLinesSince('before-unbind-003-noop');
    assertStatusBarMsgLogged(lines, {
      message: 'RangeLink: No destination bound',
    });
  });
});
