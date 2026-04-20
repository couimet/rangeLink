import assert from 'node:assert';

import * as vscode from 'vscode';

import { settle, TERMINAL_READY_MS } from './testEnv';

/**
 * A VS Code terminal backed by a custom pseudoterminal that records every
 * byte delivered to it via `handleInput`.
 *
 * Lets integration tests verify the *actual content* that landed in the
 * terminal buffer, not just that the extension called the paste adapter.
 * Closes the gap in log-only assertions like `assertTerminalPasteLogged`.
 */
export interface CapturingTerminal {
  terminal: vscode.Terminal;
  getCapturedText: () => string;
  clearCaptured: () => void;
}

/**
 * Create a terminal whose input is captured in-memory.
 *
 * The pty echoes received input back to the visible terminal display so a human
 * running an assisted test can still see what arrived; the same input is
 * simultaneously appended to the captured buffer for assertion.
 */
export const createCapturingTerminal = async (
  name: string,
  trackingArray?: vscode.Terminal[],
): Promise<CapturingTerminal> => {
  const writeEmitter = new vscode.EventEmitter<string>();
  let captured = '';

  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open: () => {
      writeEmitter.fire(`[capturing-pty:${name}] ready\r\n`);
    },
    close: () => {
      writeEmitter.dispose();
    },
    handleInput: (data: string) => {
      captured += data;
      writeEmitter.fire(data);
    },
  };

  const terminal = vscode.window.createTerminal({ name, pty });
  trackingArray?.push(terminal);
  terminal.show(true);
  await settle(TERMINAL_READY_MS);

  return {
    terminal,
    getCapturedText: () => captured,
    clearCaptured: () => {
      captured = '';
    },
  };
};

/**
 * Assert that the captured buffer equals the expected string exactly.
 * Use for content-level validation of what reached the terminal.
 */
export const assertTerminalBufferEquals = (captured: string, expected: string): void => {
  assert.strictEqual(
    captured,
    expected,
    `Terminal buffer mismatch:\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(captured)}`,
  );
};

/**
 * Assert that the captured buffer contains the expected substring.
 * Useful when surrounding whitespace / padding makes exact equality brittle.
 */
export const assertTerminalBufferContains = (captured: string, expected: string): void => {
  assert.ok(
    captured.includes(expected),
    `Terminal buffer missing expected substring:\n  expected to include: ${JSON.stringify(expected)}\n  actual:              ${JSON.stringify(captured)}`,
  );
};
