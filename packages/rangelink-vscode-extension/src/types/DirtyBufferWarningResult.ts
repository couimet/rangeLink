/**
 * Result of the dirty buffer warning check.
 *
 * Indicates the document state or the user's choice when prompted
 * about a file with unsaved changes.
 */
export enum DirtyBufferWarningResult {
  /**
   * Document has no unsaved changes — proceed without warning.
   */
  Clean = 'Clean',

  /**
   * User chose to save before proceeding.
   * Document was saved before the operation continues.
   */
  SaveAndContinue = 'SaveAndContinue',

  /**
   * User chose to proceed without saving.
   * Operation continues with unsaved changes.
   */
  ContinueAnyway = 'ContinueAnyway',

  /**
   * User dismissed the warning dialog.
   * Operation should be aborted.
   */
  Dismissed = 'Dismissed',

  /**
   * User chose to save but the save operation failed.
   * Operation should be aborted.
   */
  SaveFailed = 'SaveFailed',
}
