import assert from 'node:assert';

import type { ParsedLink } from 'rangelink-core-ts';
import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { getUntitledDisplayName } from '../../utils/getUntitledDisplayName';
import { assertToastLogged, assertNoToastLogged, getLogCapture } from '../helpers';

const SETTLE_MS = 500;
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

/**
 * Navigate to a RangeLink targeting an untitled file.
 *
 * Adapted from navigationPrecision's navigateViaHandleLinkClick — matches
 * by untitled URI scheme instead of filename suffix, since untitled documents
 * don't have filesystem paths.
 */
const navigateToUntitledLink = (
  linkText: string,
  parsed: ParsedLink,
  targetUri: vscode.Uri,
): Promise<{ sel: vscode.Selection; doc: vscode.TextDocument }> => {
  const STABLE_MS = 300;
  const TIMEOUT_MS = 10000;

  return new Promise((resolve, reject) => {
    let lastResult: { sel: vscode.Selection; doc: vscode.TextDocument } | undefined;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;

    const overallTimeout = setTimeout(() => {
      if (stableTimer) clearTimeout(stableTimer);
      disposable.dispose();
      if (lastResult) {
        resolve(lastResult);
      } else {
        reject(
          new Error(
            `No selection change event received within ${TIMEOUT_MS}ms for ${targetUri.toString()}`,
          ),
        );
      }
    }, TIMEOUT_MS);

    const disposable = vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor.document.uri.toString() === targetUri.toString()) {
        lastResult = { sel: e.textEditor.selection, doc: e.textEditor.document };
        if (stableTimer) clearTimeout(stableTimer);
        stableTimer = setTimeout(() => {
          clearTimeout(overallTimeout);
          disposable.dispose();
          resolve(lastResult!);
        }, STABLE_MS);
      }
    });

    Promise.resolve(
      vscode.commands.executeCommand('rangelink.handleDocumentLinkClick', { linkText, parsed }),
    ).catch((error: unknown) => {
      clearTimeout(overallTimeout);
      if (stableTimer) clearTimeout(stableTimer);
      disposable.dispose();
      reject(error);
    });
  });
};

