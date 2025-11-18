/**
 * Create a mock Position constructor for testing
 */

/**
 * Create a mock Position constructor for navigation tests.
 *
 * Creates Position objects with line and character properties.
 *
 * @returns Mock Position constructor that creates {line, character} objects
 */
export const createMockPosition = () =>
  jest.fn((line: number, character: number) => ({ line, character }));
