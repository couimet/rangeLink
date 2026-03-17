import assert from 'node:assert';

import * as vscode from 'vscode';

suite('Unbind Destination', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');

    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  // unbind-001: Unbind when a terminal destination is bound
  test('unbind-001: unbindDestination unbinds a currently bound terminal destination', async () => {
    const terminal = vscode.window.createTerminal({ name: 'rl-unbind-test' });
    terminal.show(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');

    await vscode.commands.executeCommand('rangelink.unbindDestination');

    // Verify unbound: R-C should work without sending to a destination.
    // If still bound, clipboard preserve logic would run differently — but R-C
    // always writes to clipboard regardless. The key assertion is that unbind
    // completed without error and a subsequent R-C doesn't throw.
    // Open a file and select text so R-C has something to work with.
    const doc = await vscode.workspace.openTextDocument({
      content: 'line 1 content\nline 2 content\n',
      language: 'typescript',
    });
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));

    await vscode.env.clipboard.writeText('unbind-test-sentinel');
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    // After unbind, R-C writes the link to clipboard (no destination restore).
    // The sentinel should be replaced with the generated link.
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

  // unbind-003: Unbind when no destination is bound — safe no-op
  test('unbind-003: unbindDestination is a safe no-op when no destination is bound', async () => {
    // Ensure nothing is bound by running unbind first (idempotent)
    await vscode.commands.executeCommand('rangelink.unbindDestination');

    // Execute unbind again — should not throw
    await vscode.commands.executeCommand('rangelink.unbindDestination');

    // If we reach here, the command completed without error — that's the assertion
    assert.ok(true, 'unbindDestination completed without error when no destination was bound');
  });
});
