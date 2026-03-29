import { Console } from 'node:console';

import * as vscode from 'vscode';

const nodeConsole = new Console(process.stdout, process.stderr);

const ASSISTED_BANNER_WIDTH = 60;
const BANNER_LINE = '═'.repeat(ASSISTED_BANNER_WIDTH);
const SECTION_LINE = '─'.repeat(ASSISTED_BANNER_WIDTH);

/**
 * Prints a visible banner at suite start explaining the assisted mode workflow.
 * Call this in suiteSetup() for any suite containing [assisted] tests.
 */
export const printAssistedBanner = (): void => {
  nodeConsole.log(`\n${BANNER_LINE}`);
  nodeConsole.log('ASSISTED TEST MODE');
  nodeConsole.log('Tests tagged [assisted] will pause for human interaction.');
  nodeConsole.log('Instructions appear as a persistent VS Code notification.');
  nodeConsole.log('Click Cancel on the notification when you have completed the action.');
  nodeConsole.log(BANNER_LINE);
};

/**
 * Pauses the test until the human completes a UI action.
 *
 * Shows a persistent VS Code progress notification. The title contains the TC ID
 * and a short action. The message is flowing prose describing what to verify —
 * the notification flattens newlines to spaces, so content reads as a paragraph.
 *
 * Console output uses structured line breaks for the terminal-side screen.
 *
 * @param tcId - Test case ID (e.g., "status-bar-menu-002"), shown as prefix in the notification
 * @param action - Short mechanical action the human should perform (notification title after TC ID)
 * @param consoleSteps - Optional extra step lines for multi-step actions (e.g., secondary picker flows)
 */
export const waitForHuman = async (
  tcId: string,
  action: string,
  consoleSteps?: string[],
): Promise<void> => {
  nodeConsole.log(`\n${SECTION_LINE}`);
  nodeConsole.log(`[${tcId}] ${action}`);
  if (consoleSteps !== undefined) {
    consoleSteps.forEach((line) => nodeConsole.log(`  ${line}`));
  }
  nodeConsole.log('Click Cancel on the notification when done.');
  nodeConsole.log(SECTION_LINE);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `🧪 ${tcId}: ${action}`,
      cancellable: true,
    },
    (_progress, token) =>
      new Promise<void>((resolve) => {
        token.onCancellationRequested(() => resolve());
      }),
  );
};
