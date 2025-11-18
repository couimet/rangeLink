/**
 * Mock Tab factory for tab group tests
 */

import * as vscode from 'vscode';

import { MockTabInputText } from './tabTestHelpers';

/**
 * Create a mock Tab for tab group tests.
 *
 * Provides minimal Tab structure for testing tab group operations.
 * Creates proper MockTabInputText instances so VscodeAdapter.isTextEditorTab()
 * instanceof checks work correctly.
 *
 * @param uri - Document URI for the tab
 * @param overrides - Optional property overrides
 * @returns Mock Tab instance
 */
export const createMockTab = (uri: vscode.Uri, overrides?: Partial<vscode.Tab>): vscode.Tab => {
  return {
    input: new MockTabInputText(uri),
    ...overrides,
  } as unknown as vscode.Tab;
};
