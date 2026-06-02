import assert from 'node:assert';

import { DEFAULT_DELIMITERS, parseLink } from 'rangelink-core-ts';
import type { ParsedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { CMD_HANDLE_DOCUMENT_LINK_CLICK } from '../../constants/commandIds';
import { getUntitledDisplayName } from '../../utils/getUntitledDisplayName';
import { clearEditorSelection, openUntitledDoc, standardSuite } from '../helpers';

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
      vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, { linkText, parsed }),
    ).catch((error: unknown) => {
      clearTimeout(overallTimeout);
      if (stableTimer) clearTimeout(stableTimer);
      disposable.dispose();
      reject(error);
    });
  });
};

const UNTITLED_CONTENT = Array.from(
  { length: 15 },
  (_, i) => `untitled line ${i + 1} content here`,
).join('\n');

standardSuite('Untitled File Navigation', (ss) => {
  let untitledDoc: vscode.TextDocument;
  let untitledDisplayName: string;

  setup(async () => {
    untitledDoc = await openUntitledDoc({ content: UNTITLED_CONTENT });
    assert.strictEqual(untitledDoc.uri.scheme, 'untitled', 'Expected untitled document');
    untitledDisplayName = getUntitledDisplayName(untitledDoc.uri);
    await ss.settle();
  });

  // untitled-navigation-001: Navigate to single line in untitled file
  test('untitled-navigation-001: #L5 navigates to line 5 in open untitled file', async () => {
    const linkText = `${untitledDisplayName}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${untitledDisplayName} @ 5` }]);

    await clearEditorSelection();
    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await ss.settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
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
  });

  // untitled-navigation-002: Navigate to line range in untitled file
  test('untitled-navigation-002: #L3-L7 navigates to range in open untitled file', async () => {
    const linkText = `${untitledDisplayName}#L3-L7`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([
      { level: 'info', message: `Navigated to ${untitledDisplayName} @ 3-7` },
    ]);

    await clearEditorSelection();
    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await ss.settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
    const endLineLength = doc.lineAt(6).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 2, anchorChar: 0, activeLine: 6, activeChar: endLineLength },
    );
  });

  // untitled-navigation-003: Navigate to untitled file that is not open shows warning
  test('untitled-navigation-003: navigating to closed untitled file shows file-not-found warning', async () => {
    const fakeName = 'Untitled-99';
    const linkText = `${fakeName}#L1`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'warning', message: `Cannot find file: ${fakeName}` }]);

    // Fire-and-forget: showWarningMessage blocks awaiting user dismissal.
    // The log entry is written before the blocking await, so settle + log check works.
    vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, {
      linkText,
      parsed: parseResult.value,
    });
    await ss.settle();
  });

  // untitled-navigation-004: Character-precision navigation in untitled file
  test('untitled-navigation-004: #L5C10-L5C20 navigates to character range in untitled file', async () => {
    const linkText = `${untitledDisplayName}#L5C10-L5C20`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([
      { level: 'info', message: `Navigated to ${untitledDisplayName} @ 5:10-5:20` },
    ]);

    await clearEditorSelection();
    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await ss.settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 4, anchorChar: 9, activeLine: 4, activeChar: 19 },
    );
  });

  // untitled-navigation-005: Line clamping in untitled file
  test('untitled-navigation-005: #L50 on 15-line untitled file clamps to last line with warning', async () => {
    const linkText = `${untitledDisplayName}#L50`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([
      {
        level: 'warning',
        message: `Navigated to ${untitledDisplayName} @ 50 (clamped: line exceeded file length)`,
      },
    ]);

    await clearEditorSelection();
    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await ss.settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
    const lastLine = doc.lineCount - 1;
    const lastLineLength = doc.lineAt(lastLine).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: lastLine, anchorChar: 0, activeLine: lastLine, activeChar: lastLineLength },
    );
  });

  // untitled-navigation-006: Case-insensitive untitled name matching
  test('untitled-navigation-006: lowercase name matches open Untitled file', async () => {
    const lowercaseName = untitledDisplayName.toLowerCase();
    const linkText = `${lowercaseName}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${lowercaseName} @ 5` }]);

    await clearEditorSelection();
    const { sel, doc } = await navigateToUntitledLink(linkText, parseResult.value, untitledDoc.uri);
    await ss.settle();

    assert.strictEqual(doc.uri.scheme, 'untitled', 'Expected navigation to untitled document');
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
  });
});
