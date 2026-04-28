import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_BIND_TO_TEXT_EDITOR_HERE, CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  assertToastLogged,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  getLogCapture,
  printAssistedBanner,
  settle,
  waitForHuman,
} from '../helpers';

suite('Text Editor Destination', () => {
  const log = createLogger('textEditorDestination');
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    await settle();
  });

  // ---------------------------------------------------------------------------
  // TC text-editor-destination-001
  // ---------------------------------------------------------------------------

  test('[assisted] text-editor-destination-001: self-paste R-L copies to clipboard and shows info message', async () => {
    const fileUri = createWorkspaceFile('ted-001', 'self-paste test\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ted-001');

    await waitForHuman(
      'text-editor-destination-001',
      'The file is bound to itself. Press Cmd+R Cmd+L — verify info message appears and file is unchanged.',
      [
        '1. The current file is already set as its own destination (bound via test setup)',
        '2. Text "self-paste" is already selected',
        '3. Press Cmd+R Cmd+L',
        '4. Verify an info notification appears saying the link was copied and cannot auto-paste to same file',
        '5. Verify the file content has NOT changed',
      ],
    );

    const lines = logCapture.getLinesSince('before-ted-001');

    assertToastLogged(lines, {
      type: 'info',
      message:
        'RangeLink copied to clipboard. Cannot auto-paste to same file. Tip: Use R-C for clipboard-only links.',
    });

    log('✓ Self-paste R-L: info toast shown, file unchanged (log verified)');
  });

  // ---------------------------------------------------------------------------
  // TC hidden-tab-paste-001
  // ---------------------------------------------------------------------------

  test('[assisted] hidden-tab-paste-001: R-L with bound editor hidden behind another tab — paste still lands in bound editor', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const SOURCE_CONTENT = 'source-for-rangelink';
    const destUri = createWorkspaceFile('htl-001-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const sourceUri = createWorkspaceFile('htl-001-source', `${SOURCE_CONTENT}\n`);
    tmpFileUris.push(destUri, sourceUri);

    const destEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(destUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    const sourceEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(sourceUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, SOURCE_CONTENT.length),
    );
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-htl-001');

    await waitForHuman(
      'hidden-tab-paste-001',
      'R-L with bound editor hidden behind another tab — paste still lands in bound editor',
      [
        '1. The source file is active (htl-001-source). The bound editor (htl-001-dest) is hidden behind it in the same column.',
        `2. "${SOURCE_CONTENT}" is already selected.`,
        '3. Press Cmd+R Cmd+L.',
        '4. Observe that the bound editor is brought to the foreground and receives the RangeLink.',
      ],
    );

    const lines = logCapture.getLinesSince('before-htl-001');

    const hiddenTabLog = lines.find((l) =>
      l.includes('Editor hidden behind other tabs at bound viewColumn'),
    );
    assert.ok(
      hiddenTabLog,
      'Expected hidden-tab log but none found — paste may not have triggered the hidden-tab path',
    );

    const destContent = (await vscode.workspace.openTextDocument(destUri)).getText();
    const relativeSourcePath = vscode.workspace.asRelativePath(sourceUri);
    assert.ok(
      destContent.includes(relativeSourcePath),
      `Expected RangeLink referencing "${relativeSourcePath}" in bound editor, got: "${destContent}"`,
    );
    assert.ok(
      destContent.includes('#L1'),
      `Expected line reference "#L1" in bound editor, got: "${destContent}"`,
    );

    log('✓ Bound editor brought to foreground and received RangeLink');
  });

  // ---------------------------------------------------------------------------
  // TC hidden-tab-paste-002
  // ---------------------------------------------------------------------------

  test('[assisted] hidden-tab-paste-002: R-V with bound editor hidden behind another tab — paste still lands in bound editor', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const SELECTED_TEXT = 'text-to-paste';
    const destUri = createWorkspaceFile('htl-002-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const sourceUri = createWorkspaceFile('htl-002-source', `${SELECTED_TEXT}\n`);
    tmpFileUris.push(destUri, sourceUri);

    const destEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(destUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    const sourceEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(sourceUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, SELECTED_TEXT.length),
    );
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-htl-002');

    await waitForHuman(
      'hidden-tab-paste-002',
      'R-V with bound editor hidden behind another tab — paste still lands in bound editor',
      [
        '1. The source file is active (htl-002-source). The bound editor (htl-002-dest) is hidden behind it in the same column.',
        `2. "${SELECTED_TEXT}" is already selected.`,
        '3. Press Cmd+R Cmd+V.',
        '4. Observe that the bound editor is brought to the foreground and receives the selected text.',
      ],
    );

    const lines = logCapture.getLinesSince('before-htl-002');

    const hiddenTabLog = lines.find((l) =>
      l.includes('Editor hidden behind other tabs at bound viewColumn'),
    );
    assert.ok(
      hiddenTabLog,
      'Expected hidden-tab log but none found — paste may not have triggered the hidden-tab path',
    );

    const destContent = (await vscode.workspace.openTextDocument(destUri)).getText();
    assert.ok(
      destContent.includes(`${ANCHOR_START}\n${SELECTED_TEXT}${ANCHOR_END}`),
      `Expected selected text inserted in bound editor at cursor position, got: "${destContent}"`,
    );

    log('✓ Bound editor brought to foreground and received selected text');
  });
});
