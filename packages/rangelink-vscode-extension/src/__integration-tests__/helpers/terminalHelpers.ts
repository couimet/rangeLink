import * as vscode from 'vscode';

import { settle, TERMINAL_READY_MS } from './testEnv';

export const createAndBindTerminal = async (name: string): Promise<vscode.Terminal> => {
  const terminal = vscode.window.createTerminal({ name });
  terminal.show(true);
  await settle(TERMINAL_READY_MS);
  await vscode.commands.executeCommand('rangelink.bindToTerminalHere');
  return terminal;
};
