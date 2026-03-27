import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertQuickPickItemsLogged,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  printAssistedBanner,
  settle,
  TERMINAL_READY_MS,
  waitForHuman,
} from '../helpers';

const SEPARATOR_KIND = -1;

suite('R-M Status Bar Menu', () => {
  const log = createLogger('statusBarMenu');
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
  });

  test('[assisted] status-bar-menu-002: clicking the status bar item opens the R-M menu', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-menu-002');

    await waitForHuman('status-bar-menu-002', 'Click the RangeLink status bar item, then Escape', [
      'Click the $(link) RangeLink item in the bottom-right status bar, then press Escape.',
    ]);

    const lines = logCapture.getLinesSince('before-menu-002');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry with items');
    assert.ok(items!.length >= 4, `Expected at least 4 menu items but got ${items!.length}`);

    assert.deepStrictEqual(
      { label: items![0].label, itemKind: items![0].itemKind },
      { label: 'No bound destination. Choose below to bind:', itemKind: 'info' },
    );

    const lastThree = items!.slice(-3);
    assert.deepStrictEqual(
      lastThree.map(({ label, kind, itemKind }) => ({ label, kind, itemKind })),
      [
        { label: '', kind: SEPARATOR_KIND, itemKind: undefined },
        { label: '$(link-external) Go to Link', kind: undefined, itemKind: 'command' },
        { label: '$(info) Show Version Info', kind: undefined, itemKind: 'command' },
      ],
    );

    log('✓ Unbound menu items validated via log capture');
  });

  test('[assisted] status-bar-menu-003: Cmd+R Cmd+M keybinding opens the R-M menu', async () => {
    const testFileUri = createWorkspaceFile('menu-003', 'line 1\nline 2\n');
    tmpFileUris.push(testFileUri);
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-menu-003');

    await waitForHuman('status-bar-menu-003', 'Press Cmd+R Cmd+M (or Ctrl+R Ctrl+M), then Escape', [
      'A file was opened for editor focus. Press the keybinding, then Escape.',
    ]);

    const lines = logCapture.getLinesSince('before-menu-003');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry with items');
    assert.ok(items!.length >= 4, `Expected at least 4 menu items but got ${items!.length}`);

    assert.deepStrictEqual(
      { label: items![0].label, itemKind: items![0].itemKind },
      { label: 'No bound destination. Choose below to bind:', itemKind: 'info' },
    );

    const lastThree = items!.slice(-3);
    assert.deepStrictEqual(
      lastThree.map(({ label, kind, itemKind }) => ({ label, kind, itemKind })),
      [
        { label: '', kind: SEPARATOR_KIND, itemKind: undefined },
        { label: '$(link-external) Go to Link', kind: undefined, itemKind: 'command' },
        { label: '$(info) Show Version Info', kind: undefined, itemKind: 'command' },
      ],
    );

    log('✓ Keybinding menu items validated via log capture');
  });

  test('[assisted] status-bar-menu-005: R-M menu shows Jump to Bound Destination when bound', async () => {
    const terminal = vscode.window.createTerminal({ name: 'rl-menu-test' });
    terminal.show(true);
    await settle(TERMINAL_READY_MS);

    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();

    try {
      const logCapture = getLogCapture();
      logCapture.mark('before-menu-005');

      await waitForHuman('status-bar-menu-005', 'Open the R-M menu, then Escape', [
        'Terminal "rl-menu-test" is bound. Open the menu and press Escape.',
      ]);

      const lines = logCapture.getLinesSince('before-menu-005');
      assertQuickPickItemsLogged(lines, [
        {
          label: '$(arrow-right) Jump to Bound Destination',
          description: '→ Terminal ("rl-menu-test")',
          itemKind: 'command',
        },
        { label: '$(close) Unbind Destination', itemKind: 'command' },
        { label: '', kind: SEPARATOR_KIND },
        { label: '$(link-external) Go to Link', itemKind: 'command' },
        { label: '$(info) Show Version Info', itemKind: 'command' },
      ]);

      log('✓ Bound-state menu items validated via log capture');
    } finally {
      await vscode.commands.executeCommand('rangelink.unbindDestination');
      terminal.dispose();
    }
  });
});
