import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_CUSTOM_AI_BY_ID,
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_COPY_LINK_RELATIVE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
  CMD_PASTE_TO_DESTINATION,
} from '../../constants/commandIds';
import {
  assertTerminalBufferEquals,
  cleanupFiles,
  echoToTerminal,
  getWorkspaceRoot,
  openEditor,
  openUntitledDoc,
  standardSuite,
  waitForHuman,
} from '../helpers';

// ---------------------------------------------------------------------------
// Suites — Editor-to-Editor R-V (tests requiring real editor destinations)
//
// Each test gets its own standardSuite so that suite-level setup/teardown
// (closeAllEditors, unbind) fully resets state between tests. Untitled
// documents are particularly susceptible to cross-test contamination.
// ---------------------------------------------------------------------------

standardSuite('Smart Padding — Editor-to-Editor R-V: 001-untitled', (ss) => {
  let sourceFileUri: vscode.Uri;

  setup(async () => {
    const ts = Date.now();
    const sourcePath = path.join(getWorkspaceRoot(), `__rl-test-sp-source-${ts}.txt`);
    fs.writeFileSync(sourcePath, '', 'utf8');
    sourceFileUri = vscode.Uri.file(sourcePath);
  });

  teardown(async () => {
    cleanupFiles([sourceFileUri]);
  });

  test('smart-padding-001-untitled: whitespace-only text sent to untitled editor destination', async () => {
    const whitespaceContent = '   \t   ';
    ss.log('smart-padding-001-untitled: starting — default profile');

    fs.writeFileSync(sourceFileUri.fsPath, whitespaceContent, 'utf8');

    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Text Editor ("Untitled-1")',
      '✓ RangeLink: Selected text sent to Text Editor ("Untitled-1")',
    ]);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE, destDoc.uri);
    await ss.settle();

    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.Three);
    await ss.settle();

    const lastLine = sourceEditor.document.lineCount - 1;
    const lastChar = sourceEditor.document.lineAt(lastLine).text.length;
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(lastLine, lastChar),
    );

    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    const destContent = destDoc.getText();
    assert.ok(
      destContent.length > 0,
      `Expected untitled dest to have content, but it was empty. isClosed=${destDoc.isClosed}`,
    );
  });
});

