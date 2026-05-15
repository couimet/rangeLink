import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  TERMINAL_READY_MS,
  assertNoSetContextLogged,
  assertSetContextLogged,
  assertStatusBarMsgLogged,
  cleanupFiles,
  createWorkspaceFile,
  getLogCapture,
  settle,
  standardSuite,
  waitForHumanVerdict,
} from '../helpers';

standardSuite('Unbind Destination', (_log) => {
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    testFileUri = createWorkspaceFile('unbind', 'line 1 content\nline 2 content\n');
  });

  suiteTeardown(async () => {
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
  });

  test('[assisted] unbind-005: "RangeLink: Unbind" hidden in command palette when no destination is bound', async () => {
    const CONTEXT_IS_BOUND_KEY = 'rangelink.isBound';

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-005');

    const lines = logCapture.getLinesSince('before-unbind-005');
    assertNoSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    const verdict = await waitForHumanVerdict(
      'unbind-005',
      'Open Command Palette (Cmd+Shift+P), type "RangeLink: Unbind" — is "RangeLink: Unbind" ABSENT?',
      [
        '1. Open the Command Palette (Cmd+Shift+P / Ctrl+Shift+P)',
        '2. Type "RangeLink: Unbind"',
        '3. Click Pass if "RangeLink: Unbind" is NOT visible (the `when: rangelink.isBound` clause should hide it).',
        '   Click Fail if it IS present (that would be a bug).',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported "RangeLink: Unbind" WAS visible in command palette when unbound — the `when: rangelink.isBound` clause is not working',
    );
  });

  test('[assisted] unbind-006: "RangeLink: Unbind" visible in command palette when a destination is bound', async () => {
    const CONTEXT_IS_BOUND_KEY = 'rangelink.isBound';

    const terminal = vscode.window.createTerminal({ name: 'rl-unbind-006-test' });
    terminal.show(true);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-006');

    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');

    const lines = logCapture.getLinesSince('before-unbind-006');
    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    const verdict = await waitForHumanVerdict(
      'unbind-006',
      'Open Command Palette (Cmd+Shift+P), type "RangeLink: Unbind" — is "RangeLink: Unbind" PRESENT?',
      [
        '1. Open the Command Palette (Cmd+Shift+P / Ctrl+Shift+P)',
        '2. Type "RangeLink: Unbind"',
        '3. Click Pass if "RangeLink: Unbind" IS visible (the `when: rangelink.isBound` clause should show it when bound).',
        '   Click Fail if it is NOT present (that would be a bug).',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported "RangeLink: Unbind" was NOT visible in command palette when bound — the `when: rangelink.isBound` clause is not working',
    );
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
