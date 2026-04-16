import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertClipboardRestored,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  getLogCapture,
  openEditor,
  printAssistedBanner,
  settle,
  waitForHuman,
  writeClipboardSentinel,
} from '../helpers';

suite('Dirty Buffer Warning', () => {
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    await activateExtension();

    testFileUri = createWorkspaceFile('dirty', 'const x = 1;\n');
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  teardown(async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', undefined, vscode.ConfigurationTarget.Workspace);
  });

  test('dirty-buffer-warning-004: warnOnDirtyBuffer=false — R-C generates link without showing warning dialog', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// dirty\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

    await vscode.env.clipboard.writeText('rangelink-dirty-test-sentinel');

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      'rangelink-dirty-test-sentinel',
      'Expected clipboard to contain a generated link, not the sentinel — warnOnDirtyBuffer=false should bypass dialog',
    );
    assert.ok(
      clipboard.includes('#L'),
      `Expected clipboard to contain a line reference but got: ${clipboard}`,
    );
  });

  test('dirty-buffer-warning-008: warnOnDirtyBuffer=false — R-F sends file path without showing warning dialog', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// rf-dirty\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

    await vscode.env.clipboard.writeText('rangelink-rf-dirty-sentinel');

    await vscode.commands.executeCommand('rangelink.sendCurrentFilePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      'rangelink-rf-dirty-sentinel',
      'Expected clipboard to contain a file path, not the sentinel — warnOnDirtyBuffer=false should bypass dialog for R-F',
    );
  });

  test('dirty-buffer-warning-009: R-F on clean file sends path without warning', async () => {
    const cleanUri = createWorkspaceFile('clean-rf', 'clean content\n');
    const editor = await openEditor(cleanUri);

    assert.ok(!editor.document.isDirty, 'Expected document to be clean');

    const logCapture = getLogCapture();
    logCapture.mark('before-clean-rf');

    await vscode.env.clipboard.writeText('rangelink-clean-rf-sentinel');
    await vscode.commands.executeCommand('rangelink.sendCurrentFilePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      'rangelink-clean-rf-sentinel',
      'Expected clipboard to contain a file path — clean file should not trigger warning',
    );

    const lines = logCapture.getLinesSince('before-clean-rf');
    const warningLog = lines.find((l) => l.includes('handleDirtyBufferWarning'));
    assert.strictEqual(
      warningLog,
      undefined,
      'Expected no dirty buffer warning log for clean file',
    );

    await closeAllEditors();
    cleanupFiles([cleanUri]);
  });
});

