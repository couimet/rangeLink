import assert from 'node:assert';

import * as vscode from 'vscode';

const EXTENSION_ID = 'couimet.rangelink-vscode-extension';

export const SETTLE_MS = 500;
export const TERMINAL_READY_MS = 1500;
export const POLL_INTERVAL_MS = 100;
export const POLL_TIMEOUT_MS = 5000;

export const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

export const activateExtension = async (): Promise<void> => {
  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
  await ext.activate();
};

export const settle = (ms: number = SETTLE_MS): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
