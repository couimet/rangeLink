import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertNoStatusBarMsgLogged,
  assertStatusBarMsgLogged,
  cleanupFiles,
  closeAllEditors,
  createAndOpenFile,
  createLogger,
  createTerminal,
  extractQuickPickItemsLogged,
  findTerminalItems,
  findTestItemsByPrefix,
  getLogCapture,
  parseQuickPickItemsFromLogLine,
  printAssistedBanner,
  settle,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

suite('R-D Bind to Destination', () => {
  const log = createLogger('bindToDestination');
  const terminals: vscode.Terminal[] = [];
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');
    for (const t of terminals) {
      t.dispose();
    }
    terminals.length = 0;
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.length = 0;
    await settle();
  });

  const findFileItems = (items: Record<string, unknown>[]): Record<string, unknown>[] =>
    findTestItemsByPrefix(items, '__rl-test-btd-');

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-004
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-004: selecting a terminal destination binds it and shows success toast', async () => {
    await createTerminal('rl-btd-004', terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-004');

    await waitForHuman(
      'bind-to-destination-004',
      'Press Cmd+R Cmd+D, select Terminal ("rl-btd-004")',
    );

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

    assertStatusBarMsgLogged(lines, {
      message: '✓ RangeLink bound to Terminal ("rl-btd-004")',
    });

    assertNoStatusBarMsgLogged(lines, {
      message: 'RangeLink: No destination bound',
    });

    log('✓ Picker showed unbound terminal; bind succeeded with correct status bar toast');
  });

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-005
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-005: selecting a text editor destination binds it and shows success toast', async () => {
    await createAndOpenFile('btd-005-a', 'line 1\n', undefined, tmpFileUris);
    const uriB = await createAndOpenFile(
      'btd-005-b',
      'line 2\n',
      vscode.ViewColumn.Two,
      tmpFileUris,
    );
    const fnB = path.basename(uriB.fsPath);

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-005');

    await waitForHuman('bind-to-destination-005', `Press Cmd+R Cmd+D, select "${fnB}"`);

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

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink bound to Text Editor ("${fnB}")`,
    });

    assertNoStatusBarMsgLogged(lines, {
      message: 'RangeLink: No destination bound',
    });

    log('✓ Picker showed unbound file; bind succeeded with correct status bar toast');
  });

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-006
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-006: selecting an AI assistant destination binds it and shows success toast', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-btd-006');

    await waitForHuman(
      'bind-to-destination-006',
      'Press Cmd+R Cmd+D, select any available AI assistant entry',
    );

    const lines = logCapture.getLinesSince('before-btd-006');

    const AI_ASSISTANT_DISPLAY_NAMES = [
      'Claude Code Chat',
      'Cursor AI Assistant',
      'GitHub Copilot Chat',
    ];
    const boundToAny = AI_ASSISTANT_DISPLAY_NAMES.some((name) =>
      lines.some((line) => line.includes(`✓ RangeLink bound to ${name}`)),
    );
    assert.ok(
      boundToAny,
      `Expected status bar message "✓ RangeLink bound to <AI assistant>" for one of: ${AI_ASSISTANT_DISPLAY_NAMES.join(', ')}`,
    );

    log('✓ AI assistant bind success toast logged');
  });

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-007
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-007: when already bound, destination picker shows smart-bind confirmation dialog', async () => {
    await createTerminal('rl-btd-007-a', terminals);
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    await createTerminal('rl-btd-007-b', terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-007');

    await waitForHuman(
      'bind-to-destination-007',
      'Cmd+R Cmd+D → select "rl-btd-007-b" → Escape the confirmation dialog',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Select Terminal ("rl-btd-007-b") from the picker',
        '3. Escape the confirmation dialog that appears',
      ],
    );

    const lines = logCapture.getLinesSince('before-btd-007');
    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.ok(
      quickPickEntries.length >= 2,
      `Expected at least 2 showQuickPick entries (R-D picker + confirmation dialog), got ${quickPickEntries.length}`,
    );

    const confirmItems = parseQuickPickItemsFromLogLine(quickPickEntries[1]);
    assert.deepStrictEqual(
      confirmItems.map(({ label, description }) => ({ label, description })),
      [
        {
          label: 'Yes, replace',
          description: 'Switch from Terminal ("rl-btd-007-a") to Terminal ("rl-btd-007-b")',
        },
        {
          label: 'No, keep current binding',
          description: 'Stay bound to Terminal ("rl-btd-007-a")',
        },
      ],
    );

    assertNoStatusBarMsgLogged(lines, {
      message: '✓ RangeLink bound to Terminal ("rl-btd-007-b")',
    });
    assertNoStatusBarMsgLogged(lines, {
      message: 'Unbound Terminal ("rl-btd-007-a"), now bound to Terminal ("rl-btd-007-b")',
    });

    log('✓ Confirmation dialog items validated; no bind/rebind toast after Escape');
  });

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-008
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-008: smart-bind confirmation Yes replaces the binding', async () => {
    await createTerminal('rl-btd-008-a', terminals);
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    await createTerminal('rl-btd-008-b', terminals);

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

    const lines = logCapture.getLinesSince('before-btd-008');

    assertStatusBarMsgLogged(lines, {
      message: 'Unbound Terminal ("rl-btd-008-a"), now bound to Terminal ("rl-btd-008-b")',
    });

    assertNoStatusBarMsgLogged(lines, {
      message: '✓ RangeLink bound to Terminal ("rl-btd-008-a")',
    });

    log('✓ Replacement binding toast logged; old binding not re-confirmed');
  });

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-009
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-009: smart-bind confirmation No keeps existing binding', async () => {
    await createTerminal('rl-btd-009-a', terminals);
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    await createTerminal('rl-btd-009-b', terminals);

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

    const lines = logCapture.getLinesSince('before-btd-009');

    assertNoStatusBarMsgLogged(lines, {
      message: 'Unbound Terminal ("rl-btd-009-a"), now bound to Terminal ("rl-btd-009-b")',
    });
    assertNoStatusBarMsgLogged(lines, {
      message: '✓ RangeLink bound to Terminal ("rl-btd-009-b")',
    });
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the original binding was NOT preserved when clicking "No, keep current binding"',
    );

    log('✓ No rebind toast — original binding preserved (human verdict + state invariant)');
  });

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-010
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-010: Escape from destination picker dismisses without changing binding', async () => {
    await createTerminal('rl-btd-010', terminals);
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-btd-010');

    await waitForHuman('bind-to-destination-010', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-btd-010');

    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry (picker did open)');

    assertNoStatusBarMsgLogged(lines, {
      message: '✓ RangeLink bound to Terminal ("rl-btd-010")',
    });
    assertNoStatusBarMsgLogged(lines, {
      message: 'RangeLink: No destination bound',
    });

    log('✓ No bind or unbind toast after Escape — binding state unchanged');
  });

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-011
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-011: re-binding same AI assistant shows already-bound message', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-btd-011');

    await waitForHuman(
      'bind-to-destination-011',
      'Cmd+R Cmd+D → select an AI assistant → Cmd+R Cmd+D → select same AI assistant',
      [
        '1. Press Cmd+R Cmd+D and select any AI assistant (e.g., Claude Code Chat)',
        '2. Press Cmd+R Cmd+D again',
        '3. Select the same AI assistant a second time',
      ],
    );

    const lines = logCapture.getLinesSince('before-btd-011');

    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.strictEqual(
      quickPickEntries.length,
      2,
      `Expected exactly 2 showQuickPick entries (two destination picker opens, no confirmation dialog), got ${quickPickEntries.length}`,
    );

    const AI_ASSISTANT_DISPLAY_NAMES = [
      'Claude Code Chat',
      'Cursor AI Assistant',
      'GitHub Copilot Chat',
    ];
    const alreadyBoundLogged = AI_ASSISTANT_DISPLAY_NAMES.some((name) =>
      lines.some((line) => line.includes(`RangeLink: Already bound to ${name}`)),
    );
    assert.ok(
      alreadyBoundLogged,
      `Expected "RangeLink: Already bound to <AI assistant>" info toast for one of: ${AI_ASSISTANT_DISPLAY_NAMES.join(', ')}`,
    );

    log('✓ Already-bound info toast logged; no confirmation dialog shown');
  });

  // ---------------------------------------------------------------------------
  // TC bind-to-destination-012
  // ---------------------------------------------------------------------------

  test('[assisted] bind-to-destination-012: switching between different AI assistants shows confirmation dialog', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-btd-012');

    await waitForHuman(
      'bind-to-destination-012',
      'Cmd+R Cmd+D → select GitHub Copilot Chat → Cmd+R Cmd+D → select Dummy AI (Tier 3) → click "Yes, replace"',
      [
        'The Dummy AI extension is loaded — its destinations appear in the picker.',
        '1. Press Cmd+R Cmd+D and select GitHub Copilot Chat',
        '2. Press Cmd+R Cmd+D again',
        '3. Select "Dummy AI (Tier 3)" (custom AI assistant)',
        '4. When the confirmation dialog appears, click "Yes, replace"',
      ],
    );

    const lines = logCapture.getLinesSince('before-btd-012');

    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.ok(
      quickPickEntries.length >= 3,
      `Expected at least 3 showQuickPick entries (first picker, second picker, confirmation dialog), got ${quickPickEntries.length}`,
    );

    const confirmItems = parseQuickPickItemsFromLogLine(
      quickPickEntries[quickPickEntries.length - 1],
    );
    assert.deepStrictEqual(
      confirmItems.map(({ label }) => ({ label })),
      [{ label: 'Yes, replace' }, { label: 'No, keep current binding' }],
    );

    const reboundLogged = lines.some(
      (line) => line.includes('VscodeAdapter.setStatusBarMessage') && line.includes('now bound to'),
    );
    assert.ok(reboundLogged, 'Expected rebound status bar message after "Yes, replace"');

    log('✓ Confirmation dialog shown; rebind toast logged after "Yes, replace"');
  });
});
