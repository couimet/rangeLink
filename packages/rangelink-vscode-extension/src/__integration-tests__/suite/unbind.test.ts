import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_COPY_LINK_ONLY_RELATIVE,
  CMD_UNBIND_DESTINATION,
} from '../../constants/commandIds';
import {
  assertClipboardEqualsGeneratedLink,
  getLogCapture,
  standardSuite,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

standardSuite('Unbind Destination', (ss) => {
  test('unbind-001: unbindDestination unbinds a currently bound terminal destination', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-unbind-test")',
      '✓ RangeLink: Unbound from Terminal ("rl-unbind-test")',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);

    const fileUri = ss.createWorkspaceFile('unbind-001', 'line 1 content\nline 2 content\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);

    await ss.createTerminal('rl-unbind-test');

    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-001');

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);

    await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));

    await assertClipboardEqualsGeneratedLink(
      'unbind + R-C should write link to clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-unbind-001-r-c',
    );
  });

  test('unbind-004: RangeLink: Unbind Destination available in Command Palette', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-unbind-004-test")',
      '✓ RangeLink: Unbound from Terminal ("rl-unbind-004-test")',
    ]);

    await ss.createTerminal('rl-unbind-004-test');

    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-004');

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
  });

  test('[assisted] unbind-005: "RangeLink: Unbind" hidden in command palette when no destination is bound', async () => {
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
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-unbind-006-test")',
      '✓ RangeLink: Unbound from Terminal ("rl-unbind-006-test")',
    ]);

    await ss.createTerminal('rl-unbind-006-test');

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-006');

    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);

    await waitForHuman(
      'unbind-006',
      'Open Command Palette (Cmd+Shift+P), type "RangeLink: Unbind", and execute it.',
      [
        '1. Open the Command Palette (Cmd+Shift+P / Ctrl+Shift+P)',
        '2. Type "RangeLink: Unbind"',
        '3. Execute "RangeLink: Unbind" to unbind the destination',
        '4. Click Cancel on the notification',
      ],
    );

    ss.log('✓ Unbind executed from palette; isBound context set to false');
  });

  test('unbind-003: unbindDestination is a safe no-op when no destination is bound', async () => {
    ss.expectStatusBarMessages([
      'RangeLink: No destination bound',
      'RangeLink: No destination bound',
    ]);

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);

    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-003-noop');

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await ss.settle();
  });
});
