import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

const TERMINAL_READY_MS = 1500;

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

suite('Unbind Destination', () => {
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');

    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();

    const filePath = path.join(getWorkspaceRoot(), `__rl-test-unbind-${Date.now()}.ts`);
    fs.writeFileSync(filePath, 'line 1 content\nline 2 content\n', 'utf8');
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

  test('unbind-001: unbindDestination unbinds a currently bound terminal destination', async () => {
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    const editor = await vscode.window.showTextDocument(doc);

    const terminal = vscode.window.createTerminal({ name: 'rl-unbind-test' });
    terminal.show(true);
    await new Promise<void>((resolve) => setTimeout(resolve, TERMINAL_READY_MS));

    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');

    await vscode.commands.executeCommand('rangelink.unbindDestination');

    // Re-show editor and verify unbound via R-C
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

  test('unbind-003: unbindDestination is a safe no-op when no destination is bound', async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');

    await vscode.commands.executeCommand('rangelink.unbindDestination');

    assert.ok(true, 'unbindDestination completed without error when no destination was bound');
  });
});
