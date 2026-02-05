/**
 * Result of the dirty buffer warning dialog.
 *
 * Indicates the user's choice when prompted about generating a link
 * from a file with unsaved changes.
 */
export enum DirtyBufferWarningResult {
  /**
   * User chose "Save & Generate".
   * Document was saved before link generation continues.
   */
  SaveAndGenerate = 'SaveAndGenerate',

  /**
   * User chose "Generate Anyway".
   * Link generation continues without saving.
   */
  GenerateAnyway = 'GenerateAnyway',

  /**
   * User dismissed the warning dialog.
   * Link generation should be aborted.
   */
  Dismissed = 'Dismissed',
}
