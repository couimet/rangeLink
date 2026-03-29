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
  parseQuickPickItemsFromLogLine,
  getWorkspaceRoot,
  printAssistedBanner,
  settle,
  waitForHuman,
} from '../helpers';

const SEPARATOR_KIND = -1;
const FILE_OVERFLOW_THRESHOLD = 5;

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
    const uriA = await createAndOpenFile('fp-001-a', 'line 1\nline 2\n', vscode.ViewColumn.One);
    const fnA = path.basename(uriA.fsPath);
    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere');
    await settle();
    const uriB = await createAndOpenFile('fp-001-b', 'other file\n', vscode.ViewColumn.Two);
    const fnB = path.basename(uriB.fsPath);

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-001');

    await waitForHuman('file-picker-001', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-fp-001');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const fileItems = findTestFileItems(items!);
    assert.deepStrictEqual(
      fileItems.map(({ label, displayName, description, boundState, itemKind }) => ({ label, displayName, description, boundState, itemKind })),
      [
        { label: fnA, displayName: fnA, description: 'bound · Tab Group 1', boundState: 'bound', itemKind: 'bindable' },
        { label: fnB, displayName: fnB, description: 'active · Tab Group 2', boundState: undefined, itemKind: 'bindable' },
      ],
    );

    log('✓ Bound file first with full semantic state + description');
  });

  test('[assisted] file-picker-002: active file appears before others in its group', async () => {
    const uriA = await createAndOpenFile('fp-002-a', 'file a\n', vscode.ViewColumn.One);
    const fnA = path.basename(uriA.fsPath);
    const uriB = await createAndOpenFile('fp-002-b', 'file b\n', vscode.ViewColumn.Two);
    const fnB = path.basename(uriB.fsPath);

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-002');

    await waitForHuman('file-picker-002', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-fp-002');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const testFileItems = findTestFileItems(items!);
    assert.deepStrictEqual(
      testFileItems.map(({ label, displayName, description, boundState, itemKind }) => ({ label, displayName, description, boundState, itemKind })),
      [
        { label: fnB, displayName: fnB, description: 'active · Tab Group 2', boundState: undefined, itemKind: 'bindable' },
        { label: fnA, displayName: fnA, description: 'Tab Group 1', boundState: undefined, itemKind: 'bindable' },
      ],
    );

    log('✓ Active file (fp-002-b) before non-active (fp-002-a) — full assertion');
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

    await waitForHuman('file-picker-003', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-fp-003');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const sharedNameItems = findTestFileItems(items!).filter((i) =>
      (i.label as string).includes('fp-003-shared'),
    );

    const descriptions = sharedNameItems.map(({ description }) => description as string);
    assert.strictEqual(sharedNameItems.length, 2, `Expected exactly 2 disambiguated items but got ${sharedNameItems.length}`);
    assert.ok(
      descriptions.some((d) => d && d.includes('dirA')) && descriptions.some((d) => d && d.includes('dirB')),
      `Expected disambiguator paths containing "dirA" and "dirB" but got: ${JSON.stringify(descriptions)}`,
    );

    assert.deepStrictEqual(
      sharedNameItems.map(({ label, displayName, boundState, itemKind }) => ({ label, displayName, boundState, itemKind })),
      [
        { label: '__rl-test-fp-003-shared.ts', displayName: '__rl-test-fp-003-shared.ts', boundState: undefined, itemKind: 'bindable' },
        { label: '__rl-test-fp-003-shared.ts', displayName: '__rl-test-fp-003-shared.ts', boundState: undefined, itemKind: 'bindable' },
      ],
    );

    log('✓ Path disambiguation validated with disambiguator in descriptions');
  });

  test('[assisted] file-picker-004: open files appear as inline items in destination picker', async () => {
    const uri = await createAndOpenFile('fp-004', 'content\n');
    const fn = path.basename(uri.fsPath);

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-004');

    await waitForHuman('file-picker-004', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-fp-004');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const fileItems = findTestFileItems(items!);
    assert.deepStrictEqual(
      fileItems.map(({ label, displayName, description, boundState, itemKind }) => ({ label, displayName, description, boundState, itemKind })),
      [{ label: fn, displayName: fn, description: 'active · Tab Group 1', boundState: undefined, itemKind: 'bindable' }],
    );

    log('✓ File appears inline in R-D picker — full assertion');
  });

  test('[assisted] file-picker-005: overflow shows "More files..." when exceeding inline limit', async () => {
    for (let i = 1; i <= FILE_OVERFLOW_THRESHOLD; i++) {
      await createAndOpenFile(`fp-005-${i}`, `file ${i}\n`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-005');

    await waitForHuman('file-picker-005', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-fp-005');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const moreItem = items!.find(
      (i) => typeof i.label === 'string' && (i.label as string).includes('More files...'),
    );
    assert.ok(moreItem, 'Expected "More files..." overflow item');
    assert.deepStrictEqual(
      { description: moreItem!.description, remainingCount: moreItem!.remainingCount, itemKind: moreItem!.itemKind },
      { description: `${(moreItem!.remainingCount as number)} more`, remainingCount: moreItem!.remainingCount, itemKind: 'file-more' },
    );

    log('✓ File overflow "More files..." item validated with description + remainingCount');
  });

  test('[assisted] file-picker-006: secondary picker shows Active Files section', async () => {
    const fileNames: string[] = [];
    for (let i = 1; i <= FILE_OVERFLOW_THRESHOLD; i++) {
      const uri = await createAndOpenFile(`fp-006-${i}`, `file ${i}\n`);
      fileNames.push(path.basename(uri.fsPath));
    }
    const lastFileName = fileNames[fileNames.length - 1];

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-006');

    await waitForHuman(
      'file-picker-006',
      'Cmd+R Cmd+D → click "More files..." → Escape',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Click "More files..."',
        '3. Escape the secondary picker',
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

    const secondaryItems = parseQuickPickItemsFromLogLine(quickPickEntries[1]);
    const activeFilesSeparator = secondaryItems.find(
      (i) => i.kind === SEPARATOR_KIND && i.label === 'Active Files',
    );
    assert.ok(activeFilesSeparator, 'Expected "Active Files" separator in secondary picker');

    const testFiles = secondaryItems.filter(
      (i) => typeof i.label === 'string' && (i.label as string).includes('__rl-test-fp-006'),
    );
    assert.strictEqual(testFiles.length, FILE_OVERFLOW_THRESHOLD, `Expected ${FILE_OVERFLOW_THRESHOLD} test files in secondary picker`);

    const activeFile = testFiles.find((i) => i.label === lastFileName);
    assert.ok(activeFile, `Expected active file "${lastFileName}" in secondary picker`);
    assert.deepStrictEqual(
      { label: activeFile!.label, displayName: activeFile!.displayName, boundState: activeFile!.boundState, itemKind: activeFile!.itemKind },
      { label: lastFileName, displayName: lastFileName, boundState: undefined, itemKind: 'bindable' },
    );

    log('✓ Secondary picker: Active Files separator + all test files with full field validation');
  });

  test('[assisted] file-picker-007: secondary picker shows Tab Group sections', async () => {
    const uriG1 = await createAndOpenFile('fp-007-g1', 'group 1\n', vscode.ViewColumn.One);
    const fnG1 = path.basename(uriG1.fsPath);
    const uriG2 = await createAndOpenFile('fp-007-g2', 'group 2\n', vscode.ViewColumn.Two);
    const fnG2 = path.basename(uriG2.fsPath);

    const extraNames: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const uri = await createAndOpenFile(`fp-007-extra-${i}`, `extra ${i}\n`, vscode.ViewColumn.One);
      extraNames.push(path.basename(uri.fsPath));
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-007');

    await waitForHuman(
      'file-picker-007',
      'Cmd+R Cmd+D → click "More files..." → Escape',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Click "More files..."',
        '3. Escape the secondary picker',
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

    const secondaryItems = parseQuickPickItemsFromLogLine(quickPickEntries[1]);

    const tabGroup1 = secondaryItems.find(
      (i) => i.kind === SEPARATOR_KIND && i.label === 'Tab Group 1',
    );
    const tabGroup2 = secondaryItems.find(
      (i) => i.kind === SEPARATOR_KIND && i.label === 'Tab Group 2',
    );
    assert.ok(tabGroup1, 'Expected "Tab Group 1" separator in secondary picker');
    assert.ok(tabGroup2, 'Expected "Tab Group 2" separator in secondary picker');

    const testFiles = secondaryItems.filter(
      (i) => typeof i.label === 'string' && (i.label as string).includes('__rl-test-fp-007'),
    );
    assert.deepStrictEqual(
      testFiles.map(({ label, displayName, boundState, itemKind }) => ({ label, displayName, boundState, itemKind })),
      [
        { label: fnG2, displayName: fnG2, boundState: undefined, itemKind: 'bindable' },
        ...extraNames.map((n) => ({ label: n, displayName: n, boundState: undefined, itemKind: 'bindable' })),
        { label: fnG1, displayName: fnG1, boundState: undefined, itemKind: 'bindable' },
      ],
    );

    log('✓ Tab Group sections + all test files validated with full fields');
  });

  test('[assisted] file-picker-008: escaping secondary file picker returns to parent', async () => {
    for (let i = 1; i <= FILE_OVERFLOW_THRESHOLD; i++) {
      await createAndOpenFile(`fp-008-${i}`, `file ${i}\n`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-008');

    await waitForHuman(
      'file-picker-008',
      'Cmd+R Cmd+D → "More files..." → Escape → Escape again',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Click "More files..."',
        '3. Escape the secondary picker (parent should reopen)',
        '4. Escape the parent picker',
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

    const firstItems = parseQuickPickItemsFromLogLine(quickPickEntries[0]);
    const reopenedItems = parseQuickPickItemsFromLogLine(quickPickEntries[2]);
    assert.strictEqual(
      reopenedItems.length,
      firstItems.length,
      `Expected reopened parent to have same item count (${firstItems.length}) but got ${reopenedItems.length}`,
    );

    log('✓ Escape from secondary file picker returns to parent with same items');
  });

  test('[assisted] file-picker-010: secondary picker shows path disambiguation for same-name files', async () => {
    const wsRoot = getWorkspaceRoot();
    const subDirA = path.join(wsRoot, 'src', 'fp010A');
    const subDirB = path.join(wsRoot, 'src', 'fp010B');
    fs.mkdirSync(subDirA, { recursive: true });
    fs.mkdirSync(subDirB, { recursive: true });

    const sharedName = '__rl-test-fp-010-shared.ts';
    const fileA = path.join(subDirA, sharedName);
    const fileB = path.join(subDirB, sharedName);
    fs.writeFileSync(fileA, 'file A\n', 'utf8');
    fs.writeFileSync(fileB, 'file B\n', 'utf8');
    const uriA = vscode.Uri.file(fileA);
    const uriB = vscode.Uri.file(fileB);
    tmpFileUris.push(uriA, uriB);

    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uriA), { viewColumn: vscode.ViewColumn.One, preview: false });
    await settle();
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uriB), { viewColumn: vscode.ViewColumn.Two, preview: false });
    await settle();

    for (let i = 1; i <= FILE_OVERFLOW_THRESHOLD; i++) {
      await createAndOpenFile(`fp-010-filler-${i}`, `filler ${i}\n`);
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-010');

    await waitForHuman(
      'file-picker-010',
      'Cmd+R Cmd+D → click "More files..." → Escape',
      [
        '1. Press Cmd+R Cmd+D',
        '2. Click "More files..."',
        '3. Escape the secondary picker',
      ],
    );

    const lines = logCapture.getLinesSince('before-fp-010');
    const quickPickEntries = lines.filter(
      (line) => line.includes('VscodeAdapter.showQuickPick') && line.includes('"items"'),
    );
    assert.ok(quickPickEntries.length >= 2, 'Expected at least 2 showQuickPick entries');

    const secondaryItems = parseQuickPickItemsFromLogLine(quickPickEntries[1]);
    const sharedItems = secondaryItems.filter(
      (i) => typeof i.label === 'string' && (i.label as string).includes('fp-010-shared'),
    );
    assert.strictEqual(sharedItems.length, 2, `Expected 2 same-name items in secondary picker but got ${sharedItems.length}`);

    const descriptions = sharedItems.map((i) => i.description as string);
    assert.ok(
      descriptions.some((d) => d && d.includes('fp010A')) && descriptions.some((d) => d && d.includes('fp010B')),
      `Expected disambiguator paths in secondary picker descriptions but got: ${JSON.stringify(descriptions)}`,
    );

    log('✓ Secondary picker shows path disambiguation');
  });

  test('[assisted] file-picker-011: three files with same name show deeper disambiguation paths', async () => {
    const wsRoot = getWorkspaceRoot();
    const dirA = path.join(wsRoot, 'src', 'a', 'nested');
    const dirB = path.join(wsRoot, 'src', 'b', 'nested');
    const dirC = path.join(wsRoot, 'src', 'c');
    fs.mkdirSync(dirA, { recursive: true });
    fs.mkdirSync(dirB, { recursive: true });
    fs.mkdirSync(dirC, { recursive: true });

    const sharedName = '__rl-test-fp-011-shared.ts';
    const files = [
      path.join(dirA, sharedName),
      path.join(dirB, sharedName),
      path.join(dirC, sharedName),
    ];
    const uris = files.map((f) => {
      fs.writeFileSync(f, 'content\n', 'utf8');
      return vscode.Uri.file(f);
    });
    tmpFileUris.push(...uris);

    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uris[0]), { viewColumn: vscode.ViewColumn.One, preview: false });
    await settle();
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uris[1]), { viewColumn: vscode.ViewColumn.Two, preview: false });
    await settle();
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uris[2]), { viewColumn: vscode.ViewColumn.Three, preview: false });
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-011');

    await waitForHuman('file-picker-011', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-fp-011');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const sharedItems = findTestFileItems(items!).filter(
      (i) => (i.label as string).includes('fp-011-shared'),
    );
    assert.strictEqual(sharedItems.length, 3, `Expected 3 same-name items but got ${sharedItems.length}`);

    assert.deepStrictEqual(
      sharedItems.map(({ label, displayName, boundState, itemKind }) => ({ label, displayName, boundState, itemKind })),
      [
        { label: '__rl-test-fp-011-shared.ts', displayName: '__rl-test-fp-011-shared.ts', boundState: undefined, itemKind: 'bindable' },
        { label: '__rl-test-fp-011-shared.ts', displayName: '__rl-test-fp-011-shared.ts', boundState: undefined, itemKind: 'bindable' },
        { label: '__rl-test-fp-011-shared.ts', displayName: '__rl-test-fp-011-shared.ts', boundState: undefined, itemKind: 'bindable' },
      ],
    );

    const descriptions = sharedItems.map((i) => i.description as string);
    const uniqueDescriptions = new Set(descriptions);
    assert.strictEqual(
      uniqueDescriptions.size,
      3,
      `Expected 3 unique descriptions for disambiguation but got ${uniqueDescriptions.size}: ${JSON.stringify(descriptions)}`,
    );

    log('✓ Three same-name files: same label/displayName, unique disambiguated descriptions');
  });

  test('[assisted] file-picker-012: unique file names have no disambiguator in description', async () => {
    const uriA = await createAndOpenFile('fp-012-alpha', 'file a\n', vscode.ViewColumn.One);
    const fnA = path.basename(uriA.fsPath);
    const uriB = await createAndOpenFile('fp-012-beta', 'file b\n', vscode.ViewColumn.Two);
    const fnB = path.basename(uriB.fsPath);

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-012');

    await waitForHuman('file-picker-012', 'Press Cmd+R Cmd+D, then Escape');

    const lines = logCapture.getLinesSince('before-fp-012');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const testFileItems = findTestFileItems(items!);
    assert.deepStrictEqual(
      testFileItems.map(({ label, displayName, description, boundState, itemKind }) => ({ label, displayName, description, boundState, itemKind })),
      [
        { label: fnB, displayName: fnB, description: 'active · Tab Group 2', boundState: undefined, itemKind: 'bindable' },
        { label: fnA, displayName: fnA, description: 'Tab Group 1', boundState: undefined, itemKind: 'bindable' },
      ],
    );

    log('✓ Unique file names have no disambiguator — only badges + tab group');
  });

  test('[assisted] file-picker-009: file picker appears inline in R-M menu when unbound', async () => {
    const uri = await createAndOpenFile('fp-009', 'content\n');
    const fn = path.basename(uri.fsPath);

    const logCapture = getLogCapture();
    logCapture.mark('before-fp-009');

    await waitForHuman('file-picker-009', 'Open R-M menu (Cmd+R Cmd+M), then Escape');

    const lines = logCapture.getLinesSince('before-fp-009');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry');

    const filesSeparator = items!.find((i) => i.kind === SEPARATOR_KIND && i.label === 'Files');
    assert.ok(filesSeparator, 'Expected "Files" separator in R-M menu');

    const fileItems = findTestFileItems(items!);
    assert.deepStrictEqual(
      fileItems.map(({ label, displayName, description, boundState, itemKind }) => ({ label, displayName, description, boundState, itemKind })),
      [{ label: `    $(arrow-right) ${fn}`, displayName: fn, description: 'active · Tab Group 1', boundState: undefined, itemKind: 'bindable' }],
    );

    log('✓ File appears inline in R-M menu — full assertion');
  });
});
