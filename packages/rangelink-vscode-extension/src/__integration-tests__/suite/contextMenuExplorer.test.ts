import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_BIND_TO_TERMINAL_HERE } from '../../constants/commandIds';
import {
  assertClipboardWriteLogged,
  assertFilePathLogged,
  assertTerminalBufferEquals,
  getLogCapture,
  standardSuite,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

const FILE_CONTENT = 'explorer context-menu test file\n';

standardSuite('Context Menus — Explorer', (ss) => {
  test('[assisted] context-menus-explorer-001: Explorer "Send File Path" sends absolute path to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-exp-001', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-exp-001';
    const capturing = await ss.createCapturingTerminal(terminalName);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-exp-001")',
      '✓ RangeLink: File path sent to Terminal ("rl-ctxmenu-exp-001")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-exp-001');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-explorer-001',
      `Right-click "${fn}" in Explorer → "RangeLink: Send File Path"`,
      [
        `1. Locate "${fn}" in the Explorer panel`,
        '2. Right-click it',
        '3. Select "RangeLink: Send File Path"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-exp-001');

    assertFilePathLogged(lines, {
      pathFormat: 'absolute',
      uriSource: 'context-menu',
      filePath: uri.fsPath,
    });
    const expectedPath = ` ${uri.fsPath} `;
    assertClipboardWriteLogged(lines, { textLength: expectedPath.length });
    assertTerminalBufferEquals(capturing.getCapturedText(), expectedPath);

    ss.log('✓ Absolute path landed in bound terminal buffer (pty capture verified content)');
  });

  test('[assisted] context-menus-explorer-002: Explorer "Send Relative File Path" sends relative path to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-exp-002', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    const terminalName = 'rl-ctxmenu-exp-002';
    const capturing = await ss.createCapturingTerminal(terminalName);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-exp-002")',
      '✓ RangeLink: File path sent to Terminal ("rl-ctxmenu-exp-002")',
    ]);
    ss.expectContextKeys({
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
      'rangelink.isBound': true,
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-exp-002');
    capturing.clearCaptured();

    await waitForHuman(
      'context-menus-explorer-002',
      `Right-click "${fn}" in Explorer → "RangeLink: Send Relative File Path"`,
      [
        `1. Locate "${fn}" in the Explorer panel`,
        '2. Right-click it',
        '3. Select "RangeLink: Send Relative File Path"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-exp-002');

    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'context-menu',
      filePath: relativePath,
    });
    const expectedPath = ` ${relativePath} `;
    assertClipboardWriteLogged(lines, { textLength: expectedPath.length });
    assertTerminalBufferEquals(capturing.getCapturedText(), expectedPath);

    ss.log(
      '✓ Workspace-relative path landed in bound terminal buffer (pty capture verified content)',
    );
  });

  test('[assisted] context-menus-explorer-003: Explorer "Bind Here" opens the file and binds it as text editor destination', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-exp-003', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);
    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${fn}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-exp-003');

    await waitForHuman(
      'context-menus-explorer-003',
      `Right-click "${fn}" in Explorer → "RangeLink: Bind Here"`,
      [
        `1. Locate "${fn}" in the Explorer panel`,
        '2. Right-click it',
        '3. Select "RangeLink: Bind Here"',
      ],
    );

    ss.log('✓ Explorer "Bind Here" committed a text-editor binding with correct displayName');
  });

  test('[assisted] context-menus-explorer-004: Explorer "Unbind" is visible when bound and unbinds on click', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-exp-004', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-exp-004';
    await ss.createTerminal(terminalName);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-exp-004")',
      '✓ RangeLink: Unbound from Terminal ("rl-ctxmenu-exp-004")',
    ]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-exp-004');

    await waitForHuman(
      'context-menus-explorer-004',
      `Right-click "${fn}" in Explorer → "RangeLink: Unbind"`,
      [
        `1. Locate "${fn}" in the Explorer panel`,
        '2. Right-click it',
        '3. Verify "RangeLink: Unbind" IS present in the menu',
        '4. Select "RangeLink: Unbind"',
      ],
    );

    ss.log('✓ Explorer "Unbind" fired the unbind path; context key flipped to false');
  });

  test('[assisted] context-menus-explorer-005: Explorer "Unbind" is hidden when no destination is bound', async () => {
    ss.expectStatusBarMessages([]);

    const uri = await ss.createAndOpenFile('ctxmenu-exp-005', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-exp-005');

    const verdict = await waitForHumanVerdict(
      'context-menus-explorer-005',
      `Right-click "${fn}" in Explorer — is "RangeLink: Unbind" ABSENT from the menu?`,
      [
        `1. Locate "${fn}" in the Explorer panel`,
        '2. Right-click it',
        '3. Click Pass if "RangeLink: Unbind" is NOT in the menu (the `when: rangelink.isBound` clause should hide it).',
        '   Click Fail if it IS present (that would be a bug).',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported "RangeLink: Unbind" WAS visible in Explorer when unbound — the `when: rangelink.isBound` clause is not working',
    );

    ss.log(
      '✓ Unbound state: "Unbind" absent from Explorer context menu (human verdict + state invariant)',
    );
  });
});
