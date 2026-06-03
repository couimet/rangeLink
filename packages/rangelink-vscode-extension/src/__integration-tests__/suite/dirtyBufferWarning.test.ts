import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_COPY_LINK_ONLY_RELATIVE, CMD_COPY_LINK_RELATIVE } from '../../constants/commandIds';
import {
  assertClipboardEqualsGeneratedLink,
  assertTerminalBufferContains,
  assertTerminalBufferEquals,
  assertTerminalBufferEqualsGeneratedLink,
  createFileAt,
  getLogCapture,
  standardSuite,
  waitForHuman,
  withClipboardRestored,
  withClipboardSentinel,
} from '../helpers';

standardSuite('Dirty Buffer Warning', (ss) => {
  test('dirty-buffer-warning-004: warnOnDirtyBuffer=false — R-C generates link without showing warning dialog', async () => {
    const testFileUri = ss.createWorkspaceFile('dirty', 'const x = 1;\n');
    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// dirty\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

    ss.expectStatusBarMessages(['✓ RangeLink: RangeLink copied to clipboard']);
    await assertClipboardEqualsGeneratedLink(
      'warnOnDirtyBuffer=false should bypass dialog',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-004',
    );
    assert.ok(
      editor.document.isDirty,
      'Expected document to remain dirty — setting disabled should not trigger a save',
    );
  });

  test('[assisted] dirty-buffer-warning-008: warnOnDirtyBuffer=false — R-F sends file path without showing warning dialog', async () => {
    const testFileUri = ss.createWorkspaceFile('dirty', 'const x = 1;\n');
    const capturing = await ss.createCapturingTerminal('dirty-buffer-test');

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: File path sent to Terminal ("dirty-buffer-test")',
    ]);

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// rf-dirty\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

    const logCapture = getLogCapture();
    logCapture.mark('before-008');
    capturing.clearCaptured();

    await waitForHuman(
      'dirty-buffer-warning-008',
      'R-F on dirty file with warnOnDirtyBuffer=false → NO dialog, then pick terminal',
      [
        'Press Cmd+R Cmd+F — confirm the dirty buffer dialog does NOT appear.',
        'When the destination picker appears, select "dirty-buffer-test" terminal.',
      ],
    );

    await ss.settle();

    assert.ok(
      editor.document.isDirty,
      'Expected document to remain dirty — setting disabled should not trigger a save',
    );

    const relativePath = vscode.workspace.asRelativePath(testFileUri, false);
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);

    const lines = logCapture.getLinesSince('before-008');
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
  });

  test('[assisted] dirty-buffer-warning-009: R-F on clean file sends path without warning', async () => {
    const capturing = await ss.createCapturingTerminal('dirty-buffer-test');

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: File path sent to Terminal ("dirty-buffer-test")',
    ]);

    const cleanUri = ss.createWorkspaceFile('clean-rf', 'clean content\n');

    const editor = await ss.openEditor(cleanUri);
    assert.ok(!editor.document.isDirty, 'Expected document to be clean');

    const logCapture = getLogCapture();
    logCapture.mark('before-clean-rf');
    capturing.clearCaptured();

    await waitForHuman(
      'dirty-buffer-warning-009',
      'R-F on clean file → NO dialog, then pick terminal',
      [
        'Press Cmd+R Cmd+F — confirm the dirty buffer dialog does NOT appear.',
        'When the destination picker appears, select "dirty-buffer-test" terminal.',
      ],
    );

    await ss.settle();

    assert.ok(!editor.document.isDirty, 'Expected document to remain clean');

    const relativePath = vscode.workspace.asRelativePath(cleanUri, false);
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);

    const lines = logCapture.getLinesSince('before-clean-rf');
    const warningLog = lines.find((l) => l.includes('handleDirtyBufferWarning'));
    assert.strictEqual(
      warningLog,
      undefined,
      'Expected no dirty buffer warning log for clean file',
    );
  });

  test('[assisted] dirty-buffer-warning-018: warnOnDirtyBuffer=false — R-L sends link to bound destination without warning dialog', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("dirty-buffer-test")',
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty', 'const x = 1;\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// rl-bypass\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

    capturing.clearCaptured();

    const logCapture = getLogCapture();
    await withClipboardSentinel('before-018', 'R-L', async () => {
      await waitForHuman(
        'dirty-buffer-warning-018-dispatch',
        'R-L on dirty file with warnOnDirtyBuffer=false → confirm NO dialog appears',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+L (Send RangeLink) — confirm the dirty buffer dialog does NOT appear.',
        ],
      );
      await ss.settle();
    });

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

    assertTerminalBufferContains(capturing.getCapturedText(), 'dirty');

    assert.ok(
      editor.document.isDirty,
      'Expected document to remain dirty — setting disabled should not trigger a save',
    );
  });

  test('dirty-buffer-warning-006: warnOnDirtyBuffer=false — R-L sends link to bound destination without dialog', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("dirty-buffer-test")',
    ]);

    const testFileUri = ss.createWorkspaceFile('dirty', 'const x = 1;\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// dirty-006\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

    await vscode.workspace
      .getConfiguration('rangelink')
      .update('warnOnDirtyBuffer', false, vscode.ConfigurationTarget.Workspace);

    capturing.clearCaptured();

    const logCapture = getLogCapture();
    await withClipboardSentinel('before-006', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });

    const lines = logCapture.getLinesSince('before-006');
    const disabledLog = lines.find(
      (l) =>
        l.includes('handleDirtyBufferWarning') &&
        l.includes('Document has unsaved changes but warning is disabled by setting'),
    );
    assert.ok(
      disabledLog,
      'Expected "disabled by setting" log — warnOnDirtyBuffer=false must short-circuit the dialog',
    );

    const dialogLog = lines.find(
      (l) =>
        l.includes('handleDirtyBufferWarning') &&
        l.includes('Document has unsaved changes, showing warning'),
    );
    assert.strictEqual(
      dialogLog,
      undefined,
      'Expected no dialog log — setting should bypass dialog',
    );

    assertTerminalBufferEqualsGeneratedLink(capturing, 'before-006');

    assert.ok(
      editor.document.isDirty,
      'Expected document to remain dirty — bypass must not trigger save',
    );
  });

  test('dirty-buffer-warning-019: R-C on clean file generates link without warning dialog', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: RangeLink copied to clipboard']);
    const cleanUri = ss.createWorkspaceFile('clean-rc', 'clean rc content\n');

    const editor = await ss.openEditor(cleanUri);
    assert.ok(!editor.document.isDirty, 'Expected document to be clean');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 5));

    await assertClipboardEqualsGeneratedLink(
      'R-C on clean file should generate link without warning',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-019',
    );
    assert.ok(!editor.document.isDirty, 'Expected document to remain clean');

    const lines = getLogCapture().getLinesSince('before-019');
    const warningLog = lines.find((l) => l.includes('handleDirtyBufferWarning'));
    assert.strictEqual(
      warningLog,
      undefined,
      'Expected no dirty buffer warning log for clean file — Clean early-return must not emit logs',
    );
  });

  test('dirty-buffer-warning-007: clean file generates link immediately without dialog', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("dirty-buffer-test")',
    ]);
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const cleanUri = ss.createWorkspaceFile('clean-rl-007', 'line 1\nline 2\nline 3\nline 4\n');

    const editor = await ss.openEditor(cleanUri);
    editor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(3, 0));
    await editor.document.save();
    await ss.settle();
    capturing.clearCaptured();
    getLogCapture().mark('before-007');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();
    assertTerminalBufferEqualsGeneratedLink(capturing, 'before-007');
  });
});

