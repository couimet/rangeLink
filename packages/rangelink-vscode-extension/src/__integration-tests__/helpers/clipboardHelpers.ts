import assert from 'node:assert';

import * as vscode from 'vscode';

export const CLIPBOARD_SENTINEL = 'rangelink-test-sentinel-value';

export const writeClipboardSentinel = async (): Promise<void> => {
  await vscode.env.clipboard.writeText(CLIPBOARD_SENTINEL);
};

export const assertClipboardChanged = async (context: string): Promise<string> => {
  const content = await vscode.env.clipboard.readText();
  assert.notStrictEqual(
    content,
    CLIPBOARD_SENTINEL,
    `${context}: clipboard should have changed from sentinel`,
  );
  return content;
};

export const assertClipboardRestored = async (context: string): Promise<void> => {
  const content = await vscode.env.clipboard.readText();
  assert.strictEqual(
    content,
    CLIPBOARD_SENTINEL,
    `${context}: clipboard should be restored to sentinel`,
  );
};
