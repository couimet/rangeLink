import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_BIND_TO_TEXT_EDITOR_HERE, CMD_PASTE_TO_DESTINATION } from '../../constants/commandIds';
import {
  assertClipboardWriteLogged,
  assertFilePathLogged,
  assertTerminalBufferContains,
  assertTerminalBufferContainsGeneratedLink,
  clearSelection,
  getLogCapture,
  openSourceWithSelection,
  parseLogContext,
  standardSuite,
  waitForHuman,
  waitForHumanVerdict,
  withClipboardSentinel,
} from '../helpers';

const FILE_CONTENT = 'line 1\nline 2\nline 3\nline 4\n';

standardSuite('Context Menus — Editor Content', (ss) => {
  let originalMultiLinePasteWarning: unknown;

  suiteSetup(async () => {
    // Multi-line "Send Selected Text" triggers VS Code's terminal
    // multi-line-paste warning dialog by default; set to 'never' so
    // TC 005's selection delivers deterministically in the test host.
    const terminalConfig = vscode.workspace.getConfiguration('terminal.integrated');
    originalMultiLinePasteWarning = terminalConfig.inspect(
      'enableMultiLinePasteWarning',
    )?.globalValue;
    await terminalConfig.update(
      'enableMultiLinePasteWarning',
      'never',
      vscode.ConfigurationTarget.Global,
    );
  });

  suiteTeardown(async () => {
    await vscode.workspace
      .getConfiguration('terminal.integrated')
      .update(
        'enableMultiLinePasteWarning',
        originalMultiLinePasteWarning,
        vscode.ConfigurationTarget.Global,
      );
  });

  test('[assisted] context-menus-editor-content-001: Editor content "Send RangeLink" sends workspace-relative link to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-001', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-001';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);

    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-001")',
      '✓ RangeLink: RangeLink sent to Terminal ("rl-ctxmenu-ed-001")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-001');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-editor-content-001',
      `Right-click INSIDE the selected text in "${fn}" → "RangeLink: Send RangeLink"`,
      [
        `The file "${fn}" has lines 1–2 already selected for you.`,
        `A Terminal "${terminalName}" is bound as the destination.`,
        '1. Right-click INSIDE the highlighted selection',
        '2. Select "RangeLink: Send RangeLink"',
      ],
    );

    assertTerminalBufferContainsGeneratedLink(capturing, 'before-ed-001');

    ss.log('✓ Editor-content "Send RangeLink" delivered workspace-relative link to bound terminal');
  });

  test('[assisted] context-menus-editor-content-002: Editor content "Send RangeLink (Absolute)" sends absolute link to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-002', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-002';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);

    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-002")',
      '✓ RangeLink: RangeLink sent to Terminal ("rl-ctxmenu-ed-002")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-002');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-editor-content-002',
      `Right-click INSIDE the selected text in "${fn}" → "RangeLink: Send RangeLink (Absolute)"`,
      [
        `The file "${fn}" has lines 1–2 already selected for you.`,
        '1. Right-click INSIDE the highlighted selection',
        '2. Select "RangeLink: Send RangeLink (Absolute)"',
      ],
    );

    assertTerminalBufferContainsGeneratedLink(capturing, 'before-ed-002');

    ss.log(
      '✓ Editor-content "Send RangeLink (Absolute)" delivered absolute link to bound terminal',
    );
  });

  test('[assisted] context-menus-editor-content-003: Editor content "Send Portable Link" sends portable link with workspace-relative path', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-003', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-003';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);

    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-003")',
      '✓ RangeLink: Portable RangeLink sent to Terminal ("rl-ctxmenu-ed-003")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-003');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-editor-content-003',
      `Right-click INSIDE the selected text in "${fn}" → "RangeLink: Send Portable Link"`,
      [
        `The file "${fn}" has lines 1–2 already selected for you.`,
        '1. Right-click INSIDE the highlighted selection',
        '2. Select "RangeLink: Send Portable Link"',
      ],
    );

    assertTerminalBufferContainsGeneratedLink(capturing, 'before-ed-003');

    ss.log('✓ Editor-content "Send Portable Link" delivered portable link to bound terminal');
  });

  test('[assisted] context-menus-editor-content-004: Editor content "Send Portable Link (Absolute)" sends portable link with absolute path', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-004', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-004';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);

    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-004")',
      '✓ RangeLink: Portable RangeLink sent to Terminal ("rl-ctxmenu-ed-004")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-004');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-editor-content-004',
      `Right-click INSIDE the selected text in "${fn}" → "RangeLink: Send Portable Link (Absolute)"`,
      [
        `The file "${fn}" has lines 1–2 already selected for you.`,
        '1. Right-click INSIDE the highlighted selection',
        '2. Select "RangeLink: Send Portable Link (Absolute)"',
      ],
    );

    assertTerminalBufferContainsGeneratedLink(capturing, 'before-ed-004');

    ss.log(
      '✓ Editor-content "Send Portable Link (Absolute)" delivered portable link with absolute path',
    );
  });

  test('[assisted] context-menus-editor-content-005: Editor content "Send Selected Text" sends raw selected text to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-005', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-005';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);

    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 6));
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-005")',
      '✓ RangeLink: Selected text sent to Terminal ("rl-ctxmenu-ed-005")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-005');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-editor-content-005',
      `Right-click INSIDE the selected text in "${fn}" → "RangeLink: Send Selected Text"`,
      [
        `The file "${fn}" has lines 1–3 already selected for you.`,
        '1. Right-click INSIDE the highlighted selection',
        '2. Select "RangeLink: Send Selected Text"',
        'Visual note: the test terminal will LOOK like it only shows "line 3" — that is correct.',
        "VS Code's terminal paste converts newlines to carriage returns so each line",
        'would execute separately in a real shell. Our capturing pty has no shell, so',
        'successive `\\r`s overwrite the same screen row. All three lines ARE delivered',
        '(the test reads the raw captured buffer, not the rendered display).',
      ],
    );

    // Normalize both `\r\n` and lone `\r` to `\n` so the contiguous-substring
    // check passes regardless of VS Code's line-ending choice. `workbench.action.terminal.paste`
    // sends `\r` between lines so a real shell treats each line as Enter-terminated;
    // our capturing pty preserves exactly what was sent.
    const normalizedCapture = capturing.getCapturedText().replace(/\r\n|\r/g, '\n');
    ss.log(`TC 005 captured (normalized): ${JSON.stringify(normalizedCapture)}`);
    assertTerminalBufferContains(normalizedCapture, 'line 1\nline 2\nline 3');

    ss.log('✓ Editor-content "Send Selected Text" delivered raw selected text to bound terminal');
  });

  test('[assisted] context-menus-editor-content-006: Visual separator is visible between RangeLink commands and other menu items', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-006', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    ss.expectStatusBarMessages([]);

    const verdict = await waitForHumanVerdict(
      'context-menus-editor-content-006',
      `Right-click in "${fn}" — is there a visual separator line between the RangeLink block and the rest of the menu?`,
      [
        '1. Right-click anywhere inside the editor',
        '2. Look at the RangeLink commands as a group (grouped together in the menu)',
        'Verdict:',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink block has no visual separator — group prefixes in package.json may have drifted',
    );

    ss.log('✓ Editor-content context menu renders a visual separator for the RangeLink block');
  });

  test('[assisted] context-menus-editor-content-007: Editor content "Send This File\'s Path" sends absolute path to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-007', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-007';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);

    await ss.openEditor(uri);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-007")',
      '✓ RangeLink: File path sent to Terminal ("rl-ctxmenu-ed-007")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-007');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-editor-content-007',
      `Right-click in "${fn}" → "RangeLink: Send This File's Path"`,
      [
        '1. Right-click anywhere inside the editor (no selection needed)',
        '2. Select "RangeLink: Send This File\'s Path"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ed-007');

    assertFilePathLogged(lines, {
      pathFormat: 'absolute',
      uriSource: 'context-menu',
      filePath: uri.fsPath,
    });
    const expectedPath = ` ${uri.fsPath} `;
    assertClipboardWriteLogged(lines, { textLength: expectedPath.length });
    assertTerminalBufferContains(capturing.getCapturedText(), uri.fsPath);

    ss.log('✓ Editor-content "Send This File\'s Path" delivered absolute path to bound terminal');
  });

  test('[assisted] context-menus-editor-content-008: Editor content "Send This File\'s Relative Path" sends workspace-relative path to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-008', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    const terminalName = 'rl-ctxmenu-ed-008';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);

    await ss.openEditor(uri);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-008")',
      '✓ RangeLink: File path sent to Terminal ("rl-ctxmenu-ed-008")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-008');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-editor-content-008',
      `Right-click in "${fn}" → "RangeLink: Send This File's Relative Path"`,
      [
        '1. Right-click anywhere inside the editor (no selection needed)',
        '2. Select "RangeLink: Send This File\'s Relative Path"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ed-008');

    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'context-menu',
      filePath: relativePath,
    });
    const expectedPath = ` ${relativePath} `;
    assertClipboardWriteLogged(lines, { textLength: expectedPath.length });
    assertTerminalBufferContains(capturing.getCapturedText(), relativePath);

    ss.log(
      '✓ Editor-content "Send This File\'s Relative Path" delivered relative path to bound terminal',
    );
  });

  test('[assisted] context-menus-editor-content-009: Editor content "Bind Here" binds the current file as the text editor destination', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-009', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${fn}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-009');

    await waitForHuman(
      'context-menus-editor-content-009',
      `Right-click in "${fn}" → "RangeLink: Bind Here"`,
      [
        '1. Right-click anywhere inside the editor (no selection needed)',
        '2. Select "RangeLink: Bind Here"',
      ],
    );

    ss.log('✓ Editor-content "Bind Here" committed a text-editor binding for the current file');
  });

  test('[assisted] context-menus-editor-content-010: Editor content "Unbind" is visible when bound and unbinds on click', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-010', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-010';
    await ss.createAndBindCapturingTerminal(terminalName);

    await ss.openEditor(uri);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-010")',
      '✓ RangeLink: Unbound from Terminal ("rl-ctxmenu-ed-010")',
    ]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-010');

    await waitForHuman(
      'context-menus-editor-content-010',
      `Right-click in "${fn}", then select "RangeLink: Unbind" from the menu.`,
      [
        `A Terminal "${terminalName}" is bound as the current destination.`,
        '1. Right-click anywhere inside the editor',
        '2. Select "RangeLink: Unbind" from the context menu',
      ],
    );

    ss.log('✓ Editor-content "Unbind" was visible (clicked it) and fired the unbind path');
  });

  test('[assisted] context-menus-editor-content-011: Selection-dependent RangeLink items are hidden when no text is selected', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-ed-011', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-011';
    await ss.createAndBindCapturingTerminal(terminalName);

    const editor = await ss.openEditor(uri);
    clearSelection(editor);
    await ss.settle();

    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("rl-ctxmenu-ed-011")']);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-011');

    const verdict = await waitForHumanVerdict(
      'context-menus-editor-content-011',
      `Right-click in "${fn}" WITHOUT selecting — are the 5 selection-dependent items ABSENT from the menu?`,
      [
        `A Terminal "${terminalName}" is bound so Unbind should remain visible.`,
        '1. Do NOT click-drag or double-click to create a text selection — cursor only',
        '2. Right-click anywhere inside the editor',
        'Verdict:',
        '   (File-path items and Bind/Unbind should remain visible — that is correct.)',
      ],
    );

    const lines = logCapture.getLinesSince('before-ed-011');

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported selection-dependent items WERE visible without a selection — the `when: editorHasSelection` clause is not working',
    );
    const pasteFired = lines.some(
      (line) => parseLogContext(line)?.fn === 'VscodeAdapter.writeTextToClipboard',
    );
    assert.ok(
      !pasteFired,
      'Expected no clipboard write log — nothing should have been sent during observation',
    );

    ss.log(
      '✓ No-selection state: selection-dependent items hidden (human verdict + state invariant)',
    );
  });

  test('context-menus-editor-content-012: R-V same file same column blocked — toast shown, clipboard untouched, editor unchanged', async () => {
    const fileUri = ss.createWorkspaceFile('rvec-012', 'line 1\nline 2\nline 3\n');
    const destBasename = path.basename(fileUri.fsPath);
    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(1, 6));
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${destBasename}")`]);
    ss.expectToastMessages([
      {
        level: 'info',
        message: 'Cannot paste when bound editor has an active selection.',
      },
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    await withClipboardSentinel('before-ed-012', 'R-V', async () => {
      await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
      await ss.settle();
    });

    const doc = await vscode.workspace.openTextDocument(fileUri);
    assert.strictEqual(
      doc.getText(),
      'line 1\nline 2\nline 3\n',
      'Expected file to remain unmodified after blocked R-V',
    );
    ss.log(
      '✓ R-V same file same column: blocked, toast shown, clipboard untouched, editor unchanged',
    );
  });

  test('context-menus-editor-content-013: R-V multi-selection same file blocked — toast shown, clipboard untouched', async () => {
    const fileUri = ss.createWorkspaceFile('rvec-013', 'line 1\nline 2\nline 3\nline 4\n');
    const destBasename = path.basename(fileUri.fsPath);
    const editor = await ss.openEditor(fileUri);
    editor.selections = [
      new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 6)),
      new vscode.Selection(new vscode.Position(2, 0), new vscode.Position(2, 6)),
    ];
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${destBasename}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectToastMessages([
      {
        level: 'info',
        message: 'Cannot paste when bound editor has an active selection.',
      },
    ]);
    await withClipboardSentinel('before-ed-013', 'R-V', async () => {
      await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
      await ss.settle();
    });

    const doc = await vscode.workspace.openTextDocument(fileUri);
    assert.strictEqual(
      doc.getText(),
      'line 1\nline 2\nline 3\nline 4\n',
      'Expected file to remain unmodified after blocked R-V multi-selection',
    );
    ss.log('✓ R-V multi-selection same file: blocked, toast shown, clipboard untouched');
  });

  test('context-menus-editor-content-014: R-V to different view column — allowed', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const destUri = ss.createWorkspaceFile('rvec-014-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const sourceUri = ss.createWorkspaceFile('rvec-014-source', `${ANCHOR_START}\n`);
    ss.trackFileUri(sourceUri);
    const destBasename = path.basename(destUri.fsPath);

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    const destEditor = await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    // Open source in a different column with a selection
    await openSourceWithSelection(sourceUri, vscode.ViewColumn.Three);
    await ss.settle();

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: Selected text sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    const destDoc2 = await vscode.workspace.openTextDocument(destUri);
    assert.ok(
      destDoc2.getText().includes(`${ANCHOR_START}\n${ANCHOR_START}`),
      `Expected "${ANCHOR_START}" text pasted into dest column, got: ${JSON.stringify(destDoc2.getText())}`,
    );
    ss.log('✓ R-V different view column: allowed, text pasted in destination column');
  });
});
