import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  CMD_BIND_TO_CUSTOM_AI_BY_ID,
  CMD_BIND_TO_DESTINATION,
  CMD_BIND_TO_GITHUB_COPILOT_CHAT,
  CMD_COPY_LINK_RELATIVE,
} from '../../constants/commandIds';
import {
  assertClipboardChanged,
  assertClipboardPreservationRan,
  assertClipboardRestored,
  extractQuickPickItemsLogged,
  getLogCapture,
  openAndDismiss,
  standardSuite,
  waitForHumanVerdict,
  writeClipboardSentinel,
} from '../helpers';

const EXPECTED_CUSTOM_AI_REGISTRATIONS = 6;

const getExpectedCustomAssistantsCount = (): number => {
  const raw = process.env.RANGELINK_CUSTOM_AI_COUNT;
  if (raw === undefined) {
    throw new Error(
      'RANGELINK_CUSTOM_AI_COUNT env var is not set — the test runner must export this via setup-integration-test-settings.js',
    );
  }
  const count = parseInt(raw, 10);
  if (isNaN(count)) {
    throw new Error(
      `RANGELINK_CUSTOM_AI_COUNT must be a valid number, got: ${raw}`,
    );
  }
  return count;
};

standardSuite('Custom AI Assistants', (_ss) => {
  test('custom-ai-assistant-001: three-tier config is parsed and logged at activation', () => {
    const expectedCount = getExpectedCustomAssistantsCount();
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const parseLogLine = allLines.find(
      (line) => line.includes('parseCustomAiAssistants') && line.includes('Loaded'),
    );

    assert.ok(
      parseLogLine,
      'Expected parseCustomAiAssistants INFO log showing loaded custom AI assistants — if missing, the rangelink.customAiAssistants setting may not be configured in the test workspace',
    );
    assert.ok(
      parseLogLine.includes(`"count":${expectedCount}`),
      `Expected ${expectedCount} custom AI assistants loaded but got: ${parseLogLine}`,
    );
    assert.ok(
      parseLogLine.includes('rangelink.dummy-ai-extension'),
      `Expected log to mention 'rangelink.dummy-ai-extension' extensionId but got: ${parseLogLine}`,
    );
  });

  test('custom-ai-assistant-002: all three tier entries registered as destination kinds', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const registrationLogs = allLines.filter(
      (line) => line.includes('Registering builder for destination') && line.includes('custom-ai:'),
    );

    assert.strictEqual(
      registrationLogs.length,
      EXPECTED_CUSTOM_AI_REGISTRATIONS,
      `Expected ${EXPECTED_CUSTOM_AI_REGISTRATIONS} custom AI registrations but found ${registrationLogs.length}: ${registrationLogs.join('\n')}`,
    );
    assert.ok(
      registrationLogs.some((l) => l.includes('custom-ai:rangelink.dummy-ai-extension"')),
      'Expected registration for Tier 1 (rangelink.dummy-ai-extension)',
    );
    assert.ok(
      registrationLogs.some((l) => l.includes('custom-ai:rangelink.dummy-ai-extension-tier2')),
      'Expected registration for Tier 2 (rangelink.dummy-ai-extension-tier2)',
    );
    assert.ok(
      registrationLogs.some((l) => l.includes('custom-ai:rangelink.dummy-ai-extension-tier3')),
      'Expected registration for Tier 3 (rangelink.dummy-ai-extension-tier3)',
    );
    assert.ok(
      registrationLogs.some((l) => l.includes('custom-ai:rangelink.dummy-ai-extension-template')),
      'Expected registration for Template (rangelink.dummy-ai-extension-template)',
    );
    assert.ok(
      registrationLogs.some((l) => l.includes('custom-ai:rangelink.dummy-ai-extension-fallback')),
      'Expected registration for Fallback (rangelink.dummy-ai-extension-fallback)',
    );
    assert.ok(
      registrationLogs.some((l) => l.includes('custom-ai:rangelink.dummy-ai-extension-focus-fail')),
      'Expected registration for Focus-Fail (rangelink.dummy-ai-extension-focus-fail)',
    );
  });

  test('custom-ai-assistant-004: dummy extension insertText command is detectable', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('dummyAi.insertText'),
      'Expected dummyAi.insertText to be registered — dummy-ai-extension should be loaded',
    );
  });

  test('custom-ai-assistant-005: tier 1 entry has its insertCommand registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('dummyAi.insertText'),
      'Expected dummyAi.insertText to be registered — Tier 1 entry should be available when this command exists',
    );

    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();
    const registrationLog = allLines.find(
      (line) =>
        line.includes('Registering builder for destination') &&
        line.includes('custom-ai:rangelink.dummy-ai-extension"'),
    );
    assert.ok(
      registrationLog,
      'Expected Tier 1 entry (rangelink.dummy-ai-extension) to be registered as a destination kind',
    );
  });

  test('custom-ai-assistant-006: dummy extension commands are all registered', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('dummyAi.insertText'), 'Expected dummyAi.insertText command');
    assert.ok(
      commands.includes('dummyAi.insertWithArgs'),
      'Expected dummyAi.insertWithArgs command',
    );
    assert.ok(commands.includes('dummyAi.focusForPaste'), 'Expected dummyAi.focusForPaste command');
    assert.ok(commands.includes('dummyAi.focusFail'), 'Expected dummyAi.focusFail command');
    assert.ok(commands.includes('dummyAi.focusPanel'), 'Expected dummyAi.focusPanel command');
    assert.ok(commands.includes('dummyAi.getText'), 'Expected dummyAi.getText command');
    assert.ok(commands.includes('dummyAi.clearAll'), 'Expected dummyAi.clearAll command');
  });

  test('custom-ai-assistant-009: template entry with ${content} interpolation is parsed and registered', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const registrationLog = allLines.find(
      (line) =>
        line.includes('Registering builder for destination') &&
        line.includes('custom-ai:rangelink.dummy-ai-extension-template'),
    );

    assert.ok(
      registrationLog,
      'Expected registration for template entry (rangelink.dummy-ai-extension-template)',
    );
  });

  const EXPECTED_GITHUB_COPILOT_CHAT_REGISTRATION_COUNT = 1;
  const EXPECTED_NO_CUSTOM_AI_COPILOT_REGISTRATIONS = 0;

  test('custom-ai-assistant-015: built-in GitHub Copilot Chat registers as a destination kind', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const copilotRegistrations = allLines.filter(
      (line) =>
        line.includes('Registering builder for destination') &&
        line.includes('"kind":"github-copilot-chat"'),
    );
    assert.strictEqual(
      copilotRegistrations.length,
      EXPECTED_GITHUB_COPILOT_CHAT_REGISTRATION_COUNT,
      `Expected exactly 1 registration for github-copilot-chat but found ${copilotRegistrations.length}`,
    );
  });

  test('custom-ai-assistant-016: built-in GitHub Copilot Chat does not register as custom-ai kind', async () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const copilotRegistration = allLines.find(
      (line) =>
        line.includes('Registering builder for destination') &&
        line.includes('"kind":"github-copilot-chat"'),
    );
    assert.ok(copilotRegistration, 'Expected github-copilot-chat registration log');

    const noSeparateCustomRegistration = allLines.filter(
      (line) =>
        line.includes('Registering builder for destination') &&
        line.includes('custom-ai:github.copilot-chat'),
    );
    assert.strictEqual(
      noSeparateCustomRegistration.length,
      EXPECTED_NO_CUSTOM_AI_COPILOT_REGISTRATIONS,
      'GitHub Copilot Chat should register as built-in kind, not custom-ai: prefixed',
    );
  });

  test('custom-ai-assistant-008: parser normalizes plain string insertCommands', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const parseLog = allLines.find(
      (line) => line.includes('parseCustomAiAssistants') && line.includes('Loaded'),
    );

    assert.ok(
      parseLog,
      'Expected parseCustomAiAssistants to load assistants with insertCommands configured as plain strings',
    );
    assert.ok(
      parseLog.includes('rangelink.dummy-ai-extension'),
      `Expected loaded assistant to include rangelink.dummy-ai-extension but got: ${parseLog}`,
    );
  });
});

