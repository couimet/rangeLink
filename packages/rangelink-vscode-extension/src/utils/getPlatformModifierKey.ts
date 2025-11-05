/**
 * Get the platform-specific modifier key label for UI messages.
 *
 * Returns the appropriate modifier key label based on the operating system:
 * - **macOS:** "Cmd" (Command key)
 * - **Windows/Linux:** "Ctrl" (Control key)
 *
 * Used in tooltips, info messages, and other user-facing text to indicate
 * keyboard shortcuts in a platform-appropriate way.
 *
 * @returns Platform-specific modifier key label
 *
 * @example
 * ```typescript
 * const modifier = getPlatformModifierKey();
 * // macOS: "Cmd"
 * // Windows: "Ctrl"
 * // Linux: "Ctrl"
 *
 * const tooltip = `Open in editor (${modifier}+Click)`;
 * // macOS: "Open in editor (Cmd+Click)"
 * // Windows: "Open in editor (Ctrl+Click)"
 * ```
 */
export const getPlatformModifierKey = (): string => {
  // Node.js process.platform values:
  // - 'darwin' = macOS
  // - 'win32' = Windows
  // - 'linux' = Linux
  // eslint-disable-next-line no-undef
  return process.platform === 'darwin' ? 'Cmd' : 'Ctrl';
};
