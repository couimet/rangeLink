import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_DESTINATION,
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
} from '../../constants/commandIds';
import {
  assertClipboardEquals,
  assertFilePathLogged,
  assertTerminalBufferContains,
  assertTerminalBufferEquals,
  extractQuickPickItemsLogged,
  getLogCapture,
  openAndDismiss,
  openEditor,
  openSourceWithSelection,
  parseLogContext,
  standardSuite,
} from '../helpers';

standardSuite('Send File Path', (ss) => {
  test('send-file-path-001: R-F sends workspace-relative path to bound terminal', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });

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
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

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
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const fileUri = ss.createTrackedFile('__rl-test-my folder.ts', 'content\n');
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
    const quotedLog = lines.some((l) => {
      const ctx = parseLogContext(l);
      return (
        l.includes('Quoted path for unsafe characters') &&
        ctx?.fn === 'FilePathPaster.pasteFilePath' &&
        ctx?.before === relativePath &&
        ctx?.after === `'${relativePath}'`
      );
    });
    assert.ok(
      quotedLog,
      'Expected "Quoted path for unsafe characters" log — path with spaces must be quoted before terminal send',
    );
    assertTerminalBufferEquals(capturing.getCapturedText(), ` '${relativePath}' `);
    ss.log('✓ Path with spaces auto-quoted for terminal destination');
  });

  test('send-file-path-005: terminal destination — path with parentheses is auto-quoted in single quotes', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const fileUri = ss.createTrackedFile('__rl-test-utils (v2).ts', 'content\n');
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
    const quotedLog = lines.some((l) => {
      const ctx = parseLogContext(l);
      return (
        l.includes('Quoted path for unsafe characters') &&
        ctx?.fn === 'FilePathPaster.pasteFilePath' &&
        ctx?.before === relativePath &&
        ctx?.after === `'${relativePath}'`
      );
    });
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
    const destBasename = path.basename(destUri.fsPath);
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: File path sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    const sourceUri = ss.createTrackedFile('__rl-test-source with spaces.ts', 'content\n');

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
    const quotedLog = lines.some((l) => {
      const ctx = parseLogContext(l);
      return (
        l.includes('Quoted path for unsafe characters') &&
        ctx?.fn === 'FilePathPaster.pasteFilePath' &&
        ctx?.before === relativePath &&
        ctx?.after === `'${relativePath}'`
      );
    });
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

  test('send-file-path-007: clipboard and terminal both receive the quoted path (clipboard.preserve=never)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const fileUri = ss.createTrackedFile('__rl-test-clipboard check.ts', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

    capturing.clearCaptured();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);

    await assertClipboardEquals(
      'Send File Path — clipboard receives quoted path',
      async () => {
        await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
        await ss.settle();
      },
      `'${relativePath}'`,
      'before-sfp-007',
    );

    const lines = getLogCapture().getLinesSince('before-sfp-007');
    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'command-palette',
      filePath: relativePath,
    });
    const quotedLog = lines.some((l) => {
      const ctx = parseLogContext(l);
      return (
        l.includes('Quoted path for unsafe characters') &&
        ctx?.fn === 'FilePathPaster.pasteFilePath' &&
        ctx?.before === relativePath &&
        ctx?.after === `'${relativePath}'`
      );
    });
    assert.ok(
      quotedLog,
      'Expected "Quoted path for unsafe characters" log — path with spaces must be quoted for terminal safety',
    );
    assertTerminalBufferContains(capturing.getCapturedText(), `'${relativePath}'`);
    ss.log('✓ Both terminal and clipboard receive the quoted path');
  });

  test('send-file-path-008: self-paste with no selection inserts path at cursor and shows normal feedback (clipboard.preserve=never)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteFilePath', 'both', vscode.ConfigurationTarget.Global);

    const fileUri = ss.createWorkspaceFile('sfp-008-self', 'original content\n');
    const destBasename = path.basename(fileUri.fsPath);
    const destEditor = await openEditor(fileUri);
    // Place cursor at beginning — no selection, so R-F is allowed
    destEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: File path sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    await assertClipboardEquals(
      'Send File Path — self-paste with no selection should write path to clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
        await ss.settle();
      },
      `${relativePath}`,
      'before-sfp-008',
    );
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const expectedContent = ` ${relativePath} original content\n`;
    assert.strictEqual(
      doc.getText(),
      expectedContent,
      `Expected file to have path inserted at cursor, got: ${JSON.stringify(doc.getText())}`,
    );
    ss.log('✓ Self-paste with no selection: path inserted at cursor, normal status bar feedback');
  });

  test('send-file-path-009: unbound — R-F opens destination picker before sending', async () => {
    const capturing = await ss.createCapturingTerminal('sfp-picker-test');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-picker-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-picker-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const fileUri = ss.createWorkspaceFile('sfp-009', 'content\n');
    await openEditor(fileUri);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-009');
    capturing.clearCaptured();

    // Open the destination picker, capture picker items from logs, then dismiss
    await openAndDismiss(CMD_BIND_TO_DESTINATION);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const lines = logCapture.getLinesSince('before-009');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items !== undefined, 'Expected destination picker to be shown via log');
    const terminalItem = items?.find(
      (item) =>
        item.itemKind === 'bindable' &&
        typeof item.displayName === 'string' &&
        (item.displayName as string).includes('sfp-picker-test'),
    );
    assert.ok(terminalItem !== undefined, 'Expected "sfp-picker-test" to appear in the picker');

    // Bind to the capturing terminal and send the file path
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    assertTerminalBufferContains(capturing.getCapturedText(), relativePath);
    ss.log('✓ Unbound R-F opens picker; path sent after selection');
  });

  test('send-file-path-010: Command Palette "Send Current File Path" sends workspace-relative path', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

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
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

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
    const destBasename = path.basename(destUri.fsPath);
    const sourceUri = ss.createWorkspaceFile('sfp-012-source', 'content\n');

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: File path sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

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

  test('send-file-path-013: same file, same column, no selection — absolute path inserted at cursor (clipboard.preserve=never)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    const fileUri = ss.createWorkspaceFile('sfp-013-self', 'line 1\nline 2\n');
    const destBasename = path.basename(fileUri.fsPath);
    const destEditor = await openEditor(fileUri);
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: File path sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    await assertClipboardEquals(
      'Send File Path — self-paste absolute path should write path to clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE);
        await ss.settle();
      },
      `${fileUri.fsPath}`,
      'before-sfp-013',
    );
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const expectedContent = `line 1\n ${fileUri.fsPath} line 2\n`;
    assert.strictEqual(
      doc.getText(),
      expectedContent,
      `Expected absolute path inserted at cursor, got: ${JSON.stringify(doc.getText())}`,
    );
    ss.log('✓ Same file, no selection: absolute path inserted at cursor, normal feedback');
  });

  test('send-file-path-014: same file, same column, with active selection — blocked with toast and clipboard copy (clipboard.preserve=never)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    const fileUri = ss.createWorkspaceFile('sfp-014-self', 'original content\n');
    const destBasename = path.basename(fileUri.fsPath);
    const destEditor = await openEditor(fileUri);
    destEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 5),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      '✓ RangeLink: File path copied to clipboard',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectToastMessages([
      {
        level: 'info',
        message:
          'Cannot paste when bound editor has an active selection. File path copied to clipboard.',
      },
    ]);
    await assertClipboardEquals(
      'Send File Path — blocked self-paste should copy path to clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
        await ss.settle();
      },
      `${vscode.workspace.asRelativePath(fileUri, false)}`,
      'before-sfp-014',
    );
    const doc = await vscode.workspace.openTextDocument(fileUri);
    assert.strictEqual(
      doc.getText(),
      'original content\n',
      'Expected file to remain unmodified after blocked self-paste',
    );
    ss.log(
      '✓ Self-paste with active selection: blocked, toast shown, path on clipboard, file unchanged',
    );
  });

  test('send-file-path-015: same file, different view column — allowed', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const destUri = ss.createWorkspaceFile('sfp-015-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const destBasename = path.basename(destUri.fsPath);
    const sourceUri = ss.createWorkspaceFile('sfp-015-source', 'source content\n');

    const destEditor = await openEditor(destUri, vscode.ViewColumn.Two);
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    // Activate source file in a different column, using a fresh column to avoid
    // the test runner's focus-steal issue where showTextDocument in a reused
    // column leaves the prior editor active.
    await openSourceWithSelection(sourceUri, vscode.ViewColumn.Three);
    await ss.settle();

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: File path sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(sourceUri, false);
    const destDoc = await vscode.workspace.openTextDocument(destUri);
    assert.ok(
      destDoc.getText().includes(` ${relativePath} `),
      `Expected destination to contain path "${relativePath}", got: ${JSON.stringify(destDoc.getText())}`,
    );
    ss.log('✓ Same file, different view column: allowed, path inserted in destination column');
  });

  test('send-file-path-016: self-paste with no selection inserts path at cursor (no clipboard.preserve override, no clipboard assertion)', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteFilePath', 'both', vscode.ConfigurationTarget.Global);

    const fileUri = ss.createWorkspaceFile('sfp-016-self', 'original content\n');
    const destBasename = path.basename(fileUri.fsPath);
    const destEditor = await openEditor(fileUri);
    // Place cursor at beginning — no selection, so R-F is allowed
    destEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: File path sent to Text Editor ("${destBasename}")`,
    ]);

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const expectedContent = ` ${relativePath} original content\n`;
    assert.strictEqual(
      doc.getText(),
      expectedContent,
      `Expected file to have path inserted at cursor, got: ${JSON.stringify(doc.getText())}`,
    );
    ss.log(
      '✓ Self-paste with no selection: path inserted at cursor, normal status bar feedback (no clipboard assertion)',
    );
  });

  test('send-file-path-017: R-F sends workspace-relative path when active tab is an image preview', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const pngUri = ss.createPngFixture('sfp-017');

    await vscode.commands.executeCommand('vscode.open', pngUri);
    await ss.settle();

    assert.strictEqual(
      vscode.window.activeTextEditor,
      undefined,
      'Expected activeTextEditor to be undefined when active tab is an image preview',
    );

    capturing.clearCaptured();

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(pngUri, false);
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);
    ss.log('✓ R-F sends workspace-relative path for image preview (TabInputCustom)');
  });

  test('send-file-path-018: R-F sends modified-side path when active tab is a text diff view', async () => {
    const capturing = await ss.createAndBindCapturingTerminal('sfp-test');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("sfp-test")',
      '✓ RangeLink: File path sent to Terminal ("sfp-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const leftUri = ss.createTrackedFile('__rl-test-sfp-018-left.txt', 'left\n');
    const rightUri = ss.createTrackedFile('__rl-test-sfp-018-right.txt', 'right\n');

    await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, 'sfp-018 Diff');
    await ss.settle();

    capturing.clearCaptured();

    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const rightRelativePath = vscode.workspace.asRelativePath(rightUri, false);
    const leftRelativePath = vscode.workspace.asRelativePath(leftUri, false);
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${rightRelativePath} `);

    // T009 — prove we picked the modified (right) side, not the original (left).
    assert.ok(
      !capturing.getCapturedText().includes(leftRelativePath),
      `Terminal must not receive the left-side path "${leftRelativePath}" — diff resolution must pick the modified side`,
    );
    ss.log('✓ R-F sends modified-side path for text diff (TabInputTextDiff)');
  });
});
