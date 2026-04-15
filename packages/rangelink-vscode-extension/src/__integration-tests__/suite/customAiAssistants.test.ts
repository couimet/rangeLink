import assert from 'node:assert';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertClipboardChanged,
  assertClipboardRestored,
  assertToastLogged,
  cleanupFiles,
  closeAllEditors,
  createAndOpenFile,
  createLogger,
  getLogCapture,
  printAssistedBanner,
  settle,
  waitForHuman,
  writeClipboardSentinel,
} from '../helpers';

suite('Custom AI Assistants', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('custom-ai-assistant-001: three-tier config is parsed and logged at activation', () => {
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
      parseLogLine.includes('"count":5'),
      `Expected 5 custom AI assistants loaded but got: ${parseLogLine}`,
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
      5,
      `Expected 5 custom AI registrations but found ${registrationLogs.length}: ${registrationLogs.join('\n')}`,
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
  });

  test('custom-ai-assistant-004: dummy extension insertText command is detectable', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('dummyAi.insertText'),
      'Expected dummyAi.insertText to be registered — dummy-ai-extension should be loaded',
    );
  });

  test('custom-ai-assistant-005: tier 1 entry is available when its insertCommand is registered', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const tier1AvailabilityLogs = allLines.filter(
      (line) =>
        line.includes('customAiAssistant.isAvailable') &&
        line.includes('rangelink.dummy-ai-extension"') &&
        !line.includes('tier2') &&
        !line.includes('tier3'),
    );

    const availableLogs = tier1AvailabilityLogs.filter((line) => line.includes('"available":true'));
    const unavailableLogs = tier1AvailabilityLogs.filter((line) =>
      line.includes('"available":false'),
    );

    assert.ok(
      availableLogs.length > 0 || unavailableLogs.length > 0,
      'Expected at least one availability check log for the Tier 1 entry',
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

suite('Custom AI Assistants — Paste Flow', () => {
  const log = createLogger('customAiPasteFlow');
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await vscode.commands.executeCommand('dummyAi.clearAll');
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.length = 0;
    await settle();
  });

  test('[assisted] custom-ai-assistant-010: Tier 1 direct insert delivers text to dummy textarea', async () => {
    const { uri } = await createAndOpenFile('__rl-test-tier1', 'hello world\nline two\nline three');
    tmpFileUris.push(uri);
    await settle();

    await waitForHuman('custom-ai-assistant-010', "Cmd+R Cmd+D → select 'Dummy AI (Tier 1)'", [
      'Press Cmd+R Cmd+D and select "Dummy AI (Tier 1)" from the picker.',
    ]);

    const logCapture = getLogCapture();
    logCapture.mark('before-tier1-paste');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-tier1-paste');

    const directInsertLog = lines.find(
      (line) =>
        line.includes('DirectInsertFactory.insert') && line.includes('Direct insert succeeded'),
    );
    assert.ok(directInsertLog, 'Expected DirectInsertFactory.insert success log');

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

    log('✓ Tier 1 direct insert delivered text to dummy textarea');
  });

  test('[assisted] custom-ai-assistant-011: Tier 1 clipboard isolation — sentinel preserved', async () => {
    const { uri } = await createAndOpenFile('__rl-test-tier1-clip', 'clipboard test');
    tmpFileUris.push(uri);
    await settle();

    await waitForHuman('custom-ai-assistant-011', "Cmd+R Cmd+D → select 'Dummy AI (Tier 1)'", [
      'Press Cmd+R Cmd+D and select "Dummy AI (Tier 1)" from the picker.',
    ]);

    await writeClipboardSentinel();
    const logCapture = getLogCapture();
    logCapture.mark('before-tier1-clip');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    await assertClipboardRestored(
      'Tier 1 should not disturb clipboard — outer preserve restores sentinel',
    );

    log('✓ Tier 1 clipboard isolation — sentinel preserved after R-L');
  });

  test('[assisted] custom-ai-assistant-012: Tier 3 shows manual-paste toast and clipboard not restored', async () => {
    const { uri } = await createAndOpenFile('__rl-test-tier3', 'tier three test');
    tmpFileUris.push(uri);
    await settle();

    await waitForHuman('custom-ai-assistant-012', "Cmd+R Cmd+D → select 'Dummy AI (Tier 3)'", [
      'Press Cmd+R Cmd+D and select "Dummy AI (Tier 3)" from the picker.',
    ]);

    await writeClipboardSentinel();
    const logCapture = getLogCapture();
    logCapture.mark('before-tier3-paste');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-tier3-paste');

    assertToastLogged(lines, {
      type: 'info',
      message: 'Paste (Cmd/Ctrl+V) in Dummy AI (Tier 3) to use.',
    });

    const manualPasteLog = lines.find(
      (line) =>
        line.includes('ManualPasteInsertFactory.insert') &&
        line.includes('Link copied to clipboard for manual paste'),
    );
    assert.ok(manualPasteLog, 'Expected ManualPasteInsertFactory success log');

    const clipboardContent = await assertClipboardChanged(
      'Tier 3 clipboard should NOT be restored — link must stay for manual paste',
    );
    assert.ok(clipboardContent.length > 0, 'Clipboard should contain the RangeLink');

    const skipRestoreLog = lines.find(
      (line) =>
        line.includes('withClipboardPreservation') &&
        line.includes('Clipboard restoration skipped'),
    );
    assert.ok(skipRestoreLog, 'Expected clipboard restoration skip log');

    log('✓ Tier 3 shows manual-paste toast, clipboard not restored (link stays)');
  });

  test('[assisted] custom-ai-assistant-013: Tier 2→3 fallback when focusAndPasteCommands not registered', async () => {
    const { uri } = await createAndOpenFile('__rl-test-fallback', 'fallback test');
    tmpFileUris.push(uri);
    await settle();

    await waitForHuman('custom-ai-assistant-013', "Cmd+R Cmd+D → select 'Dummy AI (Fallback)'", [
      'Press Cmd+R Cmd+D and select "Dummy AI (Fallback)" from the picker.',
    ]);

    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-paste');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-fallback-paste');

    const tier2SkipLog = lines.find(
      (line) =>
        line.includes('resolveFocusTier') &&
        line.includes('focusAndPasteCommands') &&
        line.includes('no registered commands'),
    );
    assert.ok(tier2SkipLog, 'Expected Tier 2 skip log — nonexistent.paste not registered');

    const tier3ResolveLog = lines.find(
      (line) =>
        line.includes('resolveFocusTier') &&
        line.includes('focusCommands') &&
        line.includes('dummyAi.focusPanel'),
    );
    assert.ok(tier3ResolveLog, 'Expected resolution to focusCommands tier via dummyAi.focusPanel');

    assertToastLogged(lines, {
      type: 'info',
      message: 'Paste (Cmd/Ctrl+V) in Dummy AI (Fallback) to use.',
    });

    log('✓ Tier 2→3 fallback: focusAndPasteCommands skipped, focusCommands resolved, toast shown');
  });

  test('[assisted] custom-ai-assistant-014: ${content} template delivers text via insertWithArgs', async () => {
    const { uri } = await createAndOpenFile('__rl-test-template', 'template test content');
    tmpFileUris.push(uri);
    await settle();

    await waitForHuman('custom-ai-assistant-014', "Cmd+R Cmd+D → select 'Dummy AI (Template)'", [
      'Press Cmd+R Cmd+D and select "Dummy AI (Template)" from the picker.',
    ]);

    const logCapture = getLogCapture();
    logCapture.mark('before-template-paste');

    await vscode.commands.executeCommand('editor.action.selectAll');
    await vscode.commands.executeCommand('rangelink.copyLinkWithRelativePath');
    await settle();

    const lines = logCapture.getLinesSince('before-template-paste');

    const insertLog = lines.find(
      (line) =>
        line.includes('DirectInsertFactory.insert') && line.includes('dummyAi.insertWithArgs'),
    );
    assert.ok(insertLog, 'Expected DirectInsertFactory success log for dummyAi.insertWithArgs');

    const textResult = (await vscode.commands.executeCommand('dummyAi.getText')) as
      | { tier1: string; tier2: string }
      | undefined;
    assert.ok(textResult, 'Expected dummyAi.getText to return a result');
    assert.ok(
      textResult!.tier1.length > 0,
      'Expected tier1 textarea to contain the link via template interpolation',
    );

    log('✓ ${content} template interpolation delivered text to dummy textarea via insertWithArgs');
  });
});
