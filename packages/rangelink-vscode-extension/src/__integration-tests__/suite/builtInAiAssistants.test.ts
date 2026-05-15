import assert from 'node:assert';

import type { Context as MochaContext } from 'mocha';
import * as vscode from 'vscode';

import {
  CMD_BIND_TO_CLAUDE_CODE,
  CMD_BIND_TO_CURSOR_AI,
  CMD_BIND_TO_DESTINATION,
  CMD_BIND_TO_GEMINI_CODE_ASSIST,
  CMD_BIND_TO_GITHUB_COPILOT_CHAT,
  CMD_COPY_LINK_RELATIVE,
  CMD_JUMP_TO_DESTINATION,
} from '../../constants/commandIds';
import {
  DEFAULT_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS,
  DEFAULT_DESTINATIONS_GEMINI_COLD_START_DELAY_MS,
} from '../../constants/settingDefaults';
import {
  EXTENSION_ID_CLAUDE_CODE,
  EXTENSION_ID_GEMINI_CODE_ASSIST,
} from '../../utils/aiAssistants/builtInAiAssistants';
import {
  assertStatusBarMsgLogged,
  cleanupFiles,
  CLIPBOARD_SENTINEL,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  openAndDismiss,
  openEditor,
  settle,
  standardSuite,
  waitForExtensionActive,
  waitForHuman,
  waitForHumanVerdict,
} from '../helpers';

const AI_ASSISTANTS_GROUP_LABEL = 'AI Assistants';
const CLAUDE_CODE_DISPLAY_NAME = 'Claude Code Chat';
const CLAUDE_CODE_BIND_STATUS_BAR_MESSAGE = '✓ RangeLink: Bound to Claude Code Chat';
const GEMINI_CODE_ASSIST_DISPLAY_NAME = 'Gemini Code Assist';
const GEMINI_BIND_STATUS_BAR_MESSAGE = '✓ RangeLink: Bound to Gemini Code Assist';