standardSuite('Custom AI Assistants — Destination Picker', (ss) => {
  test('custom-ai-assistant-003: custom AI assistant appears in R-D destination picker with configured display name', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-003');

    await openAndDismiss(CMD_BIND_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-003');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry — was the picker opened?');

    const tier1 = items!.find((item) => item.displayName === 'Dummy AI (Tier 1)');
    assert.ok(tier1, 'Expected "Dummy AI (Tier 1)" in the destination picker items');
    assert.strictEqual(tier1!.itemKind, 'bindable');

    ss.log('✓ custom-ai-assistant-003 — log confirms "Dummy AI (Tier 1)" appears in R-D picker');
  });

  test('custom-ai-assistant-007: multiple custom AI assistants listed in user-defined order', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-007');

    await openAndDismiss(CMD_BIND_TO_DESTINATION);

    const lines = logCapture.getLinesSince('before-007');
    const items = extractQuickPickItemsLogged(lines);
    assert.ok(items, 'Expected showQuickPick log entry — was the picker opened?');

    const EXPECTED_ORDER = [
      'Dummy AI (Tier 1)',
      'Dummy AI (Tier 2)',
      'Dummy AI (Tier 3)',
      'Dummy AI (Template)',
      'Dummy AI (Fallback)',
    ];

    const indices = EXPECTED_ORDER.map((name) =>
      items!.findIndex((item) => item.displayName === name),
    );

    for (const [i, name] of EXPECTED_ORDER.entries()) {
      assert.notStrictEqual(indices[i], -1, `Expected "${name}" in the destination picker items`);
    }

    for (let i = 0; i < indices.length - 1; i++) {
      assert.ok(
        indices[i]! < indices[i + 1]!,
        `Expected "${EXPECTED_ORDER[i]}" (index ${indices[i]}) before "${EXPECTED_ORDER[i + 1]}" (index ${indices[i + 1]})`,
      );
    }

    ss.log(
      '✓ custom-ai-assistant-007 — log confirms custom AI assistants appear in settings.json order',
    );
  });
});

