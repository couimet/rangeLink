import * as vscode from 'vscode';

import { settle, TERMINAL_READY_MS } from './testEnv';

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
