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

export const getExtensionVersion = (): string => {
  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
  return ext.packageJSON.version as string;
};

export const settle = (ms: number = SETTLE_MS): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const waitForExtensionActive = async (
  extensionId: string,
  log: (msg: string) => void,
  timeoutMs: number = 30000,
): Promise<void> => {
  const start = Date.now();
  let lastState = '';
  while (Date.now() - start < timeoutMs) {
    const ext = vscode.extensions.getExtension(extensionId);
    if (ext && ext.isActive) {
      log(`[waitForExtensionActive] ${extensionId} → active after ${Date.now() - start}ms`);
      return;
    }
    const currentState = ext ? `found, isActive=${ext.isActive}` : 'not found';
    if (currentState !== lastState) {
      log(
        `[waitForExtensionActive] ${extensionId} → ${currentState} (${Date.now() - start}ms elapsed)`,
      );
      lastState = currentState;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  const ext = vscode.extensions.getExtension(extensionId);
  throw new Error(
    `Extension ${extensionId} did not activate within ${timeoutMs}ms (found=${ext !== undefined}, isActive=${ext?.isActive ?? 'N/A'})`,
  );
};

/**
 * Open a QuickPick or InputBox via command, dismiss it with closeQuickOpen, and return after
 * the promise settles. The caller inspects log-captured items after this resolves.
 */
export const openAndDismiss = async (command: string): Promise<void> => {
  const promise = vscode.commands.executeCommand(command);
  await settle();
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  // Retry dismissal until the command resolves — the picker may be slow to render on loaded CI.
  for (;;) {
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
    const done = await Promise.race([
      promise.then(() => true),
      settle(POLL_INTERVAL_MS).then(() => false),
    ]);
    if (done) break;
    if (Date.now() >= deadline) {
      throw new Error(
        `openAndDismiss: "${command}" did not resolve within ${POLL_TIMEOUT_MS}ms deadline`,
      );
    }
  }
  await promise;
  await settle();
};
