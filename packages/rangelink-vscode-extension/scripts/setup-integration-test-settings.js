#!/usr/bin/env node

/**
 * Pre-populate VS Code user settings for integration tests.
 *
 * The VS Code test host uses /tmp/rl-vscode-test as user data dir.
 * Custom AI assistant tests require rangelink.customAiAssistants to be
 * configured BEFORE the extension activates — this script creates the
 * settings file so the extension picks up the config at activation.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const suffixIndex = process.argv.indexOf('--suffix');
if (suffixIndex !== -1 && !process.argv[suffixIndex + 1]) {
  console.error('Error: --suffix requires a value');
  process.exit(1);
}
const suffix = suffixIndex !== -1 ? process.argv[suffixIndex + 1] : '';
const DATA_DIR = `rl-vscode-test${suffix}`;
const SETTINGS_DIR = path.join(os.tmpdir(), DATA_DIR, 'User');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

const settings = {
  'rangelink.customAiAssistants': [
    {
      extensionId: 'rangelink.dummy-ai-extension',
      extensionName: 'Dummy AI (Tier 1)',
      insertCommands: ['dummyAi.insertText'],
    },
    {
      extensionId: 'rangelink.dummy-ai-extension-tier2',
      extensionName: 'Dummy AI (Tier 2)',
      focusAndPasteCommands: ['dummyAi.focusForPaste'],
    },
    {
      extensionId: 'rangelink.dummy-ai-extension-tier3',
      extensionName: 'Dummy AI (Tier 3)',
      focusCommands: ['dummyAi.focusPanel'],
    },
    {
      extensionId: 'rangelink.dummy-ai-extension-template',
      extensionName: 'Dummy AI (Template)',
      insertCommands: [
        { command: 'dummyAi.insertWithArgs', args: [{ text: '${content}', source: 'rangelink' }] },
      ],
    },
    {
      extensionId: 'rangelink.dummy-ai-extension-fallback',
      extensionName: 'Dummy AI (Fallback)',
      focusAndPasteCommands: ['nonexistent.paste'],
      focusCommands: ['dummyAi.focusPanel'],
    },
    {
      extensionId: 'rangelink.dummy-ai-extension-focus-fail',
      extensionName: 'Dummy AI (Focus-Fail)',
      focusAndPasteCommands: ['dummyAi.focusFail'],
    },
  ],
};

fs.mkdirSync(SETTINGS_DIR, { recursive: true });

let existing = {};
try {
  existing = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.warn(`[setup-integration-test-settings] Warning: ${err.message}, starting fresh`);
  }
}

if (process.argv.includes('--copilot-override')) {
  settings['rangelink.customAiAssistants'].push({
    extensionId: 'github.copilot-chat',
    extensionName: 'Copilot Override',
    insertCommands: ['dummyAi.insertText'],
  });
  settings['rangelink.customAiAssistants'].push({
    extensionId: 'google.geminicodeassist',
    extensionName: 'Gemini Override (Misconfigured)',
    focusCommands: ['dummyAi.focusPanel'],
  });
}

const merged = { ...existing, ...settings };
fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));

const assistantCount = settings['rangelink.customAiAssistants'].length;
console.log(`[setup-integration-test-settings] Wrote ${SETTINGS_FILE} with ${assistantCount} custom AI assistant(s)`);
console.log(`CUSTOM_AI_COUNT=${assistantCount}`);
