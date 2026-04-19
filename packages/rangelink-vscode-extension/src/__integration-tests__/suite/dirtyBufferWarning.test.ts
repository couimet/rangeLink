import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_COPY_LINK_ONLY_RELATIVE, CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  assertClipboardRestored,
  cleanupFiles,
  closeAllEditors,
  createAndBindTerminal,
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
    printAssistedBanner();
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  teardown(async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
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

    await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
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
    assert.ok(
      editor.document.isDirty,
      'Expected document to remain dirty — setting disabled should not trigger a save',
    );
  });

  test('[assisted] dirty-buffer-warning-008: warnOnDirtyBuffer=false — R-F sends file path without showing warning dialog', async () => {
    const terminal = vscode.window.createTerminal('dirty-buffer-test');
    terminal.show();
    await settle();

    try {
      const editor = await openEditor(testFileUri);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// rf-dirty\n');
      });
      assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

      await vscode.workspace
        .getConfiguration('rangelink')
        .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

      const logCapture = getLogCapture();
      logCapture.mark('before-008');

      await waitForHuman(
        'dirty-buffer-warning-008',
        'R-F on dirty file with warnOnDirtyBuffer=false → NO dialog, then pick terminal',
        [
          'Press Cmd+R Cmd+F — confirm the dirty buffer dialog does NOT appear.',
          'When the destination picker appears, select "dirty-buffer-test" terminal.',
        ],
      );

      await settle();

      assert.ok(
        editor.document.isDirty,
        'Expected document to remain dirty — setting disabled should not trigger a save',
      );

      const lines = logCapture.getLinesSince('before-008');
      const sendLog = lines.find(
        (l) => l.includes('FilePathPaster.pasteFilePath') && l.includes('Resolved file path'),
      );
      assert.ok(
        sendLog,
        'Expected file path to be resolved and sent — warnOnDirtyBuffer=false should bypass dialog for R-F',
      );

      const disabledLog = lines.find(
        (l) =>
          l.includes('handleDirtyBufferWarning') &&
          l.includes('Document has unsaved changes but warning is disabled by setting'),
      );
      assert.ok(
        disabledLog,
        'Expected "disabled by setting" log — setting should short-circuit the dialog',
      );
      const dialogLog = lines.find(
        (l) =>
          l.includes('handleDirtyBufferWarning') &&
          l.includes('Document has unsaved changes, showing warning'),
      );
      assert.strictEqual(
        dialogLog,
        undefined,
        'Expected no dialog log — setting should bypass the dialog',
      );
    } finally {
      terminal.dispose();
    }
  });

  test('[assisted] dirty-buffer-warning-009: R-F on clean file sends path without warning', async () => {
    const terminal = vscode.window.createTerminal('dirty-buffer-test');
    terminal.show();
    await settle();

    const cleanUri = createWorkspaceFile('clean-rf', 'clean content\n');

    try {
      const editor = await openEditor(cleanUri);
      assert.ok(!editor.document.isDirty, 'Expected document to be clean');

      const logCapture = getLogCapture();
      logCapture.mark('before-clean-rf');

      await waitForHuman(
        'dirty-buffer-warning-009',
        'R-F on clean file → NO dialog, then pick terminal',
        [
          'Press Cmd+R Cmd+F — confirm the dirty buffer dialog does NOT appear.',
          'When the destination picker appears, select "dirty-buffer-test" terminal.',
        ],
      );

      await settle();

      assert.ok(!editor.document.isDirty, 'Expected document to remain clean');

      const lines = logCapture.getLinesSince('before-clean-rf');
      const sendLog = lines.find(
        (l) => l.includes('FilePathPaster.pasteFilePath') && l.includes('Resolved file path'),
      );
      assert.ok(
        sendLog,
        'Expected file path to be resolved and sent — clean file should skip warning and proceed',
      );

      const warningLog = lines.find((l) => l.includes('handleDirtyBufferWarning'));
      assert.strictEqual(
        warningLog,
        undefined,
        'Expected no dirty buffer warning log for clean file',
      );
    } finally {
      terminal.dispose();
      await closeAllEditors();
      cleanupFiles([cleanUri]);
    }
  });

  test('[assisted] dirty-buffer-warning-018: warnOnDirtyBuffer=false — R-L sends link to bound destination without warning dialog', async () => {
    const terminal = await createAndBindTerminal('dirty-buffer-test');

    try {
      const editor = await openEditor(testFileUri);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// rl-bypass\n');
      });
      assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

      editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

      await vscode.workspace
        .getConfiguration('rangelink')
        .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

      await writeClipboardSentinel();

      const logCapture = getLogCapture();
      logCapture.mark('before-018');

      await waitForHuman(
        'dirty-buffer-warning-018-dispatch',
        'R-L on dirty file with warnOnDirtyBuffer=false → confirm NO dialog appears',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+L (Send RangeLink) — confirm the dirty buffer dialog does NOT appear.',
        ],
      );

      await settle();

      const lines = logCapture.getLinesSince('before-018');
      const disabledLog = lines.find(
        (l) =>
          l.includes('handleDirtyBufferWarning') &&
          l.includes('Document has unsaved changes but warning is disabled by setting'),
      );
      assert.ok(
        disabledLog,
        'Expected "disabled by setting" log — R-L path should short-circuit through handleDirtyBufferWarning',
      );

      const pastedLog = lines.find(
        (l) => l.includes('Pasted link to') || l.includes('Link copied to clipboard'),
      );
      assert.ok(pastedLog, 'Expected link to be sent to the bound destination');

      await assertClipboardRestored(
        'R-L with bound destination + warnOnDirtyBuffer=false: clipboard should be restored to sentinel after send',
      );

      assert.ok(
        editor.document.isDirty,
        'Expected document to remain dirty — setting disabled should not trigger a save',
      );
    } finally {
      terminal.dispose();
    }
  });

  test('dirty-buffer-warning-019: R-C on clean file generates link without warning dialog', async () => {
    const cleanUri = createWorkspaceFile('clean-rc', 'clean rc content\n');

    try {
      const editor = await openEditor(cleanUri);
      assert.ok(!editor.document.isDirty, 'Expected document to be clean');

      editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 5));

      await vscode.env.clipboard.writeText('rangelink-rc-clean-sentinel');

      const logCapture = getLogCapture();
      logCapture.mark('before-019');

      await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
      const clipboard = await vscode.env.clipboard.readText();

      assert.notStrictEqual(
        clipboard,
        'rangelink-rc-clean-sentinel',
        'Expected clipboard to contain a generated link, not the sentinel',
      );
      assert.ok(
        clipboard.includes('#L'),
        `Expected clipboard to contain a line reference but got: ${clipboard}`,
      );
      assert.ok(!editor.document.isDirty, 'Expected document to remain clean');

      const lines = logCapture.getLinesSince('before-019');
      const warningLog = lines.find((l) => l.includes('handleDirtyBufferWarning'));
      assert.strictEqual(
        warningLog,
        undefined,
        'Expected no dirty buffer warning log for clean file — Clean early-return must not emit logs',
      );
    } finally {
      await closeAllEditors();
      cleanupFiles([cleanUri]);
    }
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
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', undefined, vscode.ConfigurationTarget.Workspace);
    await closeAllEditors();
    await settle();
  });

  test('[assisted] dirty-buffer-warning-010: R-C Save & Generate saves file and generates link', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rc-save\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await vscode.env.clipboard.writeText('rc-save-sentinel');

    const logCapture = getLogCapture();
    logCapture.mark('before-010');

    await waitForHuman('dirty-buffer-warning-010', 'R-C on dirty file → click "Save & Generate"', [
      'Click in the editor and select some text (the first word is fine).',
      'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
      'Click "Save & Generate".',
    ]);

    await settle();
    const clipboard = await vscode.env.clipboard.readText();

    const lines = logCapture.getLinesSince('before-010');
    const showingWarningLog = lines.find(
      (l) =>
        l.includes('handleDirtyBufferWarning') &&
        l.includes('Document has unsaved changes, showing warning'),
    );
    assert.ok(
      showingWarningLog,
      'Expected handleDirtyBufferWarning to log "showing warning" — dialog must actually fire',
    );

    assert.notStrictEqual(
      clipboard,
      'rc-save-sentinel',
      'Expected clipboard to change from sentinel',
    );
    assert.ok(clipboard.includes('#L'), `Expected a RangeLink on clipboard but got: ${clipboard}`);
    assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Generate');

    log('✓ R-C Save & Generate: file saved, link generated');
  });

  test('[assisted] dirty-buffer-warning-011: R-C Generate Anyway sends link without saving', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rc-anyway\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await vscode.env.clipboard.writeText('rc-anyway-sentinel');

    const logCapture = getLogCapture();
    logCapture.mark('before-011');

    await waitForHuman('dirty-buffer-warning-011', 'R-C on dirty file → click "Generate Anyway"', [
      'Click in the editor and select some text (the first word is fine).',
      'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
      'Click "Generate Anyway".',
    ]);

    await settle();
    const clipboard = await vscode.env.clipboard.readText();

    const lines = logCapture.getLinesSince('before-011');
    const showingWarningLog = lines.find(
      (l) =>
        l.includes('handleDirtyBufferWarning') &&
        l.includes('Document has unsaved changes, showing warning'),
    );
    assert.ok(
      showingWarningLog,
      'Expected handleDirtyBufferWarning to log "showing warning" — dialog must actually fire',
    );

    assert.notStrictEqual(clipboard, 'rc-anyway-sentinel', 'Expected clipboard to change');
    assert.ok(clipboard.includes('#L'), `Expected a RangeLink on clipboard but got: ${clipboard}`);
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Generate Anyway');

    log('✓ R-C Generate Anyway: link generated, file still dirty');
  });

  test('[assisted] dirty-buffer-warning-012: R-C dismiss aborts link generation', async () => {
    const editor = await openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rc-dismiss\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await vscode.env.clipboard.writeText('rc-dismiss-sentinel');

    const logCapture = getLogCapture();
    logCapture.mark('before-012');

    await waitForHuman(
      'dirty-buffer-warning-012',
      'R-C on dirty file → dismiss the dialog (press Escape or click X)',
      [
        'Click in the editor and select some text (the first word is fine).',
        'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
        'Press Escape or click the X to dismiss.',
      ],
    );

    await settle();
    const clipboard = await vscode.env.clipboard.readText();

    const lines = logCapture.getLinesSince('before-012');
    const showingWarningLog = lines.find(
      (l) =>
        l.includes('handleDirtyBufferWarning') &&
        l.includes('Document has unsaved changes, showing warning'),
    );
    assert.ok(
      showingWarningLog,
      'Expected handleDirtyBufferWarning to log "showing warning" — dialog must actually fire',
    );

    assert.strictEqual(
      clipboard,
      'rc-dismiss-sentinel',
      'Expected clipboard unchanged — dismiss should abort',
    );
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty');

    log('✓ R-C dismiss: no link generated, clipboard unchanged');
  });

  test('[assisted] dirty-buffer-warning-013: R-F Save & Send saves file and sends path', async () => {
    const terminal = vscode.window.createTerminal('dirty-buffer-test');
    terminal.show();
    await settle();

    try {
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

      log('✓ R-F Save & Send: file saved, path sent');
    } finally {
      terminal.dispose();
    }
  });

  test('[assisted] dirty-buffer-warning-014: R-F Send Anyway sends path without saving', async () => {
    const terminal = vscode.window.createTerminal('dirty-buffer-test');
    terminal.show();
    await settle();

    try {
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

      log('✓ R-F Send Anyway: path sent, file still dirty');
    } finally {
      terminal.dispose();
    }
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
    const terminal = await createAndBindTerminal('dirty-buffer-test');

    try {
      const editor = await openEditor(testFileUri);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// clipboard-preserve-rl\n');
      });
      assert.ok(editor.document.isDirty, 'Expected document to be dirty');

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, 10),
      );

      await writeClipboardSentinel();

      const logCapture = getLogCapture();
      logCapture.mark('before-rl-clipboard-preserve');

      await waitForHuman(
        'dirty-buffer-warning-016-dialog',
        'R-L on dirty file → click "Generate Anyway"',
        ['Press Cmd+R Cmd+L — the dirty buffer dialog should appear.', 'Click "Generate Anyway".'],
      );

      await settle();

      await assertClipboardRestored(
        'R-L with bound destination + dirty buffer dialog: clipboard should be restored after send',
      );

      const lines = logCapture.getLinesSince('before-rl-clipboard-preserve');
      const pastedLog = lines.find(
        (l) => l.includes('Pasted link to') || l.includes('Link copied to clipboard'),
      );
      assert.ok(pastedLog, 'Expected link to be sent to the bound destination');

      assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Generate Anyway');

      log('✓ R-L dirty + bound destination: clipboard preserved after Generate Anyway');
    } finally {
      terminal.dispose();
    }
  });

  test('[assisted] dirty-buffer-warning-017: R-F clipboard preserved after dirty buffer dialog with bound destination', async () => {
    const terminal = await createAndBindTerminal('dirty-buffer-test');

    try {
      const editor = await openEditor(testFileUri);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// clipboard-preserve-rf\n');
      });
      assert.ok(editor.document.isDirty, 'Expected document to be dirty');

      await writeClipboardSentinel();

      const logCapture = getLogCapture();
      logCapture.mark('before-rf-clipboard-preserve');

      await waitForHuman(
        'dirty-buffer-warning-017-dialog',
        'R-F on dirty file → click "Send Anyway"',
        ['Press Cmd+R Cmd+F — the dirty buffer dialog should appear.', 'Click "Send Anyway".'],
      );

      await settle();

      await assertClipboardRestored(
        'R-F with bound destination + dirty buffer dialog: clipboard should be restored after send',
      );

      const lines = logCapture.getLinesSince('before-rf-clipboard-preserve');
      const sendLog = lines.find(
        (l) => l.includes('FilePathPaster.pasteFilePath') && l.includes('Resolved file path'),
      );
      assert.ok(sendLog, 'Expected file path to be resolved and sent to the bound destination');

      assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Send Anyway');

      log('✓ R-F dirty + bound destination: clipboard preserved after Send Anyway');
    } finally {
      terminal.dispose();
    }
  });

  test('[assisted] dirty-buffer-warning-020: R-L Save & Generate saves file and sends link to bound destination', async () => {
    const terminal = await createAndBindTerminal('dirty-buffer-test');

    try {
      const editor = await openEditor(testFileUri);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-save\n');
      });
      assert.ok(editor.document.isDirty, 'Expected document to be dirty');

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, 10),
      );

      await writeClipboardSentinel();

      const logCapture = getLogCapture();
      logCapture.mark('before-020');

      await waitForHuman(
        'dirty-buffer-warning-020-dialog',
        'R-L on dirty file → click "Save & Generate"',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+L (Send RangeLink) — the dirty buffer dialog should appear.',
          'Click "Save & Generate".',
        ],
      );

      await settle();

      const lines = logCapture.getLinesSince('before-020');
      const showingWarningLog = lines.find(
        (l) =>
          l.includes('handleDirtyBufferWarning') &&
          l.includes('Document has unsaved changes, showing warning'),
      );
      assert.ok(
        showingWarningLog,
        'Expected handleDirtyBufferWarning to log "showing warning" — dialog must actually fire',
      );

      const pastedLog = lines.find(
        (l) => l.includes('Pasted link to') || l.includes('Link copied to clipboard'),
      );
      assert.ok(pastedLog, 'Expected link to be sent to the bound destination');

      await assertClipboardRestored(
        'R-L Save & Generate with bound destination: clipboard should be restored to sentinel after send',
      );

      assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Generate');

      log('✓ R-L Save & Generate: file saved, link sent to bound destination');
    } finally {
      terminal.dispose();
    }
  });

  test('[assisted] dirty-buffer-warning-021: R-L Generate Anyway sends link without saving', async () => {
    const terminal = await createAndBindTerminal('dirty-buffer-test');

    try {
      const editor = await openEditor(testFileUri);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-anyway\n');
      });
      assert.ok(editor.document.isDirty, 'Expected document to be dirty');

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, 10),
      );

      await writeClipboardSentinel();

      const logCapture = getLogCapture();
      logCapture.mark('before-021');

      await waitForHuman(
        'dirty-buffer-warning-021-dialog',
        'R-L on dirty file → click "Generate Anyway"',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+L (Send RangeLink) — the dirty buffer dialog should appear.',
          'Click "Generate Anyway".',
        ],
      );

      await settle();

      const lines = logCapture.getLinesSince('before-021');
      const showingWarningLog = lines.find(
        (l) =>
          l.includes('handleDirtyBufferWarning') &&
          l.includes('Document has unsaved changes, showing warning'),
      );
      assert.ok(
        showingWarningLog,
        'Expected handleDirtyBufferWarning to log "showing warning" — dialog must actually fire',
      );

      const pastedLog = lines.find(
        (l) => l.includes('Pasted link to') || l.includes('Link copied to clipboard'),
      );
      assert.ok(pastedLog, 'Expected link to be sent to the bound destination');

      await assertClipboardRestored(
        'R-L Generate Anyway with bound destination: clipboard should be restored to sentinel after send',
      );

      assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Generate Anyway');

      log('✓ R-L Generate Anyway: link sent to bound destination, file still dirty');
    } finally {
      terminal.dispose();
    }
  });

  test('[assisted] dirty-buffer-warning-022: R-L dismiss aborts link generation', async () => {
    const terminal = await createAndBindTerminal('dirty-buffer-test');

    try {
      const editor = await openEditor(testFileUri);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-dismiss\n');
      });
      assert.ok(editor.document.isDirty, 'Expected document to be dirty');

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, 10),
      );

      await writeClipboardSentinel();

      const logCapture = getLogCapture();
      logCapture.mark('before-022');

      await waitForHuman(
        'dirty-buffer-warning-022-dialog',
        'R-L on dirty file → dismiss the dialog (press Escape or click X)',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+L (Send RangeLink) — the dirty buffer dialog should appear.',
          'Press Escape or click the X to dismiss.',
        ],
      );

      await settle();

      const lines = logCapture.getLinesSince('before-022');
      const showingWarningLog = lines.find(
        (l) =>
          l.includes('handleDirtyBufferWarning') &&
          l.includes('Document has unsaved changes, showing warning'),
      );
      assert.ok(
        showingWarningLog,
        'Expected handleDirtyBufferWarning to log "showing warning" — dialog must actually fire',
      );

      const pastedLog = lines.find(
        (l) => l.includes('Pasted link to') || l.includes('Link copied to clipboard'),
      );
      assert.strictEqual(
        pastedLog,
        undefined,
        'Expected no paste log — dismiss should abort before sending',
      );

      await assertClipboardRestored(
        'R-L dismiss: clipboard should still have sentinel (no send occurred)',
      );

      assert.ok(editor.document.isDirty, 'Expected document to remain dirty');

      log('✓ R-L dismiss: no link sent, clipboard unchanged');
    } finally {
      terminal.dispose();
    }
  });
});
