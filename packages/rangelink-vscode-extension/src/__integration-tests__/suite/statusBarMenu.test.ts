import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_GO_TO_RANGELINK,
  CMD_JUMP_TO_DESTINATION,
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_SHOW_VERSION,
  CMD_UNBIND_DESTINATION,
} from '../../constants/commandIds';
import * as versionInfo from '../../version.json';
import {
  assertCommandsAbsent,
  assertCommandsPresent,
  assertExecuteCommandLogged,
  assertInputBoxLogged,
  assertQuickPickFirstItem,
  assertQuickPickItemsLogged,
  assertQuickPickTrailingItems,
  buildJumpMenuItem,
  getLogCapture,
  MENU_ITEM_GO_TO_LINK,
  MENU_ITEM_SEPARATOR,
  MENU_ITEM_UNBIND,
  MENU_ITEM_UNBOUND,
  MENU_ITEM_VERSION_INFO,
  openAndDismiss,
  parseLogContext,
  standardSuite,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

const APPEARANCE_FN = 'RangeLinkStatusBar.updateStatusBarAppearance';

const findAppearanceLog = (lines: string[]): Record<string, unknown> | undefined => {
  for (let i = lines.length - 1; i >= 0; i--) {
    const jsonStart = lines[i].indexOf('{');
    const jsonEnd = lines[i].lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) continue;
    try {
      const ctx = JSON.parse(lines[i].slice(jsonStart, jsonEnd + 1));
      if (typeof ctx === 'object' && ctx !== null && ctx.fn === APPEARANCE_FN) {
        return ctx as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

standardSuite('R-M Status Bar Menu', (ss) => {
  test('status-bar-menu-002: invoking openStatusBarMenu command opens the R-M menu', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-menu-002');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const lines = logCapture.getLinesSince('before-menu-002');
    assertQuickPickFirstItem(lines, MENU_ITEM_UNBOUND);
    assertCommandsAbsent(lines, CMD_JUMP_TO_DESTINATION);
    assertQuickPickTrailingItems(lines, [
      MENU_ITEM_SEPARATOR,
      MENU_ITEM_GO_TO_LINK,
      MENU_ITEM_VERSION_INFO,
    ]);

    ss.log('✓ Unbound menu: no Jump item, correct structure');
  });

  test('status-bar-menu-003: invoking openStatusBarMenu command opens the R-M menu', async () => {
    const fileUri = ss.createWorkspaceFile('menu-003', 'line 1\nline 2\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-menu-003');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const lines = logCapture.getLinesSince('before-menu-003');
    assertQuickPickFirstItem(lines, MENU_ITEM_UNBOUND);
    assertCommandsAbsent(lines, CMD_JUMP_TO_DESTINATION);
    assertQuickPickTrailingItems(lines, [
      MENU_ITEM_SEPARATOR,
      MENU_ITEM_GO_TO_LINK,
      MENU_ITEM_VERSION_INFO,
    ]);

    ss.log('✓ Direct command menu: no Jump item, correct structure');
  });

  test('status-bar-menu-005: R-M menu shows Jump to Bound Destination when bound', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("rl-menu-test")']);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    await ss.createTerminal('rl-menu-test');

    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-menu-005');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const lines = logCapture.getLinesSince('before-menu-005');
    assertQuickPickItemsLogged(lines, [
      buildJumpMenuItem('→ Terminal ("rl-menu-test")'),
      MENU_ITEM_UNBIND,
      MENU_ITEM_SEPARATOR,
      MENU_ITEM_GO_TO_LINK,
      MENU_ITEM_VERSION_INFO,
    ]);

    ss.log('✓ Bound-state menu items validated via log capture');
  });

  test('[assisted] status-bar-menu-001: status bar item visible with correct text and tooltip', async () => {
    const verdict = await waitForHumanVerdict(
      'status-bar-menu-001',
      'Look at the VS Code status bar (bottom right). Does it show "$(link) RangeLink" with tooltip "RangeLink — no destination bound" on hover? (No destination should be bound at this point.)',
      [
        '1. Locate the RangeLink item in the bottom-right status bar',
        '2. Hover over it to reveal the tooltip',
        'Verdict:',
      ],
    );
    assert.strictEqual(verdict, 'pass', 'Human reported status bar text or tooltip was incorrect');
    ss.log('✓ Status bar item shows correct text and tooltip');
  });

  test('status-bar-menu-006: R-M menu shows destination picker items when no destination is bound', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-006');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const lines = logCapture.getLinesSince('before-006');
    assertQuickPickFirstItem(lines, MENU_ITEM_UNBOUND);
    assertCommandsAbsent(lines, CMD_JUMP_TO_DESTINATION);
    ss.log('✓ Unbound menu shows "choose below" info item and no Jump item');
  });

  test('status-bar-menu-007: R-M menu reflects bound and unbound state', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-sbm-007")',
      '✓ RangeLink: Unbound from Terminal ("rl-sbm-007")',
    ]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });
    await ss.createTerminal('rl-sbm-007');
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-007');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const lines = logCapture.getLinesSince('before-007');
    assertQuickPickItemsLogged(lines, [
      buildJumpMenuItem('→ Terminal ("rl-sbm-007")'),
      MENU_ITEM_UNBIND,
      MENU_ITEM_SEPARATOR,
      MENU_ITEM_GO_TO_LINK,
      MENU_ITEM_VERSION_INFO,
    ]);

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await ss.settle();

    logCapture.mark('after-unbind-007');

    await openAndDismiss(CMD_OPEN_STATUS_BAR_MENU);

    const postLines = logCapture.getLinesSince('after-unbind-007');
    assertQuickPickFirstItem(postLines, MENU_ITEM_UNBOUND);
    assertCommandsAbsent(postLines, CMD_JUMP_TO_DESTINATION);
    assertQuickPickTrailingItems(postLines, [
      MENU_ITEM_SEPARATOR,
      MENU_ITEM_GO_TO_LINK,
      MENU_ITEM_VERSION_INFO,
    ]);
    ss.log('✓ Bound menu showed Jump + Unbind; unbind removed Jump item');
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
    assertCommandsPresent(lines, CMD_GO_TO_RANGELINK);
    assertExecuteCommandLogged(lines, CMD_GO_TO_RANGELINK);
    assertInputBoxLogged(lines, {
      prompt: 'Enter RangeLink to navigate',
      placeHolder: 'recipes/baking/chickenpie.ts#L3C14-L15C9',
    });
    ss.log('✓ R-M menu "Go to Link" dispatched the R-G command and input box was shown');
  });

  test('[assisted] status-bar-menu-009: R-M menu Show Version Info displays version, commit, branch, and build date', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-009');

    const isDirtyIndicator = versionInfo.isDirty ? ' (with uncommitted changes)' : '';
    const expectedVersionMessage = `RangeLink v${versionInfo.version}\nCommit: ${versionInfo.commit}${isDirtyIndicator}\nBranch: ${versionInfo.branch}\nBuild: ${versionInfo.buildDate}`;

    ss.expectModalDialogs([
      {
        level: 'info',
        message: expectedVersionMessage,
        items: ['Copy Commit Hash'],
      },
    ]);

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
    const commandDispatchLog = lines.some((l) => {
      const ctx = parseLogContext(l);
      return ctx?.fn === 'VscodeAdapter.executeCommand' && ctx?.command === CMD_SHOW_VERSION;
    });
    assert.ok(commandDispatchLog, 'Expected command dispatch log for Show Version Info');

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported version info notification was missing fields',
    );
    ss.log(
      '✓ Show Version Info dispatched and notification displayed all required fields (human verified)',
    );
  });

  // Status bar appearance tests (bind/unbind → tooltip + color)

  test('status-bar-appearance-001: status bar appearance updates to bound state after bind', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("rl-sba-001")']);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });
    await ss.createTerminal('rl-sba-001');

    const logCapture = getLogCapture();
    logCapture.mark('before-sba-001');

    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);

    const lines = logCapture.getLinesSince('before-sba-001');
    const entry = findAppearanceLog(lines);
    assert.ok(entry, 'Expected updateStatusBarAppearance log entry after bind');
    assert.deepStrictEqual(entry, {
      fn: 'RangeLinkStatusBar.updateStatusBarAppearance',
      isBound: true,
      destinationName: 'Terminal ("rl-sba-001")',
    });

    ss.log('✓ Status bar appearance log shows isBound:true after bind');
  });

  test('status-bar-appearance-002: status bar appearance updates to unbound state after unbind', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-sba-002")',
      '✓ RangeLink: Unbound from Terminal ("rl-sba-002")',
    ]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });
    await ss.createTerminal('rl-sba-002');

    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);

    const logCapture = getLogCapture();
    logCapture.mark('before-sba-002');

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);

    const lines = logCapture.getLinesSince('before-sba-002');
    const entry = findAppearanceLog(lines);
    assert.ok(entry, 'Expected updateStatusBarAppearance log entry after unbind');
    assert.deepStrictEqual(entry, {
      fn: 'RangeLinkStatusBar.updateStatusBarAppearance',
      isBound: false,
    });

    ss.log('✓ Status bar appearance log shows isBound:false after unbind');
  });

  test('[assisted] status-bar-appearance-003: status bar tooltip and color reflect bind state', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-sba-003")',
      '✓ RangeLink: Unbound from Terminal ("rl-sba-003")',
    ]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });
    const terminalName = 'rl-sba-003';
    await ss.createTerminal(terminalName);

    const verdictUnbound = await waitForHumanVerdict(
      'status-bar-appearance-003',
      'Hover over the R-M status bar item (bottom-right). Does it show "$(link) RangeLink" with tooltip "RangeLink — no destination bound" and no prominent color?',
      [
        '1. Locate the RangeLink item in the bottom-right status bar',
        '2. Hover over it to reveal the tooltip',
        '3. Verify the icon does NOT have a prominent/bright color (it should look default/neutral)',
        'Verdict:',
      ],
    );
    assert.strictEqual(
      verdictUnbound,
      'pass',
      'Human reported unbound tooltip or color was incorrect',
    );

    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    const verdictBound = await waitForHumanVerdict(
      'status-bar-appearance-003',
      `Hover over the R-M status bar item again. Does the tooltip now show "RangeLink — Terminal (\\"${terminalName}\\")" and does the icon have a prominent/bright color?`,
      [
        '1. Hover over the RangeLink status bar item again',
        `2. Verify the tooltip shows "RangeLink — Terminal (\\"${terminalName}\\")"`,
        '3. Verify the icon now has a prominent/bright color (different from the default)',
        'Verdict:',
      ],
    );
    assert.strictEqual(verdictBound, 'pass', 'Human reported bound tooltip or color was incorrect');

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await ss.settle();

    const verdictAfterUnbind = await waitForHumanVerdict(
      'status-bar-appearance-003',
      'Hover over the R-M status bar item one more time. Has the tooltip reverted to "RangeLink — no destination bound" and the color returned to default?',
      [
        '1. Hover over the RangeLink status bar item again',
        '2. Verify the tooltip is back to "RangeLink — no destination bound"',
        '3. Verify the icon color is back to default (no prominent color)',
        'Verdict:',
      ],
    );
    assert.strictEqual(
      verdictAfterUnbind,
      'pass',
      'Human reported tooltip or color was incorrect after unbind',
    );

    ss.log('✓ Status bar tooltip and color correctly reflect bind/unbind state (human verified)');
  });
});
