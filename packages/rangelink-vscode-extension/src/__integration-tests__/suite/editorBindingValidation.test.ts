import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  findTestItemsByPrefix,
  getLogCapture,
  getWorkspaceRoot,
  printAssistedBanner,
  settle,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

suite('Editor Binding Validation', () => {
  const log = createLogger('editorBindingValidation');
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
  // TC editor-binding-validation-001
  // ---------------------------------------------------------------------------

  test('[assisted] editor-binding-validation-001: search editor content hides link and bind commands', async () => {
    const verdict = await waitForHumanVerdict(
      'editor-binding-validation-001',
      'Open a search editor and right-click in the CONTENT AREA — verify link and bind commands are absent.',
      [
        '1. Press Cmd+Shift+P → type "Open New Search Editor" → run it',
        '2. Right-click anywhere in the EDITOR CONTENT AREA (not the tab at the top)',
        '3. Confirm these do NOT appear: "Send RangeLink", "Send This File\'s Path", "RangeLink: Bind Here"',
        '4. "Send Selected Text" and "Unbind" are acceptable if present',
        '   Click Pass if link/bind commands are absent, Fail if any appear',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Link or bind commands were visible in the search editor content area context menu',
    );
    log('✓ Search editor content hides link/bind commands (human verdict)');
  });

  // ---------------------------------------------------------------------------
  // TC editor-binding-validation-002
  // ---------------------------------------------------------------------------

  test('[assisted] editor-binding-validation-002: output panel hides file path and bind commands', async () => {
    const verdict = await waitForHumanVerdict(
      'editor-binding-validation-002',
      'Open the Output panel and right-click — verify no file path or bind commands appear.',
      [
        '1. Press Cmd+Shift+U (or View → Output) to open the Output panel',
        '2. Click inside the Output panel to focus it',
        '3. Right-click anywhere in the Output panel',
        '4. Confirm no "Send This File\'s Path" or "RangeLink: Bind Here" appears',
        '5. "Unbind" is acceptable if present',
        '   Click Pass if those commands are absent, Fail if any appear',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'File path or bind commands were visible in the output panel context menu',
    );
    log('✓ Output panel hides file path/bind commands (human verdict)');
  });

  // ---------------------------------------------------------------------------
  // TC editor-binding-validation-003
  // ---------------------------------------------------------------------------

  test('[assisted] editor-binding-validation-003: Settings UI hides file path and bind commands', async () => {
    const verdict = await waitForHumanVerdict(
      'editor-binding-validation-003',
      'Open Settings (Cmd+,) and verify no file path or bind commands appear in its menus.',
      [
        '1. Press Cmd+, to open the Settings UI',
        '2. Right-click anywhere in the Settings editor content area',
        '3. Confirm no "RangeLink: Bind Here" appears',
        '4. Right-click the Settings TAB at the top of the editor area',
        '5. Confirm no "Send File Path" or "Send Relative File Path" appears',
        '6. Press Cmd+R Cmd+D — confirm Settings UI is not listed as a bindable destination',
        '7. Press Escape to dismiss the picker',
        '   Click Pass if all commands are absent, Fail if any appear',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'File path or bind commands appeared for the Settings UI');
    log('✓ Settings UI hides file path/bind commands (human verdict)');
  });

  // ---------------------------------------------------------------------------
  // TC editor-binding-validation-004
  // ---------------------------------------------------------------------------

  test('[assisted] editor-binding-validation-004: binary .png file is excluded from R-D destination picker', async () => {
    // Minimal PNG magic bytes — enough for VSCode to detect as binary
    const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngPath = path.join(getWorkspaceRoot(), `__rl-test-ebv-004-${Date.now()}.png`);
    fs.writeFileSync(pngPath, PNG_MAGIC);
    const pngUri = vscode.Uri.file(pngPath);
    tmpFileUris.push(pngUri);

    const txtUri = createWorkspaceFile('ebv-004-txt', 'control file\n');
    tmpFileUris.push(txtUri);

    const txtDoc = await vscode.workspace.openTextDocument(txtUri);
    await vscode.window.showTextDocument(txtDoc, vscode.ViewColumn.One);

    // Open PNG as a text document in col 2 — it becomes an "open editor" so the
    // R-D picker encounters it; isBinaryFile must still exclude it.
    const pngDoc = await vscode.workspace.openTextDocument(pngUri);
    await vscode.window.showTextDocument(pngDoc, vscode.ViewColumn.Two);

    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ebv-004');

    await waitForHuman(
      'editor-binding-validation-004',
      'A .txt file is open in col 1, a .png in col 2. Press Cmd+R Cmd+D and Escape — .png must not appear in picker.',
      [
        '1. The .txt control file is open in column 1, the .png is open in column 2',
        '2. Press Cmd+R Cmd+D to open the destination picker',
        '3. Confirm the .txt file IS listed (positive control)',
        '4. Confirm no .png file appears in the list',
        '5. Press Escape to dismiss',
      ],
    );

    const lines = logCapture.getLinesSince('before-ebv-004');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry from R-D picker');

    const pngFileName = path.basename(pngPath);
    const txtFileName = path.basename(txtUri.fsPath);

    const pngItems = findTestItemsByPrefix(items!, pngFileName);
    assert.strictEqual(
      pngItems.length,
      0,
      `Binary .png file "${pngFileName}" must not appear in R-D picker`,
    );

    const txtItems = findTestItemsByPrefix(items!, 'ebv-004-txt');
    assert.ok(
      txtItems.length > 0,
      `Plain .txt file "${txtFileName}" must appear in R-D picker as positive control`,
    );

    log('✓ Binary .png excluded from R-D picker; .txt control file present (log verified)');
  });

  // ---------------------------------------------------------------------------
  // TC editor-binding-validation-005
  // ---------------------------------------------------------------------------

  test('[assisted] editor-binding-validation-005: search editor TAB hides file path commands', async () => {
    const verdict = await waitForHumanVerdict(
      'editor-binding-validation-005',
      'Open a search editor and right-click its TAB — verify no file path commands appear.',
      [
        '1. Press Cmd+Shift+P → type "Open New Search Editor" → run it',
        '2. Right-click the search editor TAB at the top of the editor area (not the content)',
        '3. Confirm no "Send File Path" or "Send Relative File Path" appears in the context menu',
        '4. "Unbind" is acceptable if present',
        '   Click Pass if file path commands are absent, Fail if any appear',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'File path commands were visible in the search editor tab context menu',
    );
    log('✓ Search editor tab hides file path commands (human verdict)');
  });
});
