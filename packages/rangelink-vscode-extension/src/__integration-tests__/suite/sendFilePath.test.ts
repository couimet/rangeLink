import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
  CMD_UNBIND_DESTINATION,
} from '../../constants/commandIds';
import {
  activateExtension,
  assertFilePathLogged,
  assertStatusBarMsgLogged,
  assertTerminalBufferContains,
  assertTerminalBufferEquals,
  assertToastLogged,
  cleanupFiles,
  closeAllEditors,
  createAndBindCapturingTerminal,
  createCapturingTerminal,
  createFileAt,
  createLogger,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  openEditor,
  printAssistedBanner,
  settle,
  waitForHuman,
  writeClipboardSentinel,
} from '../helpers';

suite('Send File Path', () => {
  const log = createLogger('sendFilePath');
  const tmpFileUris: vscode.Uri[] = [];
  const tmpTerminals: vscode.Terminal[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  suiteTeardown(async () => {
    await closeAllEditors();
  });

  teardown(async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    for (const t of tmpTerminals.splice(0)) t.dispose();
    await closeAllEditors();
    cleanupFiles(tmpFileUris.splice(0));
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', undefined, vscode.ConfigurationTarget.Global);
    await settle();
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-001
  // ---------------------------------------------------------------------------

  test('send-file-path-001: R-F sends workspace-relative path to bound terminal', async () => {
    const capturing = await createAndBindCapturingTerminal('sfp-test');
    tmpTerminals.push(capturing.terminal);

    const fileUri = createWorkspaceFile('sfp-001', 'content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();
    capturing.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-001');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ File path copied to clipboard & sent to Terminal ("sfp-test")',
    });
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    log('✓ R-F sends workspace-relative path to terminal');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-002
  // ---------------------------------------------------------------------------

  test('[assisted] send-file-path-002: Cmd+R Cmd+Shift+F sends absolute path to bound terminal', async () => {
    const capturing = await createAndBindCapturingTerminal('sfp-test');
    tmpTerminals.push(capturing.terminal);

    const fileUri = createWorkspaceFile('sfp-002', 'content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-002');
    capturing.clearCaptured();

    await waitForHuman(
      'send-file-path-002',
      'Cmd+R Cmd+Shift+F sends absolute path to bound terminal',
      [
        'Focus the file open in the editor.',
        'Press Cmd+R Cmd+Shift+F (Send File Path Absolute).',
        'Confirm terminal "sfp-test" receives the full absolute path.',
      ],
    );

    await settle();

    const absolutePath = fileUri.fsPath;
    const lines = logCapture.getLinesSince('before-002');
    assertFilePathLogged(lines, {
      pathFormat: 'absolute',
      uriSource: 'command-palette',
      filePath: absolutePath,
    });
    assertTerminalBufferContains(capturing.getCapturedText(), absolutePath);
    log('✓ Cmd+R Cmd+Shift+F sends absolute path to terminal');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-004
  // ---------------------------------------------------------------------------

  test('[assisted] send-file-path-004: terminal destination — path with spaces is auto-quoted in single quotes', async () => {
    const capturing = await createAndBindCapturingTerminal('sfp-test');
    tmpTerminals.push(capturing.terminal);

    const fileUri = createFileAt('__rl-test-my folder.ts', 'content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-004');
    capturing.clearCaptured();

    await waitForHuman(
      'send-file-path-004',
      'R-F on file with spaces in path → terminal receives single-quoted path',
      [
        'Focus the file open in the editor.',
        "Press Cmd+R Cmd+F — terminal should receive the path wrapped in single quotes (e.g. '__rl-test-my folder.ts').",
      ],
    );

    await settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-004');
    const quotedLog = lines.find(
      (l) => l.includes('Quoted path for unsafe characters') && l.includes(relativePath),
    );
    assert.ok(
      quotedLog,
      'Expected "Quoted path for unsafe characters" log — path with spaces must be quoted before terminal send',
    );
    assertTerminalBufferContains(capturing.getCapturedText(), `'${relativePath}'`);
    log('✓ Path with spaces auto-quoted for terminal destination');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-005
  // ---------------------------------------------------------------------------

  test('[assisted] send-file-path-005: terminal destination — path with parentheses is auto-quoted in single quotes', async () => {
    const capturing = await createAndBindCapturingTerminal('sfp-test');
    tmpTerminals.push(capturing.terminal);

    const fileUri = createFileAt('__rl-test-utils (v2).ts', 'content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-005');
    capturing.clearCaptured();

    await waitForHuman(
      'send-file-path-005',
      'R-F on file with parentheses in path → terminal receives single-quoted path',
      [
        'Focus the file open in the editor.',
        "Press Cmd+R Cmd+F — terminal should receive the path wrapped in single quotes (e.g. '__rl-test-utils (v2).ts').",
      ],
    );

    await settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-005');
    const quotedLog = lines.find(
      (l) => l.includes('Quoted path for unsafe characters') && l.includes(relativePath),
    );
    assert.ok(
      quotedLog,
      'Expected "Quoted path for unsafe characters" log — path with parentheses must be quoted before terminal send',
    );
    assertTerminalBufferContains(capturing.getCapturedText(), `'${relativePath}'`);
    log('✓ Path with parentheses auto-quoted for terminal destination');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-006
  // ---------------------------------------------------------------------------

  test('send-file-path-006: text editor destination — path with spaces is auto-quoted', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const destUri = createWorkspaceFile('sfp-006-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    tmpFileUris.push(destUri);
    const sourceUri = createFileAt('__rl-test-source with spaces.ts', 'content\n');
    tmpFileUris.push(sourceUri);

    const destEditor = await openEditor(destUri, vscode.ViewColumn.Two);
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    await openEditor(sourceUri, vscode.ViewColumn.One);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-006');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await settle();

    const relativePath = vscode.workspace.asRelativePath(sourceUri, false);
    const lines = logCapture.getLinesSince('before-006');
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    const quotedLog = lines.find(
      (l) => l.includes('Quoted path for unsafe characters') && l.includes(relativePath),
    );
    assert.ok(
      quotedLog,
      'Expected "Quoted path for unsafe characters" log — path with spaces must be quoted for text editor destination',
    );
    const destDoc = await vscode.workspace.openTextDocument(destUri);
    const content = destDoc.getText();
    assert.ok(
      content.includes(`${ANCHOR_START}\n '${relativePath}' ${ANCHOR_END}`),
      `Expected single-quoted path inserted between anchors, got: ${JSON.stringify(content)}`,
    );
    log('✓ Text editor destination receives auto-quoted path (spaces → single quotes)');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-007
  // ---------------------------------------------------------------------------

  test('send-file-path-007: clipboard write uses unquoted path even when terminal receives quoted version', async () => {
    const capturing = await createAndBindCapturingTerminal('sfp-test');
    tmpTerminals.push(capturing.terminal);

    const fileUri = createFileAt('__rl-test-clipboard check.ts', 'content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    capturing.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-007');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-007');
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    const quotedLog = lines.find(
      (l) => l.includes('Quoted path for unsafe characters') && l.includes(relativePath),
    );
    assert.ok(
      quotedLog,
      'Expected "Quoted path for unsafe characters" log — proves the SEND was quoted while the clipboard write used the unquoted path',
    );
    assertTerminalBufferContains(capturing.getCapturedText(), `'${relativePath}'`);
    log('✓ Log shows unquoted filePath submitted; terminal received quoted version');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-008
  // ---------------------------------------------------------------------------

  test('send-file-path-008: self-paste shows info notification and copies path to clipboard without modifying file', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    const fileUri = createWorkspaceFile('sfp-008-self', 'original content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    await writeClipboardSentinel();

    const logCapture = getLogCapture();
    logCapture.mark('before-008');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-008');
    assertToastLogged(lines, {
      type: 'info',
      message: 'Selected text copied to clipboard. Cannot paste to same file.',
    });
    const clipboard = await vscode.env.clipboard.readText();
    assert.strictEqual(
      clipboard,
      relativePath,
      `Expected clipboard to contain path "${relativePath}" after self-paste`,
    );
    const doc = await vscode.workspace.openTextDocument(fileUri);
    assert.ok(!doc.isDirty, 'Expected file to remain unmodified after self-paste');
    log('✓ Self-paste: info notification shown, path on clipboard, file unchanged');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-009
  // ---------------------------------------------------------------------------

  test('[assisted] send-file-path-009: unbound — R-F opens destination picker before sending', async () => {
    const capturing = await createCapturingTerminal('sfp-picker-test');
    tmpTerminals.push(capturing.terminal);

    const fileUri = createWorkspaceFile('sfp-009', 'content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-009');
    capturing.clearCaptured();

    await waitForHuman(
      'send-file-path-009',
      'R-F with no destination bound → picker appears, select terminal "sfp-picker-test"',
      [
        'Focus the file open in the editor.',
        'Press Cmd+R Cmd+F — the destination picker should appear.',
        'Select terminal "sfp-picker-test" from the picker.',
        'Confirm the file path is sent to the terminal.',
      ],
    );

    await settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-009');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items !== undefined, 'Expected destination picker to be shown via log');
    const terminalItem = items?.find(
      (item) =>
        typeof item.label === 'string' && (item.label as string).includes('sfp-picker-test'),
    );
    assert.ok(terminalItem !== undefined, 'Expected "sfp-picker-test" to appear in the picker');
    assertTerminalBufferContains(capturing.getCapturedText(), relativePath);
    log('✓ Unbound R-F opens picker; path sent after selection');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-010
  // ---------------------------------------------------------------------------

  test('[assisted] send-file-path-010: Command Palette "Send Current File Path" sends workspace-relative path', async () => {
    const capturing = await createAndBindCapturingTerminal('sfp-test');
    tmpTerminals.push(capturing.terminal);

    const fileUri = createWorkspaceFile('sfp-010', 'content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-010');
    capturing.clearCaptured();

    await waitForHuman(
      'send-file-path-010',
      'Command Palette "Send Current File Path" sends workspace-relative path',
      [
        'Focus the file open in the editor.',
        'Open Command Palette (Cmd+Shift+P).',
        'Type "Send Current File Path" and press Enter.',
        'Confirm terminal "sfp-test" receives the workspace-relative path (not absolute).',
      ],
    );

    await settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-010');
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);
    log('✓ Command Palette "Send Current File Path" sends workspace-relative path');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-011
  // ---------------------------------------------------------------------------

  test('[assisted] send-file-path-011: Command Palette "Send Current File Path (Absolute)" sends absolute path', async () => {
    const capturing = await createAndBindCapturingTerminal('sfp-test');
    tmpTerminals.push(capturing.terminal);

    const fileUri = createWorkspaceFile('sfp-011', 'content\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-011');
    capturing.clearCaptured();

    await waitForHuman(
      'send-file-path-011',
      'Command Palette "Send Current File Path (Absolute)" sends absolute path',
      [
        'Focus the file open in the editor.',
        'Open Command Palette (Cmd+Shift+P).',
        'Type "Send Current File Path (Absolute)" and press Enter.',
        'Confirm terminal "sfp-test" receives the full absolute path.',
      ],
    );

    await settle();

    const absolutePath = fileUri.fsPath;
    const lines = logCapture.getLinesSince('before-011');
    assertFilePathLogged(lines, {
      pathFormat: 'absolute',
      uriSource: 'command-palette',
      filePath: absolutePath,
    });
    assertTerminalBufferContains(capturing.getCapturedText(), absolutePath);
    log('✓ Command Palette "Send Current File Path (Absolute)" sends absolute path');
  });

  // ---------------------------------------------------------------------------
  // TC send-file-path-012
  // ---------------------------------------------------------------------------

  test('[assisted] send-file-path-012: bound text editor hidden behind another tab — paste still lands in bound editor', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const destUri = createWorkspaceFile('sfp-012-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    tmpFileUris.push(destUri);
    const sourceUri = createWorkspaceFile('sfp-012-source', 'content\n');
    tmpFileUris.push(sourceUri);

    const destEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(destUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(sourceUri), {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-012');

    await waitForHuman(
      'send-file-path-012',
      'R-F with bound editor hidden behind another tab in same column — paste still lands in bound editor',
      [
        'The source file is active (sfp-012-source). The bound editor (sfp-012-dest) is hidden behind it in the same column.',
        'Press Cmd+R Cmd+F.',
        'Observe that the bound editor is brought to the foreground and receives the file path.',
      ],
    );

    await settle();

    const relativePath = vscode.workspace.asRelativePath(sourceUri, false);
    const lines = logCapture.getLinesSince('before-012');
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    const destDoc = await vscode.workspace.openTextDocument(destUri);
    const content = destDoc.getText();
    assert.ok(
      content.includes(`${ANCHOR_START}\n ${relativePath} ${ANCHOR_END}`),
      `Expected file path inserted in bound editor at cursor position, got: ${JSON.stringify(content)}`,
    );
    log('✓ Bound editor brought to foreground and received file path');
  });
});
