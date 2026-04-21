import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_CONTEXT_EDITOR_CONTENT_BIND,
  CMD_UNBIND_DESTINATION,
} from '../../constants/commandIds';
import {
  activateExtension,
  assertSetContextLogged,
  assertStatusBarMsgLogged,
  assertTerminalBufferContains,
  cleanupFiles,
  closeAllEditors,
  createAndBindCapturingTerminal,
  createAndOpenFile,
  createCapturingTerminal,
  createLogger,
  createTerminal,
  extractQuickPickItemsLogged,
  getLogCapture,
  printAssistedBanner,
  settle,
  TERMINAL_READY_MS,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

const CONTEXT_IS_BOUND_KEY = 'rangelink.isBound';

suite('Context Menus — Terminal', () => {
  const log = createLogger('contextMenuTerminal');
  const terminals: vscode.Terminal[] = [];
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
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
  // TC context-menus-terminal-001
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-terminal-001: Terminal tab "Bind Here" binds that terminal', async () => {
    const terminalName = 'rl-ctxmenu-term-001';
    await createTerminal(terminalName, terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-term-001');

    await waitForHuman(
      'context-menus-terminal-001',
      `Right-click the "${terminalName}" terminal TAB → "RangeLink: Bind Here"`,
      [
        `1. Locate the "${terminalName}" tab in the terminal panel's tab bar`,
        '2. Right-click the tab (NOT the terminal content area)',
        '3. Select "RangeLink: Bind Here"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-term-001');

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink bound to Terminal ("${terminalName}")`,
    });

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    log('✓ Terminal-tab context menu bound the terminal destination');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-terminal-002
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-terminal-002: Terminal content-area "Bind Here" binds that terminal', async () => {
    const terminalName = 'rl-ctxmenu-term-002';
    await createTerminal(terminalName, terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-term-002');

    await waitForHuman(
      'context-menus-terminal-002',
      `Right-click INSIDE the "${terminalName}" terminal content area → "RangeLink: Bind Here"`,
      [
        `1. Focus the "${terminalName}" terminal`,
        '2. Right-click INSIDE the terminal output area (NOT the tab)',
        '3. Select "RangeLink: Bind Here"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-term-002');

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink bound to Terminal ("${terminalName}")`,
    });

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    log('✓ Terminal content-area context menu bound the terminal destination');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-terminal-003
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-terminal-003: Terminal content-area "Unbind" is visible when bound and unbinds on click', async () => {
    const terminalName = 'rl-ctxmenu-term-003';
    await createTerminal(terminalName, terminals);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-term-003');

    await waitForHuman(
      'context-menus-terminal-003',
      `Right-click INSIDE the "${terminalName}" terminal content area → "RangeLink: Unbind"`,
      [
        `1. Focus the "${terminalName}" terminal`,
        '2. Right-click INSIDE the terminal CONTENT AREA (not the tab — the tab menu does not render Unbind on VSCode)',
        '3. Verify "RangeLink: Unbind" IS present in the menu (clicking it proves visibility)',
        '4. Select "RangeLink: Unbind"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-term-003');

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink unbound from Terminal ("${terminalName}")`,
    });

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: false });

    log('✓ Terminal content-area "Unbind" was visible (clicked it) and fired the unbind path');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-terminal-004
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-terminal-004: Right-clicking a specific terminal TAB binds THAT terminal (multi-terminal disambiguation)', async () => {
    const targetName = 'rl-ctxmenu-term-004-TARGET';
    const otherName = 'rl-ctxmenu-term-004-OTHER';
    await createTerminal(otherName, terminals);
    await createTerminal(targetName, terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-term-004');

    await waitForHuman(
      'context-menus-terminal-004',
      `Right-click the "${targetName}" TAB → "RangeLink: Bind Here" (NOT the "${otherName}" tab)`,
      [
        `Two terminals exist: "${otherName}" and "${targetName}"`,
        `1. In the terminal panel's tab bar, locate the "${targetName}" tab specifically`,
        '2. Right-click THAT tab (not the other one)',
        '3. Select "RangeLink: Bind Here"',
        'The TARGET terminal should bind — not the OTHER one.',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-term-004');

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink bound to Terminal ("${targetName}")`,
    });
    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    const directBindLogged = lines.some(
      (line) =>
        line.includes('"fn":"BindToTerminalCommand.execute"') &&
        line.includes('"source":"context-menu"') &&
        line.includes(`"terminalName":"${targetName}"`),
    );
    assert.ok(
      directBindLogged,
      `Expected direct-bind log for "${targetName}" from context-menu source`,
    );

    log('✓ Right-clicked TAB bound the target terminal directly (picker bypassed)');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-terminal-005
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-terminal-005: Right-clicking a specific terminal CONTENT AREA binds THAT terminal (multi-terminal disambiguation)', async () => {
    const targetName = 'rl-ctxmenu-term-005-TARGET';
    const otherName = 'rl-ctxmenu-term-005-OTHER';
    await createTerminal(otherName, terminals);
    await createTerminal(targetName, terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-term-005');

    await waitForHuman(
      'context-menus-terminal-005',
      `Right-click INSIDE the "${targetName}" CONTENT AREA → "RangeLink: Bind Here" (NOT the "${otherName}" terminal)`,
      [
        `Two terminals exist: "${otherName}" and "${targetName}"`,
        `1. Click to focus the "${targetName}" terminal`,
        '2. Right-click INSIDE its content area (not the tab, not the other terminal)',
        '3. Select "RangeLink: Bind Here"',
        'The TARGET terminal should bind — not the OTHER one.',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-term-005');

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink bound to Terminal ("${targetName}")`,
    });
    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    const directBindLogged = lines.some(
      (line) =>
        line.includes('"fn":"BindToTerminalCommand.execute"') &&
        line.includes('"source":"context-menu"') &&
        line.includes(`"terminalName":"${targetName}"`),
    );
    assert.ok(
      directBindLogged,
      `Expected direct-bind log for "${targetName}" from context-menu source`,
    );

    log('✓ Right-clicked CONTENT AREA bound the target terminal directly (picker bypassed)');
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-005 (lives here because the scenario is
  // specifically the terminal-context-menu path into R-V; the test file's slug
  // naturally fits this scenario even though the TC ID is in Section 9 of the
  // QA journal.)
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-005: Terminal content-area "Send Selection to Destination" sends selected text to bound editor', async () => {
    const editorUri = await createAndOpenFile(
      'ctxmenu-term-sts-005',
      'destination file — terminal selection arrives here\n',
      undefined,
      tmpFileUris,
    );
    const editorFn = path.basename(editorUri.fsPath);

    await vscode.commands.executeCommand(CMD_CONTEXT_EDITOR_CONTENT_BIND, editorUri);
    await settle();

    const terminalName = 'rl-ctxmenu-term-sts-005';
    const terminal = await createTerminal(terminalName, terminals);

    const markerText = 'STS_005_MARKER_TEXT';
    terminal.sendText(`echo ${markerText}`, true);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-005');

    await waitForHuman(
      'send-terminal-selection-005',
      `Select "${markerText}" in terminal "${terminalName}" → right-click → "RangeLink: Send Selection to Destination"`,
      [
        `A Text Editor "${editorFn}" is currently bound as the destination.`,
        `The terminal "${terminalName}" has "${markerText}" in its output.`,
        `1. Select the "${markerText}" text in the terminal content area`,
        '2. Right-click INSIDE the terminal content area (not the tab)',
        '3. Verify "RangeLink: Send Selection to Destination" is present',
        '4. Select "RangeLink: Send Selection to Destination"',
        `The selected text should appear in the "${editorFn}" editor.`,
      ],
    );

    const lines = logCapture.getLinesSince('before-sts-005');

    const pasteStarted = lines.some((line) =>
      line.includes('"fn":"TerminalSelectionService.pasteTerminalSelectionToDestination"'),
    );
    assert.ok(
      pasteStarted,
      'Expected TerminalSelectionService.pasteTerminalSelectionToDestination log (terminal selection was read)',
    );

    assertStatusBarMsgLogged(lines, {
      message: `✓ Selected text copied to clipboard & sent to Text Editor ("${editorFn}")`,
    });

    log('✓ Terminal context-menu "Send Selection to Destination" routed selection to bound editor');
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-008 (cross-terminal: selection in SOURCE → paste
  // into BOUND, focus shifts to BOUND)
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-008: Cross-terminal "Send Selection" pastes into bound terminal and shifts focus', async () => {
    const boundName = 'rl-sts-008-BOUND';
    const sourceName = 'rl-sts-008-SOURCE';

    const capturingBound = await createAndBindCapturingTerminal(boundName, terminals);

    const sourceTerminal = await createTerminal(sourceName, terminals);
    const markerText = 'STS_008_CROSS_TERMINAL_MARKER';
    sourceTerminal.sendText(`echo ${markerText}`, true);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-008');
    capturingBound.clearCaptured();

    await waitForHuman(
      'send-terminal-selection-008',
      `Select "${markerText}" in SOURCE terminal "${sourceName}" → right-click → "Send Selection to Destination"`,
      [
        `Destination: Terminal "${boundName}" is bound (pty-captured — the test reads its buffer to verify content).`,
        `Source: Terminal "${sourceName}" contains "${markerText}".`,
        `1. Click the "${sourceName}" terminal to focus it`,
        `2. Select the "${markerText}" text in its output`,
        '3. Right-click INSIDE the source terminal content area (not the tab)',
        '4. Select "RangeLink: Send Selection to Destination"',
        `The selection should paste into "${boundName}" and focus should shift there.`,
      ],
    );

    const lines = logCapture.getLinesSince('before-sts-008');

    const readLogged = lines.some((line) =>
      line.includes('"fn":"TerminalSelectionService.pasteTerminalSelectionToDestination"'),
    );
    assert.ok(readLogged, 'Expected TerminalSelectionService log (selection was read)');

    assertStatusBarMsgLogged(lines, {
      message: `✓ Selected text copied to clipboard & sent to Terminal ("${boundName}")`,
    });

    const focusLogged = lines.some(
      (line) =>
        line.includes('Terminal focused via showTerminal()') &&
        line.includes(`"terminalName":"${boundName}"`),
    );
    assert.ok(focusLogged, `Expected "Terminal focused via showTerminal()" log for "${boundName}"`);

    assertTerminalBufferContains(capturingBound.getCapturedText(), markerText);

    log(
      '✓ Cross-terminal send: source selection landed in bound terminal buffer (pty-captured) with focus shift',
    );
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-009 (TAB menu does NOT include "Send Selection")
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-009: "Send Selection to Destination" is NOT in the terminal TAB menu', async () => {
    const terminalName = 'rl-sts-009';
    const terminal = await createTerminal(terminalName, terminals);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();
    terminal.sendText(`echo STS_009_MARKER_TEXT`, true);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-009');

    const verdict = await waitForHumanVerdict(
      'send-terminal-selection-009',
      `Select text in "${terminalName}" → right-click the TAB → is "Send Selection to Destination" ABSENT from the menu?`,
      [
        `The terminal "${terminalName}" is bound to itself (self-bind for this contract test).`,
        `1. Click the "${terminalName}" terminal and select "STS_009_MARKER_TEXT" in its output`,
        '2. Right-click the terminal TAB (not the content area)',
        '3. Click Pass if "RangeLink: Send Selection to Destination" is NOT in the menu.',
        '   Click Fail if it IS present (that would be a bug).',
      ],
    );

    const lines = logCapture.getLinesSince('before-sts-009');

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported "Send Selection to Destination" WAS visible in the tab menu — this is a bug',
    );
    const pasteFired = lines.some((line) =>
      line.includes('"fn":"TerminalSelectionService.pasteTerminalSelectionToDestination"'),
    );
    assert.ok(
      !pasteFired,
      'Expected no TerminalSelectionService log — nothing should have triggered a paste during observation',
    );

    log('✓ Tab menu did NOT offer "Send Selection" (human verdict + no paste log)');
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-010 (SELF-paste: bound terminal sends its own
  // selection to itself — documents current behavior; no self-paste guard
  // exists for terminal destinations)
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-010: Self-paste — bound terminal selection is sent back to itself (current behavior, no guard)', async () => {
    const terminalName = 'rl-sts-010';
    const capturing = await createAndBindCapturingTerminal(terminalName, terminals);
    const markerText = 'STS_010_SELF_PASTE_MARKER';
    capturing.terminal.sendText(markerText, false);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-010');
    capturing.clearCaptured();

    await waitForHuman(
      'send-terminal-selection-010',
      `Select "${markerText}" in "${terminalName}" → right-click content area → "Send Selection to Destination"`,
      [
        `Destination: Terminal "${terminalName}" is bound (the SAME terminal we'll select from).`,
        `1. Select "${markerText}" in "${terminalName}" (the marker text is visible in the buffer)`,
        '2. Right-click INSIDE the content area',
        '3. Select "RangeLink: Send Selection to Destination"',
        'The selection will be pasted BACK into the same terminal (this documents current behavior; a self-paste guard for terminals is worth filing as a follow-up).',
      ],
    );

    const lines = logCapture.getLinesSince('before-sts-010');

    assertStatusBarMsgLogged(lines, {
      message: `✓ Selected text copied to clipboard & sent to Terminal ("${terminalName}")`,
    });

    assertTerminalBufferContains(capturing.getCapturedText(), markerText);

    log(
      '✓ Self-paste: selection echoed back into bound terminal buffer (pty-captured; follow-up issue worth filing for guard)',
    );
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-011 ("Send Selection" visible when unbound;
  // clicking opens destination picker and delivers to picked destination —
  // parity with the editor family, which never gates on rangelink.isBound)
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-011: "Send Selection" (unbound) opens destination picker and delivers to picked terminal', async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await settle();

    const sourceName = 'rl-sts-011-SOURCE';
    const destName = 'rl-sts-011-DEST';

    const capturingDest = await createCapturingTerminal(destName, terminals);

    const sourceTerminal = await createTerminal(sourceName, terminals);
    const markerText = 'STS_011_MARKER_TEXT';
    sourceTerminal.sendText(`echo ${markerText}`, true);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-011');
    capturingDest.clearCaptured();

    await waitForHuman(
      'send-terminal-selection-011',
      `Select "${markerText}" in "${sourceName}" → right-click content area → "Send Selection to Destination" → pick Terminal ("${destName}")`,
      [
        `No destination is currently bound. Two terminals exist: "${sourceName}" (with marker text) and "${destName}" (empty destination).`,
        `1. Click the "${sourceName}" terminal and select "${markerText}"`,
        '2. Right-click INSIDE the content area (NOT the tab)',
        '3. Select "RangeLink: Send Selection to Destination"',
        `4. In the destination picker that opens, pick Terminal ("${destName}")`,
        `The selection should be delivered to "${destName}" and "${destName}" should become the bound destination.`,
      ],
    );

    const lines = logCapture.getLinesSince('before-sts-011');

    const readLogged = lines.some((line) =>
      line.includes('"fn":"TerminalSelectionService.pasteTerminalSelectionToDestination"'),
    );
    assert.ok(readLogged, 'Expected TerminalSelectionService log (selection was read)');

    const pickerItems = extractQuickPickItemsLogged(lines);
    assert.ok(
      pickerItems,
      'Expected showQuickPick log with items — destination picker should have opened because nothing was bound',
    );
    const destLabel = `Terminal ("${destName}")`;
    assert.ok(
      pickerItems!.some((item) => item.label === destLabel),
      `Expected destination picker to offer "${destLabel}" as a pickable item`,
    );

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    assertStatusBarMsgLogged(lines, {
      message: `✓ Selected text copied to clipboard & sent to Terminal ("${destName}")`,
    });

    assertTerminalBufferContains(capturingDest.getCapturedText(), markerText);

    log(
      '✓ Unbound state: menu item shown; click opened picker; selection landed in picked destination buffer (pty-captured)',
    );
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-012 ("Send Selection" hidden when no text is
  // selected — `when: terminalTextSelected`)
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-012: "Send Selection" is hidden when no terminal text is selected', async () => {
    const terminalName = 'rl-sts-012';
    const terminal = await createTerminal(terminalName, terminals);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();
    terminal.sendText(`echo STS_012_MARKER_TEXT`, true);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-012');

    const verdict = await waitForHumanVerdict(
      'send-terminal-selection-012',
      `Right-click inside "${terminalName}" WITHOUT selecting → is "Send Selection to Destination" ABSENT from the menu?`,
      [
        `The terminal "${terminalName}" is bound to itself.`,
        '1. Do NOT click-drag or double-click to create a text selection',
        `2. Right-click INSIDE the "${terminalName}" content area on an empty region`,
        '3. Click Pass if "RangeLink: Send Selection to Destination" is NOT in the menu (the `when: terminalTextSelected` clause should hide it).',
        '   Click Fail if it IS present (that would be a bug).',
      ],
    );

    const lines = logCapture.getLinesSince('before-sts-012');

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported "Send Selection" WAS visible with no text selected — the `when: terminalTextSelected` clause is not working',
    );
    const pasteFired = lines.some((line) =>
      line.includes('"fn":"TerminalSelectionService.pasteTerminalSelectionToDestination"'),
    );
    assert.ok(
      !pasteFired,
      'Expected no paste log — nothing should have triggered a paste during observation',
    );

    log('✓ No-selection state: "Send Selection" absent (human verdict + no paste log)');
  });

  // ---------------------------------------------------------------------------
  // TC send-terminal-selection-013 (terminal content-area "Send Selection"
  // delivers to a bound AI-assistant destination — Dummy AI Tier 1)
  // ---------------------------------------------------------------------------

  test('[assisted] send-terminal-selection-013: Terminal content-area "Send Selection" delivers selected text to bound AI-assistant destination', async () => {
    await waitForHuman(
      'send-terminal-selection-013-bind',
      'Cmd+R Cmd+D → select "Dummy AI (Tier 1)"',
      [
        'Setup: bind the Dummy AI test extension as the destination.',
        '1. Press Cmd+R Cmd+D',
        '2. Select "Dummy AI (Tier 1)" from the destination picker',
      ],
    );

    const terminalName = 'rl-sts-013';
    const terminal = await createTerminal(terminalName, terminals);
    const markerText = 'STS_013_AI_DELIVERY_MARKER';
    terminal.sendText(`echo ${markerText}`, true);
    await settle(TERMINAL_READY_MS);

    const logCapture = getLogCapture();
    logCapture.mark('before-sts-013');

    await waitForHuman(
      'send-terminal-selection-013',
      `Select "${markerText}" in "${terminalName}" → right-click content area → "Send Selection to Destination"`,
      [
        'Destination: Dummy AI (Tier 1) is bound.',
        `Source: "${terminalName}" has "${markerText}" in its output.`,
        `1. Click the "${terminalName}" terminal to focus it`,
        `2. Select "${markerText}" in its output`,
        '3. Right-click INSIDE the terminal content area (not the tab)',
        '4. Select "RangeLink: Send Selection to Destination"',
        'The selection should be delivered to the Dummy AI extension via direct insert.',
      ],
    );

    const lines = logCapture.getLinesSince('before-sts-013');

    const readLogged = lines.some((line) =>
      line.includes('"fn":"TerminalSelectionService.pasteTerminalSelectionToDestination"'),
    );
    assert.ok(readLogged, 'Expected TerminalSelectionService log (selection was read)');

    const directInsertLog = lines.some(
      (line) =>
        line.includes('DirectInsertFactory.insert') && line.includes('Direct insert succeeded'),
    );
    assert.ok(
      directInsertLog,
      'Expected DirectInsertFactory.insert success log — Dummy AI Tier 1 uses direct insert',
    );

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.ok(
      textResult!.tier1.includes(markerText),
      `Expected Dummy AI tier1 textarea to contain "${markerText}" but got: ${textResult!.tier1}`,
    );

    log(
      '✓ Terminal context-menu "Send Selection" delivered selection to Dummy AI via Tier 1 direct insert',
    );
  });
});
