import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { ParsedLink } from 'rangelink-core-ts';
import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

/**
 * Fire rangelink.handleDocumentLinkClick without awaiting it (the command blocks on
 * showInformationMessage in the extension host, which requires user interaction).
 *
 * Instead, listen for onDidChangeTextEditorSelection events. navigateToLink sets
 * editor.selection synchronously before the blocking showInformationMessage await.
 * A 300ms debounce captures the LAST selection event — skipping the initial
 * selection fired when showTextDocument opens the file and landing on the
 * navigation selection set by editor.selection = selection.
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
        // Debounce: resolve 300ms after the last selection event for this file.
        // This skips the initial selection from showTextDocument and captures
        // the final selection set by editor.selection = selection.
        stableTimer = setTimeout(() => {
          clearTimeout(overallTimeout);
          disposable.dispose();
          resolve(lastResult!);
        }, STABLE_MS);
      }
    });

    // Do NOT await — the command never resolves in tests because showInformationMessage
    // requires user interaction to dismiss. Navigation completes (selection set) before
    // that blocking await, so our event listener captures it.
    void vscode.commands.executeCommand('rangelink.handleDocumentLinkClick', { linkText, parsed });
  });
};

suite('Navigation Precision', () => {
  let testFilename: string;
  let testFilePath: string;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink');
    await ext?.activate();

    const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1} content`);
    testFilename = `__rl-test-nav-${Date.now()}.ts`;
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

  // TC-130: #L10 selects the full line (col 0 → end of line)
  test('TC-130: #L10 navigates to full line 10 — selection spans col 0 to end of line', async () => {
    const linkText = `${testFilename}#L10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lineLength = doc.lineAt(9).text.length; // line 10 is 0-indexed as 9
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

  // TC-131: #L10-L15 selects lines 10 through 15 (anchor at start of line 10, active at end of line 15)
  test('TC-131: #L10-L15 navigates to range — anchor (9,0), active at end of line 15', async () => {
    const linkText = `${testFilename}#L10-L15`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const endLineLength = doc.lineAt(14).text.length; // line 15 is 0-indexed as 14
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
});
