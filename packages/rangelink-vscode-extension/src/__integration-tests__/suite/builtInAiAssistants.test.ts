import assert from 'node:assert';

import type { Context as MochaContext } from 'mocha';
import * as vscode from 'vscode';

import {
  CMD_BIND_TO_CLAUDE_CODE,
  CMD_BIND_TO_CURSOR_AI,
  CMD_BIND_TO_CUSTOM_AI_BY_ID,
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
  assertClipboardEqualsGeneratedLink,
  assertPasteCommandSucceeded,
  extractQuickPickItemsLogged,
  getLogCapture,
  openAndDismiss,
  parseLogContext,
  standardSuite,
  waitForHumanVerdict,
  withClipboardSentinel,
} from '../helpers';

const AI_ASSISTANTS_GROUP_LABEL = 'AI Assistants';
const CLAUDE_CODE_DISPLAY_NAME = 'Claude Code Chat';
const GEMINI_CODE_ASSIST_DISPLAY_NAME = 'Gemini Code Assist';

standardSuite('Built-in AI Assistants', (ss) => {
  test('[assisted] claude-code-002: binding to Claude Code Chat and sending a link delivers content to chat', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cc-002', 'line 1\nline 2\nline 3\n');
    await ss.openEditor(fileUri);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-002-bind');

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await ss.settle();

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    logCapture.mark('before-cc-002-send');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const sendLines = logCapture.getLinesSince('before-cc-002-send');

    assertPasteCommandSucceeded(sendLines);

    const verdict = await waitForHumanVerdict(
      'claude-code-002',
      'Did the RangeLink + selected code appear in Claude Code chat?',
      ['1. The RangeLink send was fired automatically', 'Verdict:'],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in Claude Code chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    ss.log('✓ Bind status confirmed + content delivered to Claude Code chat');
  });

  test('[assisted] claude-code-004: cold panel paste — content arrives in Claude Code chat after first R-L since bind', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cc-004', 'line 1\nline 2\nline 3\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-004');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-cc-004');

    assertPasteCommandSucceeded(lines);

    const verdict = await waitForHumanVerdict(
      'claude-code-004',
      'Cold paste: did the RangeLink appear in Claude Code chat?',
      [
        '1. Lines 1-2 of cc-004 are already selected',
        '2. The send was fired automatically (no keypress needed)',
        'Verdict:',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in Claude Code chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    ss.log('✓ Cold paste: content delivered to Claude Code (verdict PASS)');
  });

  test('[assisted] claude-code-005: warm panel paste — second R-L delivers content without cold-start refocus', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cc-005', 'line 1\nline 2\nline 3\nline 4\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await ss.settle();

    // First send (cold) — warms the panel
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const coldVerdict = await waitForHumanVerdict(
      'claude-code-005-cold',
      'Cold send: did the RangeLink appear in Claude Code chat?',
      ['1. Lines 1-2 of cc-005 are selected; cold send was fired automatically', 'Verdict:'],
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
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-005-warm');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const warmLines = logCapture.getLinesSince('before-cc-005-warm');

    assertPasteCommandSucceeded(warmLines);

    const warmVerdict = await waitForHumanVerdict(
      'claude-code-005-warm',
      'Warm send: did the lines 3-4 RangeLink appear in Claude Code chat without refocus flicker?',
      ['1. Lines 3-4 of cc-005 are selected; warm send was fired automatically', 'Verdict:'],
    );
    assert.strictEqual(
      warmVerdict,
      'pass',
      'Human reported the warm-send RangeLink did not appear cleanly in Claude Code chat',
    );

    ss.log('✓ Warm paste: content delivered to Claude Code (cold + warm both PASS)');
  });

  test('[assisted] gemini-code-assist-002: binding to Gemini Code Assist and sending a link delivers content to chat', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Gemini Code Assist',
      '✓ RangeLink: RangeLink sent to Gemini Code Assist',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('gc-002', 'line 1\nline 2\nline 3\n');
    await ss.openEditor(fileUri);
    await ss.settle();

    await ss.waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST);

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-002-bind');

    await vscode.commands.executeCommand(CMD_BIND_TO_GEMINI_CODE_ASSIST);
    await ss.settle();

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    logCapture.mark('before-gc-002-send');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const sendLines = logCapture.getLinesSince('before-gc-002-send');

    assertPasteCommandSucceeded(sendLines);

    const verdict = await waitForHumanVerdict(
      'gemini-code-assist-002',
      'Did the RangeLink + selected code appear in Gemini Code Assist chat?',
      ['1. The RangeLink send was fired automatically', 'Verdict:'],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in Gemini Code Assist chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    ss.log('✓ Bind status confirmed + content delivered to Gemini Code Assist chat');
  });

  test('[assisted] gemini-code-assist-003: cold panel paste — content arrives in Gemini Code Assist chat after first R-L since bind', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Gemini Code Assist',
      '✓ RangeLink: RangeLink sent to Gemini Code Assist',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('gc-003', 'line 1\nline 2\nline 3\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await ss.waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST);

    await vscode.commands.executeCommand(CMD_BIND_TO_GEMINI_CODE_ASSIST);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-003');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-gc-003');

    assertPasteCommandSucceeded(lines);

    const verdict = await waitForHumanVerdict(
      'gemini-code-assist-003',
      'Cold paste: did the RangeLink appear in Gemini Code Assist chat?',
      [
        '1. Lines 1-2 of gc-003 are already selected',
        '2. The send was fired automatically (no keypress needed)',
        'Verdict:',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in Gemini Code Assist chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    ss.log('✓ Cold paste: content delivered to Gemini Code Assist (verdict PASS)');
  });

  test('[assisted] gemini-code-assist-004: warm panel paste — second R-L delivers content without cold-start refocus', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Gemini Code Assist',
      '✓ RangeLink: RangeLink sent to Gemini Code Assist',
      '✓ RangeLink: RangeLink sent to Gemini Code Assist',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('gc-004', 'line 1\nline 2\nline 3\nline 4\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await ss.waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST);

    await vscode.commands.executeCommand(CMD_BIND_TO_GEMINI_CODE_ASSIST);
    await ss.settle();

    // First send (cold) — warms the panel
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const coldVerdict = await waitForHumanVerdict(
      'gemini-code-assist-004-cold',
      'Cold send: did the RangeLink appear in Gemini Code Assist chat?',
      ['1. Lines 1-2 of gc-004 are selected; cold send was fired automatically', 'Verdict:'],
    );
    assert.strictEqual(
      coldVerdict,
      'pass',
      'Human reported the cold-send RangeLink did not appear in Gemini Code Assist chat',
    );

    // Select lines 3-4 for warm send
    await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-004-warm');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-gc-004-warm');

    assertPasteCommandSucceeded(lines);

    const warmVerdict = await waitForHumanVerdict(
      'gemini-code-assist-004-warm',
      'Warm send: did the lines 3-4 RangeLink appear in Gemini Code Assist chat without refocus flicker?',
      ['1. Lines 3-4 of gc-004 are selected; warm send was fired automatically', 'Verdict:'],
    );
    assert.strictEqual(
      warmVerdict,
      'pass',
      'Human reported the warm-send RangeLink did not appear cleanly in Gemini Code Assist chat',
    );

    ss.log('✓ Warm paste: content delivered to Gemini Code Assist (cold + warm both PASS)');
  });

  test('[assisted] github-copilot-chat-002: binding to GitHub Copilot Chat and sending a link delivers content to chat', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to GitHub Copilot Chat',
      '✓ RangeLink: RangeLink sent to GitHub Copilot Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('ghc-002', 'line 1\nline 2\nline 3\n');
    await ss.openEditor(fileUri);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ghc-002-bind');

    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    logCapture.mark('before-ghc-002-send');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const sendLines = logCapture.getLinesSince('before-ghc-002-send');

    assertPasteCommandSucceeded(sendLines);

    const verdict = await waitForHumanVerdict(
      'github-copilot-chat-002',
      'Did the RangeLink + selected code appear in GitHub Copilot Chat?',
      ['1. The RangeLink send was fired automatically', 'Verdict:'],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in GitHub Copilot Chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    ss.log('✓ Bind status confirmed + content delivered to GitHub Copilot Chat');
  });

  test('[assisted] github-copilot-chat-003: cold panel paste — content arrives in GitHub Copilot Chat after first R-L since bind', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to GitHub Copilot Chat',
      '✓ RangeLink: RangeLink sent to GitHub Copilot Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('ghc-003', 'line 1\nline 2\nline 3\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ghc-003');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-ghc-003');

    assertPasteCommandSucceeded(lines);

    const verdict = await waitForHumanVerdict(
      'github-copilot-chat-003',
      'Cold paste: did the RangeLink appear in GitHub Copilot Chat?',
      [
        '1. Lines 1-2 of ghc-003 are already selected',
        '2. The send was fired automatically (no keypress needed)',
        'Verdict:',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported the RangeLink did not appear in GitHub Copilot Chat (code-side paste logs fired — the paste dispatched but did not reach the chat input)',
    );

    ss.log('✓ Cold paste: content delivered to GitHub Copilot Chat (verdict PASS)');
  });

  test('[assisted] github-copilot-chat-004: warm panel paste — second R-L delivers content without cold-start refocus', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to GitHub Copilot Chat',
      '✓ RangeLink: RangeLink sent to GitHub Copilot Chat',
      '✓ RangeLink: RangeLink sent to GitHub Copilot Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('ghc-004', 'line 1\nline 2\nline 3\nline 4\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    // First send (cold) — warms the panel
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const coldVerdict = await waitForHumanVerdict(
      'github-copilot-chat-004-cold',
      'Cold send: did the RangeLink appear in GitHub Copilot Chat?',
      ['1. Lines 1-2 of ghc-004 are selected; cold send was fired automatically', 'Verdict:'],
    );
    assert.strictEqual(
      coldVerdict,
      'pass',
      'Human reported the cold-send RangeLink did not appear in GitHub Copilot Chat',
    );

    // Select lines 3-4 for warm send
    await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-ghc-004-warm');

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const lines = logCapture.getLinesSince('before-ghc-004-warm');

    assertPasteCommandSucceeded(lines);

    const warmVerdict = await waitForHumanVerdict(
      'github-copilot-chat-004-warm',
      'Warm send: did the lines 3-4 RangeLink appear in GitHub Copilot Chat without refocus flicker?',
      ['1. Lines 3-4 of ghc-004 are selected; warm send was fired automatically', 'Verdict:'],
    );
    assert.strictEqual(
      warmVerdict,
      'pass',
      'Human reported the warm-send RangeLink did not appear cleanly in GitHub Copilot Chat',
    );

    ss.log('✓ Warm paste: content delivered to GitHub Copilot Chat (cold + warm both PASS)');
  });

  test('clipboard-preservation-011: cold paste to Claude Code — prior clipboard restored', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cp-011', 'line 1\nline 2\nline 3\n');
    const editor = await ss.openEditor(fileUri);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await ss.settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await withClipboardSentinel('before-clip-011', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ clipboard-preservation-011: prior clipboard restored after cold paste');
  });

  test('clipboard-preservation-012: warm paste to Claude Code — prior clipboard restored', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cp-012', 'line 1\nline 2\nline 3\nline 4\n');
    const editor = await ss.openEditor(fileUri);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await ss.settle();

    // Warmup: lines 1-2 pre-selected
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    // Pre-select lines 3-4 for the warm send — refocus editor first since
    // the cold paste moved focus to the AI assistant panel.
    await vscode.window.showTextDocument(editor.document);
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await ss.settle();

    await withClipboardSentinel('before-clip-012', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ clipboard-preservation-012: prior clipboard restored after warm paste');
  });

  test('clipboard-preservation-013: cold paste to Cursor AI — prior clipboard restored', async function (this: MochaContext) {
    if (!vscode.extensions.getExtension('cursor.cursor')) {
      ss.log(
        'Skipping clipboard-preservation-013 — Cursor AI extension not installed in this test config',
      );
      this.skip();
    }

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Cursor AI Assistant',
      '✓ RangeLink: RangeLink sent to Cursor AI Assistant',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cp-013', 'line 1\nline 2\nline 3\n');
    const editor = await ss.openEditor(fileUri);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CURSOR_AI);
    await ss.settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await withClipboardSentinel('before-clip-013', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ clipboard-preservation-013: cold Cursor AI paste — clipboard restored');
  });

  test('clipboard-preservation-014: warm paste to Cursor AI — prior clipboard restored', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Cursor AI Assistant',
      '✓ RangeLink: RangeLink sent to Cursor AI Assistant',
      '✓ RangeLink: RangeLink sent to Cursor AI Assistant',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cp-014', 'line 1\nline 2\nline 3\nline 4\n');
    const editor = await ss.openEditor(fileUri);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CURSOR_AI);
    await ss.settle();

    // Warmup: lines 1-2 pre-selected
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    // Pre-select lines 3-4 for the warm send — refocus editor first since
    // the cold paste moved focus to the AI assistant panel.
    await vscode.window.showTextDocument(editor.document);
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await ss.settle();

    await withClipboardSentinel('before-clip-014', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ clipboard-preservation-014: warm Cursor AI paste — clipboard restored');
  });

  test('clipboard-preservation-015: cold paste to Copilot Chat — prior clipboard restored', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to GitHub Copilot Chat',
      '✓ RangeLink: RangeLink sent to GitHub Copilot Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    const fileUri = ss.createWorkspaceFile('cp-015', 'line 1\nline 2\nline 3\n');
    const editor = await ss.openEditor(fileUri);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await withClipboardSentinel('before-clip-015', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ clipboard-preservation-015: cold Copilot Chat paste — clipboard restored');
  });

  test('clipboard-preservation-016: warm paste to Copilot Chat — prior clipboard restored', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to GitHub Copilot Chat',
      '✓ RangeLink: RangeLink sent to GitHub Copilot Chat',
      '✓ RangeLink: RangeLink sent to GitHub Copilot Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cp-016', 'line 1\nline 2\nline 3\nline 4\n');
    const editor = await ss.openEditor(fileUri);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    // Warmup: lines 1-2 pre-selected
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    // Pre-select lines 3-4 for the warm send — refocus editor first since
    // the cold paste moved focus to the AI assistant panel.
    await vscode.window.showTextDocument(editor.document);
    editor.selection = new vscode.Selection(2, 0, 3, 6);
    await ss.settle();

    await withClipboardSentinel('before-clip-016', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });
    ss.log('✓ clipboard-preservation-016: warm Copilot Chat paste — clipboard restored');
  });

  test('clipboard-preservation-017: failed paste — RangeLink stays on clipboard for manual paste', async () => {
    const fileUri = ss.createWorkspaceFile('cp-017', 'line 1\nline 2\nline 3\n');
    const editor = await ss.openEditor(fileUri);
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Focus-Fail)',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });
    ss.expectToastMessages([
      { level: 'warning', message: 'Paste (Cmd/Ctrl+V) in Dummy AI (Focus-Fail) to use.' },
    ]);

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension-focus-fail',
    });
    await ss.settle();

    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    await assertClipboardEqualsGeneratedLink(
      'clipboard-preservation-017: failed paste',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
        await ss.settle();
      },
      'before-017',
    );
    ss.log('✓ clipboard-preservation-017: failed paste — RangeLink stays on clipboard');
  });

  test('[assisted] clipboard-preservation-018: two rapid R-L to Claude Code — last write wins, prior content restored once', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
      '✓ RangeLink: RangeLink sent to Claude Code Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const fileUri = ss.createWorkspaceFile('cp-018', 'line 1\nline 2\nline 3\nline 4\n');
    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await ss.settle();

    // First send: lines 1-2
    editor.selection = new vscode.Selection(0, 0, 1, 6);
    await ss.settle();

    const RAPID_SEND_INTERVAL_MS = 50;

    await withClipboardSentinel('before-018-rapid', 'R-L', async () => {
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);

      // Simulate realistic delay between rapid keypresses
      await new Promise<void>((resolve) => setTimeout(resolve, RAPID_SEND_INTERVAL_MS));

      // Re-focus editor; the first send shifted focus to the AI assistant panel
      const focusedEditor = await vscode.window.showTextDocument(doc);
      focusedEditor.selection = new vscode.Selection(2, 0, 3, 6);
      await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
      await ss.settle();
    });

    const verdict = await waitForHumanVerdict(
      'clipboard-preservation-018',
      'Two rapid R-L: did both RangeLinks appear in Claude Code chat (lines 1-2 first and then lines 3-4)?',
      [
        '1. Two rapid sends were fired automatically',
        '2. Check Claude Code chat for BOTH RangeLinks (lines 1-2 and lines 3-4)',
        'Verdict:',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported rapid R-L did not deliver both links or clipboard was corrupted',
    );

    ss.log(
      '✓ clipboard-preservation-018: rapid R-L — both links delivered, clipboard restored once',
    );
  });
});

