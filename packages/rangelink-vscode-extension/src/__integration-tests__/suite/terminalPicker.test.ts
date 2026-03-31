import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createTerminal,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  findTerminalItems,
  getLogCapture,
  loadSettingsProfile,
  parseQuickPickItemsFromLogLine,
  printAssistedBanner,
  resetRangelinkSettings,
  settle,
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

  test('[assisted] terminal-picker-001: active terminal is marked with active badge', async () => {
    const t1 = await createTerminal('rl-tp-001-a', terminals);
    await createTerminal('rl-tp-001-b', terminals);
    t1.show(true);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-001');

    await waitForHuman('terminal-picker-001', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-001');
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
          label: 'Terminal ("rl-tp-001-a")',
          displayName: 'Terminal ("rl-tp-001-a")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
        {
          label: 'Terminal ("rl-tp-001-b")',
          displayName: 'Terminal ("rl-tp-001-b")',
          description: undefined,
          isActive: false,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Active terminal: all 6 fields. Non-active: no badge, no isActive');
  });

  test('[assisted] terminal-picker-002: bound terminal is marked with bound badge', async () => {
    await createTerminal('rl-tp-002', terminals);
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    const t2 = await createTerminal('rl-tp-002-other', terminals);
    t2.show(true);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-002');

    await waitForHuman('terminal-picker-002', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-002');
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
          label: 'Terminal ("rl-tp-002")',
          displayName: 'Terminal ("rl-tp-002")',
          description: 'bound',
          isActive: false,
          boundState: 'bound',
          itemKind: 'bindable',
        },
        {
          label: 'Terminal ("rl-tp-002-other")',
          displayName: 'Terminal ("rl-tp-002-other")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Bound first (all 6 fields), active other second');
  });

  test('[assisted] terminal-picker-003: terminal that is both active and bound shows dual badge', async () => {
    const t = await createTerminal('rl-tp-003', terminals);
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
          label: 'Terminal ("rl-tp-003")',
          displayName: 'Terminal ("rl-tp-003")',
          description: 'bound · active',
          isActive: true,
          boundState: 'bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Dual badge: all 6 fields validated');
  });

  test('[assisted] terminal-picker-004: bound terminal always appears first in the list', async () => {
    await createTerminal('rl-tp-004-b', terminals);
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    await createTerminal('rl-tp-004-a', terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-004');

    await waitForHuman('terminal-picker-004', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-004');
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
          label: 'Terminal ("rl-tp-004-b")',
          displayName: 'Terminal ("rl-tp-004-b")',
          description: 'bound',
          isActive: false,
          boundState: 'bound',
          itemKind: 'bindable',
        },
        {
          label: 'Terminal ("rl-tp-004-a")',
          displayName: 'Terminal ("rl-tp-004-a")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Bound terminal first — all 6 fields');
  });

  test('[assisted] terminal-picker-005: active non-bound terminal appears second', async () => {
    await createTerminal('rl-tp-005-a', terminals);
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();
    const t2 = await createTerminal('rl-tp-005-b', terminals);
    t2.show(true);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-005');

    await waitForHuman('terminal-picker-005', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-005');
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
          label: 'Terminal ("rl-tp-005-a")',
          displayName: 'Terminal ("rl-tp-005-a")',
          description: 'bound',
          isActive: false,
          boundState: 'bound',
          itemKind: 'bindable',
        },
        {
          label: 'Terminal ("rl-tp-005-b")',
          displayName: 'Terminal ("rl-tp-005-b")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Bound first, active second — all 6 fields');
  });

  test('[assisted] terminal-picker-006: hidden IDE terminals are absent from the picker', async () => {
    await createTerminal('rl-tp-006', terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-006');

    await waitForHuman('terminal-picker-006', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-006');
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
          label: 'Terminal ("rl-tp-006")',
          displayName: 'Terminal ("rl-tp-006")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Only the test terminal appears — full field validation');
  });

  test('[assisted] terminal-picker-007: all terminals shown inline when within maxInline limit', async () => {
    await createTerminal('rl-tp-007-a', terminals);
    await createTerminal('rl-tp-007-b', terminals);

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
          label: 'Terminal ("rl-tp-007-b")',
          displayName: 'Terminal ("rl-tp-007-b")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
        {
          label: 'Terminal ("rl-tp-007-a")',
          displayName: 'Terminal ("rl-tp-007-a")',
          description: undefined,
          isActive: false,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Both terminals inline, full field validation');
  });

  test('[assisted] terminal-picker-008: overflow shows "More terminals..." when exceeding maxInline', async () => {
    for (let i = 1; i <= TERMINAL_OVERFLOW_COUNT; i++) {
      await createTerminal(`rl-tp-008-${i}`, terminals);
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
      {
        label: moreItem!.label,
        displayName: moreItem!.displayName,
        description: moreItem!.description,
        remainingCount: moreItem!.remainingCount,
        itemKind: moreItem!.itemKind,
      },
      {
        label: 'More terminals...',
        displayName: 'More terminals...',
        description: `${TERMINAL_OVERFLOW_COUNT - MAX_INLINE_DEFAULT} more`,
        remainingCount: TERMINAL_OVERFLOW_COUNT - MAX_INLINE_DEFAULT,
        itemKind: 'terminal-more',
      },
    );

    const termItems = findTerminalItems(items!);
    assert.strictEqual(
      termItems.length,
      MAX_INLINE_DEFAULT,
      `Expected ${MAX_INLINE_DEFAULT} inline items`,
    );
    const activeInline = termItems.find((i) => i.isActive === true);
    assert.ok(activeInline, 'Expected one active terminal in inline items');
    assert.deepStrictEqual(
      {
        label: activeInline!.label,
        description: activeInline!.description,
        isActive: activeInline!.isActive,
        boundState: activeInline!.boundState,
        itemKind: activeInline!.itemKind,
      },
      {
        label: `Terminal ("rl-tp-008-${TERMINAL_OVERFLOW_COUNT}")`,
        description: 'active',
        isActive: true,
        boundState: 'not-bound',
        itemKind: 'bindable',
      },
    );

    log('✓ Overflow item + active inline terminal fully validated');
  });

  test('[assisted] terminal-picker-009: selecting "More terminals..." opens secondary full picker', async () => {
    for (let i = 1; i <= TERMINAL_OVERFLOW_COUNT; i++) {
      await createTerminal(`rl-tp-009-${i}`, terminals);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-009');

    await waitForHuman(
      'terminal-picker-009',
      'Cmd+R Cmd+D → "More terminals..." → Escape → Escape again',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Click "More terminals..."',
        '3. Escape the secondary picker (parent reopens)',
        '4. Escape the parent picker',
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
    assert.strictEqual(secondaryTerminals.length, TERMINAL_OVERFLOW_COUNT);

    const activeSecondary = secondaryTerminals.find((i) => i.isActive === true);
    assert.ok(activeSecondary, 'Expected one active terminal in secondary picker');
    assert.deepStrictEqual(
      {
        label: activeSecondary!.label,
        description: activeSecondary!.description,
        isActive: activeSecondary!.isActive,
        boundState: activeSecondary!.boundState,
        itemKind: activeSecondary!.itemKind,
      },
      {
        label: `rl-tp-009-${TERMINAL_OVERFLOW_COUNT}`,
        description: 'active',
        isActive: true,
        boundState: 'not-bound',
        itemKind: 'bindable',
      },
    );

    const nonActiveSecondary = secondaryTerminals.find((i) => i.label === 'rl-tp-009-1');
    assert.ok(nonActiveSecondary, 'Expected rl-tp-009-1 in secondary picker');
    assert.deepStrictEqual(
      {
        description: nonActiveSecondary!.description,
        isActive: nonActiveSecondary!.isActive,
        boundState: nonActiveSecondary!.boundState,
        itemKind: nonActiveSecondary!.itemKind,
      },
      { description: undefined, isActive: false, boundState: 'not-bound', itemKind: 'bindable' },
    );

    log('✓ Secondary picker: all terminals + active/non-active field validation');
  });

  test('[assisted] terminal-picker-010: escaping secondary picker returns to parent destination picker', async () => {
    for (let i = 1; i <= TERMINAL_OVERFLOW_COUNT; i++) {
      await createTerminal(`rl-tp-010-${i}`, terminals);
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

    const mapFields = (i: Record<string, unknown>) => ({
      label: i.label,
      displayName: i.displayName,
      description: i.description,
      itemKind: i.itemKind,
    });
    assert.deepStrictEqual(reopenedItems.map(mapFields), firstItems.map(mapFields));

    log('✓ Parent picker reopened with identical items');
  });

  test('[assisted] terminal-picker-011: maxInline setting changes overflow threshold', async () => {
    await loadSettingsProfile('terminal-picker-low');
    const LOW_MAX_INLINE = 2;
    const TC_TERMINAL_COUNT = 3;

    try {
      for (let i = 1; i <= TC_TERMINAL_COUNT; i++) {
        await createTerminal(`rl-tp-011-${i}`, terminals);
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
        {
          label: moreItem!.label,
          displayName: moreItem!.displayName,
          description: moreItem!.description,
          remainingCount: moreItem!.remainingCount,
          itemKind: moreItem!.itemKind,
        },
        {
          label: 'More terminals...',
          displayName: 'More terminals...',
          description: `${TC_TERMINAL_COUNT - LOW_MAX_INLINE} more`,
          remainingCount: TC_TERMINAL_COUNT - LOW_MAX_INLINE,
          itemKind: 'terminal-more',
        },
      );

      const termItems = findTerminalItems(items!);
      assert.strictEqual(
        termItems.length,
        LOW_MAX_INLINE,
        `Expected ${LOW_MAX_INLINE} inline items`,
      );
      const activeInline = termItems.find((i) => i.isActive === true);
      assert.ok(activeInline, 'Expected one active terminal in inline items');
      assert.deepStrictEqual(
        {
          label: activeInline!.label,
          description: activeInline!.description,
          isActive: activeInline!.isActive,
          boundState: activeInline!.boundState,
          itemKind: activeInline!.itemKind,
        },
        {
          label: `Terminal ("rl-tp-011-${TC_TERMINAL_COUNT}")`,
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      );

      log('✓ maxInline=2: overflow + active inline terminal fully validated');
    } finally {
      await resetRangelinkSettings();
    }
  });

  test('[assisted] terminal-picker-012: terminal picker appears inline in R-M menu when unbound', async () => {
    await createTerminal('rl-tp-012', terminals);

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
          label: '    $(arrow-right) Terminal ("rl-tp-012")',
          displayName: 'Terminal ("rl-tp-012")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Terminal inline in R-M menu with full description');
  });

  test('[assisted] terminal-picker-013: terminal picker appears inline in R-D destination picker', async () => {
    await createTerminal('rl-tp-013', terminals);

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-013');

    await waitForHuman('terminal-picker-013', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-013');
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
          label: 'Terminal ("rl-tp-013")',
          displayName: 'Terminal ("rl-tp-013")',
          description: 'active',
          isActive: true,
          boundState: 'not-bound',
          itemKind: 'bindable',
        },
      ],
    );

    log('✓ Terminal inline in R-D picker — full fields');
  });

  test('[assisted] bind-to-destination-013: R-D picker shows both overflow items when many terminals and files are open', async () => {
    for (let i = 1; i <= TERMINAL_OVERFLOW_COUNT; i++) {
      await createTerminal(`rl-btd-013-${i}`, terminals);
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
        {
          label: moreTerminals!.label,
          displayName: moreTerminals!.displayName,
          description: moreTerminals!.description,
          remainingCount: moreTerminals!.remainingCount,
          itemKind: moreTerminals!.itemKind,
        },
        {
          label: 'More terminals...',
          displayName: 'More terminals...',
          description: `${TERMINAL_OVERFLOW_COUNT - MAX_INLINE_DEFAULT} more`,
          remainingCount: TERMINAL_OVERFLOW_COUNT - MAX_INLINE_DEFAULT,
          itemKind: 'terminal-more',
        },
      );

      const moreFiles = items!.find(
        (i) => typeof i.label === 'string' && (i.label as string).includes('More files...'),
      );
      assert.ok(moreFiles, 'Expected "More files..." overflow item');
      assert.deepStrictEqual(
        {
          label: moreFiles!.label,
          displayName: moreFiles!.displayName,
          description: moreFiles!.description,
          remainingCount: moreFiles!.remainingCount,
          itemKind: moreFiles!.itemKind,
        },
        {
          label: 'More files...',
          displayName: 'More files...',
          description: `${FILE_OVERFLOW_THRESHOLD - 1} more`,
          remainingCount: FILE_OVERFLOW_THRESHOLD - 1,
          itemKind: 'file-more',
        },
      );

      const activeTerminal = findTerminalItems(items!).find((i) => i.isActive === true);
      assert.ok(activeTerminal, 'Expected one active terminal in inline items');
      assert.strictEqual(activeTerminal!.boundState, 'not-bound');

      log('✓ Both overflow items + active inline terminal validated');
    } finally {
      await closeAllEditors();
      cleanupFiles(tmpFileUris);
    }
  });
});