suite('Untitled File Navigation', () => {
  let untitledDoc: vscode.TextDocument;
  let untitledDisplayName: string;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');
    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();

    assert.ok(
      getLogCapture().isCapturing,
      'RANGELINK_CAPTURE_LOGS must be true for toast assertions',
    );

    untitledDoc = await vscode.workspace.openTextDocument({
      content: Array.from({ length: 15 }, (_, i) => `untitled line ${i + 1} content here`).join(
        '\n',
      ),
      language: 'plaintext',
    });
    await vscode.window.showTextDocument(untitledDoc, vscode.ViewColumn.One);

    assert.strictEqual(untitledDoc.uri.scheme, 'untitled', 'Expected untitled document');

    untitledDisplayName = getUntitledDisplayName(untitledDoc.uri);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  // untitled-navigation-001: Navigate to single line in untitled file
  test('untitled-navigation-001: #L5 navigates to line 5 in open untitled file', async () => {
    const linkText = `${untitledDisplayName}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-untitled-nav-001');

    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
    assert.strictEqual(sel.anchor.line, 4, `Expected anchor line 4 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      0,
      `Expected anchor char 0 but got ${sel.anchor.character}`,
    );
    const lineLength = doc.lineAt(4).text.length;
    assert.strictEqual(sel.active.line, 4, `Expected active line 4 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      lineLength,
      `Expected active char ${lineLength} but got ${sel.active.character}`,
    );

    const lines = logCapture.getLinesSince('before-untitled-nav-001');
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${untitledDisplayName} @ 5`,
    });
    assertNoToastLogged(lines, { type: 'warning', message: 'RangeLink: Cannot find file' });
    assertNoToastLogged(lines, { type: 'error', message: 'RangeLink: Failed to navigate' });
  });

  // untitled-navigation-002: Navigate to line range in untitled file
  test('untitled-navigation-002: #L3-L7 navigates to range in open untitled file', async () => {
    const linkText = `${untitledDisplayName}#L3-L7`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-untitled-nav-002');

    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
    assert.strictEqual(sel.anchor.line, 2, `Expected anchor line 2 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      0,
      `Expected anchor char 0 but got ${sel.anchor.character}`,
    );
    const endLineLength = doc.lineAt(6).text.length;
    assert.strictEqual(sel.active.line, 6, `Expected active line 6 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      endLineLength,
      `Expected active char ${endLineLength} but got ${sel.active.character}`,
    );

    const lines = logCapture.getLinesSince('before-untitled-nav-002');
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${untitledDisplayName} @ 3-7`,
    });
    assertNoToastLogged(lines, { type: 'warning', message: 'RangeLink: Cannot find file' });
  });

  // untitled-navigation-003: Navigate to untitled file that is not open shows warning
  test('untitled-navigation-003: navigating to closed untitled file shows file-not-found warning', async () => {
    const fakeName = 'Untitled-99';
    const linkText = `${fakeName}#L1`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-untitled-nav-003');

    // Fire-and-forget: showWarningMessage blocks awaiting user dismissal.
    // The log entry is written before the blocking await, so settle + log check works.
    vscode.commands.executeCommand('rangelink.handleDocumentLinkClick', {
      linkText,
      parsed: parseResult.value,
    });
    await settle();

    const lines = logCapture.getLinesSince('before-untitled-nav-003');
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Cannot find file: ${fakeName}`,
    });
    assertNoToastLogged(lines, { type: 'info', message: 'RangeLink: Navigated to' });
  });

  // untitled-navigation-004: Character-precision navigation in untitled file
  test('untitled-navigation-004: #L5C10-L5C20 navigates to character range in untitled file', async () => {
    const linkText = `${untitledDisplayName}#L5C10-L5C20`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-untitled-nav-004');

    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
    assert.strictEqual(sel.anchor.line, 4, `Expected anchor line 4 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      9,
      `Expected anchor char 9 but got ${sel.anchor.character}`,
    );
    assert.strictEqual(sel.active.line, 4, `Expected active line 4 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      19,
      `Expected active char 19 but got ${sel.active.character}`,
    );

    const lines = logCapture.getLinesSince('before-untitled-nav-004');
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${untitledDisplayName} @ 5:10-5:20`,
    });
    assertNoToastLogged(lines, { type: 'warning', message: 'RangeLink: Cannot find file' });
  });

  // untitled-navigation-005: Line clamping in untitled file
  test('untitled-navigation-005: #L50 on 15-line untitled file clamps to last line with warning', async () => {
    const linkText = `${untitledDisplayName}#L50`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-untitled-nav-005');

    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
    const lastLine = doc.lineCount - 1;
    assert.strictEqual(
      sel.anchor.line,
      lastLine,
      `Expected anchor at last line ${lastLine} but got ${sel.anchor.line}`,
    );

    const lines = logCapture.getLinesSince('before-untitled-nav-005');
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Navigated to ${untitledDisplayName} @ 50 (clamped: line exceeded file length)`,
    });
    assertNoToastLogged(lines, { type: 'error', message: 'RangeLink: Failed to navigate' });
  });

  // untitled-navigation-006: Case-insensitive untitled name matching
  test('untitled-navigation-006: lowercase name matches open Untitled file', async () => {
    const lowercaseName = untitledDisplayName.toLowerCase();
    const linkText = `${lowercaseName}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-untitled-nav-006');

    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
    assert.strictEqual(sel.anchor.line, 4, `Expected anchor line 4 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      0,
      `Expected anchor char 0 but got ${sel.anchor.character}`,
    );
    const lineLength = doc.lineAt(4).text.length;
    assert.strictEqual(sel.active.line, 4, `Expected active line 4 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      lineLength,
      `Expected active char ${lineLength} but got ${sel.active.character}`,
    );

    const lines = logCapture.getLinesSince('before-untitled-nav-006');
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${lowercaseName} @ 5`,
    });
    assertNoToastLogged(lines, { type: 'warning', message: 'RangeLink: Cannot find file' });
  });
});
