import assert from 'node:assert';
import path from 'node:path';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_CUSTOM_AI_BY_ID,
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_COPY_LINK_ONLY_RELATIVE,
  CMD_COPY_LINK_RELATIVE,
  CMD_COPY_PORTABLE_LINK_RELATIVE,
  CMD_PASTE_TO_DESTINATION,
  CMD_TERMINAL_PASTE_SELECTED_TEXT,
} from '../../constants/commandIds';
import {
  assertClipboardChanged,
  assertNoStatusBarMsgLogged,
  assertNoToastLogged,
  assertStatusBarMsgLogged,
  assertTerminalBufferContains,
  assertTerminalBufferEquals,
  assertToastLogged,
  type CapturingTerminal,
  clearSelection,
  echoToTerminal,
  extractGeneratedLink,
  extractQuickPickItemsLogged,
  getLogCapture,
  openAndDismiss,
  standardSuite,
  TERMINAL_READY_MS,
  waitForHuman,
  writeClipboardSentinel,
} from '../helpers';

const NO_TERMINAL_SELECTION_MSG = 'No text selected in the terminal. Select text and try again.';

standardSuite('Core Send Commands', (ss) => {
  teardown(async () => {
    await vscode.commands.executeCommand('dummyAi.clearAll');
  });

  test('core-send-commands-r-l-002: R-L sends RangeLink to bound text editor destination', async () => {
    const srcUri = ss.createWorkspaceFile(
      'csc-r-l-002-src',
      'line 1\nline 2\nline 3\nline 4\nline 5\n',
    );
    const destUri = ss.createWorkspaceFile('csc-r-l-002-dest', '');

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    const destEditor = await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    clearSelection(destEditor);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const srcDoc = await vscode.workspace.openTextDocument(srcUri);
    const srcEditor = await vscode.window.showTextDocument(srcDoc, vscode.ViewColumn.Beside);
    srcEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(3, 0),
    );
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-l-002');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-r-l-002');

    const updatedDestDoc = await vscode.workspace.openTextDocument(destUri);
    const destText = updatedDestDoc.getText();
    const relPath = vscode.workspace.asRelativePath(srcUri);
    const expectedContent = ` ${relPath}#L2-L3 `;
    assert.strictEqual(
      destText,
      expectedContent,
      `Expected dest editor to contain exactly "${expectedContent}", got: ${JSON.stringify(destText)}`,
    );

    const destBasename = path.basename(destUri.fsPath);
    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink: RangeLink copied to clipboard & sent to Text Editor ("${destBasename}")`,
    });
    ss.log('✓ R-L sent exact RangeLink to bound text editor destination');
  });

  test('core-send-commands-r-l-003: R-L sends RangeLink to bound AI assistant destination', async () => {
    const CSC_R_L_003_LINE_COUNT = 10;
    const { uri: fileUri } = ss.createContentFile(
      'csc-r-l-003',
      CSC_R_L_003_LINE_COUNT,
      (i) => `line ${i + 1} content`,
    );

    const relPath = vscode.workspace.asRelativePath(fileUri);
    const expectedLink = `${relPath}#L1-L3`;

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 3, 0);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension',
    });
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-l-003');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const dummyText = (await vscode.commands.executeCommand('dummyAi.getText')) as {
      tier1: string;
      tier2: string;
    };
    assert.strictEqual(
      dummyText.tier1,
      ` ${expectedLink} `,
      `Expected Dummy AI tier1=" ${expectedLink} ", got: ${JSON.stringify(dummyText.tier1)}`,
    );

    assert.ok(
      logCapture.getLinesSince('before-r-l-003').some((l) => l.includes('sent to')),
      'Expected "sent to" log line after R-L to AI destination',
    );
    ss.log('✓ R-L sent RangeLink to Dummy AI (Tier 1) destination');
  });

  test('core-send-commands-r-c-001: R-C copies RangeLink to clipboard and does NOT send to terminal', async () => {
    const fileUri = ss.createWorkspaceFile('csc-r-c-001', 'line 1\nline 2\nline 3\n');

    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-r-c-001-dest');

    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-c-001');

    await writeClipboardSentinel();
    await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
    await ss.settle();

    const clipboard = await assertClipboardChanged('R-C should write link to clipboard');
    const lines = logCapture.getLinesSince('before-r-c-001');
    const generatedLink = extractGeneratedLink(lines);
    assert.ok(generatedLink, 'Expected "Generated link:" log line');
    assert.strictEqual(
      clipboard,
      generatedLink,
      `Expected clipboard to equal generated link, got: ${JSON.stringify(clipboard)}`,
    );

    assert.strictEqual(
      capturing.getCapturedText(),
      '',
      'Terminal should not have received anything from R-C',
    );

    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink: RangeLink copied to clipboard',
    });
    ss.log('✓ R-C wrote link to clipboard; terminal received nothing');
  });

  test('core-send-commands-r-l-004: Command dispatch "Send RangeLink" behaves identically to R-L keybinding', async () => {
    const fileUri = ss.createWorkspaceFile('csc-r-l-004', 'line 1\nline 2\nline 3\n');

    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-r-l-004-dest');

    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-l-004');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const relPath = vscode.workspace.asRelativePath(fileUri);
    const expectedContent = ` ${relPath}#L1-L2 `;
    assertTerminalBufferEquals(capturing.getCapturedText(), expectedContent);

    assertStatusBarMsgLogged(logCapture.getLinesSince('before-r-l-004'), {
      message: '✓ RangeLink: RangeLink copied to clipboard & sent to Terminal ("csc-r-l-004-dest")',
    });
    ss.log(
      '✓ Command dispatch "Send RangeLink" delivered exact link to bound terminal destination',
    );
  });

  test('core-send-commands-r-c-002: Command dispatch "Copy RangeLink" behaves identically to R-C keybinding', async () => {
    const fileUri = ss.createWorkspaceFile('csc-r-c-002', 'line 1\nline 2\nline 3\n');

    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-r-c-002-dest');

    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
    await ss.settle();

    await writeClipboardSentinel();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-c-002');

    await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
    await ss.settle();

    const relPath = vscode.workspace.asRelativePath(fileUri);
    const expectedContent = `${relPath}#L1-L2`;
    const clipboard = await assertClipboardChanged(
      'R-C command dispatch should write link to clipboard',
    );
    assert.strictEqual(
      clipboard,
      expectedContent,
      `Expected exact link on clipboard, got: ${JSON.stringify(clipboard)}`,
    );

    assert.strictEqual(
      capturing.getCapturedText(),
      '',
      'Terminal should not have received anything from "Copy RangeLink"',
    );
    assertStatusBarMsgLogged(logCapture.getLinesSince('before-r-c-002'), {
      message: '✓ RangeLink: RangeLink copied to clipboard',
    });
    ss.log(
      '✓ Command dispatch "Copy RangeLink" wrote exact link to clipboard; terminal received nothing',
    );
  });

  test('[assisted] send-terminal-selection-001: Cmd+R Cmd+V with terminal text selected sends to bound destination', async () => {
    const MARKER = 'rl-sts-001-marker';

    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-sts-001-dest');
    await ss.settle();

    const srcTerminal = await ss.createTerminal('csc-sts-001-src');

    echoToTerminal(srcTerminal, MARKER);
    await ss.settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-001');

    await waitForHuman(
      'send-terminal-selection-001',
      `In "csc-sts-001-src", select "${MARKER}" and press Cmd+R Cmd+V.`,
      [`1. Click into "csc-sts-001-src", drag-select "${MARKER}"`, '2. Press Cmd+R Cmd+V'],
    );

    assertTerminalBufferContains(capturing.getCapturedText(), MARKER);

    assertStatusBarMsgLogged(logCapture.getLinesSince('before-sts-001'), {
      message:
        '✓ RangeLink: Selected text copied to clipboard & sent to Terminal ("csc-sts-001-dest")',
    });
    ss.log('✓ R-V sent selected terminal text to bound destination');
  });

  test('send-terminal-selection-003: R-V with no text selected in terminal shows error message', async () => {
    await ss.createTerminal('csc-sts-003');

    // On macOS, terminal.copySelection leaves the clipboard unchanged when nothing
    // is selected — so we prime the clipboard to empty so the preserve/read roundtrip
    // returns "" and triggers the no-text-selected error path.
    await vscode.env.clipboard.writeText('');

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-003');

    await vscode.commands.executeCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT);
    await ss.settle();

    assertToastLogged(logCapture.getLinesSince('before-sts-003'), {
      type: 'error',
      message: NO_TERMINAL_SELECTION_MSG,
    });
    ss.log('✓ R-V with no selection shows "no text selected" error toast');
  });

  test('[assisted] send-terminal-selection-004: R-V with no bound destination opens destination picker', async () => {
    const MARKER = 'rl-sts-004-marker';

    const srcTerminal = await ss.createTerminal('csc-sts-004-src');

    echoToTerminal(srcTerminal, MARKER);
    await ss.settle(TERMINAL_READY_MS);

    const logCapture004 = getLogCapture();
    logCapture004.mark('before-sts-004');

    await waitForHuman(
      'send-terminal-selection-004',
      `No destination bound. In "csc-sts-004-src", select "${MARKER}" and press Cmd+R Cmd+V.`,
      [
        `1. Click into "csc-sts-004-src", drag-select "${MARKER}"`,
        '2. Press Cmd+R Cmd+V — the RangeLink destination picker opens',
        '3. Press Escape to dismiss the picker, then click Cancel',
      ],
    );

    const items004 = extractQuickPickItemsLogged(logCapture004.getLinesSince('before-sts-004'));
    assert.ok(
      items004 !== undefined,
      'Expected destination picker to open (no showQuickPick log entry found)',
    );
    assert.ok(items004.length > 0, 'Expected destination picker to contain at least one item');
    ss.log('✓ R-V with no bound destination opens picker (log-based)');
  });

  test('core-send-commands-r-l-005: R-L with no bound destination opens picker', async () => {
    const fileUri = ss.createWorkspaceFile('csc-r-l-005', 'test content\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await ss.settle();

    const logCaptureRl005 = getLogCapture();
    logCaptureRl005.mark('before-r-l-005');

    await openAndDismiss(CMD_COPY_LINK_RELATIVE);

    const itemsRl005 = extractQuickPickItemsLogged(logCaptureRl005.getLinesSince('before-r-l-005'));
    assert.ok(
      itemsRl005 !== undefined,
      'Expected destination picker to open (no showQuickPick log entry found)',
    );
    assert.ok(itemsRl005.length > 0, 'Expected destination picker to contain at least one item');
    ss.log('✓ R-L with no destination opens picker (log-based)');
  });

  test('core-send-commands-r-p-001: Send Portable Link with no bound destination opens picker', async () => {
    const fileUri = ss.createWorkspaceFile('csc-r-p-001', 'test content\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await ss.settle();

    const logCaptureRp001 = getLogCapture();
    logCaptureRp001.mark('before-r-p-001');

    await openAndDismiss(CMD_COPY_PORTABLE_LINK_RELATIVE);

    const itemsRp001 = extractQuickPickItemsLogged(logCaptureRp001.getLinesSince('before-r-p-001'));
    assert.ok(
      itemsRp001 !== undefined,
      'Expected destination picker to open (no showQuickPick log entry found)',
    );
    assert.ok(itemsRp001.length > 0, 'Expected destination picker to contain at least one item');
    ss.log('✓ Send Portable Link with no destination opens picker (log-based)');
  });

  test('core-send-commands-r-v-001: Send Selected Text with no bound destination opens picker', async () => {
    const fileUri = ss.createWorkspaceFile('csc-r-v-001', 'test content\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await ss.settle();

    const logCaptureRv001 = getLogCapture();
    logCaptureRv001.mark('before-r-v-001');

    await openAndDismiss(CMD_PASTE_TO_DESTINATION);

    const itemsRv001 = extractQuickPickItemsLogged(logCaptureRv001.getLinesSince('before-r-v-001'));
    assert.ok(
      itemsRv001 !== undefined,
      'Expected destination picker to open (no showQuickPick log entry found)',
    );
    assert.ok(itemsRv001.length > 0, 'Expected destination picker to contain at least one item');
    ss.log('✓ Send Selected Text with no destination opens picker (log-based)');
  });

  test('send-terminal-selection-006: R-L with terminal focus shows no-active-editor error', async () => {
    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-sts-006-dest');

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-006');

    capturing.terminal.show();
    await ss.settle();
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-sts-006');
    assertToastLogged(lines, {
      type: 'error',
      message: 'No active editor',
    });
    assert.ok(
      !lines.some((line) => line.includes('VscodeAdapter.writeTextToClipboard')),
      'Expected no clipboard write when R-L invoked from terminal focus',
    );
    assertNoStatusBarMsgLogged(lines, {
      message: '✓ RangeLink: RangeLink copied to clipboard & sent to Terminal ("csc-sts-006-dest")',
    });
    ss.log('✓ R-L from terminal focus shows no-active-editor error');
  });

  test('send-terminal-selection-007: R-C with terminal focus shows no-active-editor error', async () => {
    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-sts-007-dest');

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-007');

    capturing.terminal.show();
    await ss.settle();
    await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-sts-007');
    assertToastLogged(lines, {
      type: 'error',
      message: 'No active editor',
    });
    assert.ok(
      !lines.some((line) => line.includes('VscodeAdapter.writeTextToClipboard')),
      'Expected no clipboard write when R-C invoked from terminal focus',
    );
    ss.log('✓ R-C from terminal focus shows no-active-editor error');
  });

  test('core-send-commands-r-l-001: R-L sends RangeLink to bound terminal', async () => {
    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-r-l-001-dest');

    const fileUri = ss.createWorkspaceFile(
      'csc-r-l-001',
      'line 1\nline 2\nline 3\nline 4\nline 5\n',
    );
    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(4, 0));
    await ss.settle();
    capturing.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-l-001');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-r-l-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink: RangeLink copied to clipboard & sent to Terminal ("csc-r-l-001-dest")',
    });
    const captured = capturing.getCapturedText();
    assertTerminalBufferContains(captured, 'csc-r-l-001');
    assert.ok(
      captured.startsWith(' ') && captured.endsWith(' '),
      `Expected padded (space-bracketed) link in terminal buffer, got: ${JSON.stringify(captured)}`,
    );
    ss.log('✓ R-L sent padded RangeLink to bound terminal');
  });

  test('full-line-selection-validation-001: R-L after expandLineSelection generates link without error', async () => {
    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-fullline-001-dest');

    const fileUri = ss.createWorkspaceFile('csc-fullline-001', 'line 1\nline 2\nline 3\n');
    await ss.openEditor(fileUri);
    await ss.settle();

    await vscode.commands.executeCommand('expandLineSelection');
    await ss.settle();
    capturing.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-fullline-001');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-fullline-001');
    assertStatusBarMsgLogged(lines, {
      message:
        '✓ RangeLink: RangeLink copied to clipboard & sent to Terminal ("csc-fullline-001-dest")',
    });
    assertNoToastLogged(lines, {
      type: 'error',
      message: 'No active editor',
    });
    const captured = capturing.getCapturedText();
    assertTerminalBufferContains(captured, 'csc-fullline-001');
    assert.ok(
      captured.startsWith(' ') && captured.endsWith(' '),
      `Expected padded link in terminal buffer, got: ${JSON.stringify(captured)}`,
    );
    ss.log('✓ Full-line selection → R-L: link generated, no error');
  });
});
