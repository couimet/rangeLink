import assert from 'node:assert';

import * as vscode from 'vscode';

import { getLogCapture } from './getLogCapture';
import { parseLogContext } from './logBasedUiAssertions';
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
  const savedIdx = lines.findIndex((l) => parseLogContext(l)?.fn.endsWith('::read'));
  const restoredIdx = lines.findIndex((l) => parseLogContext(l)?.fn.endsWith('::restoreClipboard'));
  assert.ok(
    savedIdx >= 0,
    'Expected "Clipboard current value read and saved" log entry — preservation must read clipboard',
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
    lines.find((l) => parseLogContext(l)?.fn.endsWith('::read')),
    undefined,
    'Expected no "Clipboard current value read and saved" — no operation ran',
  );
  assert.strictEqual(
    lines.find((l) => parseLogContext(l)?.fn.endsWith('::restoreClipboard')),
    undefined,
    'Expected no "Clipboard restored" — no operation ran',
  );
};

const PRIOR_CLIPBOARD_DIAG_MAX_LEN = 200;

const buildPriorClipboardDiagNote = (
  priorClipboard: string,
  clipboardAfterAction: string,
): string => {
  const snippet =
    priorClipboard.length > PRIOR_CLIPBOARD_DIAG_MAX_LEN
      ? `${priorClipboard.substring(0, PRIOR_CLIPBOARD_DIAG_MAX_LEN)}…`
      : priorClipboard;

  if (priorClipboard === clipboardAfterAction) {
    return `\nClipboard unchanged from prior value "${snippet}" — test action may not have written to clipboard.`;
  }
  return `\nPrior clipboard (before sentinel write): "${snippet}"`;
};

export const assertClipboardEquals = async (
  operationLabel: string,
  fn: () => Promise<void>,
  expected: string,
  marker?: string,
): Promise<string> => {
  const priorClipboard = await vscode.env.clipboard.readText();
  const clipboard = await withClipboardChanged(operationLabel, fn, marker);
  const priorNote = buildPriorClipboardDiagNote(priorClipboard, clipboard);

  assert.strictEqual(
    clipboard,
    expected,
    `Expected clipboard to equal "${expected}", got: "${clipboard}"${priorNote}`,
  );
  return clipboard;
};

export const assertClipboardEqualsGeneratedLink = async (
  operationLabel: string,
  fn: () => Promise<void>,
  marker: string,
): Promise<{ clipboard: string; generatedLink: string }> => {
  const priorClipboard = await vscode.env.clipboard.readText();
  const clipboard = await withClipboardChanged(operationLabel, fn, marker);
  const generatedLink = getGeneratedLink(marker);
  const priorNote = buildPriorClipboardDiagNote(priorClipboard, clipboard);

  assert.strictEqual(
    clipboard,
    generatedLink,
    `Expected clipboard to equal generated link "${generatedLink}", got: "${clipboard}"${priorNote}`,
  );
  return { clipboard, generatedLink };
};
