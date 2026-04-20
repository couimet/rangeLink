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

/**
 * Verdict returned by the human driver for visibility/absence tests.
 *
 * - `'pass'` — the described behavior was observed (e.g., menu item was
 *   correctly hidden or visible).
 * - `'fail'` — the described behavior was NOT observed. The test should fail.
 */
export type HumanVerdict = 'pass' | 'fail';

const VERDICT_PASS_COMMAND = 'rangelink._test.verdict.pass';
const VERDICT_FAIL_COMMAND = 'rangelink._test.verdict.fail';

/**
 * Pauses the test until the human clicks Pass or Fail in the status bar.
 *
 * Use this instead of `waitForHuman` when the test is pure visual verification
 * (e.g., "menu item is/isn't visible", "dialog has/hasn't appeared") and the
 * only machine-verifiable signal is a weak state-invariant check. The explicit
 * Pass/Fail choice forces the driver to confirm the outcome — no "just hit
 * Cancel without looking" passes.
 *
 * Implementation: wraps everything in `vscode.window.withProgress` so the
 * action prompt appears as a persistent notification in the bottom-right
 * corner. In parallel, two status bar items (PASS / FAIL) are created on the
 * bottom-left with ephemeral commands. When the human clicks one, the
 * underlying promise resolves, the status bar items dispose, AND the progress
 * notification dismisses automatically — all from the same promise settlement.
 *
 * Why this combination:
 * - Modal dialogs (`{ modal: true }`) are blocked by VS Code's test host.
 * - QuickPick verdicts conflict with scenarios that themselves open
 *   QuickPicks (R-D, R-M menus).
 * - Plain notifications (info/warning/error) can auto-collapse depending on
 *   `workbench.notifications.*` user settings, even with action buttons.
 * - Status bar items never auto-dismiss — they persist until disposed.
 * - `withProgress` notifications are tied to a promise's lifetime — they
 *   stay visible as long as the task is running.
 * - Combining the two gives us persistent instructions (progress title) AND
 *   persistent buttons (status bar), with a single promise resolving both.
 *
 * Mocha's per-test timeout (currently 10 min in `.vscode-test.mjs`) bounds
 * the maximum wait.
 *
 * @param tcId - Test case ID shown as the notification title prefix
 * @param action - Short prompt describing what to verify
 * @param consoleSteps - Optional bulleted steps (shown in the terminal console)
 * @returns `'pass'` if the human clicked the Pass status bar item, `'fail'` otherwise
 */
export const waitForHumanVerdict = async (
  tcId: string,
  action: string,
  consoleSteps?: string[],
): Promise<HumanVerdict> => {
  nodeConsole.log(`\n${SECTION_LINE}`);
  nodeConsole.log(`[${tcId}] ${action}`);
  if (consoleSteps !== undefined) {
    consoleSteps.forEach((line) => nodeConsole.log(`  ${line}`));
  }
  nodeConsole.log('Click the PASS or FAIL button in the status bar (bottom-left) when done.');
  nodeConsole.log(SECTION_LINE);

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `🧪 ${tcId}: ${action}`,
      cancellable: false,
    },
    (progress) => {
      progress.report({ message: 'Click PASS or FAIL in the bottom-left status bar' });

      return new Promise<HumanVerdict>((resolve) => {
        const disposables: vscode.Disposable[] = [];
        let settled = false;

        const settleWith = (verdict: HumanVerdict): void => {
          if (settled) return;
          settled = true;
          for (const d of disposables) {
            d.dispose();
          }
          resolve(verdict);
        };

        disposables.push(
          vscode.commands.registerCommand(VERDICT_PASS_COMMAND, () => settleWith('pass')),
          vscode.commands.registerCommand(VERDICT_FAIL_COMMAND, () => settleWith('fail')),
        );

        const passItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000);
        passItem.text = `$(check) PASS [${tcId}]`;
        passItem.tooltip = `Click if the expected behavior was observed for ${tcId}`;
        passItem.command = VERDICT_PASS_COMMAND;
        passItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        passItem.show();
        disposables.push(passItem);

        const failItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 9999);
        failItem.text = `$(x) FAIL [${tcId}]`;
        failItem.tooltip = `Click if the expected behavior was NOT observed for ${tcId}`;
        failItem.command = VERDICT_FAIL_COMMAND;
        failItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        failItem.show();
        disposables.push(failItem);
      });
    },
  );
};