standardSuite('Built-in AI Assistants', (log) => {
  const tmpFileUris: vscode.Uri[] = [];

  teardown(async () => {
    cleanupFiles(tmpFileUris);
    tmpFileUris.length = 0;
    await settle();
  });

  test('[assisted] claude-code-002: binding to Claude Code Chat and sending a link delivers content to chat', async () => {
    const fileUri = createWorkspaceFile('cc-002', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-002-bind');

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    const bindLines = logCapture.getLinesSince('before-cc-002-bind');
    assertStatusBarMsgLogged(bindLines, {
      message: CLAUDE_CODE_BIND_STATUS_BAR_MESSAGE,
    });

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    logCapture.mark('before-cc-002-send');

    // Invoke the send command directly rather than asking the human to press the chord.
    // This TC verifies bind→send delivery to Claude Code, not keybinding dispatch (which
    // claude-code-004/005 cover). Programmatic invocation removes the focus-fragility
    // that bites when the editor hasn't received a real user click.
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const sendLines = logCapture.getLinesSince('before-cc-002-send');

    const pasteSuccessLog = sendLines.find(
      (line) =>
        line.includes('ComposablePasteDestination.pasteLink') && line.includes('Pasted link'),
    );
    assert.ok(
      pasteSuccessLog,
      'Expected paste link success log after send (code-side paste fired)',
    );

    const clipboardPasteLog = sendLines.find(
      (line) =>
        line.includes('VscodeAdapter.pasteClipboardToAiAssistant') &&
        line.includes('Clipboard paste succeeded'),
    );
    assert.ok(clipboardPasteLog, 'Expected Clipboard paste succeeded log');

    const verdict = await waitForHumanVerdict(
      'claude-code-002',
      'Did the RangeLink + selected code appear in Claude Code chat?',
      [
        '1. The RangeLink send was fired automatically',
        '2. Click PASS if the link + selected code appeared in Claude Code chat input',
        '3. Click FAIL otherwise',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in Claude Code chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    log('✓ Bind status confirmed + content delivered to Claude Code chat');
  });

  test('[assisted] claude-code-004: cold panel paste — content arrives in Claude Code chat after first R-L since bind', async () => {
    const fileUri = createWorkspaceFile('cc-004', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-004');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const lines = logCapture.getLinesSince('before-cc-004');

    const pasteSuccessLog = lines.find(
      (line) =>
        line.includes('ComposablePasteDestination.pasteLink') && line.includes('Pasted link'),
    );
    assert.ok(pasteSuccessLog, 'Expected paste link success log after cold paste send');

    const clipboardPasteLog = lines.find(
      (line) =>
        line.includes('VscodeAdapter.pasteClipboardToAiAssistant') &&
        line.includes('Clipboard paste succeeded'),
    );
    assert.ok(clipboardPasteLog, 'Expected Clipboard paste succeeded log');

    const verdict = await waitForHumanVerdict(
      'claude-code-004',
      'Cold paste: did the RangeLink appear in Claude Code chat?',
      [
        '1. Lines 1-2 of cc-004 are already selected',
        '2. The send was fired automatically (no keypress needed)',
        '3. Click PASS if the RangeLink appeared in Claude Code chat input',
        '4. Click FAIL otherwise',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in Claude Code chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    log('✓ Cold paste: content delivered to Claude Code (verdict PASS)');
  });

  test('[assisted] claude-code-005: warm panel paste — second R-L delivers content without cold-start refocus', async () => {
    const fileUri = createWorkspaceFile('cc-005', 'line 1\nline 2\nline 3\nline 4\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    // First send (cold) — warms the panel
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const coldVerdict = await waitForHumanVerdict(
      'claude-code-005-cold',
      'Cold send: did the RangeLink appear in Claude Code chat?',
      [
        '1. Lines 1-2 of cc-005 are selected; cold send was fired automatically',
        '2. Click PASS if the RangeLink appeared in Claude Code chat input',
        '3. Click FAIL otherwise',
      ],
    );
    assert.strictEqual(
      coldVerdict,
      'pass',
      'Human reported the cold-send RangeLink did not appear in Claude Code chat',
    );

    // Select lines 3-4 for warm send. Re-focus the editor first — the cold
    // verdict dialog stole focus and the editor must be active for the send
    // command to see the selection.
    await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-005-warm');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const lines = logCapture.getLinesSince('before-cc-005-warm');

    const pasteSuccessLog = lines.find(
      (line) =>
        line.includes('ComposablePasteDestination.pasteLink') && line.includes('Pasted link'),
    );
    assert.ok(pasteSuccessLog, 'Expected paste link success log on warm send');

    const clipboardPasteLog = lines.find(
      (line) =>
        line.includes('VscodeAdapter.pasteClipboardToAiAssistant') &&
        line.includes('Clipboard paste succeeded'),
    );
    assert.ok(clipboardPasteLog, 'Expected Clipboard paste succeeded log on warm send');

    const warmVerdict = await waitForHumanVerdict(
      'claude-code-005-warm',
      'Warm send: did the lines 3-4 RangeLink appear in Claude Code chat without refocus flicker?',
      [
        '1. Lines 3-4 of cc-005 are selected; warm send was fired automatically',
        '2. Click PASS if the new RangeLink appeared AND the panel did not flicker/refocus',
        '3. Click FAIL otherwise (no content, or visible flicker indicating cold-start path)',
      ],
    );
    assert.strictEqual(
      warmVerdict,
      'pass',
      'Human reported the warm-send RangeLink did not appear cleanly in Claude Code chat',
    );

    log('✓ Warm paste: content delivered to Claude Code (cold + warm both PASS)');
  });

  test('[assisted] gemini-code-assist-002: binding to Gemini Code Assist and sending a link delivers content to chat', async () => {
    const fileUri = createWorkspaceFile('gc-002', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    await openEditor(fileUri);
    await settle();

    await waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST, log);

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-002-bind');

    await vscode.commands.executeCommand(CMD_BIND_TO_GEMINI_CODE_ASSIST);
    await settle();

    const bindLines = logCapture.getLinesSince('before-gc-002-bind');
    assertStatusBarMsgLogged(bindLines, {
      message: GEMINI_BIND_STATUS_BAR_MESSAGE,
    });

    const bindDestinationLog = bindLines.find(
      (line) => line.includes('PasteDestinationManager') && line.includes('bound to'),
    );
    assert.ok(
      bindDestinationLog,
      `Expected a PasteDestinationManager "bound to" log line in the ${bindLines.length} bind lines`,
    );

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    logCapture.mark('before-gc-002-send');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const sendLines = logCapture.getLinesSince('before-gc-002-send');

    const pasteSuccessLog = sendLines.find(
      (line) =>
        line.includes('ComposablePasteDestination.pasteLink') && line.includes('Pasted link'),
    );
    assert.ok(
      pasteSuccessLog,
      'Expected paste link success log after send (code-side paste fired)',
    );

    const clipboardPasteLog = sendLines.find(
      (line) =>
        line.includes('VscodeAdapter.pasteClipboardToAiAssistant') &&
        line.includes('Clipboard paste succeeded'),
    );
    assert.ok(clipboardPasteLog, 'Expected Clipboard paste succeeded log');

    const verdict = await waitForHumanVerdict(
      'gemini-code-assist-002',
      'Did the RangeLink + selected code appear in Gemini Code Assist chat?',
      [
        '1. The RangeLink send was fired automatically',
        '2. Click PASS if the link + selected code appeared in Gemini Code Assist chat input',
        '3. Click FAIL otherwise',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in Gemini Code Assist chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    log('✓ Bind status confirmed + content delivered to Gemini Code Assist chat');
  });

  test('[assisted] gemini-code-assist-003: cold panel paste — content arrives in Gemini Code Assist chat after first R-L since bind', async () => {
    const fileUri = createWorkspaceFile('gc-003', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    await waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST, log);

    await vscode.commands.executeCommand(CMD_BIND_TO_GEMINI_CODE_ASSIST);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-003');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const lines = logCapture.getLinesSince('before-gc-003');

    const pasteSuccessLog = lines.find(
      (line) =>
        line.includes('ComposablePasteDestination.pasteLink') && line.includes('Pasted link'),
    );
    assert.ok(pasteSuccessLog, 'Expected paste link success log after cold paste send');

    const clipboardPasteLog = lines.find(
      (line) =>
        line.includes('VscodeAdapter.pasteClipboardToAiAssistant') &&
        line.includes('Clipboard paste succeeded'),
    );
    assert.ok(clipboardPasteLog, 'Expected Clipboard paste succeeded log');

    const verdict = await waitForHumanVerdict(
      'gemini-code-assist-003',
      'Cold paste: did the RangeLink appear in Gemini Code Assist chat?',
      [
        '1. Lines 1-2 of gc-003 are already selected',
        '2. The send was fired automatically (no keypress needed)',
        '3. Click PASS if the RangeLink appeared in Gemini Code Assist chat input',
        '4. Click FAIL otherwise',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in Gemini Code Assist chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    log('✓ Cold paste: content delivered to Gemini Code Assist (verdict PASS)');
  });

  test('[assisted] gemini-code-assist-004: warm panel paste — second R-L delivers content without cold-start refocus', async () => {
    const fileUri = createWorkspaceFile('gc-004', 'line 1\nline 2\nline 3\nline 4\n');
    tmpFileUris.push(fileUri);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    await waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST, log);

    await vscode.commands.executeCommand(CMD_BIND_TO_GEMINI_CODE_ASSIST);
    await settle();

    // First send (cold) — warms the panel
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const coldVerdict = await waitForHumanVerdict(
      'gemini-code-assist-004-cold',
      'Cold send: did the RangeLink appear in Gemini Code Assist chat?',
      [
        '1. Lines 1-2 of gc-004 are selected; cold send was fired automatically',
        '2. Click PASS if the RangeLink appeared in Gemini Code Assist chat input',
        '3. Click FAIL otherwise',
      ],
    );
    assert.strictEqual(
      coldVerdict,
      'pass',
      'Human reported the cold-send RangeLink did not appear in Gemini Code Assist chat',
    );

    // Select lines 3-4 for warm send
    await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-004-warm');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await settle();

    const lines = logCapture.getLinesSince('before-gc-004-warm');

    const pasteSuccessLog = lines.find(
      (line) =>
        line.includes('ComposablePasteDestination.pasteLink') && line.includes('Pasted link'),
    );
    assert.ok(pasteSuccessLog, 'Expected paste link success log on warm send');

    const clipboardPasteLog = lines.find(
      (line) =>
        line.includes('VscodeAdapter.pasteClipboardToAiAssistant') &&
        line.includes('Clipboard paste succeeded'),
    );
    assert.ok(clipboardPasteLog, 'Expected Clipboard paste succeeded log on warm send');

    const warmVerdict = await waitForHumanVerdict(
      'gemini-code-assist-004-warm',
      'Warm send: did the lines 3-4 RangeLink appear in Gemini Code Assist chat without refocus flicker?',
      [
        '1. Lines 3-4 of gc-004 are selected; warm send was fired automatically',
        '2. Click PASS if the new RangeLink appeared AND the panel did not flicker/refocus',
        '3. Click FAIL otherwise (no content, or visible flicker indicating cold-start path)',
      ],
    );
    assert.strictEqual(
      warmVerdict,
      'pass',
      'Human reported the warm-send RangeLink did not appear cleanly in Gemini Code Assist chat',
    );

    log('✓ Warm paste: content delivered to Gemini Code Assist (cold + warm both PASS)');
  });

  test('[assisted] clipboard-preservation-011: cold paste to Claude Code — prior clipboard restored', async () => {
    const fileUri = createWorkspaceFile('cp-011', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    const editor = await openEditor(fileUri);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    const verdict = await waitForHumanVerdict(
      'clipboard-preservation-011',
      'Cold paste: verify prior clipboard is restored after Claude Code paste',
      [
        '1. Copy the sentinel value to clipboard — select some text and Cmd+C, then type Cmd+V to verify it is on clipboard',
        '2. Lines 1-2 already selected in cp-011 — press Cmd+R Cmd+L',
        '3. Wait for the RangeLink to appear in Claude Code chat',
        '4. Open a new editor tab (Cmd+N) and paste (Cmd+V)',
        `5. Click PASS if the pasted content is "${CLIPBOARD_SENTINEL}" (restored), FAIL if RangeLink appears instead`,
      ],
    );

    assert.strictEqual(verdict, 'pass');
    log('✓ clipboard-preservation-011: prior clipboard restored after cold paste');
  });

  test('[assisted] clipboard-preservation-012: warm paste to Claude Code — prior clipboard restored', async () => {
    const fileUri = createWorkspaceFile('cp-012', 'line 1\nline 2\nline 3\nline 4\n');
    tmpFileUris.push(fileUri);
    const editor = await openEditor(fileUri);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    // Warmup: lines 1-2 pre-selected
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    await waitForHuman(
      'clipboard-preservation-012-warmup',
      'Warmup: press Cmd+R Cmd+L to send pre-selected lines 1-2, confirm link appears, then Cancel',
      [
        '1. Lines 1-2 already selected in cp-012 — press Cmd+R Cmd+L',
        '2. Confirm the RangeLink appears in Claude Code chat',
        '3. Press Cancel to continue',
      ],
    );
    await settle();

    // Pre-select lines 3-4 for the warm send
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await settle();

    const verdict = await waitForHumanVerdict(
      'clipboard-preservation-012',
      'Warm paste: verify prior clipboard restored after second send',
      [
        '1. Copy the sentinel value to clipboard — select some text and Cmd+C, then type Cmd+V to verify it is on clipboard',
        '2. Lines 3-4 already selected in cp-012 — press Cmd+R Cmd+L',
        '3. Open a new editor tab (Cmd+N) and paste (Cmd+V)',
        `4. Click PASS if pasted content is "${CLIPBOARD_SENTINEL}" (restored), FAIL otherwise`,
      ],
    );

    assert.strictEqual(verdict, 'pass');
    log('✓ clipboard-preservation-012: prior clipboard restored after warm paste');
  });

  test('[assisted] clipboard-preservation-013: cold paste to Cursor AI — prior clipboard restored', async () => {
    const fileUri = createWorkspaceFile('cp-013', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    const editor = await openEditor(fileUri);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CURSOR_AI);
    await settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    const verdict = await waitForHumanVerdict(
      'clipboard-preservation-013',
      'Cold paste to Cursor AI: verify prior clipboard is restored',
      [
        '1. Copy a known string (e.g., "PRIOR-CURSOR") to clipboard — select it and Cmd+C',
        '2. Lines 1-2 already selected in cp-013 — press Cmd+R Cmd+L',
        '3. Wait for the RangeLink to appear in Cursor AI chat',
        '4. Open a new editor tab (Cmd+N) and paste (Cmd+V)',
        '5. Click PASS if the pasted content is "PRIOR-CURSOR" (restored), FAIL if RangeLink appears instead',
      ],
    );

    assert.strictEqual(verdict, 'pass');
    log('✓ clipboard-preservation-013: cold Cursor AI paste — clipboard restored');
  });

  test('[assisted] clipboard-preservation-014: warm paste to Cursor AI — prior clipboard restored', async () => {
    const fileUri = createWorkspaceFile('cp-014', 'line 1\nline 2\nline 3\nline 4\n');
    tmpFileUris.push(fileUri);
    const editor = await openEditor(fileUri);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CURSOR_AI);
    await settle();

    // Warmup: lines 1-2 pre-selected
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    await waitForHuman(
      'clipboard-preservation-014-warmup',
      'Warmup: press Cmd+R Cmd+L to send pre-selected lines 1-2, confirm link appears in Cursor AI, then Cancel',
      [
        '1. Lines 1-2 already selected in cp-014 — press Cmd+R Cmd+L',
        '2. Confirm the RangeLink appears in Cursor AI chat',
        '3. Press Cancel to continue',
      ],
    );
    await settle();

    // Pre-select lines 3-4 for the warm send
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await settle();

    const verdict = await waitForHumanVerdict(
      'clipboard-preservation-014',
      'Warm paste to Cursor AI: verify prior clipboard restored after second send',
      [
        '1. Copy a known string (e.g., "PRIOR-CURSOR-WARM") to clipboard — select it and Cmd+C',
        '2. Lines 3-4 already selected in cp-014 — press Cmd+R Cmd+L',
        '3. Open a new editor tab (Cmd+N) and paste (Cmd+V)',
        '4. Click PASS if pasted content is "PRIOR-CURSOR-WARM" (restored), FAIL otherwise',
      ],
    );

    assert.strictEqual(verdict, 'pass');
    log('✓ clipboard-preservation-014: warm Cursor AI paste — clipboard restored');
  });

  test('[assisted] clipboard-preservation-015: cold paste to Copilot Chat — prior clipboard restored', async () => {
    const fileUri = createWorkspaceFile('cp-015', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    const editor = await openEditor(fileUri);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    const verdict = await waitForHumanVerdict(
      'clipboard-preservation-015',
      'Cold paste to GitHub Copilot Chat: verify prior clipboard is restored',
      [
        '1. Copy a known string (e.g., "PRIOR-COPILOT") to clipboard — select it and Cmd+C',
        '2. Lines 1-2 already selected in cp-015 — press Cmd+R Cmd+L',
        '3. Wait for the RangeLink to appear in Copilot Chat input',
        '4. Open a new editor tab (Cmd+N) and paste (Cmd+V)',
        '5. Click PASS if the pasted content is "PRIOR-COPILOT" (restored), FAIL if RangeLink appears instead',
      ],
    );

    assert.strictEqual(verdict, 'pass');
    log('✓ clipboard-preservation-015: cold Copilot Chat paste — clipboard restored');
  });

  test('[assisted] clipboard-preservation-016: warm paste to Copilot Chat — prior clipboard restored', async () => {
    const fileUri = createWorkspaceFile('cp-016', 'line 1\nline 2\nline 3\nline 4\n');
    tmpFileUris.push(fileUri);
    const editor = await openEditor(fileUri);
    await settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await settle();

    // Warmup: lines 1-2 pre-selected
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    await waitForHuman(
      'clipboard-preservation-016-warmup',
      'Warmup: press Cmd+R Cmd+L to send pre-selected lines 1-2, confirm link appears in Copilot Chat, then Cancel',
      [
        '1. Lines 1-2 already selected in cp-016 — press Cmd+R Cmd+L',
        '2. Confirm the RangeLink appears in Copilot Chat input',
        '3. Press Cancel to continue',
      ],
    );
    await settle();

    // Pre-select lines 3-4 for the warm send
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await settle();

    const verdict = await waitForHumanVerdict(
      'clipboard-preservation-016',
      'Warm paste to GitHub Copilot Chat: verify prior clipboard restored after second send',
      [
        '1. Copy a known string (e.g., "PRIOR-COPILOT-WARM") to clipboard — select it and Cmd+C',
        '2. Lines 3-4 already selected in cp-016 — press Cmd+R Cmd+L',
        '3. Open a new editor tab (Cmd+N) and paste (Cmd+V)',
        '4. Click PASS if pasted content is "PRIOR-COPILOT-WARM" (restored), FAIL otherwise',
      ],
    );

    assert.strictEqual(verdict, 'pass');
    log('✓ clipboard-preservation-016: warm Copilot Chat paste — clipboard restored');
  });

  test('[assisted] clipboard-preservation-017: failed paste — RangeLink stays on clipboard for manual paste', async () => {
    const fileUri = createWorkspaceFile('cp-017', 'line 1\nline 2\nline 3\n');
    tmpFileUris.push(fileUri);
    const editor = await openEditor(fileUri);
    await settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await settle();

    const verdict = await waitForHumanVerdict(
      'clipboard-preservation-017',
      'Failed paste: verify RangeLink stays on clipboard when AI assistant focus/paste throws',
      [
        '1. PRECONDITION: Bind a Custom AI assistant named "Dummy AI (Focus-Fail)" that uses a failing focus command',
        '2. Copy the sentinel value to clipboard — select some text and Cmd+C, then type Cmd+V to verify it is on clipboard',
        '3. Lines 1-2 already selected in cp-017 — press Cmd+R Cmd+L',
        '4. The paste should fail (focus command throws)',
        '5. Open a new editor tab (Cmd+N) and paste (Cmd+V)',
        `6. Click PASS if the clipboard contains the RangeLink (NOT restored), FAIL if "${CLIPBOARD_SENTINEL}" was restored`,
      ],
    );

    assert.strictEqual(verdict, 'pass');
    log('✓ clipboard-preservation-017: failed paste — RangeLink stays on clipboard');
  });
});

standardSuite('Built-in AI Assistants — Destination Picker', (log) => {
  test('claude-code-001: Claude Code Chat appears first in destination picker AI Assistants group', async function (this: MochaContext) {
    // Skip when the Claude Code marketplace extension isn't installed. The test asserts
    // on Claude Code's position in the AI Assistants group, which requires the extension
    // to be active (its presence is what makes the destination appear). The
    // `test:release:with-extensions` config installs it; the standard `test:release:automated`
    // config does not. Without this guard, the test runs in both configs and fails in the
    // standard one because "GitHub Copilot Chat" takes the top slot when Claude Code is absent.
    if (!vscode.extensions.getExtension(EXTENSION_ID_CLAUDE_CODE)) {
      log(
        `Skipping claude-code-001 — "${EXTENSION_ID_CLAUDE_CODE}" extension is not installed in this test config (expected in test:release:automated; runs only under test:release:with-extensions).`,
      );
      this.skip();
    }

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-001');

    await openAndDismiss(CMD_BIND_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-cc-001');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry from destination picker');

    const aiSectionItems: Record<string, unknown>[] = [];
    let inAiSection = false;
    for (const item of items) {
      const isSeparator = item.kind === vscode.QuickPickItemKind.Separator;
      if (isSeparator) {
        if (item.label === AI_ASSISTANTS_GROUP_LABEL) {
          inAiSection = true;
        } else if (inAiSection) {
          break;
        }
        continue;
      }
      if (inAiSection) {
        aiSectionItems.push(item);
      }
    }

    assert.ok(
      aiSectionItems.length > 0,
      `Expected at least one item under the "${AI_ASSISTANTS_GROUP_LABEL}" separator`,
    );
    assert.strictEqual(
      aiSectionItems[0].displayName,
      CLAUDE_CODE_DISPLAY_NAME,
      `Expected "${CLAUDE_CODE_DISPLAY_NAME}" to be the first AI Assistant item`,
    );
    assert.strictEqual(aiSectionItems[0].itemKind, 'bindable');

    log('✓ Claude Code Chat appears first in the AI Assistants group');
  });

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

  test('claude-code-006: Cold-start default settings produce correct ColdRefocusConfig', async function (this: MochaContext) {
    const config = vscode.workspace.getConfiguration('rangelink.destinations.claudeCode');
    const totalMs = config.get<number>('coldStartDelayMs', 1500);
    const intervalMs = config.get<number>('coldRefocusIntervalMs', 300);

    assert.strictEqual(totalMs, 1500, 'Expected default coldStartDelayMs to be 1500');
    assert.strictEqual(intervalMs, 300, 'Expected default coldRefocusIntervalMs to be 300');
    assert.ok(
      totalMs > intervalMs,
      `Expected coldStartDelayMs (${totalMs}) > coldRefocusIntervalMs (${intervalMs})`,
    );

    log('✓ Default cold-start config produces valid ColdRefocusConfig');
  });

  test('claude-code-007: Cold-start validation rejects invalid config and falls back to defaults', async function (this: MochaContext) {
    if (!vscode.extensions.getExtension(EXTENSION_ID_CLAUDE_CODE)) {
      log('Skipping claude-code-007 — Claude Code extension not installed in this test config');
      this.skip();
    }

    const config = vscode.workspace.getConfiguration('rangelink.destinations.claudeCode');

    // Set invalid config: delay (100) <= interval (400)
    await config.update('coldStartDelayMs', 100, vscode.ConfigurationTarget.Workspace);
    await config.update('coldRefocusIntervalMs', 400, vscode.ConfigurationTarget.Workspace);
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-007');

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    await vscode.commands.executeCommand(CMD_JUMP_TO_DESTINATION);
    await settle();

    const lines = logCapture.getLinesSince('before-cc-007');
    const warningLog = lines.find((line) =>
      line.includes('coldStartDelayMs must be greater than coldRefocusIntervalMs'),
    );
    assert.ok(
      warningLog,
      'Expected validation warning log when coldStartDelayMs <= coldRefocusIntervalMs',
    );

    log('✓ claude-code-007 — invalid config triggers fallback to defaults');
  });

  test('gemini-code-assist-001: Gemini Code Assist appears in destination picker when available', async function (this: MochaContext) {
    if (!vscode.extensions.getExtension(EXTENSION_ID_GEMINI_CODE_ASSIST)) {
      log(
        `Skipping gemini-code-assist-001 — "${EXTENSION_ID_GEMINI_CODE_ASSIST}" extension is not installed in this test config.`,
      );
      this.skip();
    }

    await waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST, log);

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-001');

    await openAndDismiss(CMD_BIND_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-gc-001');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry from destination picker');

    const geminiItem = items!.find((item) => item.displayName === GEMINI_CODE_ASSIST_DISPLAY_NAME);
    assert.ok(
      geminiItem,
      `Expected "${GEMINI_CODE_ASSIST_DISPLAY_NAME}" in the destination picker items`,
    );
    assert.strictEqual(geminiItem!.itemKind, 'bindable');

    log('✓ gemini-code-assist-001 — Gemini Code Assist appears in the destination picker');
  });

  test('gemini-code-assist-005: Cold-start default settings produce correct ColdRefocusConfig', async () => {
    const config = vscode.workspace.getConfiguration('rangelink.destinations.gemini');
    const totalMs = config.get<number>(
      'coldStartDelayMs',
      DEFAULT_DESTINATIONS_GEMINI_COLD_START_DELAY_MS,
    );
    const intervalMs = config.get<number>(
      'coldRefocusIntervalMs',
      DEFAULT_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS,
    );

    assert.strictEqual(
      totalMs,
      DEFAULT_DESTINATIONS_GEMINI_COLD_START_DELAY_MS,
      'Expected default coldStartDelayMs',
    );
    assert.strictEqual(
      intervalMs,
      DEFAULT_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS,
      'Expected default coldRefocusIntervalMs',
    );
    assert.ok(
      totalMs > intervalMs,
      `Expected coldStartDelayMs (${totalMs}) > coldRefocusIntervalMs (${intervalMs})`,
    );

    log('✓ Default Gemini cold-start config produces valid ColdRefocusConfig');
  });

  test('gemini-code-assist-006: Cold-start validation rejects invalid config and falls back to defaults', async function (this: MochaContext) {
    if (!vscode.extensions.getExtension(EXTENSION_ID_GEMINI_CODE_ASSIST)) {
      log(
        'Skipping gemini-code-assist-006 — Gemini Code Assist extension not installed in this test config',
      );
      this.skip();
    }

    const INVALID_DELAY_MS = 100;
    const INVALID_INTERVAL_MS = 400;

    const config = vscode.workspace.getConfiguration('rangelink.destinations.gemini');

    // Set delay <= interval so the validation rejects it (by default, delay >
    // interval so the config is valid; flipping that relationship makes it invalid).
    await config.update('coldStartDelayMs', INVALID_DELAY_MS, vscode.ConfigurationTarget.Workspace);
    await config.update(
      'coldRefocusIntervalMs',
      INVALID_INTERVAL_MS,
      vscode.ConfigurationTarget.Workspace,
    );
    await settle();

    await waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST, log);

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-006');

    // Validation lives inside getColdRefocus, which is a thunk only invoked
    // during focus() — not at bind() time. CMD_JUMP_TO_DESTINATION triggers
    // focusBoundDestination() → focus() → getColdRefocus() → validation warning.
    await vscode.commands.executeCommand(CMD_BIND_TO_GEMINI_CODE_ASSIST);
    await settle();

    await vscode.commands.executeCommand(CMD_JUMP_TO_DESTINATION);
    await settle();

    const lines = logCapture.getLinesSince('before-gc-006');
    const warningLog = lines.find(
      (line) =>
        line.includes('coldStartDelayMs must be greater than coldRefocusIntervalMs') &&
        line.includes('using defaults'),
    );
    assert.ok(
      warningLog,
      'Expected validation warning log with "using defaults" when coldStartDelayMs <= coldRefocusIntervalMs',
    );

    log('✓ gemini-code-assist-006 — invalid config triggers fallback to defaults');
  });
});
