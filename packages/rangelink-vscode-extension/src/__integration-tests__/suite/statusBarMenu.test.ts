import * as vscode from 'vscode';

import {
  activateExtension,
  createAndBindTerminal,
  getLogCapture,
  printAssistedBanner,
  settle,
  waitForHuman,
} from '../helpers';

suite('R-M Status Bar Menu', () => {
  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  test('[assisted] status-bar-menu-002: clicking the status bar item opens the R-M menu', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-menu-002');

    await waitForHuman(
      'Click the $(link) RangeLink item in the status bar, verify the QuickPick menu opens, then dismiss it',
    );

    const lines = logCapture.getLinesSince('before-menu-002');
    const menuOpened = lines.some(
      (line) => line.includes('RangeLinkStatusBar.openMenu') && line.includes('User dismissed menu'),
    );
    if (menuOpened) {
      // eslint-disable-next-line no-console
      console.log('  ✓ Log confirms menu was opened and dismissed');
    }
  });

  test('[assisted] status-bar-menu-003: Cmd+R Cmd+M keybinding opens the R-M menu', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-menu-003');

    await waitForHuman(
      'Press Cmd+R Cmd+M (or Ctrl+R Ctrl+M) to open the RangeLink menu, verify it opens, then dismiss it',
    );

    const lines = logCapture.getLinesSince('before-menu-003');
    const menuOpened = lines.some(
      (line) => line.includes('RangeLinkStatusBar.openMenu') && line.includes('User dismissed menu'),
    );
    if (menuOpened) {
      // eslint-disable-next-line no-console
      console.log('  ✓ Log confirms menu was opened and dismissed via keybinding');
    }
  });

  test('[assisted] status-bar-menu-005: R-M menu shows Jump to Bound Destination when bound', async () => {
    const terminal = vscode.window.createTerminal({ name: 'rl-menu-test' });
    terminal.show(true);
    await settle();

    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();

    try {
      const logCapture = getLogCapture();
      logCapture.mark('before-menu-005');

      await waitForHuman(
        'Open the R-M menu and verify "Jump to Bound Destination" with terminal name is visible, then dismiss the menu',
        [
          'Expected: "Jump to Bound Destination" item with "→ rl-menu-test" description',
          'Expected: "Unbind Destination" item is also visible',
        ],
      );

      const lines = logCapture.getLinesSince('before-menu-005');
      const menuOpened = lines.some(
        (line) =>
          line.includes('RangeLinkStatusBar.openMenu') && line.includes('User dismissed menu'),
      );
      if (menuOpened) {
        // eslint-disable-next-line no-console
        console.log('  ✓ Log confirms menu was opened and dismissed');
      }
    } finally {
      await vscode.commands.executeCommand('rangelink.unbindDestination');
      terminal.dispose();
    }
  });
});
