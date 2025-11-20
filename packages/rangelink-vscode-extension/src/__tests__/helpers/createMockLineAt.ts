/**
 * Create a mock lineAt function for testing
 */

/**
 * Create a mock lineAt function that returns a minimal TextLine object.
 *
 * Returns a jest.fn() that returns { text: string } for any line number.
 * Common pattern for testing navigation logic that only needs line text.
 *
 * @param text - The text content to return for the line
 * @returns Mock function: (line: number) => { text: string }
 */
export const createMockLineAt = (text: string): jest.Mock => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jest.fn(() => ({ text })) as any;
};