standardSuite('Smart Padding — Editor-to-Editor R-V: langswitch', (ss) => {
  let sourceFileUri001: vscode.Uri;
  let sourceFileUri002: vscode.Uri;

  setup(async () => {
    const ts = Date.now();
    const sourcePath001 = path.join(getWorkspaceRoot(), `__rl-test-sp-ls1-${ts}.txt`);
    const sourcePath002 = path.join(getWorkspaceRoot(), `__rl-test-sp-ls2-${ts}.txt`);
    fs.writeFileSync(sourcePath001, '', 'utf8');
    fs.writeFileSync(sourcePath002, '', 'utf8');
    sourceFileUri001 = vscode.Uri.file(sourcePath001);
    sourceFileUri002 = vscode.Uri.file(sourcePath002);
  });

  teardown(async () => {
    cleanupFiles([sourceFileUri001, sourceFileUri002]);
  });

  test('langswitch-binding-001: binding survives manual language-mode change on untitled file', async () => {
    const sourceContent = 'hello world';
    ss.log('langswitch-001: starting');

    fs.writeFileSync(sourceFileUri001.fsPath, sourceContent, 'utf8');

    const destDoc = await openUntitledDoc({ viewColumn: vscode.ViewColumn.Two });
    const originalLanguage = destDoc.languageId;

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Text Editor ("Untitled-1")',
      '✓ RangeLink: Selected text sent to Text Editor ("Untitled-1")',
    ]);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE, destDoc.uri);
    await ss.settle();

    const updatedDestDoc = await vscode.languages.setTextDocumentLanguage(destDoc, 'markdown');
    await ss.settle();

    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri001);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.Three);
    await ss.settle();

    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );

    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    const destContent = updatedDestDoc.getText();
    assert.ok(
      destContent.length > 0,
      `POSSIBLE BUG: dest empty after language change. language=${originalLanguage}→${updatedDestDoc.languageId}, isClosed=${updatedDestDoc.isClosed}`,
    );
  });

  test('langswitch-binding-002: binding survives language change after content insertion', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Text Editor ("Untitled-1")',
      '✓ RangeLink: Selected text sent to Text Editor ("Untitled-1")',
    ]);

    const sourceContent = 'hello world';

    fs.writeFileSync(sourceFileUri002.fsPath, sourceContent, 'utf8');

    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE, destDoc.uri);
    await ss.settle();

    const mdContent = '```typescript\nconst x = 1;\n```\n';
    const edit = new vscode.WorkspaceEdit();
    edit.insert(destDoc.uri, new vscode.Position(0, 0), mdContent);
    await vscode.workspace.applyEdit(edit);
    await ss.settle();

    let currentDestDoc = destDoc;
    if (destDoc.languageId === 'plaintext') {
      currentDestDoc = await vscode.languages.setTextDocumentLanguage(destDoc, 'markdown');
      await ss.settle();
    }

    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri002);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.Three);
    await ss.settle();

    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );

    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    const destContent = currentDestDoc.getText();
    assert.ok(
      destContent.includes(sourceContent),
      `POSSIBLE BUG: dest doesn't contain source text after language change. language=${currentDestDoc.languageId}, isClosed=${currentDestDoc.isClosed}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Suite — Single-Write Architecture (CapturingTerminal + assisted tests)
// ---------------------------------------------------------------------------

standardSuite('Smart Padding — Single-Write Architecture', (ss) => {
  test('smart-padding-001: whitespace-only text preserved when sent to destination', async () => {
    const whitespaceContent = '   \t   ';

    const sourceUri = ss.createWorkspaceFile('pad-001', whitespaceContent);

    const capturing = await ss.createAndBindCapturingTerminal('pad-001-dest');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("pad-001-dest")',
      '✓ RangeLink: Selected text sent to Terminal ("pad-001-dest")',
    ]);
    await ss.settle();

    const sourceEditor = await openEditor(sourceUri);
    const lastLine = sourceEditor.document.lineCount - 1;
    const lastChar = sourceEditor.document.lineAt(lastLine).text.length;
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(lastLine, lastChar),
    );
    await ss.settle();

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    const captured = capturing.getCapturedText();
    assert.ok(
      captured.length > 0,
      `Expected whitespace content to be sent, but captured was empty`,
    );
    assert.ok(
      captured.includes('\t'),
      `Expected captured content to contain tab, got: ${JSON.stringify(captured)}`,
    );
    ss.log('✓ smart-padding-001: whitespace preserved');
  });

  test('smart-padding-003: multiline content preserved through destination', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Text Editor ("Untitled-1")',
      '✓ RangeLink: Selected text sent to Text Editor ("Untitled-1")',
    ]);

    const expected = 'line 1\nline 2\nline 3';

    const sourceUri = ss.createWorkspaceFile('pad-003', expected + '\n');

    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const sourceEditor = await openEditor(sourceUri, vscode.ViewColumn.Beside);
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(2, 6),
    );
    await ss.settle();

    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    const destContent = destDoc.getText();
    assert.strictEqual(
      destContent,
      expected,
      `Expected multiline content to arrive intact, got: ${JSON.stringify(destContent)}`,
    );
    ss.log('✓ smart-padding-003: multiline content preserved through destination');
  });

  test('smart-padding-005: pasteContent=before adds leading space only', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("pad-005-dest")',
      '✓ RangeLink: Selected text sent to Terminal ("pad-005-dest")',
    ]);
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', 'before', vscode.ConfigurationTarget.Global);

    const sourceUri = ss.createWorkspaceFile('pad-005', 'hello\n');

    const capturing = await ss.createAndBindCapturingTerminal('pad-005-dest');
    await ss.settle();

    const sourceEditor = await openEditor(sourceUri);
    sourceEditor.selection = new vscode.Selection(0, 0, 0, 5);
    await ss.settle();

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    assertTerminalBufferEquals(capturing.getCapturedText(), ' hello');
    ss.log('✓ smart-padding-005: leading space applied');
  });

  test('smart-padding-006: pasteContent=after adds trailing space only', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("pad-006-dest")',
      '✓ RangeLink: Selected text sent to Terminal ("pad-006-dest")',
    ]);
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', 'after', vscode.ConfigurationTarget.Global);

    const sourceUri = ss.createWorkspaceFile('pad-006', 'hello\n');

    const capturing = await ss.createAndBindCapturingTerminal('pad-006-dest');
    await ss.settle();

    const sourceEditor = await openEditor(sourceUri);
    sourceEditor.selection = new vscode.Selection(0, 0, 0, 5);
    await ss.settle();

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    assertTerminalBufferEquals(capturing.getCapturedText(), 'hello ');
    ss.log('✓ smart-padding-006: trailing space applied');
  });

  test('smart-padding-007: pasteContent=both — text selection sent to destination has leading and trailing space', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', 'both', vscode.ConfigurationTarget.Global);

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("pad-007-dest")',
      '✓ RangeLink: Selected text sent to Terminal ("pad-007-dest")',
    ]);
    const sourceUri = ss.createWorkspaceFile('pad-007', 'hello world\n');

    const capturing = await ss.createAndBindCapturingTerminal('pad-007-dest');
    await ss.settle();

    const sourceEditor = await openEditor(sourceUri);
    sourceEditor.selection = new vscode.Selection(0, 0, 0, 11);
    await ss.settle();

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    assertTerminalBufferEquals(capturing.getCapturedText(), ' hello world ');
    ss.log('✓ smart-padding-007: padded text selection sent to destination');
  });

  test('smart-padding-008: pasteFilePath=both — file path sent to terminal has leading and trailing space', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteFilePath', 'both', vscode.ConfigurationTarget.Global);

    const fileUri = ss.createWorkspaceFile('pad-008', 'content\n');

    const capturing = await ss.createAndBindCapturingTerminal('pad-008-dest');
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("pad-008-dest")',
      '✓ RangeLink: File path sent to Terminal ("pad-008-dest")',
    ]);
    await ss.settle();

    await openEditor(fileUri);
    await ss.settle();

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);
    ss.log('✓ smart-padding-008: padded file path sent to terminal');
  });

  test('smart-padding-009: pasteLink=both — RangeLink sent to Dummy AI has leading and trailing space', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Tier 1)',
      '✓ RangeLink: RangeLink sent to Dummy AI (Tier 1)',
    ]);

    const fileUri = ss.createWorkspaceFile('pad-009', 'line 1\nline 2\nline 3\n');
    const editor = await openEditor(fileUri);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension',
    });
    await ss.settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.ok(
      textResult!.tier1.startsWith(' ') && textResult!.tier1.endsWith(' '),
      `Expected padded RangeLink (leading + trailing space), got: "${textResult!.tier1}"`,
    );
    assert.strictEqual(
      textResult!.tier2,
      '',
      'Expected tier2 textarea to be empty (no cross-contamination)',
    );

    ss.log('✓ smart-padding-009: padded RangeLink sent to Dummy AI (programmatic verification)');
  });

  test('[assisted] smart-padding-010: terminal selection sent to editor with padding=both', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', 'both', vscode.ConfigurationTarget.Global);

    const destUri = ss.createWorkspaceFile('pad-010-dest', '');

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE, destUri);
    await ss.settle();

    const terminal = await ss.createTerminal('pad-010-src');
    echoToTerminal(terminal, 'hello');
    await ss.settle();

    await waitForHuman(
      'smart-padding-010',
      'Select "hello" in the terminal and press R-V to paste to the bound editor',
      [
        '1. In terminal "pad-010-src", mouse-select the output "hello"',
        '2. Press R-C to copy the terminal selection, then press R-V to send',
        '3. The bound editor (pad-010-dest) will receive the padded text',
        '4. Click the notification Cancel button when done',
      ],
    );

    const destContent = (await vscode.workspace.openTextDocument(destUri)).getText();
    assert.ok(
      destContent.includes(' hello '),
      `Expected dest to contain padded text " hello ", got: "${destContent}"`,
    );
    ss.log('✓ smart-padding-010: terminal selection sent to editor with padding (code verified)');
  });

  test('smart-padding-011: pasteContent=none — no padding applied when setting is off', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', 'none', vscode.ConfigurationTarget.Global);

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("pad-011-dest")',
      '✓ RangeLink: Selected text sent to Terminal ("pad-011-dest")',
    ]);
    const sourceUri = ss.createWorkspaceFile('pad-011', 'hello\n');

    const capturing = await ss.createAndBindCapturingTerminal('pad-011-dest');
    await ss.settle();

    const sourceEditor = await openEditor(sourceUri);
    sourceEditor.selection = new vscode.Selection(0, 0, 0, 5);
    await ss.settle();

    capturing.clearCaptured();
    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    assertTerminalBufferEquals(capturing.getCapturedText(), 'hello');
    ss.log('✓ smart-padding-011: no padding when disabled');
  });
});
