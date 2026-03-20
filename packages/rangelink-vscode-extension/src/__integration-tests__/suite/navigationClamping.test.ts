import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ParsedLink } from 'rangelink-core-ts';
import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

const LINE_COUNT = 10;
const LINE_CONTENT = 'abcdefghijklmnopqrst'; // 20 characters per line

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

/**
 * Fire rangelink.handleDocumentLinkClick without awaiting it (the command blocks on
 * showInformationMessage/showWarningMessage in the extension host).
 *
 * Captures the final selection via onDidChangeTextEditorSelection with a 300ms debounce.
 */
const navigateViaHandleLinkClick = (
  linkText: string,
  parsed: ParsedLink,
  testFilename: string,
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
            `No selection change event received within ${TIMEOUT_MS}ms for ${testFilename}`,
          ),
        );
      }
    }, TIMEOUT_MS);

    const disposable = vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor.document.fileName.endsWith(testFilename)) {
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

suite('Navigation Clamping', () => {
  let testFilename: string;
  let testFilePath: string;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');

    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();

    const lines = Array.from({ length: LINE_COUNT }, () => LINE_CONTENT);
    testFilename = `__rl-test-clamp-${Date.now()}.ts`;
    testFilePath = path.join(getWorkspaceRoot(), testFilename);
    fs.writeFileSync(testFilePath, lines.join('\n') + '\n', 'utf8');
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    try {
      fs.unlinkSync(testFilePath);
    } catch {
      // best-effort cleanup
    }
  });

  // TODO: Toast type verification (info vs warning) blocked on https://github.com/couimet/rangeLink/issues/481

  // navigation-clamping-001: line beyond EOF → selection at last line
  test('navigation-clamping-001: #L50 on 10-line file — selection clamped to last line', async () => {
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
  });

  // navigation-clamping-002: column beyond line length → selection at end of line
  // TODO: Toast content verification ("column exceeded line length") blocked on https://github.com/couimet/rangeLink/issues/481
  test('navigation-clamping-002: #L1C200 on 20-char line — character clamped to line length', async () => {
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
  });

  // navigation-clamping-003: valid position → selection at exact position
  // TODO: Toast type verification (should be info, not warning) blocked on https://github.com/couimet/rangeLink/issues/481
  test('navigation-clamping-003: #L5C10 within bounds — selection at exact position', async () => {
    const linkText = `${testFilename}#L5C10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);

    assert.strictEqual(sel.anchor.line, 4, 'Expected anchor at line 4 (0-indexed)');
    assert.strictEqual(sel.anchor.character, 9, 'Expected anchor char 9 (0-indexed)');
  });

  // navigation-clamping-004: both line and column beyond bounds → both axes clamped
  // TODO: Toast content verification ("line and column exceeded bounds") blocked on https://github.com/couimet/rangeLink/issues/481
  test('navigation-clamping-004: #L50C200 — both line and column clamped', async () => {
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
  });
});
