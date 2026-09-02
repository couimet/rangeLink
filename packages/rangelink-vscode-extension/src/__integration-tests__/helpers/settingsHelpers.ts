import { getWorkspaceRoot, POLL_INTERVAL_MS, POLL_TIMEOUT_MS, settle } from './testEnv';

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

const SETTING_NAMESPACE = 'rangelink';

export const getWorkspaceSettingsPath = (): string => path.join(getWorkspaceRoot(), '.vscode', 'settings.json');

/**
 * Overwrite the workspace `.vscode/settings.json` with the given settings object.
 * Used to seed configuration keys that are NOT registered in package.json's
 * contributes.configuration (e.g. the legacy `rangelink.warnOnDirtyBuffer`),
 * because `Configuration.update()` refuses to write unregistered keys.
 */
export const writeWorkspaceSettingsJson = (settings: Record<string, unknown>): void => {
  fs.mkdirSync(path.dirname(getWorkspaceSettingsPath()), { recursive: true });
  fs.writeFileSync(getWorkspaceSettingsPath(), JSON.stringify(settings, null, 2));
};

/**
 * Poll `Configuration.inspect()` until the given key's workspace-scope value
 * matches `expected`. Required after `writeWorkspaceSettingsJson` because VS Code
 * reloads settings.json asynchronously via its file watcher.
 */
export const waitForWorkspaceSettingValue = async (key: string, expected: unknown): Promise<void> => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const inspection = vscode.workspace.getConfiguration(SETTING_NAMESPACE).inspect(key);
    if (inspection?.workspaceValue === expected) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `waitForWorkspaceSettingValue: '${SETTING_NAMESPACE}.${key}' workspaceValue did not become ${String(expected)} within ${POLL_TIMEOUT_MS}ms (inspection=${JSON.stringify(inspection)})`,
      );
    }
    await settle(POLL_INTERVAL_MS);
  }
};

let cachedRangelinkKeys: string[] | undefined;

const getRangelinkKeys = (): string[] => {
  if (cachedRangelinkKeys) return cachedRangelinkKeys;

  const pkgPath = path.join(getWorkspaceRoot(), 'package.json');

  if (!fs.existsSync(pkgPath)) {
    throw new Error(`getRangelinkKeys: package.json not found at ${pkgPath}`);
  }

  let pkg: { contributes?: { configuration?: { properties?: Record<string, unknown> } } };
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    throw new Error(`getRangelinkKeys: Failed to parse package.json: ${err}`);
  }

  cachedRangelinkKeys = Object.keys(pkg.contributes?.configuration?.properties ?? {}).filter((k) => k.startsWith('rangelink.'));

  return cachedRangelinkKeys;
};

// Exposed for tests that need to verify the key list.
export { getRangelinkKeys };

export const resetRangelinkSettings = async (log: (msg: string) => void): Promise<void> => {
  const keys = getRangelinkKeys();
  const config = vscode.workspace.getConfiguration();

  for (const key of keys) {
    await config.update(key, undefined, vscode.ConfigurationTarget.Global);
    await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
  }
  log(`resetRangelinkSettings: cleared ${keys.length} rangelink settings to defaults`);
};
