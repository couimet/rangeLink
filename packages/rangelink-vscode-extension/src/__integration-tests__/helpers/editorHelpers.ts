import * as vscode from 'vscode';

import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS, settle } from './testEnv';

export const waitForActiveEditor = async (
  expectedUri: string,
  log?: (msg: string) => void,
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
    if (activeUri === expectedUri) {
      log?.(`waitForActiveEditor: matched after ${Date.now() - start}ms`);
      return true;
    }
    await settle(POLL_INTERVAL_MS);
  }
  const actualUri = vscode.window.activeTextEditor?.document.uri.toString() ?? '(none)';
  log?.(`waitForActiveEditor: TIMEOUT — expected=${expectedUri}, actual=${actualUri}`);
  return false;
};

export const selectAll = (editor: vscode.TextEditor): void => {
  const lastLine = editor.document.lineCount - 1;
  const lastChar = editor.document.lineAt(lastLine).text.length;
  editor.selection = new vscode.Selection(
    new vscode.Position(0, 0),
    new vscode.Position(lastLine, lastChar),
  );
};
