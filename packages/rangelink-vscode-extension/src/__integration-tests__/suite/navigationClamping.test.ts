import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import {
  activateExtension,
  assertToastLogged,
  cleanupFiles,
  clearEditorSelection,
  closeAllEditors,
  getLogCapture,
  getWorkspaceRoot,
  navigateViaHandleLinkClick,
} from '../helpers';

const LINE_COUNT = 10;
const LINE_CONTENT = 'abcdefghijklmnopqrst';

suite('Navigation Clamping', () => {
  let testFilename: string;
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    await activateExtension();

    const lines = Array.from({ length: LINE_COUNT }, () => LINE_CONTENT);
    testFilename = `__rl-test-clamp-${Date.now()}.ts`;
    const testFilePath = path.join(getWorkspaceRoot(), testFilename);
    fs.writeFileSync(testFilePath, lines.join('\n') + '\n', 'utf8');
    testFileUri = vscode.Uri.file(testFilePath);
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  test('navigation-clamping-001: #L50 on 10-line file — selection clamped to last line', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-clamping-001');

    const linkText = `${testFilename}#L50`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lastLine = doc.lineCount - 1;
    const lastLineLength = doc.lineAt(lastLine).text.length;
    assert.deepStrictEqual(
      { anchorLine: sel.anchor.line, anchorChar: sel.anchor.character, activeLine: sel.active.line, activeChar: sel.active.character },
      { anchorLine: lastLine, anchorChar: 0, activeLine: lastLine, activeChar: lastLineLength },
    );

    const lines = logCapture.getLinesSince('before-clamping-001');
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Navigated to ${testFilename} @ 50 (clamped: line exceeded file length)`,
    });
  });

  test('navigation-clamping-002: #L1C200 on 20-char line — character clamped to line length', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-clamping-002');

    const linkText = `${testFilename}#L1C200`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lineLength = doc.lineAt(0).text.length;
    assert.deepStrictEqual(
      { anchorLine: sel.anchor.line, anchorChar: sel.anchor.character, activeLine: sel.active.line, activeChar: sel.active.character },
      { anchorLine: 0, anchorChar: lineLength, activeLine: 0, activeChar: lineLength + 1 },
    );

    const lines = logCapture.getLinesSince('before-clamping-002');
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Navigated to ${testFilename} @ 1:200 (clamped: column exceeded line length)`,
    });
  });

  test('navigation-clamping-003: #L5C10 within bounds — selection at exact position', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-clamping-003');

    const linkText = `${testFilename}#L5C10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    await clearEditorSelection();
    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);

    assert.deepStrictEqual(
      { anchorLine: sel.anchor.line, anchorChar: sel.anchor.character, activeLine: sel.active.line, activeChar: sel.active.character },
      { anchorLine: 4, anchorChar: 9, activeLine: 4, activeChar: 10 },
    );

    const lines = logCapture.getLinesSince('before-clamping-003');
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${testFilename} @ 5:10`,
    });
  });

  test('navigation-clamping-004: #L50C200 — both line and column clamped', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-clamping-004');

    const linkText = `${testFilename}#L50C200`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lastLine = doc.lineCount - 1;
    const lastLineLength = doc.lineAt(lastLine).text.length;
    assert.deepStrictEqual(
      { anchorLine: sel.anchor.line, anchorChar: sel.anchor.character, activeLine: sel.active.line, activeChar: sel.active.character },
      { anchorLine: lastLine, anchorChar: lastLineLength, activeLine: lastLine, activeChar: lastLineLength + 1 },
    );

    const lines = logCapture.getLinesSince('before-clamping-004');
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Navigated to ${testFilename} @ 50:200 (clamped: line and column exceeded bounds)`,
    });
  });
});
