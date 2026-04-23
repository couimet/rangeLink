import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  assertClipboardWriteLogged,
  assertFilePathLogged,
  assertFnLogged,
  assertSetContextLogged,
  assertStatusBarMsgLogged,
  assertTerminalBufferContains,
  cleanupFiles,
  closeAllEditors,
  createAndBindCapturingTerminal,
  createAndOpenFile,
  createLogger,
  getLogCapture,
  openEditor,
  printAssistedBanner,
  settle,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

const FILE_CONTENT = 'line 1\nline 2\nline 3\nline 4\n';
const CONTEXT_IS_BOUND_KEY = 'rangelink.isBound';

suite('Context Menus — Editor Content', () => {
  const log = createLogger('contextMenuEditorContent');
  const terminals: vscode.Terminal[] = [];
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    // Multi-line "Send Selected Text" triggers VS Code's terminal
    // multi-line-paste warning dialog by default; set to 'never' so
    // TC 005's selection delivers deterministically in the test host.
    await vscode.workspace
      .getConfiguration('terminal.integrated')
      .update('enableMultiLinePasteWarning', 'never', vscode.ConfigurationTarget.Global);
    printAssistedBanner();
  });

  teardown(async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    for (const t of terminals) {
      t.dispose();
    }
    terminals.length = 0;
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.length = 0;
    await settle();
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-001: "Send RangeLink"
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-001: Editor content "Send RangeLink" sends workspace-relative link to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-001', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    const terminalName = 'rl-ctxmenu-ed-001';
    const capturing = await createAndBindCapturingTerminal(terminalName, terminals);

    const editor = await openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));
    await settle();

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

    const lines = logCapture.getLinesSince('before-ed-001');

    assertFnLogged(lines, { fn: 'LinkGenerator.copyToClipboardAndDestination' });
    assertTerminalBufferContains(capturing.getCapturedText(), relativePath);
    assertTerminalBufferContains(capturing.getCapturedText(), '#L1-L2');
    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink copied to clipboard & sent to Terminal ("${terminalName}")`,
    });

    log('✓ Editor-content "Send RangeLink" delivered workspace-relative link to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-002: "Send RangeLink (Absolute)"
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-002: Editor content "Send RangeLink (Absolute)" sends absolute link to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-002', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-002';
    const capturing = await createAndBindCapturingTerminal(terminalName, terminals);

    const editor = await openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));
    await settle();

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

    const lines = logCapture.getLinesSince('before-ed-002');

    assertFnLogged(lines, { fn: 'LinkGenerator.copyToClipboardAndDestination' });
    assertTerminalBufferContains(capturing.getCapturedText(), uri.fsPath);
    assertTerminalBufferContains(capturing.getCapturedText(), '#L1-L2');
    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink copied to clipboard & sent to Terminal ("${terminalName}")`,
    });

    log('✓ Editor-content "Send RangeLink (Absolute)" delivered absolute link to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-003: "Send Portable Link"
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-003: Editor content "Send Portable Link" sends portable link with workspace-relative path', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-003', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    const terminalName = 'rl-ctxmenu-ed-003';
    const capturing = await createAndBindCapturingTerminal(terminalName, terminals);

    const editor = await openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));
    await settle();

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

    const lines = logCapture.getLinesSince('before-ed-003');

    assertFnLogged(lines, { fn: 'LinkGenerator.copyToClipboardAndDestination' });
    assertTerminalBufferContains(capturing.getCapturedText(), relativePath);
    assertTerminalBufferContains(capturing.getCapturedText(), '#L1-L2');
    assertStatusBarMsgLogged(lines, {
      message: `✓ Portable RangeLink copied to clipboard & sent to Terminal ("${terminalName}")`,
    });

    log('✓ Editor-content "Send Portable Link" delivered portable link to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-004: "Send Portable Link (Absolute)"
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-004: Editor content "Send Portable Link (Absolute)" sends portable link with absolute path', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-004', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-004';
    const capturing = await createAndBindCapturingTerminal(terminalName, terminals);

    const editor = await openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));
    await settle();

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

    const lines = logCapture.getLinesSince('before-ed-004');

    assertFnLogged(lines, { fn: 'LinkGenerator.copyToClipboardAndDestination' });
    assertTerminalBufferContains(capturing.getCapturedText(), uri.fsPath);
    assertTerminalBufferContains(capturing.getCapturedText(), '#L1-L2');
    assertStatusBarMsgLogged(lines, {
      message: `✓ Portable RangeLink copied to clipboard & sent to Terminal ("${terminalName}")`,
    });

    log(
      '✓ Editor-content "Send Portable Link (Absolute)" delivered portable link with absolute path',
    );
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-005: "Send Selected Text"
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-005: Editor content "Send Selected Text" sends raw selected text to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-005', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-005';
    const capturing = await createAndBindCapturingTerminal(terminalName, terminals);

    const editor = await openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(2, 6));
    await settle();

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

    const lines = logCapture.getLinesSince('before-ed-005');

    assertFnLogged(lines, { fn: 'TextSelectionPaster.pasteSelectedTextToDestination' });
    // Normalize both `\r\n` and lone `\r` to `\n` so the contiguous-substring
    // check passes regardless of VS Code's line-ending choice. `workbench.action.terminal.paste`
    // sends `\r` between lines so a real shell treats each line as Enter-terminated;
    // our capturing pty preserves exactly what was sent.
    const normalizedCapture = capturing.getCapturedText().replace(/\r\n|\r/g, '\n');
    log(`TC 005 captured (normalized): ${JSON.stringify(normalizedCapture)}`);
    assertTerminalBufferContains(normalizedCapture, 'line 1\nline 2\nline 3');
    assertStatusBarMsgLogged(lines, {
      message: `✓ Selected text copied to clipboard & sent to Terminal ("${terminalName}")`,
    });

    log('✓ Editor-content "Send Selected Text" delivered raw selected text to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-006: visual separator in editor content menu
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-006: Visual separator is visible between RangeLink commands and other menu items', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-006', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const verdict = await waitForHumanVerdict(
      'context-menus-editor-content-006',
      `Right-click in "${fn}" — is there a visual separator line between the RangeLink block and the rest of the menu?`,
      [
        '1. Right-click anywhere inside the editor',
        '2. Look at the RangeLink commands as a group (grouped together in the menu)',
        '3. Click Pass if a visual separator line sits between the RangeLink block and the adjacent VS Code menu items.',
        '   Click Fail if there is no separator (the RangeLink commands blend into the rest of the menu).',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink block has no visual separator — group prefixes in package.json may have drifted',
    );

    log('✓ Editor-content context menu renders a visual separator for the RangeLink block');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-007: "Send This File's Path" (absolute)
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-007: Editor content "Send This File\'s Path" sends absolute path to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-007', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-007';
    const capturing = await createAndBindCapturingTerminal(terminalName, terminals);

    await openEditor(uri);
    await settle();

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
    assertClipboardWriteLogged(lines, { textLength: uri.fsPath.length });
    assertTerminalBufferContains(capturing.getCapturedText(), uri.fsPath);

    log('✓ Editor-content "Send This File\'s Path" delivered absolute path to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-008: "Send This File's Relative Path"
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-008: Editor content "Send This File\'s Relative Path" sends workspace-relative path to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-008', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    const terminalName = 'rl-ctxmenu-ed-008';
    const capturing = await createAndBindCapturingTerminal(terminalName, terminals);

    await openEditor(uri);
    await settle();

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
    assertClipboardWriteLogged(lines, { textLength: relativePath.length });
    assertTerminalBufferContains(capturing.getCapturedText(), relativePath);

    log(
      '✓ Editor-content "Send This File\'s Relative Path" delivered relative path to bound terminal',
    );
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-009: "Bind Here" binds current file as text editor
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-009: Editor content "Bind Here" binds the current file as the text editor destination', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-009', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

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

    const lines = logCapture.getLinesSince('before-ed-009');

    assertFnLogged(lines, { fn: 'BindToTextEditorCommand.executeWithUri' });
    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });
    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink bound to Text Editor ("${fn}")`,
    });

    log('✓ Editor-content "Bind Here" committed a text-editor binding for the current file');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-010: Unbind visible when bound + click fires unbind
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-010: Editor content "Unbind" is visible when bound and unbinds on click', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-010', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-010';
    await createAndBindCapturingTerminal(terminalName, terminals);

    await openEditor(uri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-010');

    await waitForHuman(
      'context-menus-editor-content-010',
      `Right-click in "${fn}" → "RangeLink: Unbind"`,
      [
        `A Terminal "${terminalName}" is bound as the current destination.`,
        '1. Right-click anywhere inside the editor',
        '2. Verify "RangeLink: Unbind" IS present in the menu (clicking it proves visibility)',
        '3. Select "RangeLink: Unbind"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ed-010');

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: false });
    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink unbound from Terminal ("${terminalName}")`,
    });

    log('✓ Editor-content "Unbind" was visible (clicked it) and fired the unbind path');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-content-011: selection-dependent items hidden when no selection
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-content-011: Selection-dependent RangeLink items are hidden when no text is selected', async () => {
    const uri = await createAndOpenFile('ctxmenu-ed-011', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-ed-011';
    await createAndBindCapturingTerminal(terminalName, terminals);

    const editor = await openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ed-011');

    const verdict = await waitForHumanVerdict(
      'context-menus-editor-content-011',
      `Right-click in "${fn}" WITHOUT selecting — are the 5 selection-dependent items ABSENT from the menu?`,
      [
        `A Terminal "${terminalName}" is bound so Unbind should remain visible.`,
        '1. Do NOT click-drag or double-click to create a text selection — cursor only',
        '2. Right-click anywhere inside the editor',
        '3. Click Pass if ALL FIVE of these items are NOT visible: "Send RangeLink", "Send RangeLink (Absolute)", "Send Portable Link", "Send Portable Link (Absolute)", "Send Selected Text"',
        '   (File-path items and Bind/Unbind should remain visible — that is correct.)',
        '   Click Fail if any of the five selection-dependent items appear despite no selection.',
      ],
    );

    const lines = logCapture.getLinesSince('before-ed-011');

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported selection-dependent items WERE visible without a selection — the `when: editorHasSelection` clause is not working',
    );
    const linkFired = lines.some((line) => line.includes('"fn":"LinkGenerator.createLinkCore"'));
    const pasteFired = lines.some((line) =>
      line.includes('"fn":"VscodeAdapter.writeTextToClipboard"'),
    );
    assert.ok(
      !linkFired,
      'Expected no LinkGenerator.createLinkCore log — no selection-dependent send should have fired during observation',
    );
    assert.ok(
      !pasteFired,
      'Expected no clipboard write log — nothing should have been sent during observation',
    );

    log('✓ No-selection state: selection-dependent items hidden (human verdict + state invariant)');
  });
});
