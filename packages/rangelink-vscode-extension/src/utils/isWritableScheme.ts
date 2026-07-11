/**
 * URI schemes that support text editing.
 *
 * - `file` - Regular file system files
 * - `untitled` - New unsaved files
 * - `vscode-remote` - Files opened via a remote connection (e.g. devcontainers, SSH)
 *
 * All other schemes (git, output, vscode-settings, etc.) are read-only.
 */
const WRITABLE_SCHEMES = ['file', 'untitled', 'vscode-remote'];

/**
 * Check if a URI scheme supports text editing.
 *
 * VSCode uses URI schemes to identify document sources. Certain schemes
 * are inherently read-only (git diff views, output panels, settings UI).
 *
 * @param scheme - The URI scheme to check
 * @returns true if scheme is writable, false for read-only schemes
 */
export const isWritableScheme = (scheme: string): boolean => {
  return WRITABLE_SCHEMES.includes(scheme);
};
