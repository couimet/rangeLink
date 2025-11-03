/**
 * Represents the type of selection made by the user.
 *
 * Extensions should determine this based on the user's input method:
 * - Normal: Standard text selection (Shift+Arrow, mouse drag, etc.)
 * - Rectangular: Column/block selection mode (Alt+Shift in VSCode, Ctrl+V in Vim)
 */
export enum SelectionType {
  /**
   * Standard text selection.
   * User selected text using normal selection modes.
   */
  Normal = 'Normal',

  /**
   * Rectangular (column/block) selection.
   * User explicitly invoked column selection mode.
   */
  Rectangular = 'Rectangular',
}
