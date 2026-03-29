import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  loadSettingsProfile,
  parseQuickPickItemsFromLogLine,
  printAssistedBanner,
  resetRangelinkSettings,
  settle,
  TERMINAL_READY_MS,
  waitForHuman,
} from '../helpers';

const SEPARATOR_KIND = -1;
const TERMINAL_OVERFLOW_COUNT = 6;
const MAX_INLINE_DEFAULT = 5;
const FILE_OVERFLOW_THRESHOLD = 5;

suite('Terminal Picker', () => {
  const log = createLogger('terminalPicker');
  const terminals: vscode.Terminal[] = [];

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
    await settle();
  });

  const createTerminal = async (name: string): Promise<vscode.Terminal> => {
    const t = vscode.window.createTerminal({ name });
    terminals.push(t);
    t.show(true);
    await settle(TERMINAL_READY_MS);
    return t;
  };

  const findTerminalItems = (items: Record<string, unknown>[]): Record<string, unknown>[] =>
    items.filter(
      (item) =>
        item.itemKind === 'bindable' &&
        typeof item.label === 'string' &&
        (item.label as string).includes('Terminal ('),
    );

  test('[assisted] terminal-picker-001: active terminal is marked with active badge', async () => {
    const t1 = await createTerminal('rl-tp-001-a');
    await createTerminal('rl-tp-001-b');
    t1.show(true);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-001');

    await waitForHuman('terminal-picker-001', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-001');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    const activeItem = termItems.find((i) => (i.label as string).includes('rl-tp-001-a'));
    assert.ok(activeItem, 'Expected to find terminal rl-tp-001-a');
    assert.deepStrictEqual(
      { description: activeItem!.description, isActive: activeItem!.isActive },
      { description: 'active', isActive: true },
    );

    const nonActiveItem = termItems.find((i) => (i.label as string).includes('rl-tp-001-b'));
    assert.ok(nonActiveItem, 'Expected to find terminal rl-tp-001-b');
    assert.deepStrictEqual(
      { description: nonActiveItem!.description, isActive: nonActiveItem!.isActive },
      { description: undefined, isActive: undefined },
    );

    log('✓ Active: isActive=true + badge, non-active: isActive=undefined + no badge');
  });

  test('[assisted] terminal-picker-002: bound terminal is marked with bound badge', async () => {
    await createTerminal('rl-tp-002');
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    const t2 = await createTerminal('rl-tp-002-other');
    t2.show(true);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-002');

    await waitForHuman('terminal-picker-002', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-002');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    const boundItem = termItems.find((i) => (i.label as string).includes('rl-tp-002"'));
    assert.ok(boundItem, 'Expected to find terminal rl-tp-002');
    assert.deepStrictEqual(
      { description: boundItem!.description, boundState: boundItem!.boundState, isActive: boundItem!.isActive },
      { description: 'bound', boundState: 'bound', isActive: undefined },
    );

    const otherItem = termItems.find((i) => (i.label as string).includes('rl-tp-002-other'));
    assert.ok(otherItem, 'Expected to find terminal rl-tp-002-other');
    assert.deepStrictEqual(
      { description: otherItem!.description, boundState: otherItem!.boundState, isActive: otherItem!.isActive },
      { description: 'active', boundState: 'not-bound', isActive: true },
    );

    log('✓ Bound: boundState=bound + no active, Other: boundState=not-bound + isActive=true');
  });

  test('[assisted] terminal-picker-003: terminal that is both active and bound shows dual badge', async () => {
    const t = await createTerminal('rl-tp-003');
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    t.show(true);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-003');

    await waitForHuman('terminal-picker-003', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-003');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    const dualItem = termItems.find((i) => (i.label as string).includes('rl-tp-003'));
    assert.ok(dualItem, 'Expected to find terminal rl-tp-003');
    assert.deepStrictEqual(
      { description: dualItem!.description, boundState: dualItem!.boundState, isActive: dualItem!.isActive },
      { description: 'bound · active', boundState: 'bound', isActive: true },
    );

    log('✓ Dual: boundState=bound + isActive=true + "bound · active" badge');
  });

  test('[assisted] terminal-picker-004: bound terminal always appears first in the list', async () => {
    await createTerminal('rl-tp-004-b');
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    await createTerminal('rl-tp-004-a');

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-004');

    await waitForHuman('terminal-picker-004', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-004');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    assert.deepStrictEqual(
      termItems.map(({ label, displayName, boundState, isActive, itemKind }) => ({ label, displayName, boundState, isActive, itemKind })),
      [
        { label: 'Terminal ("rl-tp-004-b")', displayName: 'Terminal ("rl-tp-004-b")', boundState: 'bound', isActive: true, itemKind: 'bindable' },
        { label: 'Terminal ("rl-tp-004-a")', displayName: 'Terminal ("rl-tp-004-a")', boundState: 'not-bound', isActive: undefined, itemKind: 'bindable' },
      ],
    );

    log('✓ Bound terminal first, non-bound second — full semantic state');
  });

  test('[assisted] terminal-picker-005: active non-bound terminal appears second', async () => {
    await createTerminal('rl-tp-005-a');
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    const t2 = await createTerminal('rl-tp-005-b');
    t2.show(true);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-005');

    await waitForHuman('terminal-picker-005', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-005');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    assert.strictEqual(termItems.length, 2, `Expected exactly 2 terminal items but got ${termItems.length}`);
    assert.deepStrictEqual(
      termItems.map(({ label, description, boundState, isActive }) => ({ label, description, boundState, isActive })),
      [
        { label: 'Terminal ("rl-tp-005-a")', description: 'bound', boundState: 'bound', isActive: undefined },
        { label: 'Terminal ("rl-tp-005-b")', description: 'active', boundState: 'not-bound', isActive: true },
      ],
    );

    log('✓ Bound first with semantic state, active second with semantic state');
  });

  test('[assisted] terminal-picker-006: hidden IDE terminals are absent from the picker', async () => {
    await createTerminal('rl-tp-006');

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-006');

    await waitForHuman('terminal-picker-006', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-006');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    assert.deepStrictEqual(
      termItems.map(({ label, displayName, description, isActive, boundState, itemKind }) => ({ label, displayName, description, isActive, boundState, itemKind })),
      [{ label: 'Terminal ("rl-tp-006")', displayName: 'Terminal ("rl-tp-006")', description: 'active', isActive: true, boundState: 'not-bound', itemKind: 'bindable' }],
    );

    log('✓ Only the test terminal appears — full field validation');
  });

  test('[assisted] terminal-picker-007: all terminals shown inline when within maxInline limit', async () => {
    await createTerminal('rl-tp-007-a');
    await createTerminal('rl-tp-007-b');

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-007');

    await waitForHuman('terminal-picker-007', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-007');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    assert.strictEqual(
      items!.find((i) => i.label === 'More terminals...'),
      undefined,
      'Expected no "More terminals..." overflow item',
    );

    const termItems = findTerminalItems(items!);
    assert.deepStrictEqual(
      termItems.map(({ label, displayName, description, isActive, boundState, itemKind }) => ({ label, displayName, description, isActive, boundState, itemKind })),
      [
        { label: 'Terminal ("rl-tp-007-a")', displayName: 'Terminal ("rl-tp-007-a")', description: undefined, isActive: undefined, boundState: 'not-bound', itemKind: 'bindable' },
        { label: 'Terminal ("rl-tp-007-b")', displayName: 'Terminal ("rl-tp-007-b")', description: 'active', isActive: true, boundState: 'not-bound', itemKind: 'bindable' },
      ],
    );

    log('✓ Both terminals inline, full field validation');
  });

  test('[assisted] terminal-picker-008: overflow shows "More terminals..." when exceeding maxInline', async () => {
    for (let i = 1; i <= TERMINAL_OVERFLOW_COUNT; i++) {
      await createTerminal(`rl-tp-008-${i}`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-008');

    await waitForHuman('terminal-picker-008', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-008');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const moreItem = items!.find((i) => i.label === 'More terminals...');
    assert.ok(moreItem, 'Expected "More terminals..." overflow item');
    assert.deepStrictEqual(
      { label: moreItem!.label, displayName: moreItem!.displayName, description: moreItem!.description, remainingCount: moreItem!.remainingCount, itemKind: moreItem!.itemKind },
      { label: 'More terminals...', displayName: 'More terminals...', description: `${TERMINAL_OVERFLOW_COUNT - MAX_INLINE_DEFAULT} more`, remainingCount: TERMINAL_OVERFLOW_COUNT - MAX_INLINE_DEFAULT, itemKind: 'terminal-more' },
    );

    const termItems = findTerminalItems(items!);
    assert.strictEqual(termItems.length, MAX_INLINE_DEFAULT, `Expected ${MAX_INLINE_DEFAULT} inline items`);

    log('✓ Overflow item fully validated, inline capped at maxInline');
  });

  test('[assisted] terminal-picker-009: selecting "More terminals..." opens secondary full picker', async () => {
    for (let i = 1; i <= TERMINAL_OVERFLOW_COUNT; i++) {
      await createTerminal(`rl-tp-009-${i}`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-009');

    await waitForHuman(
      'terminal-picker-009',
      'Cmd+R Cmd+D → click "More terminals..." → Escape',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Click "More terminals..."',
        '3. Escape the secondary picker',
      ],
    );

    const lines = logCapture.getLinesSince('before-tp-009');
    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.ok(quickPickEntries.length >= 2, 'Expected at least 2 showQuickPick entries');

    const secondaryItems = parseQuickPickItemsFromLogLine(quickPickEntries[1]);
    const secondaryTerminals = secondaryItems.filter(
      (i) => typeof i.label === 'string' && (i.label as string).includes('rl-tp-009-'),
    );
    assert.strictEqual(
      secondaryTerminals.length,
      TERMINAL_OVERFLOW_COUNT,
      `Expected all ${TERMINAL_OVERFLOW_COUNT} terminals in secondary picker`,
    );

    log('✓ Secondary picker contains all terminals');
  });

  test('[assisted] terminal-picker-010: escaping secondary picker returns to parent destination picker', async () => {
    for (let i = 1; i <= TERMINAL_OVERFLOW_COUNT; i++) {
      await createTerminal(`rl-tp-010-${i}`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-010');

    await waitForHuman(
      'terminal-picker-010',
      'Cmd+R Cmd+D → "More terminals..." → Escape → Escape again',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Click "More terminals..."',
        '3. Escape the secondary picker (parent should reopen)',
        '4. Escape the parent picker',
      ],
    );

    const lines = logCapture.getLinesSince('before-tp-010');
    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.ok(quickPickEntries.length >= 3, 'Expected at least 3 showQuickPick entries');

    const firstItems = parseQuickPickItemsFromLogLine(quickPickEntries[0]);
    const reopenedItems = parseQuickPickItemsFromLogLine(quickPickEntries[2]);
    assert.strictEqual(
      reopenedItems.length,
      firstItems.length,
      `Expected reopened parent item count ${firstItems.length} but got ${reopenedItems.length}`,
    );

    log('✓ Parent picker reopened with same item count');
  });

  test('[assisted] terminal-picker-011: maxInline setting changes overflow threshold', async () => {
    await loadSettingsProfile('terminal-picker-low');
    const LOW_MAX_INLINE = 2;
    const TC_TERMINAL_COUNT = 3;

    try {
      for (let i = 1; i <= TC_TERMINAL_COUNT; i++) {
        await createTerminal(`rl-tp-011-${i}`);
      }

      const logCapture = getLogCapture();
      logCapture.mark('before-tp-011');

      await waitForHuman('terminal-picker-011', 'Press Cmd+R Cmd+D, then Escape');

      const lines = logCapture.getLinesSince('before-tp-011');
      const items = extractQuickPickItemsLogged(lines);
      assert.ok(items, 'Expected showQuickPick log entry');

      const moreItem = items!.find((i) => i.label === 'More terminals...');
      assert.ok(moreItem, 'Expected "More terminals..." overflow item');
      assert.deepStrictEqual(
        { label: moreItem!.label, displayName: moreItem!.displayName, description: moreItem!.description, remainingCount: moreItem!.remainingCount, itemKind: moreItem!.itemKind },
        { label: 'More terminals...', displayName: 'More terminals...', description: `${TC_TERMINAL_COUNT - LOW_MAX_INLINE} more`, remainingCount: TC_TERMINAL_COUNT - LOW_MAX_INLINE, itemKind: 'terminal-more' },
      );

      const termItems = findTerminalItems(items!);
      assert.strictEqual(termItems.length, LOW_MAX_INLINE, `Expected ${LOW_MAX_INLINE} inline items`);

      log('✓ maxInline=2: overflow fully validated, inline capped');
    } finally {
      await resetRangelinkSettings();
    }
  });

  test('[assisted] terminal-picker-012: terminal picker appears inline in R-M menu when unbound', async () => {
    await createTerminal('rl-tp-012');

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-012');

    await waitForHuman('terminal-picker-012', 'Open R-M menu (Cmd+R Cmd+M), then Escape');

    const lines = logCapture.getLinesSince('before-tp-012');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const terminalSeparator = items!.find(
      (i) => i.kind === SEPARATOR_KIND && i.label === 'Terminals',
    );
    assert.ok(terminalSeparator, 'Expected "Terminals" separator in R-M menu');

    const termItems = findTerminalItems(items!);
    assert.deepStrictEqual(
      termItems.map(({ displayName, description, isActive, boundState, itemKind }) => ({ displayName, description, isActive, boundState, itemKind })),
      [{ displayName: 'Terminal ("rl-tp-012")', description: 'active', isActive: true, boundState: 'not-bound', itemKind: 'bindable' }],
    );

    log('✓ Terminal inline in R-M menu with full description');
  });

  test('[assisted] terminal-picker-013: terminal picker appears inline in R-D destination picker', async () => {
    await createTerminal('rl-tp-013');

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-013');

    await waitForHuman('terminal-picker-013', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-013');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    assert.deepStrictEqual(
      termItems.map(({ label, displayName, description, isActive, boundState, itemKind }) => ({ label, displayName, description, isActive, boundState, itemKind })),
      [{ label: 'Terminal ("rl-tp-013")', displayName: 'Terminal ("rl-tp-013")', description: 'active', isActive: true, boundState: 'not-bound', itemKind: 'bindable' }],
    );

    log('✓ Terminal inline in R-D picker — full fields');
  });

  test('[assisted] bind-to-destination-013: R-D picker shows both overflow items when many terminals and files are open', async () => {
    for (let i = 1; i <= TERMINAL_OVERFLOW_COUNT; i++) {
      await createTerminal(`rl-btd-013-${i}`);
    }

    const tmpFileUris: vscode.Uri[] = [];
    for (let i = 1; i <= FILE_OVERFLOW_THRESHOLD; i++) {
      const uri = createWorkspaceFile(`btd-013-${i}`, `file ${i}\n`);
      tmpFileUris.push(uri);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.One,
        preview: false,
      });
      await settle();
    }

    try {
      const logCapture = getLogCapture();
      logCapture.mark('before-btd-013');

      await waitForHuman('bind-to-destination-013', 'Press Cmd+R Cmd+D, then Escape');

      const lines = logCapture.getLinesSince('before-btd-013');
      const items = extractQuickPickItemsLogged(lines);
      assert.ok(items, 'Expected showQuickPick log entry');

      const moreTerminals = items!.find((i) => i.label === 'More terminals...');
      assert.ok(moreTerminals, 'Expected "More terminals..." overflow item');
      assert.deepStrictEqual(
        { label: moreTerminals!.label, displayName: moreTerminals!.displayName, description: moreTerminals!.description, remainingCount: moreTerminals!.remainingCount, itemKind: moreTerminals!.itemKind },
        { label: 'More terminals...', displayName: 'More terminals...', description: `${TERMINAL_OVERFLOW_COUNT - MAX_INLINE_DEFAULT} more`, remainingCount: TERMINAL_OVERFLOW_COUNT - MAX_INLINE_DEFAULT, itemKind: 'terminal-more' },
      );

      const moreFiles = items!.find(
        (i) => typeof i.label === 'string' && (i.label as string).includes('More files...'),
      );
      assert.ok(moreFiles, 'Expected "More files..." overflow item');
      assert.deepStrictEqual(
        { label: moreFiles!.label, displayName: moreFiles!.displayName, description: moreFiles!.description, remainingCount: moreFiles!.remainingCount, itemKind: moreFiles!.itemKind },
        { label: 'More files...', displayName: 'More files...', description: `${(moreFiles!.remainingCount as number)} more`, remainingCount: moreFiles!.remainingCount, itemKind: 'file-more' },
      );

      log('✓ Both overflow items validated with displayName + itemKind');
    } finally {
      await closeAllEditors();
      cleanupFiles(tmpFileUris);
    }
  });
});
