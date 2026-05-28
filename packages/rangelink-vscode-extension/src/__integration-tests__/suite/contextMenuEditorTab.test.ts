import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_BIND_TO_TERMINAL_HERE } from '../../constants/commandIds';
import {
  assertClipboardWriteLogged,
  assertFilePathLogged,
  assertSetContextLogged,
  assertTerminalBufferEquals,
  getLogCapture,
  standardSuite,
  waitForHuman,
} from '../helpers';

const FILE_CONTENT = 'editor-tab context-menu test file\n';
const CONTEXT_IS_BOUND_KEY = 'rangelink.isBound';

standardSuite('Context Menus — Editor Tab', (ss) => {
  test('[assisted] context-menus-editor-tab-001: Editor tab "Send File Path" sends absolute path to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-tab-001', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-tab-001';
    const capturing = await ss.createCapturingTerminal(terminalName);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-tab-001")',
      '✓ RangeLink: File path sent to Terminal ("rl-ctxmenu-tab-001")',
    ]);

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-tab-001');
    capturing.clearCaptured();

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
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${uri.fsPath} `);

    ss.log(
      '✓ Editor-tab absolute path landed in bound terminal buffer (pty capture verified content)',
    );
  });

  test('[assisted] context-menus-editor-tab-002: Editor tab "Send Relative File Path" sends relative path to bound terminal', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-tab-002', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    const terminalName = 'rl-ctxmenu-tab-002';
    const capturing = await ss.createCapturingTerminal(terminalName);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-tab-002")',
      '✓ RangeLink: File path sent to Terminal ("rl-ctxmenu-tab-002")',
    ]);

    const logCapture = getLogCapture();
    logCapture.mark('before-ctxmenu-tab-002');
    capturing.clearCaptured();

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
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);

    ss.log(
      '✓ Editor-tab relative path landed in bound terminal buffer (pty capture verified content)',
    );
  });

  test('[assisted] context-menus-editor-tab-003: Editor tab "Bind Here" binds that editor as text editor destination', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-tab-003', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${fn}")`]);

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

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: true });

    ss.log('✓ Editor-tab "Bind Here" committed a text-editor binding with correct displayName');
  });

  test('[assisted] context-menus-editor-tab-004: Editor tab "Unbind" is visible when bound and unbinds on click', async () => {
    const uri = await ss.createAndOpenFile('ctxmenu-tab-004', FILE_CONTENT);
    const fn = path.basename(uri.fsPath);

    const terminalName = 'rl-ctxmenu-tab-004';
    await ss.createTerminal(terminalName);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-ctxmenu-tab-004")',
      '✓ RangeLink: Unbound from Terminal ("rl-ctxmenu-tab-004")',
    ]);

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

    assertSetContextLogged(lines, { key: CONTEXT_IS_BOUND_KEY, value: false });

    ss.log('✓ Editor-tab "Unbind" fired the unbind path; context key flipped to false');
  });
});
