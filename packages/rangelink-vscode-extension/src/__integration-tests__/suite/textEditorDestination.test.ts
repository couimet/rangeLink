import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_BIND_TO_TEXT_EDITOR_HERE, CMD_COPY_LINK_RELATIVE } from '../../constants/commandIds';
import {
  assertNoToastLogged,
  assertToastLogged,
  cleanupFiles,
  createWorkspaceFile,
  getLogCapture,
  settle,
  standardSuite,
  waitForHuman,
} from '../helpers';

standardSuite('Text Editor Destination', (log) => {
  const tmpFileUris: vscode.Uri[] = [];

  teardown(async () => {
    cleanupFiles(tmpFileUris);
    await settle();
  });

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

  const WARN_DUPLICATE_TAB_GROUPS =
    'RangeLink: Bound file is open in multiple editor groups. Paste will not work until the duplicate tab is closed.';

  test('duplicate-tab-group-001: warning toast fires when bound file is opened in a second editor group', async () => {
    const destUri = createWorkspaceFile('dtg-001-dest', 'destination file\n');
    const triggerUri = createWorkspaceFile('dtg-001-trigger', '');
    tmpFileUris.push(destUri, triggerUri);

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    // Open same file in col 2 so both instances are visible. onDidChangeTabs fires
    // during this call but visibleTextEditors may not include col 2 yet.
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-dtg-001');

    // Open a dummy file in col 3 to force another onDidChangeTabs. At this point
    // visibleTextEditors already contains both dest instances (col 1 and col 2),
    // so the listener sees length > 1 and fires the warning.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(triggerUri), {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await settle();

    assertToastLogged(logCapture.getLinesSince('before-dtg-001'), {
      type: 'warning',
      message: WARN_DUPLICATE_TAB_GROUPS,
    });

    log('✓ Warning toast fired when bound file open in multiple editor groups');
  });

  test('duplicate-tab-group-002: warning is not repeated when duplicate state is already active', async () => {
    const destUri = createWorkspaceFile('dtg-002-dest', 'destination file\n');
    const trigger1Uri = createWorkspaceFile('dtg-002-trigger1', '');
    const trigger2Uri = createWorkspaceFile('dtg-002-trigger2', '');
    tmpFileUris.push(destUri, trigger1Uri, trigger2Uri);

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await settle();

    // Open trigger1 in col 3 — fires onDidChangeTabs with both dest instances visible → first warning.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger1Uri), {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-dtg-002');

    // Open trigger2 while both dest instances remain visible — isInDuplicateTabState is already
    // true so the listener must NOT fire a second warning.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger2Uri), {
      viewColumn: vscode.ViewColumn.Four,
      preview: false,
    });
    await settle();

    assertNoToastLogged(logCapture.getLinesSince('before-dtg-002'), {
      type: 'warning',
      message: WARN_DUPLICATE_TAB_GROUPS,
    });

    log('✓ No second warning fired while already in duplicate tab state');
  });

  test('duplicate-tab-group-003: paste is blocked with error when bound file is visible in multiple tab groups', async () => {
    const SOURCE_TEXT = 'dtg-003-source-text';
    const destUri = createWorkspaceFile('dtg-003-dest', 'ANCHOR\n');
    const sourceUri = createWorkspaceFile('dtg-003-source', `${SOURCE_TEXT}\n`);
    tmpFileUris.push(destUri, sourceUri);

    const destDoc = await vscode.workspace.openTextDocument(destUri);

    // Bind dest in col 2.
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    // Open dest in col 3 as well (both instances now visible).
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await settle();

    // Focus source in col 1 with selection.
    const sourceEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(sourceUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, SOURCE_TEXT.length),
    );
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-dtg-003');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    assertToastLogged(logCapture.getLinesSince('before-dtg-003'), {
      type: 'error',
      message:
        'RangeLink: Bound editor is open in multiple tab groups. Close the duplicate tab and try again.',
    });

    const destContentAfter = (await vscode.workspace.openTextDocument(destUri)).getText();
    assert.strictEqual(
      destContentAfter,
      'ANCHOR\n',
      `Expected destination to remain unchanged when duplicate-tab guard blocks paste, got: "${destContentAfter}"`,
    );

    log('✓ Paste blocked with ambiguous-columns error when dest is in multiple tab groups');
  });

  test('duplicate-tab-group-004: duplicate state clears when conflict resolves and re-entry triggers a fresh warning', async () => {
    const destUri = createWorkspaceFile('dtg-004-dest', 'destination file\n');
    const trigger1Uri = createWorkspaceFile('dtg-004-trigger1', '');
    const trigger2Uri = createWorkspaceFile('dtg-004-trigger2', '');
    const trigger3Uri = createWorkspaceFile('dtg-004-trigger3', '');
    tmpFileUris.push(destUri, trigger1Uri, trigger2Uri, trigger3Uri);

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await settle();

    // Open trigger1 in col 3 → first warning fires, isInDuplicateTabState becomes true.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger1Uri), {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-dtg-004-close');

    // Close col 2 dest: focus it first, then close the active editor.
    await vscode.window.showTextDocument(destDoc, { viewColumn: vscode.ViewColumn.Two });
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await settle();

    // Open trigger2 in col 2 to force onDidChangeTabs — visibleTextEditors now has only
    // one dest instance (col 1), so the listener clears the duplicate state.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger2Uri), {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await settle();

    const linesSinceClose = logCapture.getLinesSince('before-dtg-004-close');
    const stateCleared = linesSinceClose.some((l) =>
      l.includes('Bound file no longer in multiple editor groups — duplicate state cleared'),
    );
    assert.ok(stateCleared, 'Expected state-cleared log after closing the duplicate tab');

    // Re-open dest in col 2 to re-enter duplicate state.
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await settle();

    logCapture.mark('before-dtg-004-rewarn');

    // Open trigger3 → onDidChangeTabs fires with both dest instances visible → fresh warning.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger3Uri), {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await settle();

    assertToastLogged(logCapture.getLinesSince('before-dtg-004-rewarn'), {
      type: 'warning',
      message: WARN_DUPLICATE_TAB_GROUPS,
    });

    log('✓ Duplicate state cleared on resolve; re-entry triggered a fresh warning');
  });

  test('stale-viewcolumn-001: paste targets the correct new column after bound editor is moved', async () => {
    const SOURCE_TEXT = 'stale-vc-001-source-text';
    const destUri = createWorkspaceFile('svc-001-dest', 'ANCHOR\n');
    const sourceUri = createWorkspaceFile('svc-001-source', `${SOURCE_TEXT}\n`);
    const dummyUri = createWorkspaceFile('svc-001-dummy', '');
    tmpFileUris.push(destUri, sourceUri, dummyUri);

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    const sourceDoc = await vscode.workspace.openTextDocument(sourceUri);

    // Open dest in col 2, bind (boundViewColumn = 2).
    const destEditor = await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    // Open dest in col 3 — dest is now visible in col 2 AND col 3.
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await settle();

    // Open dummy in col 2 (active) — dest in col 2 is now HIDDEN behind dummy.
    // After this: col 2 shows dummy (visible), dest (hidden). Col 3 shows dest (visible).
    // findVisibleEditorsByUri(destUri) returns only the col 3 instance (length = 1).
    // hasVisibleEditorAt(destUri, 2) returns false — triggers the stale-viewColumn path.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(dummyUri), {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await settle();

    // Focus source in col 1 with a text selection.
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, SOURCE_TEXT.length),
    );
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-svc-001');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const lines = logCapture.getLinesSince('before-svc-001');
    const movedLog = lines.some((l) =>
      l.includes('Editor moved to different viewColumn, following it'),
    );
    assert.ok(movedLog, 'Expected "Editor moved to different viewColumn" log but none found');

    const destContent = (await vscode.workspace.openTextDocument(destUri)).getText();
    const relativeSourcePath = vscode.workspace.asRelativePath(sourceUri);
    assert.ok(
      destContent.includes(relativeSourcePath),
      `Expected RangeLink referencing "${relativeSourcePath}" in dest, got: "${destContent}"`,
    );

    log('✓ Paste followed bound editor to new view column');
  });
});
