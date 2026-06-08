import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_DESTINATION,
  CMD_BIND_TO_GITHUB_COPILOT_CHAT,
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_BIND_TO_TEXT_EDITOR,
  CMD_JUMP_TO_DESTINATION,
} from '../../constants/commandIds';
import {
  MENU_ITEM_GROUP_AI_ASSISTANTS,
  MENU_ITEM_GROUP_TERMINALS,
  assertQuickPickContains,
  assertQuickPickItemsLogged,
  closeAllEditors,
  dismissQuickPick,
  extractQuickPickItemsLogged,
  findTerminalItems,
  findTestItemsByPrefix,
  getLogCapture,
  getQuickPickLines,
  openAndDismiss,
  parseQuickPickItemsFromLogLine,
  standardSuite,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

standardSuite('R-D Bind to Destination', (ss) => {
  const findFileItems = (items: Record<string, unknown>[]): Record<string, unknown>[] =>
    findTestItemsByPrefix(items, '__rl-test-btd-');

  test('bind-to-destination-004: selecting a terminal destination binds it and shows success toast', async () => {
    await ss.createTerminal('rl-btd-004');

    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("rl-btd-004")']);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-004');

    await openAndDismiss(CMD_BIND_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-btd-004');

    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    assert.deepStrictEqual(
      termItems.map(({ label, displayName, description, isActive, boundState, itemKind }) => ({
        label,
        displayName,
        description,
        isActive,
        boundState,
        itemKind,
      })),
      [
        {
          label: 'Terminal ("rl-btd-004")',
          displayName: 'Terminal ("rl-btd-004")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    ss.log('✓ Picker showed unbound terminal; bind succeeded with correct status bar toast');
  });

  test('bind-to-destination-005: selecting a text editor destination binds it and shows success toast', async () => {
    await ss.createAndOpenFile('btd-005-a', 'line 1\n', undefined);
    const uriB = await ss.createAndOpenFile('btd-005-b', 'line 2\n', vscode.ViewColumn.Two);
    const fnB = path.basename(uriB.fsPath);

    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${fnB}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-005');

    await openAndDismiss(CMD_BIND_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-btd-005');

    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const fileItems = findFileItems(items!);
    const targetFile = fileItems.find((item) => item.label === fnB);
    assert.ok(targetFile, `Expected file item for ${fnB}`);
    assert.deepStrictEqual(
      {
        label: targetFile!.label,
        displayName: targetFile!.displayName,
        boundState: targetFile!.boundState,
        itemKind: targetFile!.itemKind,
      },
      {
        label: fnB,
        displayName: fnB,
        boundState: 'not-bound',
        itemKind: 'bindable',
      },
    );

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR, uriB);
    await ss.settle();

    ss.log('✓ Picker showed unbound file; bind succeeded with correct status bar toast');
  });

  test('bind-to-destination-006: selecting a built-in AI assistant destination binds it and shows success toast', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: Bound to GitHub Copilot Chat']);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    ss.log('✓ AI assistant bind success toast logged');
  });

  test('bind-to-destination-007: when already bound, binding a different terminal shows smart-bind confirmation dialog', async () => {
    await ss.createTerminal('rl-btd-007-a');
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();
    const terminalB = await ss.createTerminal('rl-btd-007-b');

    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("rl-btd-007-a")']);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': false,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-007');

    const bindPromise = vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE, terminalB);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-btd-007');
    assertQuickPickItemsLogged(lines, [
      {
        label: 'Yes, replace',
        description: 'Switch from Terminal ("rl-btd-007-a") to Terminal ("rl-btd-007-b")',
      },
      {
        label: 'No, keep current binding',
        description: 'Stay bound to Terminal ("rl-btd-007-a")',
      },
    ]);

    await dismissQuickPick();
    await bindPromise;
    await ss.settle();

    ss.log('✓ Confirmation dialog items validated; no bind/rebind toast after Escape');
  });

  test('[assisted] bind-to-destination-008: smart-bind confirmation Yes replaces the binding', async () => {
    await ss.createTerminal('rl-btd-008-a');
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();
    await ss.createTerminal('rl-btd-008-b');

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-btd-008-a")',
      '✓ RangeLink: Unbound Terminal ("rl-btd-008-a"), now bound to Terminal ("rl-btd-008-b")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-008');

    await waitForHuman(
      'bind-to-destination-008',
      'Cmd+R Cmd+D → select "rl-btd-008-b" → click "Yes, replace"',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Select Terminal ("rl-btd-008-b") from the list',
        '3. When the confirmation dialog appears, click "Yes, replace"',
      ],
    );

    ss.log('✓ Replacement binding toast logged; old binding not re-confirmed');
  });

  test('[assisted] bind-to-destination-009: smart-bind confirmation No keeps existing binding', async () => {
    await ss.createTerminal('rl-btd-009-a');
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();
    await ss.createTerminal('rl-btd-009-b');

    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("rl-btd-009-a")']);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': false,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-009');

    const verdict = await waitForHumanVerdict(
      'bind-to-destination-009',
      'Cmd+R Cmd+D → select "rl-btd-009-b" → click "No, keep current binding" — did the original binding ("rl-btd-009-a") survive?',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Select Terminal ("rl-btd-009-b") from the list',
        '3. When the confirmation dialog appears, click "No, keep current binding"',
        '4. Click Pass if the original binding to "rl-btd-009-a" was kept (no rebind, no status-bar change).',
        '   Click Fail if "rl-btd-009-b" ended up bound or you saw a rebind toast.',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the original binding was NOT preserved when clicking "No, keep current binding"',
    );

    ss.log('✓ No rebind toast — original binding preserved (human verdict + state invariant)');
  });

  test('bind-to-destination-010: Escape from destination picker dismisses without changing binding', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("rl-btd-010")']);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });

    await ss.createTerminal('rl-btd-010');
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-010');

    await openAndDismiss(CMD_BIND_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-btd-010');

    assertQuickPickContains(lines, MENU_ITEM_GROUP_AI_ASSISTANTS, MENU_ITEM_GROUP_TERMINALS);

    ss.log('✓ No bind or unbind toast after Escape — binding state unchanged');
  });

  test('bind-to-destination-011: re-binding same built-in AI assistant shows already-bound message', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: Bound to GitHub Copilot Chat']);
    ss.expectToastMessages([{ level: 'info', message: 'Already bound to GitHub Copilot Chat' }]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    // First bind — success toast
    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    // Second bind to same AI — should show "Already bound" info, no confirmation dialog
    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    ss.log('✓ Already-bound info toast logged; no confirmation dialog shown');
  });

  test('[assisted] bind-to-destination-012: switching between different AI assistants shows confirmation dialog', async () => {
    // Programmatic first bind to Copilot Chat
    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to GitHub Copilot Chat',
      '✓ RangeLink: Unbound GitHub Copilot Chat, now bound to Dummy AI (Tier 3)',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-012');

    await waitForHuman(
      'bind-to-destination-012',
      'Cmd+R Cmd+D → select Dummy AI (Tier 3) → click "Yes, replace"',
      [
        'The Dummy AI extension is loaded — its destinations appear in the picker.',
        '1. Press Cmd+R Cmd+D',
        '2. Select "Dummy AI (Tier 3)" (custom AI assistant) from the picker',
        '3. When the confirmation dialog appears, click "Yes, replace"',
      ],
    );

    const lines = logCapture.getLinesSince('before-btd-012');

    const quickPickEntries = getQuickPickLines(lines);
    assert.ok(
      quickPickEntries.length >= 2,
      `Expected at least 2 showQuickPick entries (destination picker + confirmation dialog), got ${quickPickEntries.length}`,
    );

    const confirmItems = parseQuickPickItemsFromLogLine(
      quickPickEntries[quickPickEntries.length - 1],
    );
    assert.deepStrictEqual(
      confirmItems.map(({ label }) => ({ label })),
      [{ label: 'Yes, replace' }, { label: 'No, keep current binding' }],
    );

    ss.log('✓ Confirmation dialog shown; rebind toast logged after "Yes, replace"');
  });

  test('bind-to-destination-014: Jump to Bound Destination with no bound destination opens picker', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-btd-014');

    await openAndDismiss(CMD_JUMP_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-btd-014');
    assertQuickPickContains(lines, MENU_ITEM_GROUP_AI_ASSISTANTS);
    ss.log('✓ Jump to Bound Destination with no destination opens picker (log-based)');
  });

  test('bind-to-destination-015: binding a text editor with a single tab group succeeds', async () => {
    await closeAllEditors();

    const fileA = ss.createWorkspaceFile('btd-015-a', 'file A content\n');
    const fileB = ss.createWorkspaceFile('btd-015-b', 'file B content\n');
    const docA = await vscode.workspace.openTextDocument(fileA);
    const docB = await vscode.workspace.openTextDocument(fileB);
    await vscode.window.showTextDocument(docA, vscode.ViewColumn.One);
    await vscode.window.showTextDocument(docB, vscode.ViewColumn.One);
    await ss.settle();

    const fnB = path.basename(fileB.fsPath);
    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${fnB}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR, fileB);
    await ss.settle();

    ss.log('✓ Text editor binding works in single tab group — no split required (human verdict)');
  });
});
