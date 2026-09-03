import { CMD_HANDLE_DOCUMENT_LINK_CLICK } from '../../constants/commandIds';
import {
  assertQuickPickItemsLogged,
  clearEditorSelection,
  createDuplicateFiles,
  createFileAt,
  createNestedWorkspaceFile,
  createTempDir,
  dismissQuickPick,
  getLogCapture,
  navigateViaHandleLinkClick,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  settle,
  standardSuite,
} from '../helpers';

import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_DELIMITERS, parseLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

const DUPLICATE_FILE_CONTENT = 'duplicate file content\n';
const NESTED_FILE_CONTENT = Array.from({ length: 25 }, (_, i) => `line ${i + 1} content`).join('\n') + '\n';

/**
 * Fire a command that opens the filename candidate picker, keep accepting the
 * QuickPick's selected (first) item, and wait until navigation lands on the
 * expected file. The command is NOT awaited — navigateToLink stays pending on
 * the navigated toast (showInformationMessage), which the test host does not
 * auto-dismiss promptly. Navigation is detected via the active editor instead.
 */
const acceptFirstCandidateTo = async (run: () => Promise<void>, expectedFsPath: string): Promise<void> => {
  void run().catch(() => undefined);
  await settle();
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
    if (vscode.window.activeTextEditor?.document.uri.fsPath === expectedFsPath) {
      await settle();
      return;
    }
    await settle(POLL_INTERVAL_MS);
  }
  throw new Error(`acceptFirstCandidateTo: navigation did not land on ${expectedFsPath} within the polling deadline`);
};

standardSuite('Filename-Only Navigation Fallback', (ss) => {
  test('filename-fallback-navigation-001: bare filename with unique match navigates to correct line', async () => {
    const { filename } = createNestedWorkspaceFile('fallback', NESTED_FILE_CONTENT);

    const linkText = `${filename}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${filename} @ 5` }]);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(linkText, parseResult.value, filename);

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

  test('filename-fallback-navigation-002: bare filename with multiple matches shows candidate picker; dismissal is a no-op', async () => {
    const { filename, filePathA, filePathB } = createDuplicateFiles('dup', DUPLICATE_FILE_CONTENT);

    // Open one of the duplicate files up front so the test can prove the active editor is unchanged after dismissal.
    await ss.openEditor(vscode.Uri.file(filePathA));
    await settle();
    const uriBefore = vscode.window.activeTextEditor!.document.uri.toString();

    const linkText = `${filename}#L1`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-002');

    const promise = vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, {
      linkText,
      parsed: parseResult.value,
    });
    await settle();

    const lines = logCapture.getLinesSince('before-fallback-002');
    assertQuickPickItemsLogged(lines, [
      {
        label: filename,
        description: vscode.workspace.asRelativePath(vscode.Uri.file(filePathA), true),
      },
      {
        label: filename,
        description: vscode.workspace.asRelativePath(vscode.Uri.file(filePathB), true),
      },
    ]);

    await dismissQuickPick();
    await promise;
    await settle();

    assert.strictEqual(vscode.window.activeTextEditor?.document.uri.toString(), uriBefore, 'Expected the active editor to be unchanged (dismissal is a no-op)');

    ss.log('✓ Candidate picker listed both matches; dismissal left the active editor untouched');
  });

  test('filename-fallback-navigation-003: bare filename with no matches shows file-not-found warning', async () => {
    const missingFilename = `__rl-nonexistent-${Date.now()}.ts`;
    const linkText = `${missingFilename}#L1`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'warning', message: `Cannot find file: ${missingFilename}` }]);

    // Same fire-and-forget pattern as TC-002 — the warning log is written before
    // showWarningMessage is awaited, so settle() is sufficient.
    void vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, {
      linkText,
      parsed: parseResult.value,
    });
    await ss.settle();
  });

  test('filename-fallback-navigation-004: path with directory separators uses standard resolution', async () => {
    const { filename, relativePath } = createNestedWorkspaceFile('fallback', NESTED_FILE_CONTENT);

    const linkText = `${relativePath}#L10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 10` }]);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(linkText, parseResult.value, filename);

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
  });

  test('filename-root-resolution-001: bare filename with a root match opens the workspace-root file', async () => {
    const rootFilename = `__rl-test-root-${Date.now()}.ts`;
    const rootContent = Array.from({ length: 25 }, (_, i) => `root line ${i + 1} content`).join('\n') + '\n';
    const rootUri = createFileAt(rootFilename, rootContent);

    const shadowDir = createTempDir('root-shadow');
    const shadowFilePath = path.join(shadowDir, rootFilename);
    fs.writeFileSync(shadowFilePath, 'shadow content\n', 'utf8');

    const linkText = `${rootFilename}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${rootFilename} @ 5` }]);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(linkText, parseResult.value, rootFilename);

    assert.strictEqual(doc.uri.fsPath, rootUri.fsPath, 'Expected the root-level file to be opened, not the shadow copy');
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

    ss.log('✓ Root-first resolution opened the root file despite a same-named file deeper in the workspace');
  });

  test('filename-root-resolution-003: multiple matches with no root file navigates to the accepted candidate', async () => {
    const { filename, filePathA } = createDuplicateFiles('dup', DUPLICATE_FILE_CONTENT);

    const linkText = `${filename}#L1`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${filename} @ 1` }]);

    await acceptFirstCandidateTo(async () => {
      await vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, {
        linkText,
        parsed: parseResult.value,
      });
    }, filePathA);

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Expected an active text editor after navigation');
    assert.strictEqual(editor.document.uri.fsPath, filePathA, 'Expected navigation to the first candidate (the a/ copy)');
    const sel = editor.selection;
    const lineLength = editor.document.lineAt(0).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 0, anchorChar: 0, activeLine: 0, activeChar: lineLength },
    );

    ss.log('✓ Accepting the first candidate navigated to the a/ copy with a full-line selection');
  });
});
