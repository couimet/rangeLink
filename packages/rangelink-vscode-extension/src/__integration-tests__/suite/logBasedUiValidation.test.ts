import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertNoStatusBarMsgLogged,
  assertNoToastLogged,
  assertStatusBarMsgLogged,
  assertTerminalBufferContains,
  assertToastLogged,
  type CapturingTerminal,
  cleanupFiles,
  closeAllEditors,
  createCapturingTerminal,
  createWorkspaceFile,
  getLogCapture,
  settle,
} from '../helpers';

suite('Log-Based UI Assertions', () => {
  let terminal: vscode.Terminal | undefined;
  let capturing: CapturingTerminal | undefined;
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
    capturing = undefined;
    cleanupFiles([testFileUri]);
  });

  const bindTerminal = async (): Promise<CapturingTerminal> => {
    capturing = await createCapturingTerminal('rl-toast-test');
    terminal = capturing.terminal;
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    return capturing;
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
    assert.ok(
      !lines.some((line) => line.includes('VscodeAdapter.writeTextToClipboard')),
      'Expected no clipboard write when R-L invoked from terminal focus',
    );
    assertNoStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
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
    assert.ok(
      !lines.some((line) => line.includes('VscodeAdapter.writeTextToClipboard')),
      'Expected no clipboard write when R-C invoked from terminal focus',
    );
  });

  test('core-send-commands-r-l-001: R-L sends RangeLink to bound terminal', async () => {
    const capturingTerminal = await bindTerminal();
    await openAndSelectLines(1, 4);
    await settle();
    capturingTerminal.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-send-rl-001');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-send-rl-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
    const captured = capturingTerminal.getCapturedText();
    assertTerminalBufferContains(captured, 'toast-test');
    assert.ok(
      captured.startsWith(' ') && captured.endsWith(' '),
      `Expected padded (space-bracketed) link in terminal buffer, got: ${JSON.stringify(captured)}`,
    );
  });

  test('dirty-buffer-warning-007: clean file generates link immediately without dialog', async () => {
    const capturingTerminal = await bindTerminal();
    const editor = await openAndSelectLines(1, 3);
    await editor.document.save();
    await settle();
    capturingTerminal.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-clean-send-007');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-clean-send-007');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
    assertNoToastLogged(lines, {
      type: 'warning',
      message: 'File has unsaved changes. Link may point to wrong position after save.',
    });
    const captured = capturingTerminal.getCapturedText();
    assertTerminalBufferContains(captured, 'toast-test');
    assert.ok(
      captured.startsWith(' ') && captured.endsWith(' '),
      `Expected padded link in terminal buffer, got: ${JSON.stringify(captured)}`,
    );
  });

  test('full-line-selection-validation-001: full-line selection generates link without error', async () => {
    const capturingTerminal = await bindTerminal();
    await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(testFileUri),
      vscode.ViewColumn.One,
    );
    await settle();

    await vscode.commands.executeCommand('expandLineSelection');
    await settle();
    capturingTerminal.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-fullline-001');

    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-fullline-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("rl-toast-test")',
    });
    assertNoToastLogged(lines, {
      type: 'error',
      message: 'RangeLink: No active editor',
    });
    const captured = capturingTerminal.getCapturedText();
    assertTerminalBufferContains(captured, 'toast-test');
    assert.ok(
      captured.startsWith(' ') && captured.endsWith(' '),
      `Expected padded link in terminal buffer, got: ${JSON.stringify(captured)}`,
    );
  });
});
