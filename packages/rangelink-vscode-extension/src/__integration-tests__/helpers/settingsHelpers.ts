import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { getWorkspaceRoot } from './testEnv';

const SETTINGS_PROFILES_DIR = 'qa/fixtures/settings';

export const loadSettingsProfile = async (
  profileName: string,
  log: (msg: string) => void,
): Promise<void> => {
  const profilePath = path.join(getWorkspaceRoot(), SETTINGS_PROFILES_DIR, `${profileName}.json`);
  log(`loadSettingsProfile: loading ${profileName} from ${profilePath}`);

  if (!fs.existsSync(profilePath)) {
    throw new Error(`loadSettingsProfile: profile file not found at ${profilePath}`);
  }

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  } catch (err) {
    throw new Error(`loadSettingsProfile: Failed to parse profile ${profileName}: ${err}`);
  }
  const config = vscode.workspace.getConfiguration();

  for (const [key, value] of Object.entries(settings)) {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }
  log(`loadSettingsProfile: applied ${Object.keys(settings).length} settings from ${profileName}`);
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

  cachedRangelinkKeys = Object.keys(pkg.contributes?.configuration?.properties ?? {}).filter((k) =>
    k.startsWith('rangelink.'),
  );

  return cachedRangelinkKeys;
};

// Exposed for tests that need to verify the key list.
export { getRangelinkKeys };

export const resetRangelinkSettings = async (log: (msg: string) => void): Promise<void> => {
  const keys = getRangelinkKeys();
  const config = vscode.workspace.getConfiguration();

  for (const key of keys) {
    await config.update(key, undefined, vscode.ConfigurationTarget.Global);
  }
  log(`resetRangelinkSettings: cleared ${keys.length} rangelink settings to defaults`);
};
