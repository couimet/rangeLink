import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_CUSTOM_AI_BY_ID,
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_COPY_LINK_ONLY_RELATIVE,
  CMD_COPY_LINK_RELATIVE,
  CMD_COPY_PORTABLE_LINK_RELATIVE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
  CMD_TERMINAL_PASTE_SELECTED_TEXT,
} from '../../constants/commandIds';
import { VSCODE_CMD_TERMINAL_SELECT_ALL } from '../../constants/vscodeCommandIds';
import {
  TERMINAL_READY_MS,
  assertClipboardEqualsGeneratedLink,
  assertClipboardPreservedAndTerminalLink,
  assertTerminalBufferContains,
  assertTerminalBufferContainsGeneratedLink,
  getLogCapture,
  openAndDismiss,
  parseLogContext,
  standardSuite,
  withClipboardChanged,
  withClipboardSentinel,
  writeClipboardSentinel,
} from '../helpers';
import type { CapturingTerminal } from '../helpers/capturingPtyHelpers';

standardSuite('Clipboard Preservation', (ss) => {
  let testFileUri: vscode.Uri;
  let editor: vscode.TextEditor;
  let capturing: CapturingTerminal;

  setup(async () => {
    const { uri } = ss.createContentFile('clipboard', 10, (i) => `line ${i + 1} content`);
    testFileUri = uri;
    editor = await ss.openEditor(testFileUri);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7));
    await writeClipboardSentinel();
    capturing = await ss.createAndBindCapturingTerminal('rl-clipboard-test');
    await ss.settle();
  });

  test('clipboard-preservation-003: R-F with preserve=always restores clipboard to sentinel after send', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-clipboard-test")',
      '✓ RangeLink: File path sent to Terminal ("rl-clipboard-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    capturing.clearCaptured();
    await withClipboardSentinel('before-003', 'R-F', async () => {
      await vscode.commands.executeCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE);
      await ss.settle();
    });
    assertTerminalBufferContains(capturing.getCapturedText(), 'clipboard');
  });

  test('clipboard-preservation-006: R-L with preserve=never leaves clipboard with the generated link', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-clipboard-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("rl-clipboard-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    capturing.clearCaptured();
    await assertClipboardEqualsGeneratedLink(
      'R-L with preserve=never',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
        await ss.settle();
      },
      'before-006',
    );
    assertTerminalBufferContains(capturing.getCapturedText(), 'clipboard');
    assertTerminalBufferContainsGeneratedLink(capturing, 'before-006');
  });

  test('clipboard-preservation-008: R-C writes link to clipboard with preserve=always (R-C is exempt from preserve)', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-clipboard-test")',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'always', vscode.ConfigurationTarget.Global);

    await assertClipboardEqualsGeneratedLink(
      'R-C with preserve=always',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-008',
    );
  });

  test('clipboard-preservation-019: R-C writes link to clipboard with default preserve setting', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-clipboard-test")',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    await assertClipboardEqualsGeneratedLink(
      'R-C with default preserve',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-019',
    );
  });

  test('clipboard-preservation-020: R-C writes link to clipboard with preserve=never', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-clipboard-test")',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);

    await assertClipboardEqualsGeneratedLink(
      'R-C with preserve=never',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-020',
    );
  });

  test('clipboard-preservation-021: R-L portable link sent to terminal shows portable content type in status bar', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("rl-clipboard-test")',
      '✓ RangeLink: Portable RangeLink sent to Terminal ("rl-clipboard-test")',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    await assertClipboardPreservedAndTerminalLink(capturing, 'before-021', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_PORTABLE_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ Portable RangeLink content type shown in status bar, clipboard preserved');
  });
});

