/**
 * Result of an automatic paste operation.
 *
 * Indicates whether an automatic paste to a destination succeeded or failed.
 * Used by getUserInstruction() to provide context-appropriate manual paste instructions.
 */
export enum AutoPasteResult {
  /**
   * Automatic paste succeeded.
   * User instruction may be omitted or provide confirmation message.
   */
  Success = 'Success',

  /**
   * Automatic paste failed or was not attempted.
   * User instruction should explain manual paste fallback.
   */
  Failure = 'Failure',
}
