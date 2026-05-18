import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_COPY_LINK_RELATIVE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
  CMD_TERMINAL_PASTE_SELECTED_TEXT,
} from '../../constants/commandIds';
import { VSCODE_CMD_TERMINAL_SELECT_ALL } from '../../constants/vscodeCommandIds';
import {
  assertClipboardChanged,
  assertClipboardRestored,
  assertTerminalBufferContains,
  type CapturingTerminal,
  cleanupFiles,
  createAndBindCapturingTerminal,
  createTerminal,
  createWorkspaceFile,
  getLogCapture,
  openAndDismiss,
  openEditor,
  settle,
  standardSuite,
  TERMINAL_READY_MS,
  waitForHuman,
  CLIPBOARD_SENTINEL,
  writeClipboardSentinel,
} from '../helpers';

standardSuite('Clipboard Preservation', (_log) => {
  let testFileUri: vscode.Uri;
  let editor: vscode.TextEditor;
  let capturing: CapturingTerminal;

  suiteSetup(async () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    testFileUri = createWorkspaceFile('clipboard', lines.join('\n') + '\n');
    editor = await openEditor(testFileUri);
  });

  suiteTeardown(async () => {
    cleanupFiles([testFileUri]);
  });

  setup(async () => {
    capturing = await createAndBindCapturingTerminal('rl-clipboard-test');
    await settle();
    editor = await vscode.window.showTextDocument(editor.document);
    await writeClipboardSentinel();
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));
  });

  test('clipboard-preservation-003: R-F with preserve=always restores clipboard to sentinel after send', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await assertClipboardRestored('R-F with preserve=always');
    assertTerminalBufferContains(capturing.getCapturedText(), 'clipboard');
  });

  test('clipboard-preservation-006: R-L with preserve=never leaves clipboard with the generated link', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    const clipboard = await assertClipboardChanged('R-L with preserve=never');
    assert.ok(clipboard.includes('#L'), `Expected line reference but got: ${clipboard}`);
    const captured = capturing.getCapturedText();
    assertTerminalBufferContains(captured, 'clipboard');
    assert.ok(
      captured.includes('#L'),
      `Expected line reference in terminal buffer, got: ${captured}`,
    );
  });

  test('clipboard-preservation-008: R-C writes link to clipboard with preserve=always (R-C is exempt from preserve)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await assertClipboardChanged('R-C with preserve=always');
    assert.ok(clipboard.includes('#L'), `Expected line reference but got: ${clipboard}`);
  });

  test('clipboard-preservation-008 (variant): R-C writes link to clipboard with default preserve setting', async () => {
    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await assertClipboardChanged('R-C with default preserve');
    assert.ok(clipboard.includes('#L'), `Expected line reference but got: ${clipboard}`);
  });

  test('clipboard-preservation-008 (variant): R-C writes link to clipboard with preserve=never', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await assertClipboardChanged('R-C with preserve=never');
    assert.ok(clipboard.includes('#L'), `Expected line reference but got: ${clipboard}`);
  });
});

