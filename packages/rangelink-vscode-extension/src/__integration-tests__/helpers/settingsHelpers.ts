import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { getWorkspaceRoot } from './testEnv';

const SETTINGS_PROFILES_DIR = 'qa/fixtures/settings';

export const loadSettingsProfile = async (
  profileName: string,
  log?: (msg: string) => void,
): Promise<void> => {
  const profilePath = path.join(getWorkspaceRoot(), SETTINGS_PROFILES_DIR, `${profileName}.json`);
  log?.(`loadSettingsProfile: loading ${profileName} from ${profilePath}`);

  const profileContent = fs.readFileSync(profilePath, 'utf8');
  const settings = JSON.parse(profileContent) as Record<string, unknown>;
  const config = vscode.workspace.getConfiguration();

  for (const [key, value] of Object.entries(settings)) {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }
  log?.(`loadSettingsProfile: applied ${Object.keys(settings).length} settings from ${profileName}`);
};

export const resetRangelinkSettings = async (log?: (msg: string) => void): Promise<void> => {
  const defaultProfilePath = path.join(getWorkspaceRoot(), SETTINGS_PROFILES_DIR, 'default.json');
  const defaultContent = fs.readFileSync(defaultProfilePath, 'utf8');
  const defaultSettings = JSON.parse(defaultContent) as Record<string, unknown>;
  const config = vscode.workspace.getConfiguration();

  for (const key of Object.keys(defaultSettings)) {
    await config.update(key, undefined, vscode.ConfigurationTarget.Global);
  }
  log?.('resetRangelinkSettings: cleared all rangelink settings to defaults');
};
