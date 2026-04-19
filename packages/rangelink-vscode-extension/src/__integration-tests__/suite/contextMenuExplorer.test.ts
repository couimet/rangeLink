import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_BIND_TO_TERMINAL_HERE, CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  assertClipboardWriteLogged,
  assertFilePathLogged,
  assertNoSetContextLogged,
  assertSetContextLogged,
  assertStatusBarMsgLogged,
  cleanupFiles,
  closeAllEditors,
  createAndOpenFile,
  createLogger,
  getLogCapture,
  printAssistedBanner,
  settle,
  waitForHuman,
} from '../helpers';

const FILE_CONTENT = 'explorer context-menu test file\n';
const CONTEXT_IS_BOUND_KEY = 'rangelink.isBound';

suite('Context Menus — Explorer', () => {
  const log = createLogger('contextMenuExplorer');
  const terminals: vscode.Terminal[] = [];
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    for (const t of terminals) {
      t.dispose();
    }
    terminals.length = 0;
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.length = 0;
    await settle();
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-explorer-001
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-explorer-001: Explorer "Send File Path" sends absolute path to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-exp-001', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-exp-001';
    const terminal = vscode.window.createTerminal({ name: terminalName });
    terminals.push(terminal);
    terminal.show(true);
    await settle();
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-exp-001');

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
    assertClipboardWriteLogged(lines, { textLength: uri.fsPath.length });

    log('✓ Absolute path resolved via context-menu route and routed to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-explorer-002
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-explorer-002: Explorer "Send Relative File Path" sends relative path to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-exp-002', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    const terminalName = 'rl-ctxmenu-exp-002';
    const terminal = vscode.window.createTerminal({ name: terminalName });
    terminals.push(terminal);
    terminal.show(true);
    await settle();
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-exp-002');

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
    assertClipboardWriteLogged(lines, { textLength: relativePath.length });

    log('✓ Workspace-relative path resolved via context-menu route and routed to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-explorer-003
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-explorer-003: Explorer "Bind Here" opens the file and binds it as text editor destination', async () => {
    const uri = await createAndOpenFile('ctxmenu-exp-003', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

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

    const lines = logCapture.getLinesSince('before-ctxmenu-exp-003');

    const executeWithUriLogged = lines.some((line) =>
      line.includes('"fn":"BindToTextEditorCommand.executeWithUri"'),
    );
    assert.ok(executeWithUriLogged, 'Expected BindToTextEditorCommand.executeWithUri log');

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink bound to Text Editor ("${fn}")`,
    });

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    log('✓ Explorer "Bind Here" committed a text-editor binding with correct displayName');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-explorer-004
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-explorer-004: Explorer "Unbind" is visible when bound and unbinds on click', async () => {
    const uri = await createAndOpenFile('ctxmenu-exp-004', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-exp-004';
    const terminal = vscode.window.createTerminal({ name: terminalName });
    terminals.push(terminal);
    terminal.show(true);
    await settle();
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();

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

    const lines = logCapture.getLinesSince('before-ctxmenu-exp-004');

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink unbound from Terminal ("${terminalName}")`,
    });

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: false });

    log('✓ Explorer "Unbind" fired the unbind path; context key flipped to false');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-explorer-005
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-explorer-005: Explorer "Unbind" is hidden when no destination is bound', async () => {
    const uri = await createAndOpenFile('ctxmenu-exp-005', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-exp-005');

    await waitForHuman(
      'context-menus-explorer-005',
      `Right-click "${fn}" in Explorer and verify "RangeLink: Unbind" is HIDDEN`,
      [
        `1. Locate "${fn}" in the Explorer panel`,
        '2. Right-click it',
        '3. Verify "RangeLink: Unbind" is NOT in the menu (the when-clause is rangelink.isBound)',
        '4. Dismiss the menu (Escape), then Cancel this notification',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-exp-005');

    assertNoSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    log(
      '✓ State invariant held (no bind during observation); human confirmed "Unbind" entry hidden',
    );
  });
});
