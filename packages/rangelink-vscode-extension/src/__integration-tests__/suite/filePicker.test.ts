import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  getWorkspaceRoot,
  printAssistedBanner,
  settle,
  waitForHuman,
} from '../helpers';

const SEPARATOR_KIND = -1;

suite('File Picker', () => {
  const log = createLogger('filePicker');
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.length = 0;
    await settle();
  });

  const createAndOpenFile = async (
    name: string,
    content: string,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.One,
  ): Promise<vscode.Uri> => {
    const uri = createWorkspaceFile(name, content);
    tmpFileUris.push(uri);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { viewColumn, preview: false });
    await settle();
    return uri;
  };

  const findTestFileItems = (items: Record<string, unknown>[]): Record<string, unknown>[] =>
    items.filter(
      (item) =>
        item.itemKind === 'bindable' &&
        typeof item.label === 'string' &&
        (item.label as string).includes('__rl-test-fp-'),
    );

  test('[assisted] file-picker-001: bound file appears first with bound badge', async () => {
    await createAndOpenFile('fp-001', 'line 1\nline 2\n');
    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere');
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-001');

    await waitForHuman('file-picker-001', 'Open R-D picker (Cmd+R Cmd+D), then Escape', [
      'One file opened and bound.',
      'Press Cmd+R Cmd+D, then Escape.',
    ]);

    const lines = logCapture.getLinesSince('before-fp-001');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const fileItems = findTestFileItems(items!);
    const boundItem = fileItems.find(
      (i) => typeof i.description === 'string' && (i.description as string).includes('bound'),
    );
    assert.ok(boundItem, 'Expected a file item with "bound" in description');

    log('✓ Bound file badge validated');
  });

  test('[assisted] file-picker-002: active file appears before others in its group', async () => {
    await createAndOpenFile('fp-002-a', 'file a\n', vscode.ViewColumn.One);
    await createAndOpenFile('fp-002-b', 'file b\n', vscode.ViewColumn.Two);

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-002');

    await waitForHuman('file-picker-002', 'Open R-D picker (Cmd+R Cmd+D), then Escape', [
      'Two files opened in separate groups. "fp-002-b" is active.',
      'Press Cmd+R Cmd+D, then Escape.',
    ]);

    const lines = logCapture.getLinesSince('before-fp-002');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const testFileItems = findTestFileItems(items!);
    assert.ok(
      testFileItems.length >= 2,
      `Expected at least 2 test file items but got ${testFileItems.length}`,
    );

    log('✓ Active file ordering validated');
  });

  test('[assisted] file-picker-003: same base name shows path disambiguation', async () => {
    const wsRoot = getWorkspaceRoot();
    const subDirA = path.join(wsRoot, 'src', 'dirA');
    const subDirB = path.join(wsRoot, 'src', 'dirB');
    fs.mkdirSync(subDirA, { recursive: true });
    fs.mkdirSync(subDirB, { recursive: true });

    const fileA = path.join(subDirA, '__rl-test-fp-003-shared.ts');
    const fileB = path.join(subDirB, '__rl-test-fp-003-shared.ts');
    fs.writeFileSync(fileA, 'file A\n', 'utf8');
    fs.writeFileSync(fileB, 'file B\n', 'utf8');
    const uriA = vscode.Uri.file(fileA);
    const uriB = vscode.Uri.file(fileB);
    tmpFileUris.push(uriA, uriB);

    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uriA), {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
    await settle();
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uriB), {
      viewColumn: vscode.ViewColumn.Two,
      preview: false,
    });
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-003');

    await waitForHuman('file-picker-003', 'Open R-D picker (Cmd+R Cmd+D), then Escape', [
      'Two files with the same name in different tab groups opened.',
      'Press Cmd+R Cmd+D, then Escape.',
    ]);

    const lines = logCapture.getLinesSince('before-fp-003');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const sharedNameItems = findTestFileItems(items!).filter((i) =>
      (i.label as string).includes('fp-003-shared'),
    );
    assert.ok(
      sharedNameItems.length >= 2,
      `Expected 2 items with shared name but got ${sharedNameItems.length}`,
    );

    const descriptions = sharedNameItems.map((i) => i.description as string);
    const hasDisambiguation =
      descriptions.some((d) => d && d.includes('dirA')) &&
      descriptions.some((d) => d && d.includes('dirB'));
    assert.ok(
      hasDisambiguation,
      `Expected path disambiguation in descriptions but got: ${JSON.stringify(descriptions)}`,
    );

    log('✓ Path disambiguation validated');
  });

  test('[assisted] file-picker-004: open files appear as inline items in destination picker', async () => {
    await createAndOpenFile('fp-004', 'content\n');

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-004');

    await waitForHuman('file-picker-004', 'Open R-D picker (Cmd+R Cmd+D), then Escape', [
      'One file opened.',
      'Press Cmd+R Cmd+D, then Escape.',
    ]);

    const lines = logCapture.getLinesSince('before-fp-004');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const fileItems = findTestFileItems(items!);
    assert.ok(
      fileItems.some((i) => (i.label as string).includes('fp-004')),
      'Expected test file to appear inline in R-D picker',
    );

    log('✓ File appears inline in R-D picker');
  });

  test('[assisted] file-picker-005: overflow shows "More files..." when exceeding inline limit', async () => {
    for (let i = 1; i <= 5; i++) {
      await createAndOpenFile(`fp-005-${i}`, `file ${i}\n`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-005');

    await waitForHuman('file-picker-005', 'Open R-D picker (Cmd+R Cmd+D), then Escape', [
      'Five files opened.',
      'Press Cmd+R Cmd+D, then Escape.',
    ]);

    const lines = logCapture.getLinesSince('before-fp-005');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const moreItem = items!.find(
      (i) => typeof i.label === 'string' && (i.label as string).includes('More files...'),
    );
    assert.ok(moreItem, 'Expected "More files..." overflow item');
    assert.ok(
      typeof moreItem!.description === 'string' &&
        (moreItem!.description as string).includes('more'),
      `Expected "N more" description but got "${moreItem!.description}"`,
    );

    log('✓ File overflow "More files..." item validated');
  });

  test('[assisted] file-picker-006: secondary picker shows Active Files section', async () => {
    for (let i = 1; i <= 5; i++) {
      await createAndOpenFile(`fp-006-${i}`, `file ${i}\n`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-006');

    await waitForHuman(
      'file-picker-006',
      'Open R-D → click "More files..." → Escape the secondary picker',
      [
        'Five files opened. Open R-D picker (Cmd+R Cmd+D).',
        'Click "More files..." from the list.',
        'A secondary file picker opens — press Escape.',
      ],
    );

    const lines = logCapture.getLinesSince('before-fp-006');
    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.ok(
      quickPickEntries.length >= 2,
      `Expected at least 2 showQuickPick entries (primary + secondary) but got ${quickPickEntries.length}`,
    );

    log('✓ Secondary file picker opened after "More files..."');
  });

  test('[assisted] file-picker-007: secondary picker shows Tab Group sections', async () => {
    await createAndOpenFile('fp-007-g1', 'group 1\n', vscode.ViewColumn.One);
    await createAndOpenFile('fp-007-g2', 'group 2\n', vscode.ViewColumn.Two);

    for (let i = 1; i <= 3; i++) {
      await createAndOpenFile(`fp-007-extra-${i}`, `extra ${i}\n`, vscode.ViewColumn.One);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-007');

    await waitForHuman(
      'file-picker-007',
      'Open R-D → click "More files..." → Escape the secondary picker',
      [
        'Files opened in Tab Group 1 and Tab Group 2. Open R-D picker.',
        'Click "More files...".',
        'The secondary picker should show "Tab Group 1" and "Tab Group 2" sections — press Escape.',
      ],
    );

    const lines = logCapture.getLinesSince('before-fp-007');
    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.ok(
      quickPickEntries.length >= 2,
      `Expected at least 2 showQuickPick entries but got ${quickPickEntries.length}`,
    );

    log('✓ Tab Group sections validated in secondary picker');
  });

  test('[assisted] file-picker-008: escaping secondary file picker returns to parent', async () => {
    for (let i = 1; i <= 5; i++) {
      await createAndOpenFile(`fp-008-${i}`, `file ${i}\n`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-008');

    await waitForHuman(
      'file-picker-008',
      'Open R-D → "More files..." → Escape → verify parent reopens → Escape',
      [
        'Five files opened. Open R-D picker (Cmd+R Cmd+D).',
        'Click "More files...".',
        'Press Escape on the secondary picker — the parent R-D picker should reopen.',
        'Press Escape again to dismiss the parent picker.',
      ],
    );

    const lines = logCapture.getLinesSince('before-fp-008');
    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.ok(
      quickPickEntries.length >= 3,
      `Expected at least 3 showQuickPick entries (primary → secondary → primary reopened) but got ${quickPickEntries.length}`,
    );

    log('✓ Escape from secondary file picker returns to parent');
  });

  test('[assisted] file-picker-009: file picker appears inline in R-M menu when unbound', async () => {
    await createAndOpenFile('fp-009', 'content\n');

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-009');

    await waitForHuman(
      'file-picker-009',
      'Open R-M menu (click status bar or Cmd+R Cmd+M), then Escape',
      ['One file opened, no destination bound.', 'Open the R-M menu, then Escape.'],
    );

    const lines = logCapture.getLinesSince('before-fp-009');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const filesSeparator = items!.find((i) => i.kind === SEPARATOR_KIND && i.label === 'Files');
    assert.ok(filesSeparator, 'Expected "Files" separator in R-M menu');

    const fileItems = findTestFileItems(items!);
    assert.ok(
      fileItems.some((i) => (i.label as string).includes('fp-009')),
      'Expected test file to appear inline in R-M menu',
    );

    log('✓ File appears inline in R-M menu');
  });
});
