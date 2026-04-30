import assert from 'node:assert';
import path from 'node:path';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_COPY_LINK_ONLY_RELATIVE,
  CMD_TERMINAL_PASTE_SELECTED_TEXT,
  CMD_UNBIND_DESTINATION,
} from '../../constants/commandIds';
import {
  activateExtension,
  assertClipboardChanged,
  assertStatusBarMsgLogged,
  assertTerminalBufferContains,
  assertToastLogged,
  type CapturingTerminal,
  cleanupFiles,
  closeAllEditors,
  createAndBindCapturingTerminal,
  createLogger,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  openEditor,
  printAssistedBanner,
  settle,
  TERMINAL_READY_MS,
  waitForHuman,
  writeClipboardSentinel,
} from '../helpers';

const NO_TERMINAL_SELECTION_MSG =
  'RangeLink: No text selected in the terminal. Select text and try again.';

suite('Core Send Commands', () => {
  const log = createLogger('coreSendCommands');
  const tmpFileUris: vscode.Uri[] = [];
  const tmpTerminals: vscode.Terminal[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await vscode.commands.executeCommand('dummyAi.clearAll');
    for (const t of tmpTerminals.splice(0)) t.dispose();
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.splice(0);
    await settle();
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-l-002
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-l-002: R-L sends RangeLink to bound text editor destination', async () => {
    const srcUri = createWorkspaceFile(
      'csc-r-l-002-src',
      'line 1\nline 2\nline 3\nline 4\nline 5\n',
    );
    const destUri = createWorkspaceFile('csc-r-l-002-dest', '');
    tmpFileUris.push(srcUri, destUri);

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    const srcDoc = await vscode.workspace.openTextDocument(srcUri);
    const srcEditor = await vscode.window.showTextDocument(srcDoc, vscode.ViewColumn.One);
    srcEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(3, 0),
    );
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-l-002');

    await waitForHuman(
      'core-send-commands-r-l-002',
      'Lines 2-3 selected in "csc-r-l-002-src". "csc-r-l-002-dest" is bound as text editor destination.',
      ['1. Press Cmd+R Cmd+L'],
    );

    const updatedDestDoc = await vscode.workspace.openTextDocument(destUri);
    const destText = updatedDestDoc.getText();
    assert.ok(
      destText.includes('#L'),
      `Expected RangeLink inserted into dest editor, got: ${JSON.stringify(destText)}`,
    );

    const lines = logCapture.getLinesSince('before-r-l-002');
    const destBasename = path.basename(destUri.fsPath);
    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink copied to clipboard & sent to Text Editor ("${destBasename}")`,
    });
    log('✓ R-L inserted RangeLink into bound text editor destination');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-l-003
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-l-003: R-L sends RangeLink to bound AI assistant destination', async () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    const fileUri = createWorkspaceFile('csc-r-l-003', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const relPath = vscode.workspace.asRelativePath(fileUri);
    const expectedLink = `${relPath}#L1-L3`;

    await openEditor(fileUri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-l-003');

    await waitForHuman(
      'core-send-commands-r-l-003',
      `Bind Dummy AI Tier 1 via Cmd+R Cmd+D, select lines 1-3 in ${relPath}, press Cmd+R Cmd+L.`,
      [
        '1. Press Cmd+R Cmd+D → select "Dummy AI (Tier 1)"',
        `2. Click into ${relPath}, select lines 1-3`,
        '3. Press Cmd+R Cmd+L',
      ],
    );

    await settle();
    const dummyText = (await vscode.commands.executeCommand('dummyAi.getText')) as {
      tier1: string;
      tier2: string;
    };
    assert.strictEqual(
      dummyText.tier1.trim(),
      expectedLink,
      `Expected Dummy AI tier1="${expectedLink}", got: ${JSON.stringify(dummyText.tier1)}`,
    );

    assert.ok(
      logCapture.getLinesSince('before-r-l-003').some((l) => l.includes('sent to')),
      'Expected "sent to" log line after R-L to AI destination',
    );
    log('✓ R-L sent RangeLink to Dummy AI (Tier 1) destination');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-c-001
  // ---------------------------------------------------------------------------

  test('core-send-commands-r-c-001: R-C copies RangeLink to clipboard and does NOT send to terminal', async () => {
    const fileUri = createWorkspaceFile('csc-r-c-001', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);

    const capturing: CapturingTerminal = await createAndBindCapturingTerminal(
      'csc-r-c-001-dest',
      tmpTerminals,
    );

    const editor = await openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-c-001');

    await writeClipboardSentinel();
    await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
    await settle();

    const clipboard = await assertClipboardChanged('R-C should write link to clipboard');
    assert.ok(
      clipboard.includes('#L'),
      `Expected line-range link in clipboard, got: ${JSON.stringify(clipboard)}`,
    );

    assert.strictEqual(
      capturing.getCapturedText(),
      '',
      'Terminal should not have received anything from R-C',
    );

    assertStatusBarMsgLogged(logCapture.getLinesSince('before-r-c-001'), {
      message: '✓ RangeLink copied to clipboard',
    });
    log('✓ R-C wrote link to clipboard; terminal received nothing');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-l-004
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-l-004: Command Palette "Send RangeLink" behaves identically to R-L keybinding', async () => {
    const fileUri = createWorkspaceFile('csc-r-l-004', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);

    const capturing: CapturingTerminal = await createAndBindCapturingTerminal(
      'csc-r-l-004-dest',
      tmpTerminals,
    );

    const editor = await openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-l-004');

    await waitForHuman(
      'core-send-commands-r-l-004',
      '"csc-r-l-004-dest" is bound. Lines 1-2 selected.',
      ['1. Press Cmd+Shift+P → "RangeLink: Send RangeLink"'],
    );

    assertTerminalBufferContains(capturing.getCapturedText(), '#L');

    assertStatusBarMsgLogged(logCapture.getLinesSince('before-r-l-004'), {
      message: '✓ RangeLink copied to clipboard & sent to Terminal ("csc-r-l-004-dest")',
    });
    log('✓ Command Palette "Send RangeLink" delivered link to bound terminal destination');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-c-002
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-c-002: Command Palette "Copy RangeLink" behaves identically to R-C keybinding', async () => {
    const fileUri = createWorkspaceFile('csc-r-c-002', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);

    const capturing: CapturingTerminal = await createAndBindCapturingTerminal(
      'csc-r-c-002-dest',
      tmpTerminals,
    );

    const editor = await openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 0));
    await settle();

    await writeClipboardSentinel();

    const logCapture = getLogCapture();
    logCapture.mark('before-r-c-002');

    await waitForHuman(
      'core-send-commands-r-c-002',
      '"csc-r-c-002-dest" is bound but should NOT receive anything. Lines 1-2 selected.',
      ['1. Press Cmd+Shift+P → "RangeLink: Copy RangeLink"'],
    );

    const clipboard = await assertClipboardChanged('R-C palette should write link to clipboard');
    assert.ok(
      clipboard.includes('#L'),
      `Expected line-range link in clipboard, got: ${JSON.stringify(clipboard)}`,
    );

    assert.strictEqual(
      capturing.getCapturedText(),
      '',
      'Terminal should not have received anything from "Copy RangeLink"',
    );
    assertStatusBarMsgLogged(logCapture.getLinesSince('before-r-c-002'), {
      message: '✓ RangeLink copied to clipboard',
    });
    log('✓ Command Palette "Copy RangeLink" wrote link to clipboard; terminal received nothing');
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-001
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-001: Cmd+R Cmd+V with terminal text selected sends to bound destination', async () => {
    const MARKER = 'rl-sts-001-marker';

    const capturing: CapturingTerminal = await createAndBindCapturingTerminal(
      'csc-sts-001-dest',
      tmpTerminals,
    );
    await settle();

    const srcTerminal = vscode.window.createTerminal({ name: 'csc-sts-001-src' });
    srcTerminal.show(true);
    tmpTerminals.push(srcTerminal);
    await settle(TERMINAL_READY_MS);

    srcTerminal.sendText(`echo "${MARKER}"`, true);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-001');

    await waitForHuman(
      'send-terminal-selection-001',
      `In "csc-sts-001-src", select "${MARKER}" and press Cmd+R Cmd+V.`,
      [`1. Click into "csc-sts-001-src", drag-select "${MARKER}"`, '2. Press Cmd+R Cmd+V'],
    );

    assertTerminalBufferContains(capturing.getCapturedText(), MARKER);

    assertStatusBarMsgLogged(logCapture.getLinesSince('before-sts-001'), {
      message: '✓ Selected text copied to clipboard & sent to Terminal ("csc-sts-001-dest")',
    });
    log('✓ R-V sent selected terminal text to bound destination');
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-003
  // ---------------------------------------------------------------------------

  test('send-terminal-selection-003: R-V with no text selected in terminal shows error message', async () => {
    const terminal = vscode.window.createTerminal({ name: 'csc-sts-003' });
    terminal.show(true);
    tmpTerminals.push(terminal);
    await settle(TERMINAL_READY_MS);

    // On macOS, terminal.copySelection leaves the clipboard unchanged when nothing
    // is selected — so we prime the clipboard to empty so the preserve/read roundtrip
    // returns "" and triggers the no-text-selected error path.
    await vscode.env.clipboard.writeText('');

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-003');

    await vscode.commands.executeCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT);
    await settle();

    assertToastLogged(logCapture.getLinesSince('before-sts-003'), {
      type: 'error',
      message: NO_TERMINAL_SELECTION_MSG,
    });
    log('✓ R-V with no selection shows "no text selected" error toast');
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-004
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-004: R-V with no bound destination opens destination picker', async () => {
    const MARKER = 'rl-sts-004-marker';

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await settle();

    const srcTerminal = vscode.window.createTerminal({ name: 'csc-sts-004-src' });
    srcTerminal.show(true);
    tmpTerminals.push(srcTerminal);
    await settle(TERMINAL_READY_MS);

    srcTerminal.sendText(`echo "${MARKER}"`, true);
    await settle(TERMINAL_READY_MS);

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
    log('✓ R-V with no bound destination opens picker (log-based)');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-l-005
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-l-005: R-L with no bound destination opens picker', async () => {
    const fileUri = createWorkspaceFile('csc-r-l-005', 'test content\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await settle();

    const logCaptureRl005 = getLogCapture();
    logCaptureRl005.mark('before-r-l-005');

    await waitForHuman(
      'core-send-commands-r-l-005',
      'No destination bound. "test" is already selected.',
      [
        'Press Cmd+R Cmd+L — the RangeLink destination picker opens',
        'Press Escape to dismiss the picker, then click Cancel',
      ],
    );

    const itemsRl005 = extractQuickPickItemsLogged(logCaptureRl005.getLinesSince('before-r-l-005'));
    assert.ok(
      itemsRl005 !== undefined,
      'Expected destination picker to open (no showQuickPick log entry found)',
    );
    assert.ok(itemsRl005.length > 0, 'Expected destination picker to contain at least one item');
    log('✓ R-L with no destination opens picker (log-based)');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-p-001
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-p-001: Send Portable Link with no bound destination opens picker', async () => {
    const fileUri = createWorkspaceFile('csc-r-p-001', 'test content\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await settle();

    const logCaptureRp001 = getLogCapture();
    logCaptureRp001.mark('before-r-p-001');

    await waitForHuman(
      'core-send-commands-r-p-001',
      'No destination bound. "test" is already selected.',
      [
        'Press Cmd+Shift+P → "RangeLink: Send Portable Link" — the RangeLink destination picker opens',
        'Press Escape to dismiss the picker, then click Cancel',
      ],
    );

    const itemsRp001 = extractQuickPickItemsLogged(logCaptureRp001.getLinesSince('before-r-p-001'));
    assert.ok(
      itemsRp001 !== undefined,
      'Expected destination picker to open (no showQuickPick log entry found)',
    );
    assert.ok(itemsRp001.length > 0, 'Expected destination picker to contain at least one item');
    log('✓ Send Portable Link with no destination opens picker (log-based)');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-v-001
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-v-001: Send Selected Text with no bound destination opens picker', async () => {
    const fileUri = createWorkspaceFile('csc-r-v-001', 'test content\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await settle();

    const logCaptureRv001 = getLogCapture();
    logCaptureRv001.mark('before-r-v-001');

    await waitForHuman(
      'core-send-commands-r-v-001',
      'No destination bound. "test" is already selected.',
      [
        'Press Cmd+Shift+P → "RangeLink: Send Selected Text" — the RangeLink destination picker opens',
        'Press Escape to dismiss the picker, then click Cancel',
      ],
    );

    const itemsRv001 = extractQuickPickItemsLogged(logCaptureRv001.getLinesSince('before-r-v-001'));
    assert.ok(
      itemsRv001 !== undefined,
      'Expected destination picker to open (no showQuickPick log entry found)',
    );
    assert.ok(itemsRv001.length > 0, 'Expected destination picker to contain at least one item');
    log('✓ Send Selected Text with no destination opens picker (log-based)');
  });
});
