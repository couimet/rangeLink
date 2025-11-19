/**
 * Create a mock getText function for TextDocument testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock getText function that returns text content.
 *
 * This helper encapsulates the common pattern of mocking TextDocument.getText().
 * Can be enhanced in the future to handle Selection/Range parameters properly.
 *
 * @param text - The text content to return
 * @returns Mock function that returns the text (ignores selection/range parameter)
 *
 * @example
 * const mockDocument = createMockDocument({
 *   getText: createMockText('test content'),
 * });
 */
export const createMockText = (text: string): jest.Mock => {
  return jest.fn((selection?: vscode.Selection | vscode.Range) => {
    // For now, ignore selection/range parameter and return full text
    // Future enhancement: parse text by lines and return substring based on range
    return text;
  });
};
