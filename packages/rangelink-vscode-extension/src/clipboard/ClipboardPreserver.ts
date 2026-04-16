/**
 * Wraps an async operation with clipboard save/restore based on the
 * rangelink.clipboard.preserve setting.
 *
 * Implementations own the mode check and the save/restore lifecycle.
 * Call sites pass the operation to wrap and may optionally pass a
 * shouldRestore callback to control post-operation clipboard restoration.
 *
 * @param fn - The async operation to wrap
 * @param shouldRestore - Optional callback evaluated AFTER fn completes.
 *   When provided and returns false, clipboard restoration is skipped.
 *   Used by Tier 3 (focusCommands) destinations where the link must
 *   stay on the clipboard for manual paste.
 */
export interface ClipboardPreserver {
  preserve<T>(fn: () => Promise<T>, shouldRestore?: () => boolean): Promise<T>;
}
