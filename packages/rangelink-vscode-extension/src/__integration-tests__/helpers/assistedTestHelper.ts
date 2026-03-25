import * as vscode from 'vscode';

const DONE_BUTTON = 'Done ✓';

const BANNER_LINE = '═'.repeat(60);
const SECTION_LINE = '─'.repeat(60);

/**
 * Prints a visible banner at suite start explaining the assisted mode workflow.
 * Call this in suiteSetup() for any suite containing [assisted] tests.
 */
export const printAssistedBanner = (): void => {
  console.log(`\n${BANNER_LINE}`);
  console.log('ASSISTED TEST MODE');
  console.log('Tests tagged [assisted] will pause for human interaction.');
  console.log('Instructions appear both here and as a VS Code notification.');
  console.log('Click "Done ✓" on the notification when you have completed the action.');
  console.log(BANNER_LINE);
};

/**
 * Pauses the test until the human completes a UI action.
 *
 * Prints the instruction to the console (for the terminal-side screen) and shows
 * a VS Code notification with the same instruction text and a "Done" button.
 * If the notification is dismissed without clicking "Done", it re-shows automatically.
 *
 * @param instruction - What the tester should do (shown in both console and notification)
 * @param details - Optional additional context lines printed to the console only
 */
export const waitForHuman = async (instruction: string, details?: string[]): Promise<void> => {
  console.log(`\n${SECTION_LINE}`);
  console.log(`ACTION REQUIRED: ${instruction}`);
  if (details !== undefined) {
    details.forEach((line) => console.log(`  ${line}`));
  }
  console.log(`Click "Done ✓" on the VS Code notification when ready.`);
  console.log(SECTION_LINE);

  let done = false;
  while (!done) {
    const result = await vscode.window.showInformationMessage(
      `🧪 ${instruction}`,
      DONE_BUTTON,
    );
    if (result === DONE_BUTTON) {
      done = true;
    }
  }
};
