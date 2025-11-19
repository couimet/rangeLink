/**
 * Create a mock TextDocument for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock TextDocument with minimal helper pattern.
 *
 * **Minimal Helper Philosophy:**
 * - No smart defaults or hidden behaviors
 * - Caller provides exactly what they need
 * - Use helper functions for common patterns:
 *   - `getText: createMockText('content')`
 *   - `uri: createMockUri('/path')`
 *
 * @param overrides - Document properties (getText, uri, lineCount, etc.)
 * @returns Mock TextDocument with provided properties
 */
export const createMockDocument = (
  overrides: Partial<vscode.TextDocument>,
): vscode.TextDocument => {
  return {
    ...overrides,
  } as vscode.TextDocument;
};
