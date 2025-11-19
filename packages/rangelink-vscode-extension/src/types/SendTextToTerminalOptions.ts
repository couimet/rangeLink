import { BehaviourAfterPaste } from './BehaviourAfterPaste';

/**
 * Options for sending text to terminal.
 *
 * Architecture note: Optional object parameter enables future extensibility.
 * Additional options can be added without breaking existing calls.
 */
export interface SendTextToTerminalOptions {
  /**
   * Behavior after pasting text to terminal.
   *
   * Defaults to NOTHING (paste without executing) for safety.
   */
  behaviour?: BehaviourAfterPaste;
}
