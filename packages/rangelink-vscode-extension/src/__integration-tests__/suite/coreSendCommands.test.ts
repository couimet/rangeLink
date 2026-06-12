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
  assertClipboardEqualsGeneratedLink,
  assertNoClipboardWriteLogged,
  assertTerminalBufferContains,
  assertTerminalBufferEqualsGeneratedLink,
  type CapturingTerminal,
  clearSelection,
  echoToTerminal,
  getGeneratedLink,
  assertQuickPickContains,
  MENU_ITEM_GROUP_AI_ASSISTANTS,
  MENU_ITEM_GROUP_FILES,
  MENU_ITEM_GROUP_TERMINALS,
  getLogCapture,
  openAndDismiss,
  standardSuite,
  TERMINAL_READY_MS,
  waitForHuman,
} from '../helpers';

const NO_TERMINAL_SELECTION_MSG = 'No text selected in the terminal. Select text and try again.';

standardSuite('Core Send Commands', (ss) => {
  test('core-send-commands-r-l-002: R-L sends RangeLink to bound text editor destination', async () => {
    const srcUri = ss.createWorkspaceFile(
      'csc-r-l-002-src',
      'line 1\nline 2\nline 3\nline 4\nline 5\n',
    );
    const destUri = ss.createWorkspaceFile('csc-r-l-002-dest', '');
    const destBasename = path.basename(destUri.fsPath);
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: RangeLink sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

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

    const generatedLink = getGeneratedLink('before-r-l-002', { smartPad: 'both' });

    const updatedDestDoc = await vscode.workspace.openTextDocument(destUri);
    const destText = updatedDestDoc.getText();
    assert.strictEqual(
      destText,
      generatedLink,
      `Expected dest editor to contain exactly the generated link, got: ${JSON.stringify(destText)}`,
    );

    ss.log('✓ R-L sent exact RangeLink to bound text editor destination');
  });

  test('core-send-commands-r-l-003: R-L sends RangeLink to bound AI assistant destination', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Tier 1)',
      '✓ RangeLink: RangeLink sent to Dummy AI (Tier 1)',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const CSC_R_L_003_LINE_COUNT = 10;
    const { uri: fileUri } = ss.createContentFile(
      'csc-r-l-003',
      CSC_R_L_003_LINE_COUNT,
      (i) => `line ${i + 1} content`,
    );

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 3, 0);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension',
    });
    await ss.settle();

    const logCapture003 = getLogCapture();
    logCapture003.mark('before-r-l-003');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const generatedLink = getGeneratedLink('before-r-l-003', { smartPad: 'both' });

    const dummyText = (await vscode.commands.executeCommand('dummyAi.getText')) as {
      tier1: string;
      tier2: string;
    };
    assert.strictEqual(
      dummyText.tier1,
      generatedLink,
      `Expected Dummy AI tier1="${generatedLink}", got: ${JSON.stringify(dummyText.tier1)}`,
    );
    ss.log('✓ R-L sent RangeLink to Dummy AI (Tier 1) destination');
  });

  test('core-send-commands-r-c-001: R-C copies RangeLink to clipboard and does NOT send to terminal', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("csc-r-c-001-dest")',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });
    const fileUri = ss.createWorkspaceFile('csc-r-c-001', 'line 1\nline 2\nline 3\n');

    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-r-c-001-dest');

    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
    await ss.settle();

    await assertClipboardEqualsGeneratedLink(
      'R-C should write link to clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-r-c-001',
    );

    assert.strictEqual(
      capturing.getCapturedText(),
      '',
      'Terminal should not have received anything from R-C',
    );

    ss.log('✓ R-C wrote link to clipboard; terminal received nothing');
  });

  test('core-send-commands-r-l-004: Command dispatch "Send RangeLink" behaves identically to R-L keybinding', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("csc-r-l-004-dest")',
      '✓ RangeLink: RangeLink sent to Terminal ("csc-r-l-004-dest")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });
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

    assertTerminalBufferEqualsGeneratedLink(capturing, 'before-r-l-004');

    ss.log(
      '✓ Command dispatch "Send RangeLink" delivered exact link to bound terminal destination',
    );
  });

  test('core-send-commands-r-c-002: Command dispatch "Copy RangeLink" behaves identically to R-C keybinding', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("csc-r-c-002-dest")',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });
    const fileUri = ss.createWorkspaceFile('csc-r-c-002', 'line 1\nline 2\nline 3\n');

    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-r-c-002-dest');

    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
    await ss.settle();

    await assertClipboardEqualsGeneratedLink(
      'R-C command dispatch should write link to clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-r-c-002',
    );

    assert.strictEqual(
      capturing.getCapturedText(),
      '',
      'Terminal should not have received anything from "Copy RangeLink"',
    );
    ss.log(
      '✓ Command dispatch "Copy RangeLink" wrote exact link to clipboard; terminal received nothing',
    );
  });

  test('[assisted] send-terminal-selection-001: Cmd+R Cmd+V with terminal text selected sends to bound destination', async () => {
    const MARKER = 'rl-sts-001-marker';

    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-sts-001-dest');
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("csc-sts-001-dest")',
      '✓ RangeLink: Selected text sent to Terminal ("csc-sts-001-dest")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

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

    ss.log('✓ R-V sent selected terminal text to bound destination');
  });

  test('send-terminal-selection-003: R-V with no text selected in terminal shows error message', async () => {
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });
    await ss.createTerminal('csc-sts-003');

    // On macOS, terminal.copySelection leaves the clipboard unchanged when nothing
    // is selected — so we prime the clipboard to empty so the preserve/read roundtrip
    // returns "" and triggers the no-text-selected error path.
    await vscode.env.clipboard.writeText('');

    ss.expectToastMessages([{ level: 'error', message: NO_TERMINAL_SELECTION_MSG }]);

    await vscode.commands.executeCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT);
    await ss.settle();

    ss.log('✓ R-V with no selection shows "no text selected" error toast');
  });

  test('[assisted] send-terminal-selection-004: R-V with no bound destination opens destination picker', async () => {
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });
    const MARKER = 'rl-sts-004-marker';

    const srcTerminal = await ss.createTerminal('csc-sts-004-src');

    echoToTerminal(srcTerminal, MARKER);
    await ss.settle(TERMINAL_READY_MS);

    const logCapture004 = getLogCapture();
    logCapture004.mark('before-sts-004');

    await waitForHuman(
      'send-terminal-selection-004',
      `No destination bound. In "csc-sts-004-src", select "${MARKER}", press Cmd+R Cmd+V, then dismiss the picker with Escape.`,
      [
        `1. Click into "csc-sts-004-src", drag-select "${MARKER}"`,
        '2. Press Cmd+R Cmd+V — the RangeLink destination picker opens',
        '3. Press Escape to dismiss the picker',
      ],
    );

    const linesSts004 = logCapture004.getLinesSince('before-sts-004');
    assertQuickPickContains(linesSts004, MENU_ITEM_GROUP_AI_ASSISTANTS, MENU_ITEM_GROUP_TERMINALS);
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

    const linesRl005 = logCaptureRl005.getLinesSince('before-r-l-005');
    assertQuickPickContains(linesRl005, MENU_ITEM_GROUP_AI_ASSISTANTS, MENU_ITEM_GROUP_FILES);
    ss.log('✓ R-L with no destination opens picker (log-based)');
  });

  test('[assisted] send-terminal-selection-010: Self-paste via R-V — bound terminal selection is sent back to itself', async () => {
    const terminalName = 'rl-sts-010';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);
    const markerText = 'STS_010_SELF_PASTE_MARKER';
    capturing.terminal.sendText(markerText, false);
    await ss.settle(TERMINAL_READY_MS);

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-sts-010")',
      '✓ RangeLink: Selected text sent to Terminal ("rl-sts-010")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-010');
    capturing.clearCaptured();

    await waitForHuman(
      'send-terminal-selection-010',
      `In "${terminalName}", select "${markerText}" and press Cmd+R Cmd+V (R-V).`,
      [
        `Destination: Terminal "${terminalName}" IS the bound destination (the SAME terminal we will select from).`,
        `1. Click into "${terminalName}" to give it focus`,
        `2. Drag-select "${markerText}" in the terminal buffer`,
        '3. Press Cmd+R Cmd+V',
        'The right-click menu intentionally hides "Send Selected Text" here (self-paste gate). The R-V keybinding bypasses that gate and pastes the selection BACK into the same terminal.',
      ],
    );

    assertTerminalBufferContains(capturing.getCapturedText(), markerText);

    ss.log('✓ Self-paste via R-V: selection echoed back into bound terminal buffer (pty-captured)');
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

    const linesRp001 = logCaptureRp001.getLinesSince('before-r-p-001');
    assertQuickPickContains(linesRp001, MENU_ITEM_GROUP_AI_ASSISTANTS, MENU_ITEM_GROUP_FILES);
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

    const linesRv001 = logCaptureRv001.getLinesSince('before-r-v-001');
    assertQuickPickContains(linesRv001, MENU_ITEM_GROUP_AI_ASSISTANTS, MENU_ITEM_GROUP_FILES);
    ss.log('✓ Send Selected Text with no destination opens picker (log-based)');
  });

  test('send-terminal-selection-006: R-L with terminal focus shows no-active-editor error', async () => {
    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-sts-006-dest');

    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("csc-sts-006-dest")']);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });
    ss.expectToastMessages([{ level: 'error', message: 'No active editor' }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-006');

    capturing.terminal.show();
    await ss.settle();
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-sts-006');
    assertNoClipboardWriteLogged(lines);
    ss.log('✓ R-L from terminal focus shows no-active-editor error');
  });

  test('send-terminal-selection-007: R-C with terminal focus shows no-active-editor error', async () => {
    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-sts-007-dest');

    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("csc-sts-007-dest")']);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });
    ss.expectToastMessages([{ level: 'error', message: 'No active editor' }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-007');

    capturing.terminal.show();
    await ss.settle();
    await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-sts-007');
    assertNoClipboardWriteLogged(lines);
    ss.log('✓ R-C from terminal focus shows no-active-editor error');
  });

  test('core-send-commands-r-l-001: R-L sends RangeLink to bound terminal', async () => {
    const capturing: CapturingTerminal =
      await ss.createAndBindCapturingTerminal('csc-r-l-001-dest');

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("csc-r-l-001-dest")',
      '✓ RangeLink: RangeLink sent to Terminal ("csc-r-l-001-dest")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

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

    assertTerminalBufferEqualsGeneratedLink(capturing, 'before-r-l-001');
    ss.log('✓ R-L sent padded RangeLink to bound terminal');
  });

  test('full-line-selection-validation-001: R-L after expandLineSelection generates link without error', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("csc-fullline-001-dest")',
      '✓ RangeLink: RangeLink sent to Terminal ("csc-fullline-001-dest")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

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

    assertTerminalBufferEqualsGeneratedLink(capturing, 'before-fullline-001');
    ss.log('✓ Full-line selection → R-L: link generated, no error');
  });
});
