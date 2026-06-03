import assert from 'node:assert';

import * as vscode from 'vscode';

import { getLogCapture } from './getLogCapture';
import { getGeneratedLink } from './logHelpers';

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

export const assertClipboardPreservationRan = (markName: string, operationLabel: string): void => {
  const lines = getLogCapture().getLinesSince(markName);
  const savedIdx = lines.findIndex((l) => l.includes('Clipboard saved'));
  const restoredIdx = lines.findIndex((l) => l.includes('Clipboard restored'));
  assert.ok(
    savedIdx >= 0,
    'Expected "Clipboard saved" log entry — preservation must read clipboard',
  );
  assert.ok(
    restoredIdx > savedIdx,
    `Expected "Clipboard restored" log entry after ${operationLabel} operation`,
  );
};

export const withClipboardSentinel = async (
  marker: string,
  operationLabel: string,
  fn: () => Promise<void>,
  { expectPreserved = true }: { expectPreserved?: boolean } = {},
): Promise<void> => {
  await writeClipboardSentinel();
  getLogCapture().mark(marker);
  await fn();
  if (expectPreserved) {
    assertClipboardPreservationRan(marker, operationLabel);
  } else {
    assertClipboardPreservationDidNotRun(marker);
  }
  await assertClipboardRestored(`${operationLabel}: clipboard sentinel check`);
};

export const withClipboardRestored = async (
  context: string,
  fn: () => Promise<void>,
): Promise<void> => {
  await writeClipboardSentinel();
  await fn();
  await assertClipboardRestored(context);
};

export const withClipboardChanged = async (
  operationLabel: string,
  fn: () => Promise<void>,
  marker?: string,
): Promise<string> => {
  await writeClipboardSentinel();
  if (marker) {
    getLogCapture().mark(marker);
  }
  await fn();
  return assertClipboardChanged(operationLabel);
};

export const assertClipboardPreservationDidNotRun = (markName: string): void => {
  const lines = getLogCapture().getLinesSince(markName);
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

export const assertClipboardEquals = async (
  operationLabel: string,
  fn: () => Promise<void>,
  expected: string,
  marker?: string,
): Promise<string> => {
  const clipboard = await withClipboardChanged(operationLabel, fn, marker);
  assert.strictEqual(
    clipboard,
    expected,
    `Expected clipboard to equal "${expected}", got: "${clipboard}"`,
  );
  return clipboard;
};

export const assertClipboardEqualsGeneratedLink = async (
  operationLabel: string,
  fn: () => Promise<void>,
  marker: string,
): Promise<{ clipboard: string; generatedLink: string }> => {
  const clipboard = await withClipboardChanged(operationLabel, fn, marker);
  const generatedLink = getGeneratedLink(marker);
  assert.strictEqual(
    clipboard,
    generatedLink,
    `Expected clipboard to equal generated link "${generatedLink}", got: "${clipboard}"`,
  );
  return { clipboard, generatedLink };
};
