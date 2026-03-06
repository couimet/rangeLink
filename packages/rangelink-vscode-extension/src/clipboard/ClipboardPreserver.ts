/**
 * Wraps an async operation with clipboard save/restore based on the
 * rangelink.clipboard.preserve setting.
 *
 * Implementations own the mode check and the save/restore lifecycle.
 * Call sites pass only the operation to wrap.
 */
export interface ClipboardPreserver {
  preserve<T>(fn: () => Promise<T>): Promise<T>;
}
