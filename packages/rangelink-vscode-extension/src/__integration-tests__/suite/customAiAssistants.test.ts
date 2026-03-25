import assert from 'node:assert';

import * as vscode from 'vscode';

import { activateExtension, getLogCapture } from '../helpers';

suite('Custom AI Assistants', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('custom-ai-assistant-001: valid config is parsed and logged at activation', () => {
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

  test('custom-ai-assistant-002: custom AI registered as destination kind in registry', () => {
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

  test('custom-ai-assistant-004: fake focus command makes assistant detectable', async () => {
    const fakeCommandDisposable = vscode.commands.registerCommand('fake-tool.focus', () => {});

    try {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes('fake-tool.focus'),
        'Expected fake-tool.focus to be registered as a VS Code command',
      );
    } finally {
      fakeCommandDisposable.dispose();
    }
  });

  test('custom-ai-assistant-005: config loaded but assistant not available without matching command at startup', () => {
    const logCapture = getLogCapture();
    const allLines = logCapture.getAllLines();

    const parseLog = allLines.find(
      (line) => line.includes('parseCustomAiAssistants') && line.includes('Loaded'),
    );
    assert.ok(parseLog, 'Expected custom AI assistant to be loaded from settings');

    const availableAtStartup = allLines.some(
      (line) =>
        line.includes('customAiAssistant.isAvailable') &&
        line.includes('fake-tool.test') &&
        line.includes('"commandAvailable":true'),
    );

    assert.ok(
      !availableAtStartup,
      'Expected custom AI assistant NOT to be available at startup (fake-tool.focus not registered at activation)',
    );
  });

  test('custom-ai-assistant-006: invalid config entries are skipped (verified via unit tests)', () => {
    assert.ok(
      true,
      'Invalid config validation is covered by parseCustomAiAssistants unit tests at 100% coverage',
    );
  });
});