standardSuite('Custom AI Assistants — Cold Start', (ss) => {
  test('custom-ai-assistant-017: Tier 1 direct insert works when panel is not yet visible', async () => {
    await ss.createAndOpenFile('__rl-test-cold-start', 'cold start test');
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Tier 1)',
      '✓ RangeLink: RangeLink sent to Dummy AI (Tier 1)',
    ]);
    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension',
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-cold-start');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.ok(
      textResult!.tier1.length > 0,
      'Expected tier1 textarea to contain the link even though panel was not pre-opened',
    );
    assert.strictEqual(
      textResult!.tier2,
      '',
      'Expected tier2 textarea to be empty (no cross-contamination)',
    );

    ss.log('✓ Tier 1 cold start — panel auto-initialized, text delivered');
  });
});

standardSuite('Custom AI Assistants — Paste Flow', (ss) => {
  suiteSetup(async () => {
    await vscode.commands.executeCommand('dummyAi.focusPanel');
    await ss.settle();
    await vscode.commands.executeCommand('dummyAi.getText');
  });

  test('custom-ai-assistant-010: Tier 1 direct insert delivers text to dummy textarea', async () => {
    await ss.createAndOpenFile('__rl-test-tier1', 'hello world\nline two\nline three');
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Tier 1)',
      '✓ RangeLink: RangeLink sent to Dummy AI (Tier 1)',
    ]);
    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension',
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-tier1-paste');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.ok(
      textResult!.tier1.length > 0,
      `Expected tier1 textarea to contain the link but got empty string`,
    );
    assert.strictEqual(
      textResult!.tier2,
      '',
      'Expected tier2 textarea to be empty (no cross-contamination)',
    );

    ss.log('✓ Tier 1 direct insert delivered text to dummy textarea');
  });

  test('custom-ai-assistant-011: Tier 1 clipboard isolation — sentinel preserved', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Tier 1)',
      '✓ RangeLink: RangeLink sent to Dummy AI (Tier 1)',
    ]);
    await ss.createAndOpenFile('__rl-test-tier1-clip', 'clipboard test');
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension',
    });

    await writeClipboardSentinel();
    const logCapture = getLogCapture();
    logCapture.mark('before-tier1-clip');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    assertClipboardPreservationRan(logCapture, 'before-tier1-clip', 'R-L');

    await assertClipboardRestored(
      'Tier 1 should not disturb clipboard — outer preserve restores sentinel',
    );

    ss.log('✓ Tier 1 clipboard isolation — sentinel preserved after R-L');
  });

  test('custom-ai-assistant-012: Tier 3 shows manual-paste toast and clipboard not restored', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Tier 3)',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectToastMessages([
      { level: 'info', message: 'Paste (Cmd/Ctrl+V) in Dummy AI (Tier 3) to use.' },
    ]);
    await ss.createAndOpenFile('__rl-test-tier3', 'tier three test');
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension-tier3',
    });

    await writeClipboardSentinel();
    const logCapture = getLogCapture();
    logCapture.mark('before-tier3-paste');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const clipboardContent = await assertClipboardChanged(
      'Tier 3 clipboard should NOT be restored — link must stay for manual paste',
    );
    assert.ok(clipboardContent.length > 0, 'Clipboard should contain the RangeLink');

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.strictEqual(
      textResult!.tier1,
      '',
      'Expected tier1 textarea to be empty (Tier 3 uses manual paste, not direct insert)',
    );

    ss.log('✓ Tier 3 shows manual-paste toast, clipboard not restored (link stays)');
  });

  test('custom-ai-assistant-013: Tier 2→3 fallback — clipboard not restored and manual paste works', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Fallback)',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectToastMessages([
      { level: 'info', message: 'Paste (Cmd/Ctrl+V) in Dummy AI (Fallback) to use.' },
    ]);
    await ss.createAndOpenFile('__rl-test-fallback', 'fallback test');
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension-fallback',
    });

    await writeClipboardSentinel();
    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-paste');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const clipboardContent = await assertClipboardChanged(
      'Fallback→Tier 3 clipboard should NOT be restored — link must stay for manual paste',
    );
    assert.ok(clipboardContent.length > 0, 'Clipboard should contain the RangeLink');

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.strictEqual(
      textResult!.tier1,
      '',
      'Expected tier1 textarea to be empty (fallback resolved to focusCommands, not direct insert)',
    );

    ss.log('✓ Tier 2→3 fallback: clipboard not restored, manual paste verified');
  });

  test('custom-ai-assistant-014: ${content} template delivers text via insertWithArgs', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Dummy AI (Template)',
      '✓ RangeLink: RangeLink sent to Dummy AI (Template)',
    ]);
    await ss.createAndOpenFile('__rl-test-template', 'template test content');
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'rangelink.dummy-ai-extension-template',
    });

    const logCapture = getLogCapture();
    logCapture.mark('before-template-paste');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.ok(
      textResult!.tier1.length > 0,
      'Expected tier1 textarea to contain the link via template interpolation',
    );

    ss.log(
      '✓ ${content} template interpolation delivered text to dummy textarea via insertWithArgs',
    );
  });
});

