import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import {
  activateExtension,
  assertToastLogged,
  cleanupFiles,
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

    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lastLine = doc.lineCount - 1;
    const lastLineLength = doc.lineAt(lastLine).text.length;
    assert.strictEqual(sel.anchor.line, lastLine, `Expected anchor at last line ${lastLine}`);
    assert.strictEqual(sel.anchor.character, 0, 'Expected anchor char 0 (full-line selection)');
    assert.strictEqual(sel.active.line, lastLine, `Expected active at last line ${lastLine}`);
    assert.strictEqual(
      sel.active.character,
      lastLineLength,
      `Expected active char at end of last line (${lastLineLength})`,
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

    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lineLength = doc.lineAt(0).text.length;
    assert.strictEqual(sel.anchor.line, 0, 'Expected anchor at line 0');
    assert.strictEqual(
      sel.anchor.character,
      lineLength,
      `Expected anchor char clamped to line length (${lineLength})`,
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

    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);

    assert.strictEqual(sel.anchor.line, 4, 'Expected anchor at line 4 (0-indexed)');
    assert.strictEqual(sel.anchor.character, 9, 'Expected anchor char 9 (0-indexed)');
    assert.strictEqual(sel.active.line, 4, 'Expected active at line 4 (0-indexed)');
    assert.strictEqual(
      sel.active.character,
      10,
      'Expected active char 10 (extended by 1 for visibility)',
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

    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lastLine = doc.lineCount - 1;
    const lastLineLength = doc.lineAt(lastLine).text.length;
    assert.strictEqual(sel.anchor.line, lastLine, `Expected anchor at last line ${lastLine}`);
    assert.strictEqual(
      sel.anchor.character,
      lastLineLength,
      `Expected anchor char clamped to line length (${lastLineLength})`,
    );

    const lines = logCapture.getLinesSince('before-clamping-004');
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Navigated to ${testFilename} @ 50:200 (clamped: line and column exceeded bounds)`,
    });
  });
});