suite('Dirty Buffer Warning — Dialog Interaction', () => {
  const log = createLogger('dirtyBufferDialog');
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    await activateExtension();
    testFileUri = createWorkspaceFile('dirty-dialog', 'original content\n');
    printAssistedBanner();
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  teardown(async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', undefined, vscode.ConfigurationTarget.Workspace);
    await closeAllEditors();
    await settle();
  });

  test('[assisted] dirty-buffer-warning-010: R-L Save & Generate saves file and generates link', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-save\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await vscode.env.clipboard.writeText('rl-save-sentinel');

    await waitForHuman('dirty-buffer-warning-010', 'R-C on dirty file → click "Save & Generate"', [
      'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
      'Click "Save & Generate".',
    ]);

    await settle();
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(
      clipboard,
      'rl-save-sentinel',
      'Expected clipboard to change from sentinel',
    );
    assert.ok(clipboard.includes('#L'), `Expected a RangeLink on clipboard but got: ${clipboard}`);
    assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Generate');

    log('✓ R-L Save & Generate: file saved, link generated');
  });

  test('[assisted] dirty-buffer-warning-011: R-L Generate Anyway sends link without saving', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-anyway\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await vscode.env.clipboard.writeText('rl-anyway-sentinel');

    await waitForHuman('dirty-buffer-warning-011', 'R-C on dirty file → click "Generate Anyway"', [
      'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
      'Click "Generate Anyway".',
    ]);

    await settle();
    const clipboard = await vscode.env.clipboard.readText();

    assert.notStrictEqual(clipboard, 'rl-anyway-sentinel', 'Expected clipboard to change');
    assert.ok(clipboard.includes('#L'), `Expected a RangeLink on clipboard but got: ${clipboard}`);
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Generate Anyway');

    log('✓ R-L Generate Anyway: link generated, file still dirty');
  });

  test('[assisted] dirty-buffer-warning-012: R-L dismiss aborts link generation', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-dismiss\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await vscode.env.clipboard.writeText('rl-dismiss-sentinel');

    await waitForHuman(
      'dirty-buffer-warning-012',
      'R-C on dirty file → dismiss the dialog (press Escape or click X)',
      [
        'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
        'Press Escape or click the X to dismiss.',
      ],
    );

    await settle();
    const clipboard = await vscode.env.clipboard.readText();

    assert.strictEqual(
      clipboard,
      'rl-dismiss-sentinel',
      'Expected clipboard unchanged — dismiss should abort',
    );
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty');

    log('✓ R-L dismiss: no link generated, clipboard unchanged');
  });

  test('[assisted] dirty-buffer-warning-013: R-F Save & Send saves file and sends path', async () => {
    const terminal = vscode.window.createTerminal('dirty-buffer-test');
    terminal.show();
    await settle();

    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rf-save\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    const logCapture = getLogCapture();
    logCapture.mark('before-rf-save');

    await waitForHuman(
      'dirty-buffer-warning-013',
      'R-F on dirty file → click "Save & Send" → pick the terminal',
      [
        'Press Cmd+R Cmd+F — the dirty buffer dialog should appear.',
        'Click "Save & Send".',
        'A destination picker will appear — select "dirty-buffer-test" terminal.',
      ],
    );

    await settle();

    assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Send');

    const lines = logCapture.getLinesSince('before-rf-save');
    const sendLog = lines.find(
      (l) => l.includes('FilePathPaster.pasteFilePath') && l.includes('Resolved file path'),
    );
    assert.ok(sendLog, 'Expected file path to be resolved and sent after Save & Send');

    terminal.dispose();
    log('✓ R-F Save & Send: file saved, path sent');
  });

  test('[assisted] dirty-buffer-warning-014: R-F Send Anyway sends path without saving', async () => {
    const terminal = vscode.window.createTerminal('dirty-buffer-test');
    terminal.show();
    await settle();

    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rf-anyway\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    const logCapture = getLogCapture();
    logCapture.mark('before-rf-anyway');

    await waitForHuman(
      'dirty-buffer-warning-014',
      'R-F on dirty file → click "Send Anyway" → pick the terminal',
      [
        'Press Cmd+R Cmd+F — the dirty buffer dialog should appear.',
        'Click "Send Anyway".',
        'A destination picker will appear — select "dirty-buffer-test" terminal.',
      ],
    );

    await settle();

    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Send Anyway');

    const lines = logCapture.getLinesSince('before-rf-anyway');
    const sendLog = lines.find(
      (l) => l.includes('FilePathPaster.pasteFilePath') && l.includes('Resolved file path'),
    );
    assert.ok(sendLog, 'Expected file path to be resolved and sent after Send Anyway');

    terminal.dispose();
    log('✓ R-F Send Anyway: path sent, file still dirty');
  });

  test('[assisted] dirty-buffer-warning-015: R-F dismiss aborts file path send', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rf-dismiss\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    await vscode.env.clipboard.writeText('rf-dismiss-sentinel');

    await waitForHuman(
      'dirty-buffer-warning-015',
      'R-F on dirty file → dismiss the dialog (press Escape or click X)',
      [
        'Press Cmd+R Cmd+F — the dirty buffer dialog should appear.',
        'Press Escape or click the X to dismiss.',
      ],
    );

    await settle();
    const clipboard = await vscode.env.clipboard.readText();

    assert.strictEqual(
      clipboard,
      'rf-dismiss-sentinel',
      'Expected clipboard unchanged — dismiss should abort',
    );
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty');

    log('✓ R-F dismiss: no path sent, clipboard unchanged');
  });

  test('[assisted] dirty-buffer-warning-016: R-L clipboard preserved after dirty buffer dialog with bound destination', async () => {
    const editor = await openEditor(testFileUri);

    await waitForHuman('dirty-buffer-warning-016-bind', 'Bind to a terminal via Cmd+R Cmd+D', [
      'Press Cmd+R Cmd+D and select any terminal from the picker.',
    ]);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// clipboard-preserve-rl\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await writeClipboardSentinel();

    await waitForHuman(
      'dirty-buffer-warning-016-dialog',
      'R-L on dirty file → click "Generate Anyway"',
      ['Press Cmd+R Cmd+L — the dirty buffer dialog should appear.', 'Click "Generate Anyway".'],
    );

    await settle();

    await assertClipboardRestored(
      'R-L with bound destination + dirty buffer dialog: clipboard should be restored after send',
    );

    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();
    const pastedLog = allLines.find(
      (l) => l.includes('Pasted link to') || l.includes('Link copied to clipboard'),
    );
    assert.ok(pastedLog, 'Expected link to be sent to the bound destination');

    log('✓ R-L dirty + bound destination: clipboard preserved after Generate Anyway');
  });

  test('[assisted] dirty-buffer-warning-017: R-F clipboard preserved after dirty buffer dialog with bound destination', async () => {
    const editor = await openEditor(testFileUri);

    await waitForHuman('dirty-buffer-warning-017-bind', 'Bind to a terminal via Cmd+R Cmd+D', [
      'Press Cmd+R Cmd+D and select any terminal from the picker.',
    ]);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// clipboard-preserve-rf\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    await writeClipboardSentinel();

    await waitForHuman(
      'dirty-buffer-warning-017-dialog',
      'R-F on dirty file → click "Send Anyway"',
      ['Press Cmd+R Cmd+F — the dirty buffer dialog should appear.', 'Click "Send Anyway".'],
    );

    await settle();

    await assertClipboardRestored(
      'R-F with bound destination + dirty buffer dialog: clipboard should be restored after send',
    );

    log('✓ R-F dirty + bound destination: clipboard preserved after Send Anyway');
  });
});
