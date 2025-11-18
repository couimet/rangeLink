/**
 * Create a mock Range constructor for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock Range constructor for navigation tests.
 *
 * Creates Range objects with start and end properties.
 *
 * @returns Mock Range constructor that creates {start, end} objects
 */
export const createMockRange = () =>
  jest.fn((start: vscode.Position, end: vscode.Position) => ({ start, end }));
