import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_OPEN_STATUS_BAR_MENU,
} from '../../constants/commandIds';
import {
  assertQuickPickItemsLogged,
  cleanupFiles,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  openAndDismiss,
  settle,
  standardSuite,
  TERMINAL_READY_MS,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

const SEPARATOR_KIND = -1;

standardSuite('R-M Status Bar Menu', (log) => {
  const tmpFileUris: vscode.Uri[] = [];

  suiteTeardown(async () => {
    cleanupFiles(tmpFileUris);
  });

  test('status-bar-menu-002: invoking openStatusBarMenu command opens the R-M menu', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-menu-002');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const lines = logCapture.getLinesSince('before-menu-002');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry with items');

    assert.deepStrictEqual(
      { label: items![0].label, itemKind: items![0].itemKind },
      { label: 'No bound destination. Choose below to bind:', itemKind: 'info' },
    );

    assert.strictEqual(
      items!.find((i) => i.label === '$(arrow-right) Jump to Bound Destination'),
      undefined,
      'Expected no Jump item in unbound state',
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

    log('✓ Unbound menu: no Jump item, correct structure');
  });

  test('status-bar-menu-003: invoking openStatusBarMenu command opens the R-M menu', async () => {
    const testFileUri = createWorkspaceFile('menu-003', 'line 1\nline 2\n');
    tmpFileUris.push(testFileUri);
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-menu-003');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const lines = logCapture.getLinesSince('before-menu-003');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry with items');

    assert.deepStrictEqual(
      { label: items![0].label, itemKind: items![0].itemKind },
      { label: 'No bound destination. Choose below to bind:', itemKind: 'info' },
    );

    assert.strictEqual(
      items!.find((i) => i.label === '$(arrow-right) Jump to Bound Destination'),
      undefined,
      'Expected no Jump item in unbound state',
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

    log('✓ Direct command menu: no Jump item, correct structure');
  });

  test('status-bar-menu-005: R-M menu shows Jump to Bound Destination when bound', async () => {
    const terminal = vscode.window.createTerminal({ name: 'rl-menu-test' });
    terminal.show(true);
    await settle(TERMINAL_READY_MS);

    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
    await settle();

    try {
      const logCapture = getLogCapture();
      logCapture.mark('before-menu-005');

      await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

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
      terminal.dispose();
    }
  });

  test('[assisted] status-bar-menu-001: status bar item visible with correct text and tooltip', async () => {
    const verdict = await waitForHumanVerdict(
      'status-bar-menu-001',
      'Look at the VS Code status bar (bottom right). Does it show "$(link) RangeLink" with tooltip "RangeLink Menu" on hover?',
      [
        '1. Locate the RangeLink item in the bottom-right status bar',
        '2. Hover over it to reveal the tooltip',
        '3. Click PASS if it shows "$(link) RangeLink" with tooltip "RangeLink Menu"',
        '   Click FAIL if the text or tooltip is wrong, or the item is missing',
      ],
    );
    assert.strictEqual(verdict, 'pass', 'Human reported status bar text or tooltip was incorrect');
    log('✓ Status bar item shows correct text and tooltip');
  });

  test('status-bar-menu-006: R-M menu shows destination picker items when no destination is bound', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-006');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const lines = logCapture.getLinesSince('before-006');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry with items');
    assert.deepStrictEqual(
      { label: items![0].label, itemKind: items![0].itemKind },
      { label: 'No bound destination. Choose below to bind:', itemKind: 'info' },
    );
    assert.strictEqual(
      items!.find((i) => i.label === '$(arrow-right) Jump to Bound Destination'),
      undefined,
      'Expected no Jump item in unbound state',
    );
    log('✓ Unbound menu shows "choose below" info item and no Jump item');
  });

  test('[assisted] status-bar-menu-007: R-M menu Unbind Destination item unbinds the destination when selected', async () => {
    const terminal = vscode.window.createTerminal({ name: 'rl-sbm-007' });
    terminal.show(true);
    await settle(TERMINAL_READY_MS);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();

    try {
      const logCapture = getLogCapture();
      logCapture.mark('before-007');

      await waitForHuman(
        'status-bar-menu-007',
        'Destination is bound to "rl-sbm-007". Open the R-M menu (Cmd+R Cmd+M), verify Jump and Unbind are present, select "$(close) Unbind Destination", then click Cancel.',
        [
          '1. Press Cmd+R Cmd+M to open the R-M menu',
          '2. Confirm "$(arrow-right) Jump to Bound Destination" shows "rl-sbm-007"',
          '3. Confirm "$(close) Unbind Destination" is visible',
          '4. Select "$(close) Unbind Destination"',
          '5. Click Cancel on this notification',
        ],
      );

      const lines = logCapture.getLinesSince('before-007');
      const items = extractQuickPickItemsLogged(lines);
      assert.ok(items, 'Expected showQuickPick log entry with items');
      assert.ok(
        items!.find((i) => i.label === '$(arrow-right) Jump to Bound Destination'),
        'Expected Jump item present in bound state',
      );
      assert.ok(
        items!.find((i) => i.label === '$(close) Unbind Destination'),
        'Expected Unbind item present in bound state',
      );
      const commandSelectedLog = lines.find(
        (l) => l.includes('Command item selected') && l.includes('Unbind Destination'),
      );
      assert.ok(commandSelectedLog, 'Expected "Command item selected" log for Unbind Destination');

      logCapture.mark('after-unbind-007');
      await waitForHuman(
        'status-bar-menu-007',
        'Re-open the R-M menu (Cmd+R Cmd+M), verify "Jump to Bound Destination" is gone, then press Escape and click Cancel.',
        [
          '1. Press Cmd+R Cmd+M to open the R-M menu',
          '2. Confirm "$(arrow-right) Jump to Bound Destination" is NOT present',
          '3. Press Escape to dismiss, then click Cancel',
        ],
      );

      const postLines = logCapture.getLinesSince('after-unbind-007');
      const postItems = extractQuickPickItemsLogged(postLines);
      assert.ok(postItems, 'Expected post-unbind showQuickPick log entry with items');
      assert.strictEqual(
        postItems!.find((i) => i.label === '$(arrow-right) Jump to Bound Destination'),
        undefined,
        'Expected no Jump item after unbind',
      );
      log(
        '✓ Bound menu showed Jump + Unbind; human selected Unbind; post-unbind menu confirmed Jump absent',
      );
    } finally {
      terminal.dispose();
    }
  });

  test('[assisted] status-bar-menu-008: R-M menu Go to Link item opens the R-G input box', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-008');

    await waitForHuman(
      'status-bar-menu-008',
      'Open the R-M menu (Cmd+R Cmd+M), select "$(link-external) Go to Link", dismiss the R-G input box (Escape), then click Cancel.',
      [
        '1. Press Cmd+R Cmd+M to open the R-M menu',
        '2. Select "$(link-external) Go to Link"',
        '3. The R-G input box opens — press Escape to dismiss it',
        '4. Click Cancel on this notification',
      ],
    );

    const lines = logCapture.getLinesSince('before-008');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry with items');
    assert.ok(
      items!.find((i) => i.label === '$(link-external) Go to Link'),
      'Expected "Go to Link" item in menu',
    );
    const commandSelectedLog = lines.find(
      (l) => l.includes('Command item selected') && l.includes('Go to Link'),
    );
    assert.ok(commandSelectedLog, 'Expected "Command item selected" log for Go to Link');
    const inputBoxLog = lines.find(
      (l) => l.includes('GoToRangeLinkCommand.execute') && l.includes('Showing input box'),
    );
    assert.ok(inputBoxLog, 'Expected GoToRangeLinkCommand to log input box presentation');
    log('✓ R-M menu "Go to Link" dispatched the R-G command and input box was shown');
  });

  test('[assisted] status-bar-menu-009: R-M menu Show Version Info displays version, commit, branch, and build date', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-009');

    const verdict = await waitForHumanVerdict(
      'status-bar-menu-009',
      'Open the R-M menu (Cmd+R Cmd+M), select "$(info) Show Version Info", read the notification. Does it show the version, a short commit SHA, a branch name, and a build date?',
      [
        '1. Press Cmd+R Cmd+M to open the R-M menu',
        '2. Select "$(info) Show Version Info"',
        '3. Read the notification — verify it contains:',
        '   • Extension version (e.g. 1.1.0)',
        '   • Short commit SHA (e.g. abc1234)',
        '   • Branch name (e.g. main or issues/509-block7)',
        '   • Build date',
        '4. Dismiss the notification, then click PASS or FAIL',
      ],
    );

    const lines = logCapture.getLinesSince('before-009');
    // "Executing command" is logged by VscodeAdapter before awaiting ShowVersionCommand.execute(),
    // so it lands in the capture regardless of when the human dismisses the version notification.
    const commandDispatchLog = lines.find(
      (l) => l.includes('Executing command') && l.includes('rangelink.showVersion'),
    );
    assert.ok(commandDispatchLog, 'Expected command dispatch log for Show Version Info');

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported version info notification was missing fields',
    );
    log(
      '✓ Show Version Info dispatched and notification displayed all required fields (human verified)',
    );
  });
});
