import assert from 'node:assert';
import * as path from 'node:path';

import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import {
  activateExtension,
  assertNoToastLogged,
  assertSuppressionLogged,
  assertToastLogged,
  cleanupFiles,
  closeAllEditors,
  createWorkspaceFile,
  getLogCapture,
  navigateViaHandleLinkClick,
  settle,
} from '../helpers';

suite('Navigation Toast Settings', () => {
  let testFilename: string;
  let testFileUri: vscode.Uri;

  suiteSetup(async () => {
    await activateExtension();

    assert.ok(
      getLogCapture().isCapturing,
      'RANGELINK_CAPTURE_LOGS must be true for toast assertions',
    );

    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1} content here`);
    testFileUri = createWorkspaceFile('toast settings', lines.join('\n') + '\n');
    testFilename = path.basename(testFileUri.fsPath);
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles([testFileUri]);
  });

  teardown(async () => {
    const config = vscode.workspace.getConfiguration('rangelink');
    await config.update(
      'navigation.showNavigatedToast',
      undefined,
      vscode.ConfigurationTarget.Workspace,
    );
    await config.update(
      'navigation.showClampingWarning',
      undefined,
      vscode.ConfigurationTarget.Workspace,
    );
  });

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
    assertSuppressionLogged(lines, {
      fn: 'RangeLinkNavigationHandler.navigateToLink',
      suppressedMessage: `RangeLink: Navigated to ${testFilename} @ 5`,
    });
    assertNoToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${testFilename} @ 5`,
    });
  });

  test('navigation-toast-settings-002: showClampingWarning=false suppresses clamping warning but navigation still works', async () => {
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('navigation.showClampingWarning', false, vscode.ConfigurationTarget.Workspace);

    const linkText = `${testFilename}#L50`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-toast-settings-002');

    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );
    await settle();

    const lastLine = doc.lineCount - 1;
    assert.strictEqual(sel.anchor.line, lastLine, `Expected clamped to last line ${lastLine}`);

    const lines = logCapture.getLinesSince('before-toast-settings-002');
    assertSuppressionLogged(lines, {
      fn: 'RangeLinkNavigationHandler.navigateToLink',
      suppressedMessage: `RangeLink: Navigated to ${testFilename} @ 50 (clamped: line exceeded file length)`,
    });
    assertNoToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Navigated to ${testFilename} @ 50 (clamped: line exceeded file length)`,
    });
  });

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
