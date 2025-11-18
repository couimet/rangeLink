/**
 * Create a mock TextDocument for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock TextDocument with sensible defaults and optional overrides.
 *
 * **Default behavior (for link detection tests):**
 * - `getText()` returns full text content
 * - `positionAt()` converts string indices to Position objects
 * - `lineAt()` returns line text with range property (required by toInputSelection)
 *
 * **For navigation tests, provide overrides:**
 * - `lineAt: jest.fn(() => ({ text: 'line content' }))`
 * - `lineCount: 100`
 *
 * @param text - Document content (used for getText and positionAt)
 * @param uri - Optional document URI (defaults to file:///test.md)
 * @param overrides - Optional property overrides for specialized behavior
 * @returns Mock TextDocument with default + overridden properties
 */
export const createMockDocument = (
  text: string,
  uri?: vscode.Uri,
  overrides?: Partial<vscode.TextDocument>,
): vscode.TextDocument => {
  // Create a default mock URI if not provided
  const defaultUri = uri || {
    scheme: 'file',
    path: '/test.md',
    toString: () => 'file:///test.md',
    fsPath: '/test.md',
  };

  const baseDocument = {
    getText: () => text,
    positionAt: (index: number) => {
      // Calculate line and character from string index
      const lines = text.substring(0, index).split('\n');
      const line = lines.length - 1;
      const character = lines[lines.length - 1].length;
      return new vscode.Position(line, character);
    },
    uri: defaultUri,
    lineCount: text.split('\n').length,
    lineAt: jest.fn((line: number) => {
      const lineText = text.split('\n')[line] || '';
      return {
        text: lineText,
        lineNumber: line,
        range: {
          start: { line, character: 0 },
          end: { line, character: lineText.length },
        },
      };
    }),
  };

  return {
    ...baseDocument,
    ...overrides,
  } as unknown as vscode.TextDocument;
};
