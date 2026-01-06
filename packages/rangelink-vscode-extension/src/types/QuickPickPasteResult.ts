/**
 * Result of showing quick pick for paste destination selection.
 *
 * Represents the distinct outcomes when a user is prompted to choose
 * a destination for the R-V (Paste to Destination) command (issue #90).
 */
export enum QuickPickPasteResult {
  /**
   * User selected a destination, binding succeeded, and content was sent successfully.
   */
  SentToDestination = 'SentToDestination',

  /**
   * User selected a destination but sending content failed.
   * Binding succeeded, but sendFn returned false.
   */
  SendFailed = 'SendFailed',

  /**
   * User selected a destination but binding failed.
   * Error message was already shown by bind().
   */
  BindingFailed = 'BindingFailed',

  /**
   * User cancelled the quick pick (pressed Escape).
   * No clipboard copy - R-V requires a destination.
   */
  Cancelled = 'Cancelled',

  /**
   * No destinations available to show in quick pick.
   * Informative message was shown to the user.
   */
  NoDestinationsAvailable = 'NoDestinationsAvailable',
}
