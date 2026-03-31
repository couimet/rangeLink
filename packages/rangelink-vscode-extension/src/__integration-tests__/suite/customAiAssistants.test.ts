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
      parseLogLine.includes('fake-tool.test'),
      `Expected log to mention 'fake-tool.test' extensionId but got: ${parseLogLine}`,
    );
  });

  test('custom-ai-assistant-002: custom AI registered as destination kind with tiered capability', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const registrationLog = allLines.find(
      (line) =>
        line.includes('Registering builder for destination') &&
        line.includes('custom-ai:fake-tool.test'),
    );

    assert.ok(
      registrationLog,
      'Expected registration log for custom-ai:fake-tool.test — the custom AI assistant should be registered in the destination registry',
    );
  });

  test('custom-ai-assistant-004: registering a fake insertCommand makes it detectable', async () => {
    const fakeCommandDisposable = vscode.commands.registerCommand(
      'fake-tool.insertText',
      () => {},
    );

    try {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes('fake-tool.insertText'),
        'Expected fake-tool.insertText to be registered as a VS Code command',
      );
    } finally {
      fakeCommandDisposable.dispose();
    }
  });

  test('custom-ai-assistant-005: unavailable at startup — no matching command from any tier', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const parseLog = allLines.find(
      (line) => line.includes('parseCustomAiAssistants') && line.includes('Loaded'),
    );
    assert.ok(parseLog, 'Expected custom AI assistant to be loaded from settings');

    const unavailabilityLogs = allLines.filter(
      (line) =>
        line.includes('customAiAssistant.isAvailable') &&
        line.includes('fake-tool.test') &&
        line.includes('"available":false'),
    );

    const availabilityLogs = allLines.filter(
      (line) =>
        line.includes('customAiAssistant.isAvailable') &&
        line.includes('fake-tool.test') &&
        line.includes('"available":true'),
    );

    assert.strictEqual(
      availabilityLogs.length,
      0,
      `Expected no "available":true logs for fake-tool.test at startup but found ${availabilityLogs.length}`,
    );

    if (unavailabilityLogs.length > 0) {
      assert.ok(
        unavailabilityLogs[0].includes('"extensionFound":false'),
        `Expected extensionFound:false in unavailability log but got: ${unavailabilityLogs[0]}`,
      );
      assert.ok(
        unavailabilityLogs[0].includes('"commandAvailable":false'),
        `Expected commandAvailable:false in unavailability log but got: ${unavailabilityLogs[0]}`,
      );
    }
  });

  test('custom-ai-assistant-006: only valid entries loaded — invalid entries produce no registration', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const registrationLogs = allLines.filter(
      (line) =>
        line.includes('Registering builder for destination') && line.includes('custom-ai:'),
    );

    assert.strictEqual(
      registrationLogs.length,
      1,
      `Expected exactly 1 custom AI registration (fake-tool.test) but found ${registrationLogs.length}: ${registrationLogs.join(', ')}`,
    );
    assert.ok(
      registrationLogs[0].includes('custom-ai:fake-tool.test'),
      `Expected registration for fake-tool.test but got: ${registrationLogs[0]}`,
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
      'Expected parseCustomAiAssistants to load the assistant with insertCommands configured as plain strings',
    );
    assert.ok(
      parseLog.includes('fake-tool.test'),
      `Expected loaded assistant to include fake-tool.test but got: ${parseLog}`,
    );
  });
});
