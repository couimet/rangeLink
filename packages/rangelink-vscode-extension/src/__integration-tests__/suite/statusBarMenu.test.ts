import * as vscode from 'vscode';

import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  getLogCapture,
  printAssistedBanner,
  settle,
  TERMINAL_READY_MS,
  waitForHuman,
} from '../helpers';

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

    await waitForHuman(
      'status-bar-menu-002',
      'Click the RangeLink status bar item',
      [
        '1. Find the RangeLink status bar item (bottom-right, shows link icon)',
        '2. Click it — a QuickPick titled "RangeLink" should appear',
        '3. Expected menu items (no destination is bound):',
        '     "No bound destination. Choose below to bind:"',
        '     (available terminals and/or files listed below)',
        '     ─── separator ───',
        '     → Go to Link',
        '     ⓘ Show Version Info',
        '4. Verify menu is visible, then press Escape to dismiss',
      ],
      'Expected: QuickPick titled "RangeLink" with "No bound destination. Choose below to bind:" at top, then available destinations, separator, "Go to Link", "Show Version Info". Verify, then Escape.',
    );

    const lines = logCapture.getLinesSince('before-menu-002');
    const menuOpened = lines.some(
      (line) => line.includes('RangeLinkStatusBar.openMenu') && line.includes('User dismissed menu'),
    );
    if (menuOpened) {
      log('✓ Log confirms menu was opened and dismissed');
    }
  });

  test('[assisted] status-bar-menu-003: Cmd+R Cmd+M keybinding opens the R-M menu', async () => {
    const testFileUri = createWorkspaceFile('menu-003', 'line 1\nline 2\n');
    tmpFileUris.push(testFileUri);
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-menu-003');

    await waitForHuman(
      'status-bar-menu-003',
      'Open the R-M menu via keybinding',
      [
        'Setup done: a file was opened automatically to ensure editor focus.',
        '',
        '1. Press Cmd+R then Cmd+M (or Ctrl+R then Ctrl+M)',
        '2. Expected menu items (no destination is bound):',
        '     "No bound destination. Choose below to bind:"',
        '     (available terminals and/or files listed below)',
        '     ─── separator ───',
        '     → Go to Link',
        '     ⓘ Show Version Info',
        '3. Verify menu opens, then press Escape to dismiss',
      ],
      'A file was opened for editor focus. Press Cmd+R Cmd+M (or Ctrl+R Ctrl+M). Expected: same "RangeLink" QuickPick with "No bound destination" at top, destinations, "Go to Link", "Show Version Info". Verify, then Escape.',
    );

    const lines = logCapture.getLinesSince('before-menu-003');
    const menuOpened = lines.some(
      (line) => line.includes('RangeLinkStatusBar.openMenu') && line.includes('User dismissed menu'),
    );
    if (menuOpened) {
      log('✓ Log confirms menu was opened and dismissed via keybinding');
    }
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

      await waitForHuman(
        'status-bar-menu-005',
        'Verify bound-state menu items',
        [
          'Setup done: terminal "rl-menu-test" was bound automatically.',
          '',
          '1. Open the R-M menu (click status bar or Cmd+R Cmd+M)',
          '2. Expected menu items (terminal is bound):',
          '     → Jump to Bound Destination  →  Terminal ("rl-menu-test")',
          '     ✕ Unbind Destination',
          '     ─── separator ───',
          '     → Go to Link',
          '     ⓘ Show Version Info',
          '3. Verify both bound-state items are present, then Escape to dismiss',
        ],
        'Terminal "rl-menu-test" already bound. Expected: "→ Jump to Bound Destination → Terminal (rl-menu-test)", "✕ Unbind Destination", separator, "Go to Link", "Show Version Info". Verify, then Escape.',
      );

      const lines = logCapture.getLinesSince('before-menu-005');
      const menuOpened = lines.some(
        (line) =>
          line.includes('RangeLinkStatusBar.openMenu') && line.includes('User dismissed menu'),
      );
      if (menuOpened) {
        log('✓ Log confirms menu was opened and dismissed');
      }
    } finally {
      await vscode.commands.executeCommand('rangelink.unbindDestination');
      terminal.dispose();
    }
  });
});
