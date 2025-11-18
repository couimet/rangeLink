/**
 * Create a mock Selection constructor for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock Selection constructor for navigation tests.
 *
 * Creates Selection objects with anchor and active properties.
 *
 * @returns Mock Selection constructor that creates {anchor, active} objects
 */
export const createMockSelection = () =>
  jest.fn((anchor: vscode.Position, active: vscode.Position) => ({ anchor, active }));
