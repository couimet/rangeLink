import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ParsedLink } from 'rangelink-core-ts';
import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { assertToastLogged, assertNoToastLogged, getLogCapture } from '../helpers';

const SETTLE_MS = 500;
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

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

suite('Navigation Toast Settings', () => {
  let testFilename: string;
  let testFilePath: string;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');
    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();

    assert.ok(
      getLogCapture().isCapturing,
      'RANGELINK_CAPTURE_LOGS must be true for toast assertions',
    );

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content here`);
    testFilename = `__rl-test-toast-settings-${Date.now()}.ts`;
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

  teardown(async () => {
    const config = vscode.workspace.getConfiguration('rangelink');
    await config.update('navigation.showNavigatedToast', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('navigation.showClampingWarning', undefined, vscode.ConfigurationTarget.Workspace);
  });

  // navigation-toast-settings-001: showNavigatedToast=false suppresses info toast
  test('navigation-toast-settings-001: showNavigatedToast=false suppresses info toast but navigation still works', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('navigation.showNavigatedToast', false, vscode.ConfigurationTarget.Workspace);

    const linkText = `${testFilename}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-toast-settings-001');

    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);
    await settle();

    assert.strictEqual(sel.anchor.line, 4, `Expected anchor line 4 but got ${sel.anchor.line}`);

    const lines = logCapture.getLinesSince('before-toast-settings-001');
    assertNoToastLogged(lines, { type: 'info', message: 'RangeLink: Navigated to' });
  });

  // navigation-toast-settings-002: showClampingWarning=false suppresses clamping warning
  test('navigation-toast-settings-002: showClampingWarning=false suppresses clamping warning but navigation still works', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('navigation.showClampingWarning', false, vscode.ConfigurationTarget.Workspace);

    const linkText = `${testFilename}#L50`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-toast-settings-002');

    const { sel, doc } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);
    await settle();

    const lastLine = doc.lineCount - 1;
    assert.strictEqual(sel.anchor.line, lastLine, `Expected clamped to last line ${lastLine}`);

    const lines = logCapture.getLinesSince('before-toast-settings-002');
    assertNoToastLogged(lines, { type: 'warning', message: 'clamped' });
  });

  // navigation-toast-settings-003: default settings show info toast
  test('navigation-toast-settings-003: default settings show info toast after successful navigation', async () => {
    const linkText = `${testFilename}#L3`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-toast-settings-003');

    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);
    await settle();

    assert.strictEqual(sel.anchor.line, 2, `Expected anchor line 2 but got ${sel.anchor.line}`);

    const lines = logCapture.getLinesSince('before-toast-settings-003');
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${testFilename} @ 3`,
    });
  });
});
