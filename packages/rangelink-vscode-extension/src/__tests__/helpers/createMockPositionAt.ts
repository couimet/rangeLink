/**
 * Create a mock positionAt function for testing
 */

import { createMockPosition } from './createMockPosition';

/**
 * Create a mock positionAt function for single-line documents.
 *
 * Returns a jest.fn() that converts character offset to Position at line 0.
 * Common pattern for testing documents with links on a single line.
 *
 * @param line - Line number for all positions (defaults to 0 for single-line documents)
 * @returns Mock function: (index: number) => Position
 */
export const createMockPositionAt = (line = 0): jest.Mock => {
  return jest.fn((index: number) => createMockPosition({ line, character: index }));
};
