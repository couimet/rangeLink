import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_BIND_TO_CLAUDE_CODE, CMD_BIND_TO_DESTINATION, CMD_UNBIND_DESTINATION } from '../../constants/commandIds';
import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createLogger,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  openAndDismiss,
  openEditor,
  settle,
  standardSuite,
  waitForHuman,
} from '../helpers';

suite('Built-in AI Assistants', () => {
  const log = createLogger('builtInAiAssistants');
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
  });

  teardown(async () => {
    await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.length = 0;
    await settle();
  });

  test('[assisted] claude-code-004: cold panel paste — content arrives in Claude Code chat after first R-L since bind', async () => {
    const fileUri = createWorkspaceFile('cc-004', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-004');

    await waitForHuman(
      'claude-code-004',
      'Cold paste: select lines 1-2 and press Cmd+R Cmd+L, verify link appears in Claude Code chat, then Cancel',
      [
        '1. Click into the test file (cc-004) to focus it',
        '2. Select exactly lines 1-2 (click line 1, shift-click end of line 2)',
        '3. Press Cmd+R Cmd+L — the RangeLink should appear in Claude Code chat input',
        '4. Visually confirm the link appears in Claude Code',
        '5. Press Cancel to continue (assertions happen automatically)',
      ],
    );

    await settle();
    const lines = logCapture.getLinesSince('before-cc-004');

    const pasteSuccessLog = lines.find(
      (line) =>
        line.includes('ComposablePasteDestination.pasteLink') && line.includes('Pasted link'),
    );
    assert.ok(pasteSuccessLog, 'Expected paste link success log after cold paste send');

    const clipboardPasteLog = lines.find(
      (line) =>
        line.includes('VscodeAdapter.pasteTextFromClipboard') &&
        line.includes('Clipboard paste succeeded'),
    );
    assert.ok(clipboardPasteLog, 'Expected Clipboard paste succeeded log');

    log('✓ Cold paste: focus + clipboard paste executed, content sent to Claude Code');
  });

  test('[assisted] claude-code-005: warm panel paste — second R-L delivers content without cold-start refocus', async () => {
    const fileUri = createWorkspaceFile('cc-005', 'line 1\nline 2\nline 3\nline 4\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    // First send (cold) — warms the panel
    await waitForHuman(
      'claude-code-005-cold',
      'First send (cold): select lines 1-2 and press Cmd+R Cmd+L, confirm link appears, then Cancel',
      [
        '1. Click into the test file (cc-005)',
        '2. Select exactly lines 1-2 (click line 1, shift-click end of line 2)',
        '3. Press Cmd+R Cmd+L — the RangeLink should appear in Claude Code chat',
        '4. Visually confirm the link appears in Claude Code',
        '5. Press Cancel to continue',
      ],
    );
    await settle();

    // Select lines 3-4 for warm send
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(2, 0, 3, 7);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-005');

    await waitForHuman(
      'claude-code-005-warm',
      'Second send (warm): verify lines 3-4 selected, press Cmd+R Cmd+L, confirm no refocus flicker, then Cancel',
      [
        '1. Lines 3-4 should already be selected in cc-005',
        '2. Press Cmd+R Cmd+L — the RangeLink should appear in Claude Code chat',
        '3. Visually confirm NO refocus flickering or delay (panel already warm)',
        '4. Press Cancel to continue',
      ],
    );
    await settle();

    const lines = logCapture.getLinesSince('before-cc-005');

    const pasteSuccessLog = lines.find(
      (line) =>
        line.includes('ComposablePasteDestination.pasteLink') && line.includes('Pasted link'),
    );
    assert.ok(pasteSuccessLog, 'Expected paste link success log on warm send');

    const clipboardPasteLog = lines.find(
      (line) =>
        line.includes('VscodeAdapter.pasteTextFromClipboard') &&
        line.includes('Clipboard paste succeeded'),
    );
    assert.ok(clipboardPasteLog, 'Expected Clipboard paste succeeded log on warm send');

    log('✓ Warm paste: content arrived without cold-start refocus');
  });
});

standardSuite('Built-in AI Assistants — Destination Picker', (log) => {
  test('github-copilot-chat-001: GitHub Copilot Chat appears in destination picker when available', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-copilot-001');

    await openAndDismiss(CMD_BIND_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-copilot-001');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry — was the picker opened?');

    const copilotItem = items!.find((item) => item.displayName === 'GitHub Copilot Chat');
    assert.ok(copilotItem, 'Expected "GitHub Copilot Chat" in the destination picker items');
    assert.strictEqual(copilotItem!.itemKind, 'bindable');

    log('✓ github-copilot-chat-001 — log confirms "GitHub Copilot Chat" appears in R-D picker');
  });
});
