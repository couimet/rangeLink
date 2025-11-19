/**
 * Create a mock vscode.languages object for testing
 */

import * as vscode from 'vscode';

/**
 * Mock vscode.languages object for language feature tests.
 *
 * @returns Mock languages object with registerDocumentLinkProvider spy
 */
export const createMockLanguages = (): typeof vscode.languages => {
  return {
    registerDocumentLinkProvider: jest.fn(() => ({ dispose: jest.fn() })),
  } as unknown as typeof vscode.languages;
};