standardSuite('Built-in AI Assistants — Destination Picker', (ss) => {
  test('claude-code-001: Claude Code Chat appears first in destination picker AI Assistants group', async function (this: MochaContext) {
    // Skip when the Claude Code marketplace extension isn't installed. The test asserts
    // on Claude Code's position in the AI Assistants group, which requires the extension
    // to be active (its presence is what makes the destination appear). The
    // `test:release:with-extensions` config installs it; the standard `test:release:automated`
    // config does not. Without this guard, the test runs in both configs and fails in the
    // standard one because "GitHub Copilot Chat" takes the top slot when Claude Code is absent.
    if (!vscode.extensions.getExtension(EXTENSION_ID_CLAUDE_CODE)) {
      ss.log(
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

    ss.log('✓ Claude Code Chat appears first in the AI Assistants group');
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

    ss.log('✓ github-copilot-chat-001 — log confirms "GitHub Copilot Chat" appears in R-D picker');
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

    ss.log('✓ Default cold-start config produces valid ColdRefocusConfig');
  });

  test('claude-code-007: Cold-start validation rejects invalid config and falls back to defaults', async function (this: MochaContext) {
    if (!vscode.extensions.getExtension(EXTENSION_ID_CLAUDE_CODE)) {
      ss.log('Skipping claude-code-007 — Claude Code extension not installed in this test config');
      this.skip();
    }

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Claude Code Chat',
      '✓ RangeLink: Focused Claude Code Chat',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const config = vscode.workspace.getConfiguration('rangelink.destinations.claudeCode');

    const INVALID_DELAY_MS = 100;
    const INVALID_INTERVAL_MS = 400;

    // Set invalid config: delay (100) <= interval (400)
    await config.update('coldStartDelayMs', INVALID_DELAY_MS, vscode.ConfigurationTarget.Workspace);
    await config.update(
      'coldRefocusIntervalMs',
      INVALID_INTERVAL_MS,
      vscode.ConfigurationTarget.Workspace,
    );
    await ss.settle();

    const logCapture = getLogCapture();
    logCapture.mark('before-cc-007');

    await vscode.commands.executeCommand(CMD_BIND_TO_CLAUDE_CODE);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_JUMP_TO_DESTINATION);
    await ss.settle();

    const ccLines = getLogCapture().getLinesSince('before-cc-007');
    const ccCtx = parseLogContext(
      ccLines.find((l) => {
        const c = parseLogContext(l);
        return (
          c?.fn === 'claudeCode.getColdRefocus' &&
          c.totalMs === INVALID_DELAY_MS &&
          c.intervalMs === INVALID_INTERVAL_MS
        );
      }) ?? '',
    );
    assert.ok(ccCtx, 'Expected claudeCode.getColdRefocus warning with totalMs=100, intervalMs=400');

    ss.log('✓ claude-code-007 — invalid config triggers fallback to defaults');
  });

  test('gemini-code-assist-001: Gemini Code Assist appears in destination picker when available', async function (this: MochaContext) {
    if (!vscode.extensions.getExtension(EXTENSION_ID_GEMINI_CODE_ASSIST)) {
      ss.log(
        `Skipping gemini-code-assist-001 — "${EXTENSION_ID_GEMINI_CODE_ASSIST}" extension is not installed in this test config.`,
      );
      this.skip();
    }

    await ss.waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST);

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

    ss.log('✓ gemini-code-assist-001 — Gemini Code Assist appears in the destination picker');
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

    ss.log('✓ Default Gemini cold-start config produces valid ColdRefocusConfig');
  });

  test('gemini-code-assist-006: Cold-start validation rejects invalid config and falls back to defaults', async function (this: MochaContext) {
    if (!vscode.extensions.getExtension(EXTENSION_ID_GEMINI_CODE_ASSIST)) {
      ss.log(
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
    await ss.settle();

    await ss.waitForExtensionActive(EXTENSION_ID_GEMINI_CODE_ASSIST);

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Gemini Code Assist',
      '✓ RangeLink: Focused Gemini Code Assist',
    ]);
    ss.expectContextKeys({ 'rangelink.isBound': true });

    const logCapture = getLogCapture();
    logCapture.mark('before-gc-006');

    // Validation lives inside getColdRefocus, which is a thunk only invoked
    // during focus() — not at bind() time. CMD_JUMP_TO_DESTINATION triggers
    // focusBoundDestination() → focus() → getColdRefocus() → validation warning.
    await vscode.commands.executeCommand(CMD_BIND_TO_GEMINI_CODE_ASSIST);
    await ss.settle();

    await vscode.commands.executeCommand(CMD_JUMP_TO_DESTINATION);
    await ss.settle();

    const gcLines = getLogCapture().getLinesSince('before-gc-006');
    const gcCtx = parseLogContext(
      gcLines.find((l) => {
        const c = parseLogContext(l);
        return (
          c?.fn === 'gemini.getColdRefocus' &&
          c.totalMs === INVALID_DELAY_MS &&
          c.intervalMs === INVALID_INTERVAL_MS
        );
      }) ?? '',
    );
    assert.ok(gcCtx, 'Expected gemini.getColdRefocus warning with totalMs=100, intervalMs=400');

    ss.log('✓ gemini-code-assist-006 — invalid config triggers fallback to defaults');
  });
});
