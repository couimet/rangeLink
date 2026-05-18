import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
} from '../../constants/commandIds';
import {
  assertFilePathLogged,
  assertStatusBarMsgLogged,
  assertTerminalBufferContains,
  assertTerminalBufferEquals,
  assertToastLogged,
  createFileAt,
  extractQuickPickItemsLogged,
  getLogCapture,
  openEditor,
  standardSuite,
  waitForHuman,
  writeClipboardSentinel,
} from '../helpers';

standardSuite('Send File Path', (ss) => {
  test('send-file-path-001: R-F sends workspace-relative path to bound terminal', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');

    const fileUri = ss.createWorkspaceFile('sfp-001', 'content\n');
    await openEditor(fileUri);
    await ss.settle();
    capturing.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-001');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-001');
    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink: File path copied to clipboard & sent to Terminal ("sfp-test")',
    });
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    ss.log('✓ R-F sends workspace-relative path to terminal');
  });

  test('send-file-path-002: Cmd+R Cmd+Shift+F sends absolute path to bound terminal', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');

    const fileUri = ss.createWorkspaceFile('sfp-002', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-002');
    capturing.clearCaptured();

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE);
    await ss.settle();

    const absolutePath = fileUri.fsPath;
    const lines = logCapture.getLinesSince('before-002');
    assertFilePathLogged(lines, {
      pathFormat: 'absolute',
      uriSource: 'command-palette',
      filePath: absolutePath,
    });
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${absolutePath} `);
    ss.log('✓ Cmd+R Cmd+Shift+F sends exact absolute path to terminal');
  });

  test('send-file-path-004: terminal destination — path with spaces is auto-quoted in single quotes', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');

    const fileUri = createFileAt('__rl-test-my folder.ts', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-004');
    capturing.clearCaptured();

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-004');
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
      'Expected "Quoted path for unsafe characters" log — path with spaces must be quoted before terminal send',
    );
    assertTerminalBufferEquals(capturing.getCapturedText(), ` '${relativePath}' `);
    ss.log('✓ Path with spaces auto-quoted for terminal destination');
  });

  test('send-file-path-005: terminal destination — path with parentheses is auto-quoted in single quotes', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');

    const fileUri = createFileAt('__rl-test-utils (v2).ts', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-005');
    capturing.clearCaptured();

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-005');
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
      'Expected "Quoted path for unsafe characters" log — path with parentheses must be quoted before terminal send',
    );
    assertTerminalBufferEquals(capturing.getCapturedText(), ` '${relativePath}' `);
    ss.log('✓ Path with parentheses auto-quoted for terminal destination');
  });

  test('send-file-path-006: text editor destination — path with spaces is auto-quoted', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const destUri = ss.createWorkspaceFile('sfp-006-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const sourceUri = createFileAt('__rl-test-source with spaces.ts', 'content\n');

    const destEditor = await openEditor(destUri, vscode.ViewColumn.Two);
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(sourceUri),
      vscode.ViewColumn.Beside,
    );
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-006');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

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
    ss.log('✓ Text editor destination receives auto-quoted path (spaces → single quotes)');
  });

  test('send-file-path-007: clipboard and terminal both receive the quoted path (single clipboard write)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');

    const fileUri = createFileAt('__rl-test-clipboard check.ts', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

    capturing.clearCaptured();

    const logCapture = getLogCapture();
    logCapture.mark('before-007');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const clipboard = await vscode.env.clipboard.readText();
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
      'Expected "Quoted path for unsafe characters" log — path with spaces must be quoted for terminal safety',
    );
    assertTerminalBufferContains(capturing.getCapturedText(), `'${relativePath}'`);
    assert.ok(
      clipboard.includes(relativePath),
      `Expected clipboard to include the file path, got: ${JSON.stringify(clipboard)}`,
    );
    ss.log('✓ Both terminal and clipboard receive the quoted path (single clipboard write)');
  });

  test('send-file-path-008: self-paste shows info notification and copies smart-padded path to clipboard without modifying file', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteFilePath', 'both', vscode.ConfigurationTarget.Global);

    const fileUri = ss.createWorkspaceFile('sfp-008-self', 'original content\n');
    await openEditor(fileUri);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    await writeClipboardSentinel();

    const logCapture = getLogCapture();
    logCapture.mark('before-008');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-008');
    assertToastLogged(lines, {
      type: 'info',
      message: 'Selected text copied to clipboard. Cannot paste to same file.',
    });
    const clipboard = await vscode.env.clipboard.readText();
    const expectedPadded = ` ${relativePath} `;
    assert.strictEqual(
      clipboard,
      expectedPadded,
      `Expected clipboard to contain smart-padded path "${JSON.stringify(expectedPadded)}" after self-paste, got: ${JSON.stringify(clipboard)}`,
    );
    const doc = await vscode.workspace.openTextDocument(fileUri);
    assert.ok(!doc.isDirty, 'Expected file to remain unmodified after self-paste');
    ss.log('✓ Self-paste: info notification shown, smart-padded path on clipboard, file unchanged');
  });

  test('[assisted] send-file-path-009: unbound — R-F opens destination picker before sending', async () => {
    const capturing = await ss.createCapturingTerminal('sfp-picker-test');

    const fileUri = ss.createWorkspaceFile('sfp-009', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

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

    await ss.settle();

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
    ss.log('✓ Unbound R-F opens picker; path sent after selection');
  });

  test('send-file-path-010: Command Palette "Send Current File Path" sends workspace-relative path', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');

    const fileUri = ss.createWorkspaceFile('sfp-010', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-010');
    capturing.clearCaptured();

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-010');
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);
    ss.log('✓ Command Palette "Send Current File Path" sends workspace-relative path');
  });

  test('send-file-path-011: Command Palette "Send Current File Path (Absolute)" sends absolute path', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');

    const fileUri = ss.createWorkspaceFile('sfp-011', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-011');
    capturing.clearCaptured();

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE);
    await ss.settle();

    const absolutePath = fileUri.fsPath;
    const lines = logCapture.getLinesSince('before-011');
    assertFilePathLogged(lines, {
      pathFormat: 'absolute',
      uriSource: 'command-palette',
      filePath: absolutePath,
    });
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${absolutePath} `);
    ss.log('✓ Command Palette "Send Current File Path (Absolute)" sends absolute path');
  });

  test('send-file-path-012: bound text editor hidden behind another tab — paste still lands in bound editor', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const destUri = ss.createWorkspaceFile('sfp-012-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const sourceUri = ss.createWorkspaceFile('sfp-012-source', 'content\n');

    const destEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(destUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(sourceUri), {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-012');

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    assert.strictEqual(
      vscode.window.activeTextEditor?.document.uri.toString(),
      destUri.toString(),
      'Expected bound editor to be active after paste',
    );

    const relativePath = vscode.workspace.asRelativePath(sourceUri, false);
    const lines = logCapture.getLinesSince('before-012');
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    const destDoc = await vscode.workspace.openTextDocument(destUri);
    const expectedContent = `${ANCHOR_START}\n ${relativePath} ${ANCHOR_END}\n`;
    assert.strictEqual(
      destDoc.getText(),
      expectedContent,
      `Expected exact dest content, got: ${JSON.stringify(destDoc.getText())}`,
    );
    ss.log('✓ Bound editor brought to foreground and received exact file path');
  });
});