standardSuite('Dirty Buffer Warning — Dialog Interaction', (ss) => {
  test('[assisted] dirty-buffer-warning-002: dirty buffer dialog shows Save & Generate, Generate Anyway, and dismiss options', async () => {
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');

    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("dirty-buffer-test")']);

    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);

    ss.expectToastMessages([
      {
        level: 'info',
        message: 'Operation cancelled — file has unsaved changes.',
      },
    ]);

    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// dirty-002\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

    capturing.clearCaptured();

    await withClipboardSentinel(
      'before-002',
      'R-L',
      async () => {
        await waitForHuman(
          'dirty-buffer-warning-002',
          'R-L on dirty file → dismiss the dialog (press Escape or click X)',
          [
            'Click in the editor and select some text (the first word is fine).',
            'Press Cmd+R Cmd+L — the dirty buffer dialog should appear.',
            'Press Escape or click the X to dismiss.',
          ],
        );
        await ss.settle();
      },
      { expectPreserved: false },
    );

    assertTerminalBufferEquals(capturing.getCapturedText(), '');

    ss.log('✓ Dialog dismissed, terminal unchanged');
  });

  test('[assisted] dirty-buffer-warning-003: R-L Save & Generate saves file and sends link to bound destination', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("dirty-buffer-test")',
    ]);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// dirty-003\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    capturing.clearCaptured();

    await withClipboardSentinel('before-003', 'R-L', async () => {
      await waitForHuman(
        'dirty-buffer-warning-003',
        'R-L on dirty file → click "Save & Generate"',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+L — the dirty buffer dialog should appear.',
          'Click "Save & Generate".',
        ],
      );
      await ss.settle();
    });

    assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Generate');

    assertTerminalBufferContains(capturing.getCapturedText(), 'dirty');

    ss.log('✓ R-L Save & Generate: file saved, link sent to terminal');
  });

  test('[assisted] dirty-buffer-warning-005: R-L dismiss aborts link generation, terminal unchanged', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("dirty-buffer-test")']);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    ss.expectToastMessages([
      {
        level: 'info',
        message: 'Operation cancelled — file has unsaved changes.',
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// dirty-005\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 8));

    capturing.clearCaptured();

    await withClipboardSentinel(
      'before-005',
      'R-L',
      async () => {
        await waitForHuman(
          'dirty-buffer-warning-005',
          'R-L on dirty file → dismiss the dialog (press Escape or click X)',
          [
            'Click in the editor and ensure some text is selected.',
            'Press Cmd+R Cmd+L — the dirty buffer dialog should appear.',
            'Press Escape or click the X to dismiss.',
          ],
        );
        await ss.settle();
      },
      { expectPreserved: false },
    );

    assertTerminalBufferEquals(capturing.getCapturedText(), '');
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after dismiss');

    ss.log('✓ R-L dismiss: terminal unchanged, file still dirty');
  });

  test('[assisted] dirty-buffer-warning-010: R-C Save & Generate saves file and generates link', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: RangeLink copied to clipboard']);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rc-save\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await assertClipboardEqualsGeneratedLink(
      'R-C Save & Generate should write link to clipboard',
      async () => {
        await waitForHuman(
          'dirty-buffer-warning-010',
          'R-C on dirty file → click "Save & Generate"',
          [
            'Click in the editor and select some text (the first word is fine).',
            'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
            'Click "Save & Generate".',
          ],
        );
        await ss.settle();
      },
      'before-010',
    );
    assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Generate');

    ss.log('✓ R-C Save & Generate: file saved, link generated');
  });

  test('[assisted] dirty-buffer-warning-011: R-C Generate Anyway sends link without saving', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: RangeLink copied to clipboard']);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rc-anyway\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await assertClipboardEqualsGeneratedLink(
      'R-C Generate Anyway should write link to clipboard',
      async () => {
        await waitForHuman(
          'dirty-buffer-warning-011',
          'R-C on dirty file → click "Generate Anyway"',
          [
            'Click in the editor and select some text (the first word is fine).',
            'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
            'Click "Generate Anyway".',
          ],
        );
        await ss.settle();
      },
      'before-011',
    );
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Generate Anyway');

    ss.log('✓ R-C Generate Anyway: link generated, file still dirty');
  });

  test('[assisted] dirty-buffer-warning-012: R-C dismiss aborts link generation', async () => {
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    ss.expectToastMessages([
      {
        level: 'info',
        message: 'Operation cancelled — file has unsaved changes.',
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rc-dismiss\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    await withClipboardRestored('dismiss should abort — clipboard unchanged', async () => {
      await waitForHuman(
        'dirty-buffer-warning-012',
        'R-C on dirty file → dismiss the dialog (press Escape or click X)',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+C (Copy RangeLink) — the dirty buffer dialog should appear.',
          'Press Escape or click the X to dismiss.',
        ],
      );
      await ss.settle();
    });
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty');

    ss.log('✓ R-C dismiss: no link generated, clipboard unchanged');
  });

  test('[assisted] dirty-buffer-warning-013: R-F Save & Send saves file and sends path', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: File path sent to Terminal ("dirty-buffer-test")',
    ]);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. The AI tool may read stale content from disk.',
        items: ['Save & Send', 'Send Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rf-save\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    const logCapture = getLogCapture();
    logCapture.mark('before-rf-save');
    capturing.clearCaptured();

    await waitForHuman(
      'dirty-buffer-warning-013',
      'R-F on dirty file → click "Save & Send" → pick the terminal',
      [
        'Press Cmd+R Cmd+F — the dirty buffer dialog should appear.',
        'Click "Save & Send".',
        'A destination picker will appear — select "dirty-buffer-test" terminal.',
      ],
    );

    await ss.settle();

    assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Send');

    const relativePath = vscode.workspace.asRelativePath(testFileUri, false);
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);

    ss.log('✓ R-F Save & Send: file saved, path sent (pty capture verified content)');
  });

  test('[assisted] dirty-buffer-warning-014: R-F Send Anyway sends path without saving', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: File path sent to Terminal ("dirty-buffer-test")',
    ]);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. The AI tool may read stale content from disk.',
        items: ['Save & Send', 'Send Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rf-anyway\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    const logCapture = getLogCapture();
    logCapture.mark('before-rf-anyway');
    capturing.clearCaptured();

    await waitForHuman(
      'dirty-buffer-warning-014',
      'R-F on dirty file → click "Send Anyway" → pick the terminal',
      [
        'Press Cmd+R Cmd+F — the dirty buffer dialog should appear.',
        'Click "Send Anyway".',
        'A destination picker will appear — select "dirty-buffer-test" terminal.',
      ],
    );

    await ss.settle();

    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Send Anyway');

    const relativePath = vscode.workspace.asRelativePath(testFileUri, false);
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);

    ss.log('✓ R-F Send Anyway: path sent, file still dirty (pty capture verified content)');
  });

  test('[assisted] dirty-buffer-warning-015: R-F dismiss aborts file path send', async () => {
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. The AI tool may read stale content from disk.',
        items: ['Save & Send', 'Send Anyway'],
      },
    ]);
    ss.expectToastMessages([
      {
        level: 'info',
        message: 'Operation cancelled — file has unsaved changes.',
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rf-dismiss\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    await withClipboardRestored('dismiss should abort — clipboard unchanged', async () => {
      await waitForHuman(
        'dirty-buffer-warning-015',
        'R-F on dirty file → dismiss the dialog (press Escape or click X)',
        [
          'Press Cmd+R Cmd+F — the dirty buffer dialog should appear.',
          'Press Escape or click the X to dismiss.',
        ],
      );
      await ss.settle();
    });
    assert.ok(editor.document.isDirty, 'Expected document to remain dirty');

    ss.log('✓ R-F dismiss: no path sent, clipboard unchanged');
  });

  test('[assisted] dirty-buffer-warning-016: R-L clipboard preserved after dirty buffer dialog with bound destination', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("dirty-buffer-test")',
    ]);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// clipboard-preserve-rl\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    capturing.clearCaptured();

    await withClipboardSentinel('before -rl-clipboard-preserve', 'R-L', async () => {
      await waitForHuman(
        'dirty-buffer-warning-016-dialog',
        'R-L on dirty file → click "Generate Anyway"',
        ['Press Cmd+R Cmd+L — the dirty buffer dialog should appear.', 'Click "Generate Anyway".'],
      );
      await ss.settle();
    });

    assertTerminalBufferContains(capturing.getCapturedText(), 'dirty');

    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Generate Anyway');

    ss.log(
      '✓ R-L dirty + bound destination: link landed in terminal; clipboard preserved after Generate Anyway',
    );
  });

  test('[assisted] dirty-buffer-warning-017: R-F clipboard preserved after dirty buffer dialog with bound destination', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: File path sent to Terminal ("dirty-buffer-test")',
    ]);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. The AI tool may read stale content from disk.',
        items: ['Save & Send', 'Send Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// clipboard-preserve-rf\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    capturing.clearCaptured();

    await withClipboardSentinel('before-rf-clipboard-preserve', 'R-F', async () => {
      await waitForHuman(
        'dirty-buffer-warning-017-dialog',
        'R-F on dirty file → click "Send Anyway"',
        ['Press Cmd+R Cmd+F — the dirty buffer dialog should appear.', 'Click "Send Anyway".'],
      );
      await ss.settle();
    });

    const relativePath = vscode.workspace.asRelativePath(testFileUri, false);
    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${relativePath} `);

    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Send Anyway');

    ss.log(
      '✓ R-F dirty + bound destination: path landed in terminal; clipboard preserved after Send Anyway',
    );
  });

  test('[assisted] dirty-buffer-warning-020: R-L Save & Generate saves file and sends link to bound destination', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("dirty-buffer-test")',
    ]);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-save\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    capturing.clearCaptured();

    await withClipboardSentinel('before-020', 'R-L', async () => {
      await waitForHuman(
        'dirty-buffer-warning-020-dialog',
        'R-L on dirty file → click "Save & Generate"',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+L (Send RangeLink) — the dirty buffer dialog should appear.',
          'Click "Save & Generate".',
        ],
      );
      await ss.settle();
    });

    assertTerminalBufferContains(capturing.getCapturedText(), 'dirty');

    assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Generate');

    ss.log('✓ R-L Save & Generate: file saved, link landed in terminal');
  });

  test('[assisted] dirty-buffer-warning-021: R-L Generate Anyway sends link without saving', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("dirty-buffer-test")',
    ]);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-anyway\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    capturing.clearCaptured();

    await withClipboardSentinel('before-021', 'R-L', async () => {
      await waitForHuman(
        'dirty-buffer-warning-021-dialog',
        'R-L on dirty file → click "Generate Anyway"',
        [
          'Click in the editor and select some text (the first word is fine).',
          'Press Cmd+R Cmd+L (Send RangeLink) — the dirty buffer dialog should appear.',
          'Click "Generate Anyway".',
        ],
      );
      await ss.settle();
    });

    assertTerminalBufferContains(capturing.getCapturedText(), 'dirty');

    assert.ok(editor.document.isDirty, 'Expected document to remain dirty after Generate Anyway');

    ss.log('✓ R-L Generate Anyway: link landed in terminal, file still dirty');
  });

  test('[assisted] dirty-buffer-warning-022: R-L dismiss aborts link generation', async () => {
    ss.expectStatusBarMessages(['✓ RangeLink: Bound to Terminal ("dirty-buffer-test")']);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    ss.expectToastMessages([
      {
        level: 'info',
        message: 'Operation cancelled — file has unsaved changes.',
      },
    ]);
    const testFileUri = ss.createWorkspaceFile('dirty-dialog', 'original content\n');
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const editor = await ss.openEditor(testFileUri);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// assisted-rl-dismiss\n');
    });
    assert.ok(editor.document.isDirty, 'Expected document to be dirty');

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 10));

    capturing.clearCaptured();

    await withClipboardSentinel(
      'before-022',
      'R-L',
      async () => {
        await waitForHuman(
          'dirty-buffer-warning-022-dialog',
          'R-L on dirty file → dismiss the dialog (press Escape or click X)',
          [
            'Click in the editor and select some text (the first word is fine).',
            'Press Cmd+R Cmd+L (Send RangeLink) — the dirty buffer dialog should appear.',
            'Press Escape or click the X to dismiss.',
          ],
        );
        await ss.settle();
      },
      { expectPreserved: false },
    );

    assertTerminalBufferEquals(capturing.getCapturedText(), '');

    assert.ok(editor.document.isDirty, 'Expected document to remain dirty');

    ss.log('✓ R-L dismiss: terminal buffer empty (no send occurred)');
  });

  test('[assisted] dirty-buffer-warning-023: R-L Save & Generate re-reads selections after save mutates document', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Terminal ("dirty-buffer-test")',
      '✓ RangeLink: RangeLink sent to Terminal ("dirty-buffer-test")',
    ]);
    ss.expectModalDialogs([
      {
        level: 'warning',
        message: 'File has unsaved changes. Link may point to wrong position after save.',
        items: ['Save & Generate', 'Generate Anyway'],
      },
    ]);
    const TRAILING_SPACES = 5;
    const TARGET_LINE_BASE = "export const targetLine = 'shift me';";
    const REFERENCE_LINE_BASE = "export const referenceLine = 'no trim';";
    const TARGET_LINE = `${TARGET_LINE_BASE}${' '.repeat(TRAILING_SPACES)}`;
    const REFERENCE_LINE = `${REFERENCE_LINE_BASE}${' '.repeat(TRAILING_SPACES)}`;
    const FIXTURE_CONTENT = `${TARGET_LINE}\n${REFERENCE_LINE}\n`;

    const TARGET_LINE_BASE_LEN = TARGET_LINE_BASE.length;
    const PRE_TRIM_LINE_LEN = TARGET_LINE.length;
    const SELECTION_START_COL = 3;
    const SELECTION_END_COL_PRE_TRIM = PRE_TRIM_LINE_LEN - 1;

    const testFileUri = createFileAt('__rl-test-dirty-fmt-023.ts', FIXTURE_CONTENT);
    const capturing = await ss.createAndBindCapturingTerminal('dirty-buffer-test');

    const filesConfig = vscode.workspace.getConfiguration('files');
    const originalTrimTrailingWhitespace =
      filesConfig.inspect('trimTrailingWhitespace')?.workspaceValue;
    await filesConfig.update('trimTrailingWhitespace', true, vscode.ConfigurationTarget.Workspace);

    try {
      const editor = await ss.openEditor(testFileUri);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// 023\n');
      });
      assert.ok(editor.document.isDirty, 'Expected document to be dirty after edit');

      const targetLineIdx = 1;
      editor.selection = new vscode.Selection(
        new vscode.Position(targetLineIdx, SELECTION_START_COL),
        new vscode.Position(targetLineIdx, SELECTION_END_COL_PRE_TRIM),
      );

      capturing.clearCaptured();

      const logCapture = getLogCapture();
      await withClipboardSentinel('before-023', 'R-L', async () => {
        await waitForHuman(
          'dirty-buffer-warning-023-dialog',
          'R-L on dirty file with trim-on-save → click "Save & Generate"',
          [
            'The editor is focused with a precise column range selected on line 2 (not the full line).',
            'Press Cmd+R Cmd+L (Send RangeLink) — the dirty buffer dialog should appear.',
            'Click "Save & Generate".',
          ],
        );
        await ss.settle();
      });

      const lines = logCapture.getLinesSince('before-023');

      const reReadLog = lines.find((l) =>
        l.includes(
          'Re-read selections after Save & Continue to account for possible format-on-save shifts',
        ),
      );
      assert.ok(
        reReadLog,
        'Expected LinkGenerator to log the post-save re-read — the fix path was not taken',
      );

      const preMatch = reReadLog.match(/"preSaveSelections":(\[[^\]]*\])/);
      const postMatch = reReadLog.match(/"postSaveSelections":(\[[^\]]*\])/);
      assert.ok(preMatch && postMatch, `Expected pre/post selections in log, got: ${reReadLog}`);

      const preSelections = JSON.parse(preMatch[1]) as Array<{
        end: { line: number; char: number };
      }>;
      const postSelections = JSON.parse(postMatch[1]) as Array<{
        end: { line: number; char: number };
      }>;

      assert.strictEqual(
        preSelections[0].end.char,
        SELECTION_END_COL_PRE_TRIM,
        `Pre-save end column should be ${SELECTION_END_COL_PRE_TRIM} (within trailing whitespace)`,
      );
      assert.strictEqual(
        preSelections[0].end.line,
        targetLineIdx,
        'Pre-save end line should match source line',
      );

      const postEndChar = postSelections[0].end.char;
      const postEndLine = postSelections[0].end.line;
      assert.ok(
        postEndChar < SELECTION_END_COL_PRE_TRIM,
        `Post-save end column (${postEndChar}) should be less than pre-save (${SELECTION_END_COL_PRE_TRIM}) after ${TRAILING_SPACES} spaces trimmed`,
      );
      assert.strictEqual(postEndLine, targetLineIdx, 'Post-save end line should be unchanged');
      assert.ok(
        postEndChar >= TARGET_LINE_BASE_LEN,
        `Post-save end column (${postEndChar}) should be >= text-only line length (${TARGET_LINE_BASE_LEN})`,
      );

      assert.ok(!editor.document.isDirty, 'Expected document to be saved after Save & Generate');

      assertTerminalBufferEqualsGeneratedLink(capturing, 'before-023');

      ss.log(
        '✓ R-L Save & Generate with trim-on-save: selections re-read, link coordinates correct',
      );
    } finally {
      await vscode.workspace
        .getConfiguration('files')
        .update(
          'trimTrailingWhitespace',
          originalTrimTrailingWhitespace,
          vscode.ConfigurationTarget.Workspace,
        );
    }
  });
});
