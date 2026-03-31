import * as vscode from 'vscode';

import { settle, TERMINAL_READY_MS } from './testEnv';

export const createTerminal = async (
  name: string,
  trackingArray?: vscode.Terminal[],
): Promise<vscode.Terminal> => {
  const t = vscode.window.createTerminal({ name });
  trackingArray?.push(t);
  t.show(true);
  await settle(TERMINAL_READY_MS);
  return t;
};

export const findTerminalItems = (items: Record<string, unknown>[]): Record<string, unknown>[] =>
  items.filter(
    (item) =>
      item.itemKind === 'bindable' &&
      typeof item.label === 'string' &&
      (item.label as string).includes('Terminal ('),
  );

export const createAndBindTerminal = async (name: string): Promise<vscode.Terminal> => {
  const terminal = vscode.window.createTerminal({ name });
  terminal.show(true);
  await settle(TERMINAL_READY_MS);
  try {
    await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
  } catch (error) {
    terminal.dispose();
    throw error;
  }
  return terminal;
};
