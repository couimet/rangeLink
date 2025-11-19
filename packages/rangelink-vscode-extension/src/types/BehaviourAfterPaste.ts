/**
 * Behavior after pasting text to terminal.
 *
 * Architecture note: Extensible enum for future terminal paste behaviors.
 * Using descriptive names focused on user intent, not implementation details.
 */
export enum BehaviourAfterPaste {
  /**
   * Execute the pasted text immediately (terminal.sendText(..., true))
   *
   * Sends Enter key after pasting, causing terminal to execute the command.
   * Used for auto-running commands like paste + execute workflows.
   */
  EXECUTE = 'execute',

  /**
   * Paste without executing (terminal.sendText(..., false))
   *
   * Leaves pasted text at the prompt without sending Enter key.
   * User can review/edit before manually pressing Enter.
   * Used for safe paste operations where user wants to verify first.
   */
  NOTHING = 'nothing',
}
