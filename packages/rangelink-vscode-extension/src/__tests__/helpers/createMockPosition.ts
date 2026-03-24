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

/**
 * Shorthand for createMockPosition with positional args.
 *
 * @param line - Line number
 * @param character - Character offset
 * @returns Mock Position with line and character set
 */
export const createMockPos = (line: number, character: number): vscode.Position =>
  createMockPosition({ line, character });
