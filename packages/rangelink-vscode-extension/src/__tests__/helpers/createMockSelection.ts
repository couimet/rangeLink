/**
 * Create a mock Selection for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock Selection with minimal helper pattern.
 *
 * **Minimal Helper Philosophy:**
 * - No smart defaults or hidden behaviors
 * - Caller provides exactly what they need
 *
 * @param overrides - Selection properties (anchor, active, start, end, etc.)
 * @returns Mock Selection with provided properties
 */
export const createMockSelection = (
  overrides: Partial<vscode.Selection>,
): vscode.Selection => {
  return {
    ...overrides,
  } as vscode.Selection;
};
