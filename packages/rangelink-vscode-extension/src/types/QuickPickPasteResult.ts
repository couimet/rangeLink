/**
 * Result of showing quick pick for destination binding.
 *
 * Represents the distinct outcomes when a user is prompted to choose
 * a destination to bind to (used by both Jump and Paste flows).
 */
export enum QuickPickBindResult {
  /**
   * User selected a destination and binding succeeded.
   */
  Bound = 'Bound',

  /**
   * User selected a destination but binding failed.
   * Error message was already shown by bind().
   */
  BindingFailed = 'BindingFailed',

  /**
   * User cancelled the quick pick (pressed Escape).
   */
  Cancelled = 'Cancelled',

  /**
   * No destinations available to show in quick pick.
   * Informative message was shown to the user.
   */
  NoDestinationsAvailable = 'NoDestinationsAvailable',
}
