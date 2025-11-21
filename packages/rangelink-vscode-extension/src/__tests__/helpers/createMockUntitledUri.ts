import type * as vscode from 'vscode';

/**
 * Create a mock untitled URI for testing
 *
 * Handles untitled URI format parsing to extract scheme and path components.
 * Supports both test format (`untitled:/1`) and actual format (`untitled:Untitled-1`).
 *
 * @param uriString - Full URI string (e.g., "untitled:/1", "untitled:Untitled-1")
 * @returns Mock vscode.Uri with untitled scheme
 */
export const createMockUntitledUri = (uriString: string): vscode.Uri => {
  const colonIndex = uriString.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Invalid URI format: ${uriString} (missing colon)`);
  }

  const scheme = uriString.substring(0, colonIndex);
  const path = uriString.substring(colonIndex + 1);

  return {
    scheme,
    path,
    fsPath: '',
    authority: '',
    query: '',
    fragment: '',
    toString: () => uriString,
    toJSON: () => ({ scheme, path }),
    with: jest.fn(),
  } as vscode.Uri;
};
