import type { ConfigGetter } from '../config/types';

import type * as vscode from 'vscode';

/**
 * Minimal interface for IDE adapters that provide configuration access.
 * Decouples ConfigReader from concrete VscodeAdapter.
 */
export interface ConfigurationProvider {
  getConfiguration(section: string): ConfigGetter;
  updateConfiguration(section: string, key: string, value: unknown, target: vscode.ConfigurationTarget, resource?: vscode.Uri): Promise<void>;
}
