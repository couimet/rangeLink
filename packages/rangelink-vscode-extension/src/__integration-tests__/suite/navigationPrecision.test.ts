import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import {
  activateExtension,
  cleanupFiles,
  clearEditorSelection,
  closeAllEditors,
  getWorkspaceRoot,
  navigateViaHandleLinkClick,
} from '../helpers';

suite('Navigation Precision', () => {
  let testFilename: string;
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    await activateExtension();

    const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1} content`);
    testFilename = `__rl-test-nav-${Date.now()}.ts`;
    const testFilePath = path.join(getWorkspaceRoot(), testFilename);
    fs.writeFileSync(testFilePath, lines.join('\n') + '\n', 'utf8');
    testFileUri = vscode.Uri.file(testFilePath);
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  test('full-line-navigation-001: #L10 navigates to full line 10 — selection spans col 0 to end of line', async () => {
    const linkText = `${testFilename}#L10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lineLength = doc.lineAt(9).text.length;
    assert.strictEqual(sel.anchor.line, 9, `Expected anchor line 9 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      0,
      `Expected anchor char 0 but got ${sel.anchor.character}`,
    );
    assert.strictEqual(sel.active.line, 9, `Expected active line 9 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      lineLength,
      `Expected active char ${lineLength} but got ${sel.active.character}`,
    );
  });

  test('full-line-navigation-002: #L10-L15 navigates to range — anchor (9,0), active at end of line 15', async () => {
    const linkText = `${testFilename}#L10-L15`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const endLineLength = doc.lineAt(14).text.length;
    assert.strictEqual(sel.anchor.line, 9, `Expected anchor line 9 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      0,
      `Expected anchor char 0 but got ${sel.anchor.character}`,
    );
    assert.strictEqual(sel.active.line, 14, `Expected active line 14 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      endLineLength,
      `Expected active char ${endLineLength} but got ${sel.active.character}`,
    );
  });

  test('char-navigation-001: #L10C5 navigates to cursor position (9,4)', async () => {
    const linkText = `${testFilename}#L10C5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    await clearEditorSelection();
    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);

    assert.strictEqual(sel.anchor.line, 9, `Expected anchor line 9 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      4,
      `Expected anchor char 4 but got ${sel.anchor.character}`,
    );
    assert.strictEqual(sel.active.line, 9, `Expected active line 9 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      5,
      `Expected active char 5 but got ${sel.active.character}`,
    );
  });

  test('char-navigation-002: #L10C5-L15C10 navigates to range (9,4)→(14,9)', async () => {
    const linkText = `${testFilename}#L10C5-L15C10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    await clearEditorSelection();
    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);

    assert.strictEqual(sel.anchor.line, 9, `Expected anchor line 9 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      4,
      `Expected anchor char 4 but got ${sel.anchor.character}`,
    );
    assert.strictEqual(sel.active.line, 14, `Expected active line 14 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      9,
      `Expected active char 9 but got ${sel.active.character}`,
    );
  });
});
