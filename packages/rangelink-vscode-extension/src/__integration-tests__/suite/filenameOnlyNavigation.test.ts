import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { DEFAULT_DELIMITERS, parseLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { CMD_HANDLE_DOCUMENT_LINK_CLICK } from '../../constants/commandIds';
import {
  assertToastLogged,
  clearEditorSelection,
  getLogCapture,
  getWorkspaceRoot,
  navigateViaHandleLinkClick,
  settle,
  standardSuite,
} from '../helpers';

const DUPLICATE_FILE_CONTENT = 'duplicate file content\n';

standardSuite('Filename-Only Navigation Fallback', {}, (_log) => {
  let uniqueFilename: string;
  let uniqueFilePath: string;
  let relativeFilePath: string;

  let duplicateFilename: string;
  let duplicateFilePath1: string;
  let duplicateFilePath2: string;

  suiteSetup(async () => {
    const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1} content`);

    uniqueFilename = `__rl-test-fallback-${Date.now()}.ts`;
    const subDir = path.join(getWorkspaceRoot(), 'src', 'nested');
    fs.mkdirSync(subDir, { recursive: true });
    uniqueFilePath = path.join(subDir, uniqueFilename);
    fs.writeFileSync(uniqueFilePath, lines.join('\n') + '\n', 'utf8');

    relativeFilePath = path.relative(getWorkspaceRoot(), uniqueFilePath);

    // Place duplicate files outside src/ to avoid triggering the TypeScript watcher,
    // which can block vscode.workspace.findFiles while the TS server re-initializes.
    duplicateFilename = `__rl-test-dup-${Date.now()}.ts`;
    const dupDir1 = path.join(getWorkspaceRoot(), '__rl-test-dup-a');
    const dupDir2 = path.join(getWorkspaceRoot(), '__rl-test-dup-b');
    fs.mkdirSync(dupDir1, { recursive: true });
    fs.mkdirSync(dupDir2, { recursive: true });
    duplicateFilePath1 = path.join(dupDir1, duplicateFilename);
    duplicateFilePath2 = path.join(dupDir2, duplicateFilename);
    fs.writeFileSync(duplicateFilePath1, DUPLICATE_FILE_CONTENT, 'utf8');
    fs.writeFileSync(duplicateFilePath2, DUPLICATE_FILE_CONTENT, 'utf8');
  });

  suiteTeardown(async () => {
    try {
      fs.unlinkSync(uniqueFilePath);
    } catch {
      // best-effort — subdirectory file, not managed by cleanupFiles
    }
    for (const p of [duplicateFilePath1, duplicateFilePath2]) {
      try {
        fs.unlinkSync(p);
        fs.rmdirSync(path.dirname(p));
      } catch {
        // best-effort
      }
    }
  });

  test('filename-fallback-navigation-001: bare filename with unique match navigates to correct line', async () => {
    const linkText = `${uniqueFilename}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-001');

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      uniqueFilename,
    );

    const lineLength = doc.lineAt(4).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 4, anchorChar: 0, activeLine: 4, activeChar: lineLength },
    );

    const lines = logCapture.getLinesSince('before-fallback-001');
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${uniqueFilename} @ 5`,
    });
  });

  test('filename-fallback-navigation-002: bare filename with multiple matches shows ambiguity warning', async () => {
    const linkText = `${duplicateFilename}#L1`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-002');

    // VscodeAdapter logs the message before awaiting showWarningMessage. The notification
    // itself never auto-dismisses in the test host, so we fire-and-forget the command and
    // settle before asserting — the log is already captured by then.
    void vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, {
      linkText,
      parsed: parseResult.value,
    });
    await settle();

    const lines = logCapture.getLinesSince('before-fallback-002');
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Multiple files match: ${duplicateFilename}`,
    });
  });

  test('filename-fallback-navigation-003: bare filename with no matches shows file-not-found warning', async () => {
    const missingFilename = `__rl-nonexistent-${Date.now()}.ts`;
    const linkText = `${missingFilename}#L1`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-003');

    // Same fire-and-forget pattern as TC-002 — the warning log is written before
    // showWarningMessage is awaited, so settle() is sufficient.
    void vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, {
      linkText,
      parsed: parseResult.value,
    });
    await settle();

    const lines = logCapture.getLinesSince('before-fallback-003');
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Cannot find file: ${missingFilename}`,
    });
  });

  test('filename-fallback-navigation-004: path with directory separators uses standard resolution', async () => {
    const linkText = `${relativeFilePath}#L10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-004');

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      uniqueFilename,
    );

    const lineLength = doc.lineAt(9).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 9, anchorChar: 0, activeLine: 9, activeChar: lineLength },
    );

    const lines = logCapture.getLinesSince('before-fallback-004');
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${relativeFilePath} @ 10`,
    });
  });
});
