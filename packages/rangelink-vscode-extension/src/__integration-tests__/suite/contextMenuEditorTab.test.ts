import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_BIND_TO_TERMINAL_HERE, CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  assertClipboardWriteLogged,
  assertFilePathLogged,
  assertFnLogged,
  assertSetContextLogged,
  assertStatusBarMsgLogged,
  assertTerminalPasteLogged,
  cleanupFiles,
  closeAllEditors,
  createAndOpenFile,
  createLogger,
  getLogCapture,
  printAssistedBanner,
  settle,
  waitForHuman,
} from '../helpers';

const FILE_CONTENT = 'editor-tab context-menu test file\n';
const CONTEXT_IS_BOUND_KEY = 'rangelink.isBound';

suite('Context Menus — Editor Tab', () => {
  const log = createLogger('contextMenuEditorTab');
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
  // TC context-menus-editor-tab-001
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-tab-001: Editor tab "Send File Path" sends absolute path to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-tab-001', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-tab-001';
    const terminal = vscode.window.createTerminal({ name: terminalName });
    terminals.push(terminal);
    terminal.show(true);
    await settle();
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-tab-001');

    await waitForHuman(
      'context-menus-editor-tab-001',
      `Right-click tab "${fn}" → "RangeLink: Send File Path"`,
      [
        `1. Locate the "${fn}" tab in the editor tab bar`,
        '2. Right-click the tab',
        '3. Select "RangeLink: Send File Path"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-tab-001');

    assertFilePathLogged(lines, {
      pathFormat: 'absolute',
      uriSource: 'context-menu',
      filePath: uri.fsPath,
    });
    assertClipboardWriteLogged(lines, { textLength: uri.fsPath.length });
    assertTerminalPasteLogged(lines, {
      terminalName,
      minTextLength: uri.fsPath.length,
    });

    log('✓ Editor-tab context menu routed absolute path via context-menu route to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-tab-002
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-tab-002: Editor tab "Send Relative File Path" sends relative path to bound terminal', async () => {
    const uri = await createAndOpenFile('ctxmenu-tab-002', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    const terminalName = 'rl-ctxmenu-tab-002';
    const terminal = vscode.window.createTerminal({ name: terminalName });
    terminals.push(terminal);
    terminal.show(true);
    await settle();
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-tab-002');

    await waitForHuman(
      'context-menus-editor-tab-002',
      `Right-click tab "${fn}" → "RangeLink: Send Relative File Path"`,
      [
        `1. Locate the "${fn}" tab in the editor tab bar`,
        '2. Right-click the tab',
        '3. Select "RangeLink: Send Relative File Path"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-tab-002');

    assertFilePathLogged(lines, {
      pathFormat: 'workspace-relative',
      uriSource: 'context-menu',
      filePath: relativePath,
    });
    assertClipboardWriteLogged(lines, { textLength: relativePath.length });
    assertTerminalPasteLogged(lines, {
      terminalName,
      minTextLength: relativePath.length,
    });

    log('✓ Editor-tab context menu routed workspace-relative path to bound terminal');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-tab-003
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-tab-003: Editor tab "Bind Here" binds that editor as text editor destination', async () => {
    const uri = await createAndOpenFile('ctxmenu-tab-003', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-tab-003');

    await waitForHuman(
      'context-menus-editor-tab-003',
      `Right-click tab "${fn}" → "RangeLink: Bind Here"`,
      [
        `1. Locate the "${fn}" tab in the editor tab bar`,
        '2. Right-click the tab',
        '3. Select "RangeLink: Bind Here"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-tab-003');

    assertFnLogged(lines, { fn: 'BindToTextEditorCommand.executeWithUri' });

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink bound to Text Editor ("${fn}")`,
    });

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    log('✓ Editor-tab "Bind Here" committed a text-editor binding with correct displayName');
  });

  // ---------------------------------------------------------------------------
  // TC context-menus-editor-tab-004
  // ---------------------------------------------------------------------------

  test('[assisted] context-menus-editor-tab-004: Editor tab "Unbind" is visible when bound and unbinds on click', async () => {
    const uri = await createAndOpenFile('ctxmenu-tab-004', FILE_CONTENT, undefined, tmpFileUris);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-tab-004';
    const terminal = vscode.window.createTerminal({ name: terminalName });
    terminals.push(terminal);
    terminal.show(true);
    await settle();
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-tab-004');

    await waitForHuman(
      'context-menus-editor-tab-004',
      `Right-click tab "${fn}" → "RangeLink: Unbind"`,
      [
        `1. Locate the "${fn}" tab in the editor tab bar`,
        '2. Right-click the tab',
        '3. Verify "RangeLink: Unbind" IS present in the menu',
        '4. Select "RangeLink: Unbind"',
      ],
    );

    const lines = logCapture.getLinesSince('before-ctxmenu-tab-004');

    assertStatusBarMsgLogged(lines, {
      message: `✓ RangeLink unbound from Terminal ("${terminalName}")`,
    });

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: false });

    log('✓ Editor-tab "Unbind" fired the unbind path; context key flipped to false');
  });
});
