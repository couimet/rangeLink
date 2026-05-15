import assert from 'node:assert';

import type { Context as MochaContext } from 'mocha';
import * as vscode from 'vscode';

import {
  CMD_BIND_TO_CLAUDE_CODE,
  CMD_BIND_TO_DESTINATION,
  CMD_COPY_LINK_RELATIVE,
  CMD_JUMP_TO_DESTINATION,
} from '../../constants/commandIds';
import { CLAUDE_CODE_EXTENSION_ID } from '../../utils/aiAssistants/isClaudeCodeAvailable';
import {
  assertStatusBarMsgLogged,
  cleanupFiles,
  createWorkspaceFile,
  extractQuickPickItemsLogged,
  getLogCapture,
  openAndDismiss,
  openEditor,
  settle,
  standardSuite,
  waitForHumanVerdict,
} from '../helpers';

const AI_ASSISTANTS_GROUP_LABEL = 'AI Assistants';
const CLAUDE_CODE_DISPLAY_NAME = 'Claude Code Chat';
const CLAUDE_CODE_BIND_STATUS_BAR_MESSAGE = '✓ RangeLink: Bound to Claude Code Chat';

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
});

standardSuite('Built-in AI Assistants — Destination Picker', (log) => {
  test('claude-code-001: Claude Code Chat appears first in destination picker AI Assistants group', async function (this: MochaContext) {
    // Skip when the Claude Code marketplace extension isn't installed. The test asserts
    // on Claude Code's position in the AI Assistants group, which requires the extension
    // to be active (its presence is what makes the destination appear). The
    // `test:release:with-extensions` config installs it; the standard `test:release:automated`
    // config does not. Without this guard, the test runs in both configs and fails in the
    // standard one because "GitHub Copilot Chat" takes the top slot when Claude Code is absent.
    if (!vscode.extensions.getExtension(CLAUDE_CODE_EXTENSION_ID)) {
      log(
        `Skipping claude-code-001 — "${CLAUDE_CODE_EXTENSION_ID}" extension is not installed in this test config (expected in test:release:automated; runs only under test:release:with-extensions).`,
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
    if (!vscode.extensions.getExtension(CLAUDE_CODE_EXTENSION_ID)) {
      log('Skipping claude-code-007 — Claude Code extension not installed in this test config');
      this.skip();
    }

    const config = vscode.workspace.getConfiguration('rangelink.destinations.claudeCode');

    // Set delay <= interval so the validation rejects it (by default, delay >
    // interval so the config is valid; flipping that relationship makes it invalid).
    const INVALID_DELAY_MS = 100;
    const INVALID_INTERVAL_MS = 400;
    await config.update('coldStartDelayMs', INVALID_DELAY_MS, vscode.ConfigurationTarget.Workspace);
    await config.update(
      'coldRefocusIntervalMs',
      INVALID_INTERVAL_MS,
      vscode.ConfigurationTarget.Workspace,
    );
    await settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-007');

    // Validation lives inside getColdRefocus, which is a thunk only invoked
    // during focus() — not at bind() time. CMD_JUMP_TO_DESTINATION triggers
    // focusBoundDestination() → focus() → getColdRefocus() → validation warning.
    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await settle();

    await vscode.commands.executeCommand(CMD_JUMP_TO_DESTINATION);
    await settle();

    const lines = logCapture.getLinesSince('before-cc-007');
    const warningLog = lines.find(
      (line) =>
        line.includes('coldStartDelayMs must be greater than coldRefocusIntervalMs') &&
        line.includes('using defaults'),
    );
    assert.ok(
      warningLog,
      'Expected validation warning log with "using defaults" when coldStartDelayMs <= coldRefocusIntervalMs',
    );

    log('✓ claude-code-007 — invalid config triggers fallback to defaults');
  });
});
