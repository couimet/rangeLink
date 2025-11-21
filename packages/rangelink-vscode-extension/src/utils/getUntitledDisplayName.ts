import type * as vscode from 'vscode';

/**
 * Extract display name from untitled file URI
 *
 * Handles VSCode/Cursor URI format variations:
 * - Test format: `untitled:/1` → "Untitled-1"
 * - Actual format: `untitled:Untitled-1` → "Untitled-1" (avoid duplication)
 *
 * @param uri - The URI with untitled scheme
 * @returns Display name for the untitled file (e.g., "Untitled-1")
 * @throws Error if URI scheme is not 'untitled'
 */
export const getUntitledDisplayName = (uri: vscode.Uri): string => {
  if (uri.scheme !== 'untitled') {
    throw new Error(`Expected untitled scheme, got: ${uri.scheme}`);
  }

  // Remove leading slash from path
  const pathPart = uri.path.replace(/^\//, '');

  // VSCode/Cursor URI formats vary:
  // - Tests: uri.path = '/1' → should produce 'Untitled-1'
  // - Actual: uri.path = 'Untitled-1' → should produce 'Untitled-1' (not 'Untitled-Untitled-1')
  // Case-insensitive check for cross-platform compatibility (Windows is case-insensitive)
  return /^Untitled/i.test(pathPart) ? pathPart : `Untitled-${pathPart}`;
};
