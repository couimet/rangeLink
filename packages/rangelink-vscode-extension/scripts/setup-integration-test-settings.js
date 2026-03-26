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
const path = require('node:path');

const SETTINGS_DIR = '/tmp/rl-vscode-test/User';
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

const settings = {
  'rangelink.customAiAssistants': [
    {
      extensionId: 'fake-tool.test',
      extensionName: 'Fake AI Tool',
      focusCommands: ['fake-tool.focus'],
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

const merged = { ...existing, ...settings };
fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));

console.log(`[setup-integration-test-settings] Wrote ${SETTINGS_FILE}`);
