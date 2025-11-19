/**
 * Create a mock Range for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock Range with minimal helper pattern.
 *
 * **Minimal Helper Philosophy:**
 * - No smart defaults or hidden behaviors
 * - Caller provides exactly what they need
 *
 * @param overrides - Range properties (start, end, etc.)
 * @returns Mock Range with provided properties
 */
export const createMockRange = (
  overrides: Partial<vscode.Range>,
): vscode.Range => {
  return {
    ...overrides,
  } as vscode.Range;
};