standardSuite('Clipboard Preservation — Assisted', (ss) => {
  test('clipboard-preservation-001: always mode — R-L to terminal restores clipboard', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("cbp-001-dest")',
      '✓ RangeLink: RangeLink sent to Terminal ("cbp-001-dest")',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    const { uri: fileUri } = ss.createContentFile('cbp-001', 10, (i) => `line ${i + 1} content`);

    const capturing = await ss.createAndBindCapturingTerminal('cbp-001-dest');

    const editor001 = await ss.openEditor(fileUri);
    const lastSelectedLine = editor001.document.lineAt(3);
    editor001.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      lastSelectedLine.range.end,
    );
    await ss.settle();

    await assertClipboardPreservedAndTerminalLink(capturing, 'before-001', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ Clipboard restored to sentinel after R-L; terminal received link');
  });

  test('clipboard-preservation-002: always mode — R-V from terminal restores clipboard', async () => {
    const PHRASE = 'hello world cbp-002';

    const fileUri = ss.createWorkspaceFile('cbp-002', '');
    const destBasename = path.basename(fileUri.fsPath);
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: Selected text sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
    });

    await ss.openEditor(fileUri);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const srcTerminal = await ss.createTerminal('cbp-002-src');
    srcTerminal.show(true);
    await ss.settle();

    srcTerminal.sendText(PHRASE, false);
    await ss.settle(TERMINAL_READY_MS);

    await vscode.commands.executeCommand(VSCODE_CMD_TERMINAL_SELECT_ALL);
    await ss.settle();

    await withClipboardSentinel('before-002', 'R-V', async () => {
      await vscode.commands.executeCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT);
      await ss.settle();
    });

    const destContent = (await vscode.workspace.openTextDocument(fileUri)).getText();
    assert.ok(
      destContent.replace(/[\r\n]/g, '').includes(PHRASE),
      `Expected "${PHRASE}" in destination file, got: ${JSON.stringify(destContent)}`,
    );
    ss.log('✓ Clipboard restored to sentinel and phrase landed in destination file after R-V');
  });

  test('clipboard-preservation-004: always mode — AI assistant paste restores clipboard', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Tier 1)',
      '✓ RangeLink: RangeLink sent to Dummy AI (Tier 1)',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    const { uri: fileUri } = ss.createContentFile('cbp-004', 10, (i) => `line ${i + 1} content`);

    const relPath = vscode.workspace.asRelativePath(fileUri);
    const expectedLink = `${relPath}#L1C1-L3C7`;

    const editor = await ss.openEditor(fileUri);

    editor.selection = new vscode.Selection(0, 0, 2, 6);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension',
    });
    await ss.settle();

    await withClipboardSentinel('before-004', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    const dummyText = (await vscode.commands.executeCommand('dummyAi.getText')) as {
      tier1: string;
      tier2: string;
    };
    assert.strictEqual(
      dummyText.tier1,
      ` ${expectedLink} `,
      `Expected Dummy AI tier1=" ${expectedLink} ", got: ${JSON.stringify(dummyText.tier1)}`,
    );
    ss.log('✓ Clipboard restored to sentinel and link landed in Dummy AI after R-L');
  });

  test('clipboard-preservation-005: always mode — terminal paste (fresh bind) restores clipboard', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("cbp-005-dest")',
      '✓ RangeLink: RangeLink sent to Terminal ("cbp-005-dest")',
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });
    const { uri: fileUri } = ss.createContentFile('cbp-005', 10, (i) => `entry ${i + 1}`);

    const capturing = await ss.createAndBindCapturingTerminal('cbp-005-dest');

    const editor005 = await ss.openEditor(fileUri);
    const lastSelectedLine = editor005.document.lineAt(2);
    editor005.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      lastSelectedLine.range.end,
    );
    await ss.settle();

    await assertClipboardPreservedAndTerminalLink(capturing, 'before-005', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ Clipboard restored to sentinel after terminal paste (preserve=always)');
  });

  test('clipboard-preservation-007: never mode — R-V from terminal overwrites clipboard', async () => {
    const PHRASE = 'test phrase cbp-007';

    const config = vscode.workspace.getConfiguration();
    await config.update('rangelink.clipboard.preserve', 'never', vscode.ConfigurationTarget.Global);
    ss.log('set rangelink.clipboard.preserve to never');

    const fileUri = ss.createWorkspaceFile('cbp-007', '');

    await ss.openEditor(fileUri);
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const destBasename = path.basename(fileUri.fsPath);
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: Selected text sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
    });
    const srcTerminal = await ss.createTerminal('cbp-007-src');
    srcTerminal.show(true);
    await ss.settle();

    srcTerminal.sendText(PHRASE, false);
    await ss.settle(TERMINAL_READY_MS);

    await vscode.commands.executeCommand(VSCODE_CMD_TERMINAL_SELECT_ALL);
    await ss.settle();

    // Sentinel written after selectAll so copyOnSelection cannot overwrite it
    await withClipboardChanged('clipboard-preservation-007: never + R-V', async () => {
      await vscode.commands.executeCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT);
      await ss.settle();
    });

    const destContent = (await vscode.workspace.openTextDocument(fileUri)).getText();
    assert.ok(
      destContent.replace(/[\r\n]/g, '').includes(PHRASE),
      `Expected "${PHRASE}" in destination file, got: ${JSON.stringify(destContent)}`,
    );
    ss.log('✓ Clipboard changed from sentinel and phrase landed in destination file after R-V');
  });

  test('clipboard-preservation-009: always mode — dismissed picker leaves clipboard unchanged', async () => {
    const { uri: fileUri } = ss.createContentFile('cbp-009', 5, (i) => `line ${i + 1}`);

    const SELECTION_START_LINE = 0;
    const SELECTION_END_LINE = 2;
    const SELECTION_COLUMN = 0;

    const editor009 = await ss.openEditor(fileUri);
    editor009.selection = new vscode.Selection(
      new vscode.Position(SELECTION_START_LINE, SELECTION_COLUMN),
      new vscode.Position(SELECTION_END_LINE, SELECTION_COLUMN),
    );
    await ss.settle();

    await withClipboardSentinel(
      'before-009',
      'R-L',
      async () => {
        await openAndDismiss(CMD_COPY_LINK_RELATIVE);
        await ss.settle();
      },
      { expectPreserved: false },
    );
    ss.log('✓ Clipboard unchanged after picker dismissed (no operation performed)');
  });

  test('clipboard-preservation-010: focus command failure preserves link in clipboard for manual paste', async () => {
    const { uri: fileUri } = ss.createContentFile('cbp-010', 5, (i) => `line ${i + 1}`);

    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(0, 0, 3, 0);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Focus-Fail)',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectToastMessages([
      { level: 'warning', message: 'Paste (Cmd/Ctrl+V) in Dummy AI (Focus-Fail) to use.' },
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension-focus-fail',
    });
    await ss.settle();

    await assertClipboardEqualsGeneratedLink(
      'clipboard-preservation-010: focus-fail — link must stay in clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
        await ss.settle();
      },
      'before-010',
    );

    const cbpLines010 = getLogCapture().getLinesSince('before-010');
    const focusFailed010 = cbpLines010.some((l) => {
      const ctx = parseLogContext(l);
      return ctx?.fn?.endsWith('.pasteLink') && ctx?.reason !== undefined;
    });
    assert.ok(focusFailed010, 'Expected focus failure log with reason field');
    ss.log(
      '✓ Clipboard not restored after focus failure — link stays in clipboard for manual paste',
    );
  });

  test('clipboard-preservation-022: focus command failure preserves portable link in clipboard for manual paste with portable content type in UI', async () => {
    const { uri: fileUri } = ss.createContentFile('cbp-022', 5, (i) => `line ${i + 1}`);

    const editor = await ss.openEditor(fileUri);
    editor.selection = new vscode.Selection(0, 0, 3, 0);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Focus-Fail)',
      '✓ RangeLink: Portable RangeLink copied to clipboard',
    ]);
    ss.expectToastMessages([
      { level: 'warning', message: 'Paste (Cmd/Ctrl+V) in Dummy AI (Focus-Fail) to use.' },
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension-focus-fail',
    });
    await ss.settle();

    await assertClipboardEqualsGeneratedLink(
      'clipboard-preservation-022: focus-fail — portable link must stay in clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_PORTABLE_LINK_RELATIVE);
        await ss.settle();
      },
      'before-022',
    );

    const cbpLines022 = getLogCapture().getLinesSince('before-022');
    const focusFailed022 = cbpLines022.some((l) => {
      const ctx = parseLogContext(l);
      return ctx?.fn?.endsWith('.pasteLink') && ctx?.reason !== undefined;
    });
    assert.ok(focusFailed022, 'Expected focus failure log with reason field');
    ss.log(
      '✓ Clipboard not restored after focus failure — portable link stays in clipboard for manual paste. Portable content type shown in status bar and toast.',
    );
  });
});
