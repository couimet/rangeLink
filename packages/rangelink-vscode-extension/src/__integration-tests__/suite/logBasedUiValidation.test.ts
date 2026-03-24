import assert from 'node:assert';
import * as fs from 'node:fs';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertStatusBarMsgLogged,
  assertToastLogged,
  closeAllEditors,
  createWorkspaceFile,
  getLogCapture,
  settle,
} from '../helpers';

suite('Log-Based UI Assertions', () => {
  let terminal: vscode.Terminal | undefined;
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    await activateExtension();

    assert.ok(
      getLogCapture().isCapturing,
      'RANGELINK_CAPTURE_LOGS must be true for toast assertions',
    );
  });

  setup(async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');

    const content = Array.from({ length: 15 }, (_, i) => `const line${i + 1} = ${i + 1};`).join(
      '\n',
    );
    testFileUri = createWorkspaceFile('toast-test', content);
  });

  teardown(async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await closeAllEditors();
    if (terminal) {
      terminal.dispose();
      terminal = undefined;
    }
    try {
      fs.unlinkSync(testFileUri.fsPath);
    } catch {
      // best-effort
    }
  });

  const bindTerminal = async (): Promise<vscode.Terminal> => {
    terminal = vscode.window.createTerminal({ name: 'rl-toast-test' });
    terminal.show();
    await settle();
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    return terminal;
  };

  const openAndSelectLines = async (
    startLine: number,
    endLine: number,
  ): Promise<vscode.TextEditor> => {
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, editor.document.lineAt(endLine).text.length),
    );
    return editor;
  };

  test('unbind-003: R-U with no bound destination shows status bar message', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-003');

    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await settle();

    const lines = logCapture.getLinesSince('before-unbind-003');
    assertStatusBarMsgLogged(lines, {
      message: 'RangeLink: No destination bound',
    });
  });

  test('send-terminal-selection-006: R-L with terminal focus shows no-active-editor error', async () => {
    await bindTerminal();

    const logCapture = getLogCapture();
    logCapture.mark('before-terminal-rl-006');

    terminal!.show();
    await settle();
    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-terminal-rl-006');
    assertToastLogged(lines, {
      type: 'error',
      message: 'RangeLink: No active editor',
    });
  });

  test('send-terminal-selection-007: R-C with terminal focus shows no-active-editor error', async () => {
    await bindTerminal();

    const logCapture = getLogCapture();
    logCapture.mark('before-terminal-rc-007');

    terminal!.show();
    await settle();
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-terminal-rc-007');
    assertToastLogged(lines, {
      type: 'error',
      message: 'RangeLink: No active editor',
    });
  });

  test('core-send-commands-r-l-001: R-L sends RangeLink to bound terminal', async () => {
    await bindTerminal();
    await openAndSelectLines(1, 4);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-send-rl-001');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-send-rl-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
  });

  test('send-file-path-001: R-F sends file path to bound terminal', async () => {
    await bindTerminal();
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-send-fp-001');

    await vscode.commands.executeCommand('rangelink.pasteCurrentFileRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-send-fp-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ File path copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
  });

  test('dirty-buffer-warning-007: clean file generates link immediately without dialog', async () => {
    await bindTerminal();
    const editor = await openAndSelectLines(1, 3);
    await editor.document.save();
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-clean-send-007');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-clean-send-007');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
  });

  test('full-line-selection-validation-001: full-line selection generates link without error', async () => {
    await bindTerminal();
    await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(testFileUri),
      vscode.ViewColumn.One,
    );
    await settle();

    await vscode.commands.executeCommand('expandLineSelection');
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-fullline-001');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-fullline-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
  });
});
