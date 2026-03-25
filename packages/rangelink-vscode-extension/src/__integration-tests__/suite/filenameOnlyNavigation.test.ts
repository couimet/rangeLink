import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ParsedLink } from 'rangelink-core-ts';
import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

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

suite('Filename-Only Navigation Fallback', () => {
  let uniqueFilename: string;
  let uniqueFilePath: string;
  let relativeFilePath: string;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');
    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();

    const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1} content`);

    uniqueFilename = `__rl-test-fallback-${Date.now()}.ts`;
    const subDir = path.join(getWorkspaceRoot(), 'src', 'nested');
    fs.mkdirSync(subDir, { recursive: true });
    uniqueFilePath = path.join(subDir, uniqueFilename);
    fs.writeFileSync(uniqueFilePath, lines.join('\n') + '\n', 'utf8');

    relativeFilePath = path.relative(getWorkspaceRoot(), uniqueFilePath);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    try {
      fs.unlinkSync(uniqueFilePath);
    } catch {
      // best-effort cleanup
    }
  });

  // filename-fallback-navigation-001: bare filename navigates via workspace search
  test('filename-fallback-navigation-001: bare filename with unique match navigates to correct line', async () => {
    const linkText = `${uniqueFilename}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      uniqueFilename,
    );

    const lineLength = doc.lineAt(4).text.length;
    assert.strictEqual(sel.anchor.line, 4, `Expected anchor line 4 but got ${sel.anchor.line}`);
    assert.strictEqual(
      sel.anchor.character,
      0,
      `Expected anchor char 0 but got ${sel.anchor.character}`,
    );
    assert.strictEqual(sel.active.line, 4, `Expected active line 4 but got ${sel.active.line}`);
    assert.strictEqual(
      sel.active.character,
      lineLength,
      `Expected active char ${lineLength} but got ${sel.active.character}`,
    );
  });

  // filename-fallback-navigation-004: relative path with separators uses standard resolution
  test('filename-fallback-navigation-004: path with directory separators uses standard resolution', async () => {
    const linkText = `${relativeFilePath}#L10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      uniqueFilename,
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
});
