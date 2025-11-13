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
    showTextDocument: jest.fn(),
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
export const createMockDocument = (text: string, uri?: vscode.Uri): vscode.TextDocument => {
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
export const createMockCancellationToken = (isCancelled = false): vscode.CancellationToken => {
  return {
    isCancellationRequested: isCancelled,
    onCancellationRequested: jest.fn(),
  } as unknown as vscode.CancellationToken;
};

/**
 * Create a mock workspace object for navigation tests.
 *
 * @returns Mock workspace with file operations and document handling
 */
export const createMockWorkspace = () => ({
  workspaceFolders: [],
  openTextDocument: jest.fn(),
  fs: {
    stat: jest.fn(),
  },
});

/**
 * Create a mock Uri namespace for navigation tests.
 *
 * @returns Mock Uri with file and parse methods
 */
export const createMockUri = () => ({
  file: jest.fn(),
  parse: jest.fn(),
});

/**
 * Create a mock Position constructor for navigation tests.
 *
 * Creates Position objects with line and character properties.
 *
 * @returns Mock Position constructor that creates {line, character} objects
 */
export const createMockPosition = () =>
  jest.fn((line: number, character: number) => ({ line, character }));

/**
 * Create a mock Selection constructor for navigation tests.
 *
 * Creates Selection objects with anchor and active properties.
 *
 * @returns Mock Selection constructor that creates {anchor, active} objects
 */
export const createMockSelection = () =>
  jest.fn((anchor: vscode.Position, active: vscode.Position) => ({ anchor, active }));

/**
 * Create a mock Range constructor for navigation tests.
 *
 * Creates Range objects with start and end properties.
 *
 * @returns Mock Range constructor that creates {start, end} objects
 */
export const createMockRange = () =>
  jest.fn((start: vscode.Position, end: vscode.Position) => ({ start, end }));

/**
 * Options for configuring the vscode module mock.
 */
export interface VSCodeMockOptions {
  /**
   * Optional TextEditorRevealType enum values to include.
   * Defaults to {InCenterIfOutsideViewport: 2} if not provided.
   */
  textEditorRevealType?: Record<string, number>;
}

/**
 * Canonical vscode navigation mock structure for jest.mock() calls.
 *
 * Use this constant directly in jest.mock() factories with spread operator:
 *
 * @example
 * ```typescript
 * // ✅ CORRECT - Use with spread operator
 * jest.mock('vscode', () => ({ ...VSCODE_NAVIGATION_MOCK }));
 *
 * // ✅ Also works - Reference without spread (but less flexible)
 * jest.mock('vscode', () => VSCODE_NAVIGATION_MOCK);
 * ```
 */
export const VSCODE_NAVIGATION_MOCK = {
  window: {
    activeTerminal: undefined,
    activeTextEditor: undefined,
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showTextDocument: jest.fn(),
  },
  workspace: {
    workspaceFolders: [],
    openTextDocument: jest.fn(),
    fs: {
      stat: jest.fn(),
    },
  },
  Uri: {
    file: jest.fn(),
    parse: jest.fn(),
  },
  Position: jest.fn((line: number, character: number) => ({ line, character })),
  Selection: jest.fn(
    (anchor: { line: number; character: number }, active: { line: number; character: number }) => ({
      anchor,
      active,
    }),
  ),
  Range: jest.fn(
    (
      start: { line: number; character: number },
      end: { line: number; character: number },
    ) => ({ start, end }),
  ),
  TextEditorRevealType: {
    InCenterIfOutsideViewport: 2,
  },
} as const;

/**
 * Create a complete vscode module mock for navigation tests.
 *
 * Composes from existing mock components to provide all necessary mocks
 * for file operations, document handling, and UI interactions.
 *
 * **⚠️ Cannot be used in jest.mock() factories** due to Jest hoisting + ES/CJS module issues.
 * This factory serves as:
 * 1. **Runtime usage** - Call directly in test setup code (not in jest.mock())
 * 2. **Reference documentation** - Canonical structure for inline jest.mock() calls
 *
 * For jest.mock() calls, you MUST inline the structure:
 *
 * @param options - Optional configuration for the mock
 * @example
 * ```typescript
 * // ❌ DOES NOT WORK - Jest hoisting + module resolution prevents this
 * jest.mock('vscode', () => {
 *   const { createVSCodeNavigationMock } = require('../helpers/mockVSCode');
 *   return createVSCodeNavigationMock();  // Module not found / not a function
 * });
 *
 * // ✅ CORRECT - Inline the mock structure
 * // Canonical structure defined in mockVSCode.ts createVSCodeNavigationMock()
 * jest.mock('vscode', () => ({
 *   window: { showTextDocument: jest.fn(), ... },
 *   workspace: { openTextDocument: jest.fn(), ... },
 *   // ... (see createVSCodeNavigationMock for full structure)
 * }));
 *
 * // ✅ ALSO WORKS - Use in runtime test setup (not jest.mock factory)
 * const mockVSCode = createVSCodeNavigationMock();
 * // Then manually assign to module system if needed
 * ```
 */
export const createVSCodeNavigationMock = (options?: VSCodeMockOptions) => ({
  window: createMockWindow(),
  workspace: createMockWorkspace(),
  Uri: createMockUri(),
  Position: createMockPosition(),
  Selection: createMockSelection(),
  Range: createMockRange(),
  TextEditorRevealType: options?.textEditorRevealType ?? {
    InCenterIfOutsideViewport: 2,
  },
});
