import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_COPY_LINK_RELATIVE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
  CMD_TERMINAL_PASTE_SELECTED_TEXT,
  CMD_UNBIND_DESTINATION,
} from '../../constants/commandIds';
import { VSCODE_CMD_TERMINAL_SELECT_ALL } from '../../constants/vscodeCommandIds';
import {
  activateExtension,
  assertClipboardChanged,
  assertClipboardRestored,
  assertTerminalBufferContains,
  type CapturingTerminal,
  cleanupFiles,
  closeAllEditors,
  CLIPBOARD_SENTINEL,
  createAndBindCapturingTerminal,
  createLogger,
  createTerminal,
  createWorkspaceFile,
  loadSettingsProfile,
  openEditor,
  printAssistedBanner,
  resetRangelinkSettings,
  settle,
  TERMINAL_READY_MS,
  waitForHuman,
  writeClipboardSentinel,
} from '../helpers';

suite('Clipboard Preservation', () => {
  let testFileUri: vscode.Uri;
  let editor: vscode.TextEditor;
  let capturing: CapturingTerminal;

  suiteSetup(async () => {
    await activateExtension();

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    testFileUri = createWorkspaceFile('clipboard', lines.join('\n') + '\n');

    editor = await openEditor(testFileUri);

    capturing = await createAndBindCapturingTerminal('rl-clipboard-test');
    editor = await openEditor(testFileUri);
  });

  suiteTeardown(async () => {
    capturing.terminal.dispose();
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  setup(async () => {
    editor = await vscode.window.showTextDocument(editor.document);
    await writeClipboardSentinel();
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));
  });

  teardown(async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', undefined, vscode.ConfigurationTarget.Global);
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

suite('Clipboard Preservation — Assisted', () => {
  const log = createLogger('clipboardPreservationAssisted');
  const tmpFileUris: vscode.Uri[] = [];
  const tmpTerminals: vscode.Terminal[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await resetRangelinkSettings(log);
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await vscode.commands.executeCommand('dummyAi.clearAll');
    for (const t of tmpTerminals.splice(0)) t.dispose();
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.splice(0);
    await settle();
  });

  // ---------------------------------------------------------------------------
  // TC clipboard-preservation-001
  // ---------------------------------------------------------------------------

  test('[assisted] clipboard-preservation-001: always mode — R-L to terminal restores clipboard', async () => {
    await loadSettingsProfile('default', log);

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    const fileUri = createWorkspaceFile('cbp-001', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const capturing: CapturingTerminal = await createAndBindCapturingTerminal(
      'cbp-001-dest',
      tmpTerminals,
    );

    await openEditor(fileUri);
    await writeClipboardSentinel();

    await waitForHuman(
      'clipboard-preservation-001',
      `clipboard.preserve="always". Terminal "cbp-001-dest" is bound. Select lines 2-4 in the test file and press Cmd+R Cmd+L. Sentinel: "${CLIPBOARD_SENTINEL}".`,
      [
        '1. Click into the open test file (cbp-001-...)',
        '2. Select lines 2 through 4',
        '3. Press Cmd+R Cmd+L — the link should appear in terminal "cbp-001-dest"',
        '4. Press Cancel to continue (clipboard assertion happens automatically)',
      ],
    );

    await assertClipboardRestored('clipboard-preservation-001: always + R-L');
    assertTerminalBufferContains(capturing.getCapturedText(), '#L');
    log('✓ Clipboard restored to sentinel after R-L; terminal received link');
  });

  // ---------------------------------------------------------------------------
  // TC clipboard-preservation-002
  // ---------------------------------------------------------------------------

  test('clipboard-preservation-002: always mode — R-V from terminal restores clipboard', async () => {
    const PHRASE = 'hello world cbp-002';

    await loadSettingsProfile('default', log);

    const fileUri = createWorkspaceFile('cbp-002', '');
    tmpFileUris.push(fileUri);

    await openEditor(fileUri);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    const srcTerminal = await createTerminal('cbp-002-src', tmpTerminals);
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

  // ---------------------------------------------------------------------------
  // TC clipboard-preservation-004
  // ---------------------------------------------------------------------------

  test('[assisted] clipboard-preservation-004: always mode — AI assistant paste restores clipboard', async () => {
    await loadSettingsProfile('default', log);

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content`);
    const fileUri = createWorkspaceFile('cbp-004', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const relPath = vscode.workspace.asRelativePath(fileUri);
    const expectedLink = `${relPath}#L1-L3`;

    await openEditor(fileUri);
    await writeClipboardSentinel();

    await waitForHuman(
      'clipboard-preservation-004',
      `clipboard.preserve="always". Press Cmd+R Cmd+D → bind "Dummy AI (Tier 1)"; click back into the cbp-004 file, select exactly lines 1-3, press Cmd+R Cmd+L. Sentinel: "${CLIPBOARD_SENTINEL}".`,
      [
        '1. Press Cmd+R Cmd+D → select "Dummy AI (Tier 1)" from the picker',
        `2. Click back into the test file (${relPath})`,
        '3. Select exactly lines 1-3 (click line 1, shift-click end of line 3)',
        '4. Press Cmd+R Cmd+L — the link should appear in Dummy AI Tier 1 textarea',
        '5. Press Cancel to continue (assertions happen automatically)',
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

  // ---------------------------------------------------------------------------
  // TC clipboard-preservation-005
  // ---------------------------------------------------------------------------

  test('[assisted] clipboard-preservation-005: always mode — terminal paste (fresh bind) restores clipboard', async () => {
    await loadSettingsProfile('default', log);

    const lines = Array.from({ length: 10 }, (_, i) => `entry ${i + 1}`);
    const fileUri = createWorkspaceFile('cbp-005', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    const capturing: CapturingTerminal = await createAndBindCapturingTerminal(
      'cbp-005-dest',
      tmpTerminals,
    );

    await openEditor(fileUri);
    await writeClipboardSentinel();

    await waitForHuman(
      'clipboard-preservation-005',
      `clipboard.preserve="always". Terminal "cbp-005-dest" is bound. Select 2-3 lines in the test file and press Cmd+R Cmd+L. Sentinel: "${CLIPBOARD_SENTINEL}".`,
      [
        '1. Click into the open test file (cbp-005-...)',
        '2. Select 2 or 3 lines',
        '3. Press Cmd+R Cmd+L — the link should appear in terminal "cbp-005-dest"',
        '4. Press Cancel to continue (clipboard assertion happens automatically)',
      ],
    );

    await assertClipboardRestored('clipboard-preservation-005: always + terminal paste');
    assertTerminalBufferContains(capturing.getCapturedText(), '#L');
    log('✓ Clipboard restored to sentinel after terminal paste (preserve=always)');
  });

  // ---------------------------------------------------------------------------
  // TC clipboard-preservation-007
  // ---------------------------------------------------------------------------

  test('clipboard-preservation-007: never mode — R-V from terminal overwrites clipboard', async () => {
    const PHRASE = 'test phrase cbp-007';

    await loadSettingsProfile('clipboard-never', log);

    const fileUri = createWorkspaceFile('cbp-007', '');
    tmpFileUris.push(fileUri);

    await openEditor(fileUri);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    const srcTerminal = await createTerminal('cbp-007-src', tmpTerminals);
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

  // ---------------------------------------------------------------------------
  // TC clipboard-preservation-009
  // ---------------------------------------------------------------------------

  test('[assisted] clipboard-preservation-009: always mode — dismissed picker leaves clipboard unchanged', async () => {
    await loadSettingsProfile('default', log);
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);

    const lines = Array.from({ length: 5 }, (_, i) => `line ${i + 1}`);
    const fileUri = createWorkspaceFile('cbp-009', lines.join('\n') + '\n');
    tmpFileUris.push(fileUri);

    await openEditor(fileUri);
    await settle();
    await writeClipboardSentinel();

    await waitForHuman(
      'clipboard-preservation-009',
      `clipboard.preserve="always", no destination bound. Select lines, press Cmd+R Cmd+L (picker opens), press Escape. Sentinel: "${CLIPBOARD_SENTINEL}".`,
      [
        '1. Click into the test file (cbp-009-...)',
        '2. Select a few lines',
        '3. Press Cmd+R Cmd+L — the destination picker opens (no destination is bound)',
        '4. Press Escape to dismiss without selecting anything',
        '5. Press Cancel to continue (test asserts clipboard still has the sentinel)',
      ],
    );

    await assertClipboardRestored('clipboard-preservation-009: always + picker dismissed');
    log('✓ Clipboard unchanged after picker dismissed (no operation performed)');
  });
});
