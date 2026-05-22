import assert from 'node:assert';

import * as vscode from 'vscode';

import type { LogCapture } from '../../LogCapture';

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

export const assertClipboardPreservationRan = (
  logCapture: LogCapture,
  markName: string,
  operationLabel: string,
): void => {
  const lines = logCapture.getLinesSince(markName);
  const savedLine = lines.find((l) => l.includes('Clipboard saved'));
  const restoredLine = lines.find((l) => l.includes('Clipboard restored'));
  assert.ok(savedLine, 'Expected "Clipboard saved" log entry — preservation must read clipboard');
  assert.ok(
    restoredLine,
    `Expected "Clipboard restored" log entry after ${operationLabel} operation`,
  );
};

export const assertClipboardPreservationDidNotRun = (
  logCapture: LogCapture,
  markName: string,
): void => {
  const lines = logCapture.getLinesSince(markName);
  assert.strictEqual(
    lines.find((l) => l.includes('Clipboard saved')),
    undefined,
    'Expected no "Clipboard saved" — no operation ran',
  );
  assert.strictEqual(
    lines.find((l) => l.includes('Clipboard restored')),
    undefined,
    'Expected no "Clipboard restored" — no operation ran',
  );
};
