/**
 * Create a mock Position for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock Position with minimal helper pattern.
 *
 * **Minimal Helper Philosophy:**
 * - No smart defaults or hidden behaviors
 * - Caller provides exactly what they need
 *
 * @param overrides - Position properties (line, character, etc.)
 * @returns Mock Position with provided properties
 */
export const createMockPosition = (overrides: Partial<vscode.Position>): vscode.Position => {
  return {
    ...overrides,
  } as vscode.Position;
};
