import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  printAssistedBanner,
  settle,
  waitForHumanVerdict,
} from '../helpers';

suite('Core Send Commands', () => {
  const log = createLogger('coreSendCommands');
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    await settle();
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-l-005
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-l-005: R-L with no bound destination opens picker', async () => {
    const fileUri = createWorkspaceFile('csc-r-l-005', 'test content\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await settle();

    const verdict = await waitForHumanVerdict(
      'core-send-commands-r-l-005',
      'No destination is bound. Press Cmd+R Cmd+L — verify destination picker opens (not silent clipboard fallback). Escape to dismiss.',
      [
        '1. Text "test" is already selected',
        '2. Confirm no destination is bound',
        '3. Press Cmd+R Cmd+L',
        '4. Verify destination picker appears (NOT a clipboard copy with no UI)',
        '5. Press Escape to dismiss',
        '   Click Pass if picker appeared, Fail if link was silently copied without a picker',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'R-L with no destination did not open picker');
    log('✓ R-L with no destination opens picker (human verdict)');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-p-001
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-p-001: Send Portable Link with no bound destination opens picker', async () => {
    const fileUri = createWorkspaceFile('csc-r-p-001', 'test content\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await settle();

    const verdict = await waitForHumanVerdict(
      'core-send-commands-r-p-001',
      'No destination is bound. From Command Palette, run "Send Portable Link" — verify destination picker opens. Escape.',
      [
        '1. Text "test" is already selected',
        '2. Confirm no destination is bound',
        '3. Press Cmd+Shift+P → type "Send Portable Link" → select "RangeLink: Send Portable Link"',
        '4. Verify destination picker appears',
        '5. Press Escape to dismiss',
        '   Click Pass if picker appeared, Fail if link was silently copied without a picker',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Send Portable Link with no destination did not open picker',
    );
    log('✓ Send Portable Link with no destination opens picker (human verdict)');
  });

  // ---------------------------------------------------------------------------
  // TC core-send-commands-r-v-001
  // ---------------------------------------------------------------------------

  test('[assisted] core-send-commands-r-v-001: Send Selected Text with no bound destination opens picker', async () => {
    const fileUri = createWorkspaceFile('csc-r-v-001', 'test content\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    await settle();

    const verdict = await waitForHumanVerdict(
      'core-send-commands-r-v-001',
      'No destination is bound. From Command Palette, run "Send Selected Text" — verify destination picker opens. Escape.',
      [
        '1. Text "test" is already selected',
        '2. Confirm no destination is bound',
        '3. Press Cmd+Shift+P → type "Send Selected Text" → select "RangeLink: Send Selected Text"',
        '4. Verify destination picker appears',
        '5. Press Escape to dismiss',
        '   Click Pass if picker appeared, Fail if text was silently copied without a picker',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Send Selected Text with no destination did not open picker',
    );
    log('✓ Send Selected Text with no destination opens picker (human verdict)');
  });
});
