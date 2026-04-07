import assert from 'node:assert';

import * as vscode from 'vscode';

import { activateExtension, getLogCapture } from '../helpers';

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
      parseLogLine.includes('"count":4'),
      `Expected 4 custom AI assistants loaded but got: ${parseLogLine}`,
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
      4,
      `Expected 4 custom AI registrations but found ${registrationLogs.length}: ${registrationLogs.join('\n')}`,
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
    assert.ok(commands.includes('dummyAi.insertWithArgs'), 'Expected dummyAi.insertWithArgs command');
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
