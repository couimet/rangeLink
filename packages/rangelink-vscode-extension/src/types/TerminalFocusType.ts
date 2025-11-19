/**
 * Terminal focus behavior when showing terminal.
 *
 * Architecture note: Single value enum as stepping stone for future expansion.
 * Additional focus types can be added later (e.g., PreserveFocus) without breaking changes.
 */
export enum TerminalFocusType {
  /**
   * Steal focus to the terminal (terminal.show(false))
   *
   * Brings terminal panel to front and moves cursor focus to terminal input.
   * Used for paste operations where user expects to see pasted content immediately.
   */
  StealFocus = 'steal-focus',
}