standardSuite('Custom AI Assistants — Copilot Override', (ss) => {
  test('custom-ai-assistant-018: Copilot Chat override routes content to Dummy AI via setup-integration-test-settings', async () => {
    await ss.createAndOpenFile('__rl-test-copilot-override', 'copilot override test');
    await ss.settle();

    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to GitHub Copilot Chat',
      '✓ RangeLink: RangeLink sent to GitHub Copilot Chat',
    ]);
    await vscode.commands.executeCommand(CMD_BIND_TO_GITHUB_COPILOT_CHAT);
    await ss.settle();

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.ok(
      textResult!.tier1.length > 0,
      'Expected tier1 textarea to contain the link (Copilot override should route to Dummy AI)',
    );
    assert.strictEqual(
      textResult!.tier2,
      '',
      'Expected tier2 textarea to be empty (no cross-contamination)',
    );

    ss.log('✓ Copilot override routes content to Dummy AI Tier 1');
  });

  test('[assisted] custom-ai-assistant-019: misconfigured override (focusCommands-only) leaves link in clipboard with manual-paste toast', async () => {
    ss.expectStatusBarMessages([
      '✓ RangeLink: Bound to Gemini Code Assist',
      '✓ RangeLink: RangeLink copied to clipboard',
    ]);
    ss.expectToastMessages([
      { level: 'info', message: 'Paste (Cmd/Ctrl+V) in Gemini Code Assist to use.' },
    ]);
    await ss.createAndOpenFile('__rl-test-gemini-override', 'gemini override test');
    await ss.settle();

    await vscode.commands.executeCommand(CMD_BIND_TO_CUSTOM_AI_BY_ID, {
      extensionId: 'google.geminicodeassist',
    });

    await writeClipboardSentinel();

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand(CMD_COPY_LINK_RELATIVE);
    await ss.settle();

    const clipboardContent = await assertClipboardChanged(
      'Gemini override clipboard should NOT be restored — link must stay for manual paste',
    );
    assert.ok(clipboardContent.length > 0, 'Clipboard should contain the RangeLink');

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.strictEqual(
      textResult!.tier1,
      '',
      'Expected tier1 to be empty (focusCommands-only, no direct insert)',
    );

    const verdict = await waitForHumanVerdict(
      'custom-ai-assistant-019',
      `Clipboard content:\n\n${clipboardContent}\n\nDoes this look like a valid RangeLink?`,
      [
        '1. Read the clipboard content shown above',
        '2. Verify it looks like a valid RangeLink with file path and line/column references',
        '3. Verify the toast says "Paste (Cmd/Ctrl+V) in Gemini Code Assist to use."',
        '4. Click PASS if everything looks correct, FAIL otherwise',
      ],
    );
    assert.strictEqual(
      verdict,
      'pass',
      'Human reported clipboard content was not a valid RangeLink',
    );

    ss.log(
      '✓ Misconfigured override (focusCommands-only) leaves link in clipboard, human confirmed',
    );
  });
});
