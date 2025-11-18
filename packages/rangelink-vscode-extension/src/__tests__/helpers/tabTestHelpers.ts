/**
 * Mock TabInputText class for VSCode tab testing
 *
 * Provides a mock implementation of vscode.TabInputText for testing tab group operations.
 * Required for VscodeAdapter.isTextEditorTab() instanceof checks to work correctly.
 *
 * This class is used by createMockTab() to create proper TabInputText instances.
 * Also used in mockVSCode.ts for the TabInputText constructor mock.
 */

import * as vscode from 'vscode';

/**
 * Mock TabInputText class for instanceof checks in VscodeAdapter.
 *
 * Exported so createMockTab can create proper TabInputText instances.
 */
export class MockTabInputText {
  constructor(public uri: vscode.Uri) {}
}
