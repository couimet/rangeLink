import type { ParsedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

const STABLE_MS = 300;
const TIMEOUT_MS = 10000;

/**
 * Trigger navigation via the document link click command and wait for the selection to stabilize.
 *
 * Uses a debounce pattern: resolves 300ms after the last selection change event for the target file.
 * This skips the initial selection from showTextDocument and captures the final selection set by
 * the navigation handler.
 */
export const navigateViaHandleLinkClick = (
  linkText: string,
  parsed: ParsedLink,
  testFilename: string,
): Promise<{ sel: vscode.Selection; doc: vscode.TextDocument }> =>
  new Promise((resolve, reject) => {
    let lastResult: { sel: vscode.Selection; doc: vscode.TextDocument } | undefined;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;

    const overallTimeout = setTimeout(() => {
      if (stableTimer) clearTimeout(stableTimer);
      disposable.dispose();
      if (lastResult) {
        resolve(lastResult);
      } else {
        reject(
          new Error(
            `No selection change event received within ${TIMEOUT_MS}ms for ${testFilename}`,
          ),
        );
      }
    }, TIMEOUT_MS);

    const disposable = vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor.document.fileName.endsWith(testFilename)) {
        lastResult = { sel: e.textEditor.selection, doc: e.textEditor.document };
        if (stableTimer) clearTimeout(stableTimer);
        stableTimer = setTimeout(() => {
          clearTimeout(overallTimeout);
          disposable.dispose();
          resolve(lastResult!);
        }, STABLE_MS);
      }
    });

    Promise.resolve(
      vscode.commands.executeCommand('rangelink.handleDocumentLinkClick', { linkText, parsed }),
    ).catch((error: unknown) => {
      clearTimeout(overallTimeout);
      if (stableTimer) clearTimeout(stableTimer);
      disposable.dispose();
      reject(error);
    });
  });
