import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { assertStatusBarMsgLogged, assertToastLogged, getLogCapture } from '../helpers';

const SETTLE_MS = 500;

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

suite('Log-Based UI Assertions', () => {
  let terminal: vscode.Terminal | undefined;
  let testFilePath: string;
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');
    assert.ok(ext, 'Extension not found');
    await ext.activate();

    assert.ok(
      getLogCapture().isCapturing,
      'RANGELINK_CAPTURE_LOGS must be true for toast assertions',
    );
  });

  setup(async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');

    const ts = Date.now();
    testFilePath = path.join(getWorkspaceRoot(), `__rl-toast-test-${ts}.ts`);
    const content = Array.from({ length: 15 }, (_, i) => `const line${i + 1} = ${i + 1};`).join(
      '\n',
    );
    fs.writeFileSync(testFilePath, content, 'utf8');
    testFileUri = vscode.Uri.file(testFilePath);
  });

  teardown(async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    if (terminal) {
      terminal.dispose();
      terminal = undefined;
    }
    try {
      fs.unlinkSync(testFilePath);
    } catch {
      // best-effort
    }
  });

  const bindTerminal = async (): Promise<vscode.Terminal> => {
    terminal = vscode.window.createTerminal({ name: 'rl-toast-test' });
    terminal.show();
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
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

  // unbind-003: unbind with nothing bound → status bar message
  test('unbind-003: R-U with no bound destination shows status bar message', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-unbind-003');

    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const lines = logCapture.getLinesSince('before-unbind-003');
    assertStatusBarMsgLogged(lines, {
      message: 'RangeLink: No destination bound',
    });
  });

  // send-terminal-selection-006: R-L with terminal focused → "No active editor" error
  test('send-terminal-selection-006: R-L with terminal focus shows no-active-editor error', async () => {
    await bindTerminal();

    const logCapture = getLogCapture();
    logCapture.mark('before-terminal-rl-006');

    terminal!.show();
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const lines = logCapture.getLinesSince('before-terminal-rl-006');
    assertToastLogged(lines, {
      type: 'error',
      message: 'RangeLink: No active editor',
    });
  });

  // send-terminal-selection-007: R-C with terminal focused → "No active editor" error
  test('send-terminal-selection-007: R-C with terminal focus shows no-active-editor error', async () => {
    await bindTerminal();

    const logCapture = getLogCapture();
    logCapture.mark('before-terminal-rc-007');

    terminal!.show();
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const lines = logCapture.getLinesSince('before-terminal-rc-007');
    assertToastLogged(lines, {
      type: 'error',
      message: 'RangeLink: No active editor',
    });
  });

  // core-send-commands-r-l-001: R-L sends RangeLink to bound terminal → status bar with dest name
  test('core-send-commands-r-l-001: R-L sends RangeLink to bound terminal', async () => {
    await bindTerminal();
    await openAndSelectLines(1, 4);
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const logCapture = getLogCapture();
    logCapture.mark('before-send-rl-001');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const lines = logCapture.getLinesSince('before-send-rl-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
  });

  // send-file-path-001: R-F sends file path to bound terminal
  test('send-file-path-001: R-F sends file path to bound terminal', async () => {
    await bindTerminal();
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const logCapture = getLogCapture();
    logCapture.mark('before-send-fp-001');

    await vscode.commands.executeCommand('rangelink.pasteCurrentFileRelativePath');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const lines = logCapture.getLinesSince('before-send-fp-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ File path copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
  });

  // dirty-buffer-warning-007: clean file → immediate link generation, no dialog
  test('dirty-buffer-warning-007: clean file generates link immediately without dialog', async () => {
    await bindTerminal();
    const editor = await openAndSelectLines(1, 3);
    await editor.document.save();
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const logCapture = getLogCapture();
    logCapture.mark('before-clean-send-007');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const lines = logCapture.getLinesSince('before-clean-send-007');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
  });

  // full-line-selection-validation-001: Ctrl+L selection then R-L → no error
  test('full-line-selection-validation-001: full-line selection generates link without error', async () => {
    await bindTerminal();
    await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(testFileUri),
      vscode.ViewColumn.One,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    await vscode.commands.executeCommand('expandLineSelection');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const logCapture = getLogCapture();
    logCapture.mark('before-fullline-001');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const lines = logCapture.getLinesSince('before-fullline-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
  });
});