standardSuite('Clipboard Preservation — Assisted', (log) => {
  const tmpFileUris: vscode.Uri[] = [];

  teardown(async () => {
    await vscode.commands.executeCommand('dummyAi.clearAll');
    cleanupFiles(tmpFileUris);
    tmpFileUris.splice(0);
    await settle();
  });

  test('clipboard-preservation-001: always mode — R-L to terminal restores clipboard', async () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    const fileUri = createWorkspaceFile('cbp-001', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const capturing: CapturingTerminal = await createAndBindCapturingTerminal('cbp-001-dest');

    const editor001 = await openEditor(fileUri);
    const lastSelectedLine = editor001.document.lineAt(3);
    editor001.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      lastSelectedLine.range.end,
    );
    await settle();
    await writeClipboardSentinel();

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    await assertClipboardRestored('clipboard-preservation-001: always + R-L');
    assertTerminalBufferContains(capturing.getCapturedText(), '#L');
    log('✓ Clipboard restored to sentinel after R-L; terminal received link');
  });

  test('clipboard-preservation-002: always mode — R-V from terminal restores clipboard', async () => {
    const PHRASE = 'hello world cbp-002';

    const fileUri = createWorkspaceFile('cbp-002', '');
    tmpFileUris.push(fileUri);

    await openEditor(fileUri);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    const srcTerminal = await createTerminal('cbp-002-src');
    srcTerminal.show(true);
    await settle();

    srcTerminal.sendText(PHRASE, false);
    await settle(TERMINAL_READY_MS);

    await vscode.commands.executeCommand(VSCODE_CMD_TERMINAL_SELECT_ALL);
    await settle();

    // Sentinel written after selectAll so copyOnSelection cannot overwrite it
    await writeClipboardSentinel();

    await vscode.commands.executeCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT);
    await settle();

    const destContent = (await vscode.workspace.openTextDocument(fileUri)).getText();
    assert.ok(
      destContent.replace(/[\r\n]/g, '').includes(PHRASE),
      `Expected "${PHRASE}" in destination file, got: ${JSON.stringify(destContent)}`,
    );
    await assertClipboardRestored('clipboard-preservation-002: always + R-V');
    log('✓ Clipboard restored to sentinel and phrase landed in destination file after R-V');
  });

  test('[assisted] clipboard-preservation-004: always mode — AI assistant paste restores clipboard', async () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    const fileUri = createWorkspaceFile('cbp-004', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const relPath = vscode.workspace.asRelativePath(fileUri);
    const expectedLink = `${relPath}#L1C1-L3C7`;

    const editor = await openEditor(fileUri);
    await writeClipboardSentinel();

    editor.selection = new vscode.Selection(0, 0, 2, 6);
    await settle();

    await waitForHuman(
      'clipboard-preservation-004',
      `Press Cmd+R Cmd+D → bind "Dummy AI (Tier 1)", click back into the editor, press Cmd+R Cmd+L`,
      [
        '1. Press Cmd+R Cmd+D → select "Dummy AI (Tier 1)" from the picker',
        '2. Click back into the editor (lines 1-3 are pre-selected)',
        '3. Press Cmd+R Cmd+L — the link should appear in Dummy AI Tier 1 textarea',
        '4. Press Cancel to continue (assertions happen automatically)',
      ],
    );

    await settle();
    const dummyText = (await vscode.commands.executeCommand('dummyAi.getText')) as {
      tier1: string;
      tier2: string;
    };
    // trim() strips smart-padding spaces (pasteLink='both' adds leading/trailing space)
    assert.strictEqual(
      dummyText.tier1.trim(),
      expectedLink,
      `Expected Dummy AI tier1="${expectedLink}", got: ${JSON.stringify(dummyText.tier1)}`,
    );
    await assertClipboardRestored('clipboard-preservation-004: always + AI paste');
    log('✓ Clipboard restored to sentinel and link landed in Dummy AI after R-L');
  });

  test('clipboard-preservation-005: always mode — terminal paste (fresh bind) restores clipboard', async () => {
    const lines = Array.from({ length: 10 }, (_, i) => `entry ${i + 1}`);
    const fileUri = createWorkspaceFile('cbp-005', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const capturing: CapturingTerminal = await createAndBindCapturingTerminal('cbp-005-dest');

    const editor005 = await openEditor(fileUri);
    const lastSelectedLine = editor005.document.lineAt(2);
    editor005.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      lastSelectedLine.range.end,
    );
    await settle();
    await writeClipboardSentinel();

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    await assertClipboardRestored('clipboard-preservation-005: always + terminal paste');
    assertTerminalBufferContains(capturing.getCapturedText(), '#L');
    log('✓ Clipboard restored to sentinel after terminal paste (preserve=always)');
  });

  test('clipboard-preservation-007: never mode — R-V from terminal overwrites clipboard', async () => {
    const PHRASE = 'test phrase cbp-007';

    const config = vscode.workspace.getConfiguration();
    await config.update('rangelink.clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);
    log('set rangelink.clipboard.preserve to never');

    const fileUri = createWorkspaceFile('cbp-007', '');
    tmpFileUris.push(fileUri);

    await openEditor(fileUri);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    const srcTerminal = await createTerminal('cbp-007-src');
    srcTerminal.show(true);
    await settle();

    srcTerminal.sendText(PHRASE, false);
    await settle(TERMINAL_READY_MS);

    await vscode.commands.executeCommand(VSCODE_CMD_TERMINAL_SELECT_ALL);
    await settle();

    // Sentinel written after selectAll so copyOnSelection cannot overwrite it
    await writeClipboardSentinel();

    await vscode.commands.executeCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT);
    await settle();

    const destContent = (await vscode.workspace.openTextDocument(fileUri)).getText();
    assert.ok(
      destContent.replace(/[\r\n]/g, '').includes(PHRASE),
      `Expected "${PHRASE}" in destination file, got: ${JSON.stringify(destContent)}`,
    );
    await assertClipboardChanged('clipboard-preservation-007: never + R-V');
    log('✓ Clipboard changed from sentinel and phrase landed in destination file after R-V');
  });

  test('clipboard-preservation-009: always mode — dismissed picker leaves clipboard unchanged', async () => {
    const lines = Array.from({ length: 5 }, (_, i) => `line ${i + 1}`);
    const fileUri = createWorkspaceFile('cbp-009', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const SELECTION_START_LINE = 0;
    const SELECTION_END_LINE = 2;
    const SELECTION_COLUMN = 0;

    const editor009 = await openEditor(fileUri);
    editor009.selection = new vscode.Selection(
      new vscode.Position(SELECTION_START_LINE, SELECTION_COLUMN),
      new vscode.Position(SELECTION_END_LINE, SELECTION_COLUMN),
    );
    await settle();
    await writeClipboardSentinel();

    await openAndDismiss(CMD_COPY_LINK_RELATIVE);

    await assertClipboardRestored('clipboard-preservation-009: always + picker dismissed');
    log('✓ Clipboard unchanged after picker dismissed (no operation performed)');
  });

  test('[assisted] clipboard-preservation-010: focus command failure preserves link in clipboard for manual paste', async () => {

    const lines = Array.from({ length: 5 }, (_, i) => `line ${i + 1}`);
    const fileUri = createWorkspaceFile('cbp-010', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const relPath = vscode.workspace.asRelativePath(fileUri);
    await openEditor(fileUri);
    await settle();
    await writeClipboardSentinel();

    const logCapture = getLogCapture();
    logCapture.mark('before-010');

    await waitForHuman(
      'clipboard-preservation-010',
      `clipboard.preserve="always". Bind "Dummy AI (Focus-Fail)" via Cmd+R Cmd+D, then select lines 1-3 in the test file and press Cmd+R Cmd+L. The focus command throws — you should see a warning. Sentinel: "${CLIPBOARD_SENTINEL}".`,
      [
        '1. Press Cmd+R Cmd+D → select "Dummy AI (Focus-Fail)" from the picker',
        `2. Click back into the test file (${relPath}) and select lines 1-3`,
        '3. Press Cmd+R Cmd+L — the focus command will throw an intentional error',
        '4. Observe the warning message (manual paste instruction)',
        '5. Press Cancel to continue (test verifies the link stayed in the clipboard)',
      ],
    );

    await settle();

    const lines010 = logCapture.getLinesSince('before-010');
    const focusFailLog = lines010.find((line) => line.includes('Focus failed, cannot paste link'));
    assert.ok(
      focusFailLog,
      'Expected "Focus failed, cannot paste link" log — the focus command should have thrown',
    );

    const warningToastLog = lines010.find(
      (line) =>
        line.includes('VscodeAdapter.showWarningMessage') && line.toLowerCase().includes('paste'),
    );
    assert.ok(
      warningToastLog,
      'Expected warning toast log instructing manual paste after focus failure',
    );

    const clipboardContent = await assertClipboardChanged(
      'clipboard-preservation-010: focus-fail — link must stay in clipboard',
    );
    assert.ok(
      clipboardContent.includes('#L'),
      `Expected a RangeLink link in clipboard (with #L) but got: ${clipboardContent}`,
    );
    log('✓ Clipboard not restored after focus failure — link stays in clipboard for manual paste');
  });
});
