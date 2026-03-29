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
  printAssistedBanner,
  resetRangelinkSettings,
  settle,
  TERMINAL_READY_MS,
  waitForHuman,
} from '../helpers';

const SEPARATOR_KIND = -1;

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
    assert.strictEqual(activeItem!.description, 'active');

    log('✓ Active terminal badge validated');
  });

  test('[assisted] terminal-picker-002: bound terminal is marked with bound badge', async () => {
    await createTerminal('rl-tp-002');
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-tp-002');

    await waitForHuman('terminal-picker-002', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-tp-002');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const termItems = findTerminalItems(items!);
    const boundItem = termItems.find((i) => (i.label as string).includes('rl-tp-002'));
    assert.ok(boundItem, 'Expected to find terminal rl-tp-002');
    assert.ok(
      typeof boundItem!.description === 'string' &&
        (boundItem!.description as string).includes('bound'),
      `Expected description to include "bound" but got "${boundItem!.description}"`,
    );

    log('✓ Bound terminal badge validated');
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
    assert.strictEqual(dualItem!.description, 'bound · active');

    log('✓ Dual bound · active badge validated');
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
    assert.ok(
      termItems.length >= 2,
      `Expected at least 2 terminal items but got ${termItems.length}`,
    );

    const firstTermLabel = termItems[0].label as string;
    assert.ok(
      firstTermLabel.includes('rl-tp-004-b'),
      `Expected bound terminal first but got "${firstTermLabel}"`,
    );

    log('✓ Bound terminal appears first validated');
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
    assert.ok(
      termItems.length >= 2,
      `Expected at least 2 terminal items but got ${termItems.length}`,
    );

    const firstLabel = termItems[0].label as string;
    const secondLabel = termItems[1].label as string;
    assert.ok(
      firstLabel.includes('rl-tp-005-a'),
      `Expected bound terminal first but got "${firstLabel}"`,
    );
    assert.ok(
      secondLabel.includes('rl-tp-005-b'),
      `Expected active terminal second but got "${secondLabel}"`,
    );

    log('✓ Active non-bound terminal appears second validated');
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
    for (const item of termItems) {
      const label = item.label as string;
      assert.ok(
        label.includes('rl-tp-006'),
        `Expected only test terminals but found unexpected item: "${label}"`,
      );
    }

    log('✓ Only explicitly created test terminals appear');
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

    const moreItem = items!.find((i) => i.label === 'More terminals...');
    assert.strictEqual(moreItem, undefined, 'Expected no "More terminals..." overflow item');

    const termItems = findTerminalItems(items!);
    assert.ok(
      termItems.length >= 2,
      `Expected at least 2 terminal items but got ${termItems.length}`,
    );

    log('✓ All terminals shown inline without overflow');
  });

  test('[assisted] terminal-picker-008: overflow shows "More terminals..." when exceeding maxInline', async () => {
    for (let i = 1; i <= 6; i++) {
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
    assert.ok(
      typeof moreItem!.description === 'string' &&
        (moreItem!.description as string).includes('more'),
      `Expected "N more" description but got "${moreItem!.description}"`,
    );

    log('✓ Overflow "More terminals..." item validated');
  });

  test('[assisted] terminal-picker-009: selecting "More terminals..." opens secondary full picker', async () => {
    for (let i = 1; i <= 6; i++) {
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
    assert.ok(
      quickPickEntries.length >= 2,
      `Expected at least 2 showQuickPick log entries (primary + secondary) but got ${quickPickEntries.length}`,
    );

    log('✓ Secondary terminal picker opened after "More terminals..."');
  });

  test('[assisted] terminal-picker-010: escaping secondary picker returns to parent destination picker', async () => {
    for (let i = 1; i <= 6; i++) {
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
    assert.ok(
      quickPickEntries.length >= 3,
      `Expected at least 3 showQuickPick entries (primary → secondary → primary reopened) but got ${quickPickEntries.length}`,
    );

    log('✓ Escape from secondary picker returns to parent');
  });

  test('[assisted] terminal-picker-011: maxInline setting changes overflow threshold', async () => {
    await loadSettingsProfile('terminal-picker-low');

    try {
      for (let i = 1; i <= 3; i++) {
        await createTerminal(`rl-tp-011-${i}`);
      }

      const logCapture = getLogCapture();
      logCapture.mark('before-tp-011');

      await waitForHuman('terminal-picker-011', 'Press Cmd+R Cmd+D, then Escape');

      const lines = logCapture.getLinesSince('before-tp-011');
      const items = extractQuickPickItemsLogged(lines);
      assert.ok(items, 'Expected showQuickPick log entry');

      const moreItem = items!.find((i) => i.label === 'More terminals...');
      assert.ok(moreItem, 'Expected "More terminals..." overflow item with maxInline=2');

      const termItems = findTerminalItems(items!);
      assert.ok(
        termItems.length <= 2,
        `Expected at most 2 inline terminal items (maxInline=2) but got ${termItems.length}`,
      );

      log('✓ maxInline=2 overflow threshold validated');
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
    assert.ok(
      termItems.some((i) => (i.label as string).includes('rl-tp-012')),
      'Expected test terminal to appear inline in R-M menu',
    );

    log('✓ Terminal appears inline in R-M menu');
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
    assert.ok(
      termItems.some((i) => (i.label as string).includes('rl-tp-013')),
      'Expected test terminal to appear in R-D destination picker',
    );

    log('✓ Terminal appears inline in R-D picker');
  });

  test('[assisted] bind-to-destination-013: R-D picker shows both overflow items when many terminals and files are open', async () => {
    for (let i = 1; i <= 6; i++) {
      await createTerminal(`rl-btd-013-${i}`);
    }

    const tmpFileUris: vscode.Uri[] = [];
    for (let i = 1; i <= 5; i++) {
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

      const moreTerminals = items!.find(
        (i) => typeof i.label === 'string' && (i.label as string).includes('More terminals...'),
      );
      assert.ok(moreTerminals, 'Expected "More terminals..." overflow item');

      const moreFiles = items!.find(
        (i) => typeof i.label === 'string' && (i.label as string).includes('More files...'),
      );
      assert.ok(moreFiles, 'Expected "More files..." overflow item');

      log('✓ Both overflow items validated in R-D picker');
    } finally {
      await closeAllEditors();
      cleanupFiles(tmpFileUris);
    }
  });
});
