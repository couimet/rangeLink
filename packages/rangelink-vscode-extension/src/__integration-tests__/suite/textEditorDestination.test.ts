import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_COPY_LINK_RELATIVE,
  CMD_PASTE_TO_DESTINATION,
} from '../../constants/commandIds';
import {
  assertClipboardEqualsGeneratedLink,
  closeAllEditors,
  getGeneratedLink,
  getLogCapture,
  openSourceWithSelection,
  parseLogContext,
  standardSuite,
} from '../helpers';

standardSuite('Text Editor Destination', (ss) => {
  test('text-editor-destination-001: self-paste R-L copies to clipboard and shows info message', async () => {
    const fileUri = ss.createWorkspaceFile('ted-001', 'self-paste test\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const destBasename = path.basename(fileUri.fsPath);
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectToastMessages([
      {
        level: 'info',
        message:
          'Cannot auto-paste to same file. Link copied to clipboard. Tip: Use R-C for clipboard-only links.',
      },
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));
    await ss.settle();

    await assertClipboardEqualsGeneratedLink(
      'Self-paste R-L should copy link to clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
        await ss.settle();
      },
      'before-ted-001',
    );
    assert.ok(!doc.isDirty, 'Expected file to remain unmodified after self-paste');

    ss.log('✓ Self-paste R-L: info toast shown, link on clipboard, file unchanged');
  });

  test('text-editor-destination-002: R-L to different view column — allowed', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const destUri = ss.createWorkspaceFile('ted-002-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const sourceUri = ss.createWorkspaceFile('ted-002-source', 'source content\n');
    const destBasename = path.basename(destUri.fsPath);

    const destEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(destUri),
      { viewColumn: vscode.ViewColumn.Two, preview: false },
    );
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    // Open source file in a different column
    await openSourceWithSelection(sourceUri, vscode.ViewColumn.Three);
    await ss.settle();

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: RangeLink sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const logCapture = getLogCapture();
    logCapture.mark('before-ted-002');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const link = getGeneratedLink('before-ted-002', { smartPad: 'both' });

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    assert.ok(
      destDoc.getText().includes(link),
      `Expected dest to contain generated link "${link}", got: "${destDoc.getText()}"`,
    );
    ss.log('✓ R-L different view column: allowed, link pasted in destination column');
  });

  test('hidden-tab-paste-001: R-L with bound editor hidden behind another tab — paste still lands in bound editor', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const SOURCE_CONTENT = 'source-for-rangelink';
    const destUri = ss.createWorkspaceFile('htl-001-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const sourceUri = ss.createWorkspaceFile('htl-001-source', `${SOURCE_CONTENT}\n`);
    const destBasename = path.basename(destUri.fsPath);
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: RangeLink sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const destEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(destUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const sourceEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(sourceUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, SOURCE_CONTENT.length),
    );
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-htl-001');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-htl-001');

    const hiddenTabLog = lines.some((l) => {
      const ctx = parseLogContext(l);
      return (
        l.includes('Editor hidden behind other tabs at bound viewColumn') &&
        ctx?.fn === 'EditorFocusCapability.resolveViewColumn' &&
        ctx?.editorUri === destUri.toString()
      );
    });
    assert.ok(
      hiddenTabLog,
      'Expected hidden-tab log but none found — paste may not have triggered the hidden-tab path',
    );

    const link = getGeneratedLink('before-htl-001', { smartPad: 'both' });

    const destContent = (await vscode.workspace.openTextDocument(destUri)).getText();
    assert.ok(
      destContent.includes(link),
      `Expected dest to include generated link "${link}", got: "${destContent}"`,
    );

    ss.log('✓ Bound editor brought to foreground and received RangeLink');
  });

  test('hidden-tab-paste-002: R-V with bound editor hidden behind another tab — paste still lands in bound editor', async () => {
    const ANCHOR_START = 'ANCHOR_START';
    const ANCHOR_END = 'ANCHOR_END';
    const SELECTED_TEXT = 'text-to-paste';
    const destUri = ss.createWorkspaceFile('htl-002-dest', `${ANCHOR_START}\n${ANCHOR_END}\n`);
    const sourceUri = ss.createWorkspaceFile('htl-002-source', `${SELECTED_TEXT}\n`);
    const destBasename = path.basename(destUri.fsPath);
    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: Selected text sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const destEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(destUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    destEditor.selection = new vscode.Selection(
      new vscode.Position(1, 0),
      new vscode.Position(1, 0),
    );
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const sourceEditor = await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(sourceUri),
      { viewColumn: vscode.ViewColumn.One, preview: false },
    );
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, SELECTED_TEXT.length),
    );
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-htl-002');

    await vscode.commands.executeCommand(CMD_PASTE_TO_DESTINATION);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-htl-002');

    const hiddenTabLog = lines.some((l) => {
      const ctx = parseLogContext(l);
      return (
        l.includes('Editor hidden behind other tabs at bound viewColumn') &&
        ctx?.fn === 'EditorFocusCapability.resolveViewColumn' &&
        ctx?.editorUri === destUri.toString()
      );
    });
    assert.ok(
      hiddenTabLog,
      'Expected hidden-tab log but none found — paste may not have triggered the hidden-tab path',
    );

    const destContent = (await vscode.workspace.openTextDocument(destUri)).getText();
    assert.ok(
      destContent.includes(`${ANCHOR_START}\n${SELECTED_TEXT}${ANCHOR_END}`),
      `Expected selected text inserted in bound editor at cursor position, got: "${destContent}"`,
    );

    ss.log('✓ Bound editor brought to foreground and received selected text');
  });

  const WARN_DUPLICATE_TAB_GROUPS =
    'Bound file is open in multiple editor groups. Paste will not work until the duplicate tab is closed.';

  test('duplicate-tab-group-001: warning toast fires when bound file is opened in a second editor group', async () => {
    const destUri = ss.createWorkspaceFile('dtg-001-dest', 'destination file\n');
    const destBasename = path.basename(destUri.fsPath);
    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${destBasename}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectToastMessages([{ level: 'warning', message: WARN_DUPLICATE_TAB_GROUPS }]);
    const triggerUri = ss.createWorkspaceFile('dtg-001-trigger', '');

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    // Open same file in col 2 so both instances are visible. onDidChangeTabs fires
    // during this call but visibleTextEditors may not include col 2 yet.
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await ss.settle();

    // Open a dummy file in col 3 to force another onDidChangeTabs. At this point
    // visibleTextEditors already contains both dest instances (col 1 and col 2),
    // so the listener sees length > 1 and fires the warning.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(triggerUri), {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await ss.settle();

    ss.log('✓ Warning toast fired when bound file open in multiple editor groups');
  });

  test('duplicate-tab-group-002: warning is not repeated when duplicate state is already active', async () => {
    const destUri = ss.createWorkspaceFile('dtg-002-dest', 'destination file\n');
    const destBasename = path.basename(destUri.fsPath);
    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${destBasename}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectToastMessages([{ level: 'warning', message: WARN_DUPLICATE_TAB_GROUPS }]);
    const trigger1Uri = ss.createWorkspaceFile('dtg-002-trigger1', '');
    const trigger2Uri = ss.createWorkspaceFile('dtg-002-trigger2', '');

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await ss.settle();

    // Open trigger1 in col 3 — fires onDidChangeTabs with both dest instances visible → first warning.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger1Uri), {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await ss.settle();

    // Open trigger2 while both dest instances remain visible — isInDuplicateTabState is already
    // true so the listener must NOT fire a second warning.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger2Uri), {
      viewColumn: vscode.ViewColumn.Four,
      preview: false,
    });
    await ss.settle();

    ss.log('✓ No second warning fired while already in duplicate tab state');
  });

  test('duplicate-tab-group-003: paste is blocked with error when bound file is visible in multiple tab groups', async () => {
    const SOURCE_TEXT = 'dtg-003-source-text';
    const destUri = ss.createWorkspaceFile('dtg-003-dest', 'ANCHOR\n');
    const destBasename = path.basename(destUri.fsPath);
    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${destBasename}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectToastMessages([
      { level: 'warning', message: WARN_DUPLICATE_TAB_GROUPS },
      {
        level: 'error',
        message:
          'Bound editor is open in multiple tab groups. Close the duplicate tab and try again.',
      },
      {
        level: 'warning',
        message: 'Could not send to editor. Make sure the bound editor is visible and focused.',
      },
    ]);
    const sourceUri = ss.createWorkspaceFile('dtg-003-source', `${SOURCE_TEXT}\n`);

    const destDoc = await vscode.workspace.openTextDocument(destUri);

    // Bind dest in col 2.
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    // Open dest in col 3 as well (both instances now visible).
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await ss.settle();

    // Open source in col 4 — a fresh column that reliably gets focus in the
    // test runner (col 2 and 3 are occupied by dest; col 1 is unreliable
    // after prior tests have manipulated it).
    await openSourceWithSelection(sourceUri, vscode.ViewColumn.Four);

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const destContentAfter = (await vscode.workspace.openTextDocument(destUri)).getText();
    assert.strictEqual(
      destContentAfter,
      'ANCHOR\n',
      `Expected destination to remain unchanged when duplicate-tab guard blocks paste, got: "${destContentAfter}"`,
    );

    ss.log('✓ Paste blocked with ambiguous-columns error when dest is in multiple tab groups');
  });

  test('duplicate-tab-group-004: duplicate state clears when conflict resolves and re-entry triggers a fresh warning', async () => {
    const destUri = ss.createWorkspaceFile('dtg-004-dest', 'destination file\n');
    const destBasename = path.basename(destUri.fsPath);
    const trigger1Uri = ss.createWorkspaceFile('dtg-004-trigger1', '');
    const trigger2Uri = ss.createWorkspaceFile('dtg-004-trigger2', '');
    const trigger3Uri = ss.createWorkspaceFile('dtg-004-trigger3', '');

    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Text Editor ("${destBasename}")`]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectToastMessages([
      { level: 'warning', message: WARN_DUPLICATE_TAB_GROUPS },
      { level: 'warning', message: WARN_DUPLICATE_TAB_GROUPS },
    ]);

    const destDoc = await vscode.workspace.openTextDocument(destUri);
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await ss.settle();

    // Open trigger1 in col 3 → first warning fires, isInDuplicateTabState becomes true.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger1Uri), {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-dtg-004-close');

    // Close col 2 dest: focus it first, then close the active editor.
    await vscode.window.showTextDocument(destDoc, { viewColumn: vscode.ViewColumn.Two });
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await ss.settle();

    // Open trigger2 in col 2 to force onDidChangeTabs — visibleTextEditors now has only
    // one dest instance (col 1), so the listener clears the duplicate state.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger2Uri), {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await ss.settle();

    const linesSinceClose = logCapture.getLinesSince('before-dtg-004-close');
    const stateCleared = linesSinceClose.some((l) => {
      const ctx = parseLogContext(l);
      return (
        l.includes('Bound file no longer in multiple editor groups — duplicate state cleared') &&
        ctx?.fn === 'createMultiColumnGuard' &&
        ctx?.editorUri === destUri.toString()
      );
    });
    assert.ok(stateCleared, 'Expected state-cleared log after closing the duplicate tab');

    // Re-open dest in col 2 to re-enter duplicate state.
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await ss.settle();

    // Open trigger3 → onDidChangeTabs fires with both dest instances visible → fresh warning.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(trigger3Uri), {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await ss.settle();

    ss.log('✓ Duplicate state cleared on resolve; re-entry triggered a fresh warning');
  });

  test('stale-viewcolumn-001: paste targets the correct new column after bound editor is moved', async () => {
    const SOURCE_TEXT = 'stale-vc-001-source-text';
    const destUri = ss.createWorkspaceFile('svc-001-dest', 'ANCHOR\n');
    const destBasename = path.basename(destUri.fsPath);
    const sourceUri = ss.createWorkspaceFile('svc-001-source', `${SOURCE_TEXT}\n`);
    const dummyUri = ss.createWorkspaceFile('svc-001-dummy', '');

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `✓ RangeLink: RangeLink sent to Text Editor ("${destBasename}")`,
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectToastMessages([{ level: 'warning', message: WARN_DUPLICATE_TAB_GROUPS }]);

    const destDoc = await vscode.workspace.openTextDocument(destUri);

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
    await ss.settle();

    // Open dest in col 3 — dest is now visible in col 2 AND col 3.
    await vscode.window.showTextDocument(destDoc, {
      viewColumn: vscode.ViewColumn.Three,
      preview: false,
    });
    await ss.settle();

    // Open dummy in col 2 (active) — dest in col 2 is now HIDDEN behind dummy.
    // After this: col 2 shows dummy (visible), dest (hidden). Col 3 shows dest (visible).
    // findVisibleEditorsByUri(destUri) returns only the col 3 instance (length = 1).
    // hasVisibleEditorAt(destUri, 2) returns false — triggers the stale-viewColumn path.
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(dummyUri), {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await ss.settle();

    // Open source in col 4 — a fresh column that reliably gets focus.
    // Col 2 is occupied by dummy (dest hidden behind it), col 3 by dest.
    await openSourceWithSelection(sourceUri, vscode.ViewColumn.Four);

    const logCapture = getLogCapture();
    logCapture.mark('before-svc-001');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-svc-001');
    const movedLog = lines.some((l) => {
      const ctx = parseLogContext(l);
      return (
        l.includes('Editor moved to different viewColumn, following it') &&
        ctx?.fn === 'EditorFocusCapability.resolveViewColumn' &&
        ctx?.editorUri === destUri.toString()
      );
    });
    assert.ok(movedLog, 'Expected "Editor moved to different viewColumn" log but none found');

    const destContent = (await vscode.workspace.openTextDocument(destUri)).getText();
    const relativeSourcePath = vscode.workspace.asRelativePath(sourceUri);
    assert.ok(
      destContent.includes(relativeSourcePath),
      `Expected RangeLink referencing "${relativeSourcePath}" in dest, got: "${destContent}"`,
    );

    ss.log('✓ Paste followed bound editor to new view column');
  });

  test('auto-unbind-editor-001: closing bound untitled editor shows status bar auto-unbind message', async () => {
    const doc = await vscode.workspace.openTextDocument({ content: 'auto-unbind test file\n' });
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const untitledName = path.basename(doc.uri.fsPath);
    await closeAllEditors();
    await ss.settle();

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${untitledName}")`,
      `RangeLink: Unbound from Text Editor ("${untitledName}") — editor closed`,
    ]);
    ss.log('✓ Untitled editor close triggered status bar auto-unbind message');
  });

  test('auto-unbind-editor-002: closing bound saved editor shows status bar auto-unbind message', async () => {
    const fileUri = ss.createWorkspaceFile('aue-002', 'saved file auto-unbind test\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await ss.settle();

    const destBasename = path.basename(fileUri.fsPath);
    await closeAllEditors();
    await ss.settle();

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${destBasename}")`,
      `RangeLink: Unbound from Text Editor ("${destBasename}") — editor closed`,
    ]);
    ss.log('✓ Saved editor close triggered status bar auto-unbind message');
  });

  test('auto-unbind-editor-003: closing all editors unbinds only the bound one when multiple tabs are open', async () => {
    const boundUri = ss.createWorkspaceFile('aue-003-bound', 'bound file\n');
    const otherUri = ss.createWorkspaceFile('aue-003-other', 'other file\n');

    const boundDoc = await vscode.workspace.openTextDocument(boundUri);
    const otherDoc = await vscode.workspace.openTextDocument(otherUri);
    await vscode.window.showTextDocument(boundDoc, vscode.ViewColumn.One);
    await vscode.window.showTextDocument(otherDoc, vscode.ViewColumn.Two);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE, boundUri);
    await ss.settle();

    const boundBasename = path.basename(boundUri.fsPath);
    const otherBasename = path.basename(otherUri.fsPath);
    await closeAllEditors();
    await ss.settle();

    ss.expectStatusBarMessages([
      `✓ RangeLink: Bound to Text Editor ("${boundBasename}")`,
      `RangeLink: Unbound from Text Editor ("${boundBasename}") — editor closed`,
    ]);
    ss.log(`✓ Only bound editor (${boundBasename}) auto-unbound; other (${otherBasename}) ignored`);
  });
});
