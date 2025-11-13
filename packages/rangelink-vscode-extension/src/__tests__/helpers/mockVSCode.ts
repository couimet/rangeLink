/**
 * Mock VSCode objects and utilities for testing
 *
 * Provides pre-configured mocks for common VSCode API objects used across
 * destination tests. Reduces boilerplate and ensures consistent test setups.
 */

import * as vscode from 'vscode';

/**
 * Create a mock Terminal with common methods stubbed
 *
 * @param name - Terminal name (default: 'bash')
 * @returns Mock Terminal object with Jest functions
 */
export const createMockTerminal = (name = 'bash'): vscode.Terminal => {
  return {
    name,
    sendText: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  } as unknown as vscode.Terminal;
};

/**
 * Mock vscode.window object for testing
 *
 * Use this to mock window-related functions like activeTextEditor, showInformationMessage, etc.
 *
 * @example
 * ```typescript
 * jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation(mockWindow.showInformationMessage);
 * ```
 */
export const createMockWindow = () => {
  return {
    activeTerminal: undefined as vscode.Terminal | undefined,
    activeTextEditor: undefined as vscode.TextEditor | undefined,
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  };
};

/**
 * Mock vscode.env object for environment detection tests
 *
 * @param options - Environment properties to override
 * @returns Mock env object
 */
export const createMockEnv = (options?: {
  appName?: string;
  uriScheme?: string;
}): typeof vscode.env => {
  return {
    appName: options?.appName || 'Visual Studio Code',
    uriScheme: options?.uriScheme || 'vscode',
    clipboard: {
      writeText: jest.fn(),
      readText: jest.fn().mockResolvedValue(''),
    },
  } as unknown as typeof vscode.env;
};

/**
 * Mock vscode.extensions object for extension detection tests
 *
 * @param extensionIds - Array of extension IDs to mock as installed
 * @returns Mock extensions object
 */
export const createMockExtensions = (extensionIds: string[] = []): typeof vscode.extensions => {
  const mockExtensions = extensionIds.map((id) => ({
    id,
    isActive: true,
    exports: {},
  }));

  return {
    all: mockExtensions,
    getExtension: jest.fn((id: string) => {
      return mockExtensions.find((ext) => ext.id === id);
    }),
  } as unknown as typeof vscode.extensions;
};

/**
 * Mock vscode.commands object for command execution tests
 *
 * @returns Mock commands object with executeCommand spy
 */
export const createMockCommands = (): typeof vscode.commands => {
  return {
    executeCommand: jest.fn().mockResolvedValue(undefined),
  } as unknown as typeof vscode.commands;
};

/**
 * Create a mock TextDocument with working getText() and positionAt() for link detection tests.
 *
 * The positionAt() implementation converts string indices to line/character positions
 * by counting newlines and character offsets. This is essential for provider tests
 * that detect links in document text.
 *
 * @param text - Document content
 * @param uri - Optional document URI (defaults to file:///test.md)
 * @returns Mock TextDocument with functional getText and positionAt
 */
export const createMockDocument = (
  text: string,
  uri?: vscode.Uri,
): vscode.TextDocument => {
  // Create a default mock URI if not provided
  const defaultUri = uri || {
    scheme: 'file',
    path: '/test.md',
    toString: () => 'file:///test.md',
    fsPath: '/test.md',
  };

  return {
    getText: () => text,
    positionAt: (index: number) => {
      // Calculate line and character from string index
      const lines = text.substring(0, index).split('\n');
      const line = lines.length - 1;
      const character = lines[lines.length - 1].length;
      return new vscode.Position(line, character);
    },
    uri: defaultUri,
  } as unknown as vscode.TextDocument;
};

/**
 * Create a mock CancellationToken for provider tests.
 *
 * @param isCancelled - Whether the token should report as cancelled (default: false)
 * @returns Mock CancellationToken
 */
export const createMockCancellationToken = (
  isCancelled = false,
): vscode.CancellationToken => {
  return {
    isCancellationRequested: isCancelled,
    onCancellationRequested: jest.fn(),
  } as unknown as vscode.CancellationToken;
};
