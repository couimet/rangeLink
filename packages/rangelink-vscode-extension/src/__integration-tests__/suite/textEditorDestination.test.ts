import * as vscode from 'vscode';

import { CMD_BIND_TO_TEXT_EDITOR_HERE, CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  assertToastLogged,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  getLogCapture,
  printAssistedBanner,
  settle,
  waitForHuman,
} from '../helpers';

suite('Text Editor Destination', () => {
  const log = createLogger('textEditorDestination');
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
  // TC text-editor-destination-001
  // ---------------------------------------------------------------------------

  test('[assisted] text-editor-destination-001: self-paste R-L copies to clipboard and shows info message', async () => {
    const fileUri = createWorkspaceFile('chg-nosplit-002', 'self-paste test\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_TEXT_EDITOR_HERE);
    await settle();

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 9));
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ted-001');

    await waitForHuman(
      'text-editor-destination-001',
      'The file is bound to itself. Press Cmd+R Cmd+L — verify info message appears and file is unchanged.',
      [
        '1. The current file is already set as its own destination (bound via test setup)',
        '2. Text "self-past" is already selected',
        '3. Press Cmd+R Cmd+L',
        '4. Verify an info notification appears saying the link was copied and cannot auto-paste to same file',
        '5. Verify the file content has NOT changed',
      ],
    );

    const lines = logCapture.getLinesSince('before-ted-001');

    assertToastLogged(lines, {
      type: 'info',
      message:
        'RangeLink copied to clipboard. Cannot auto-paste to same file. Tip: Use R-C for clipboard-only links.',
    });

    log('✓ Self-paste R-L: info toast shown, file unchanged (log verified)');
  });
});
