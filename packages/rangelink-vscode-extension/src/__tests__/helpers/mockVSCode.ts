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
 * Provides complete mock of vscode.window with:
 * - Status bar operations with Disposable return
 * - Notification methods (info, warning, error)
 * - Document/editor operations
 * - Terminal and editor references
 *
 * All notification methods return Promise<string | undefined> matching VSCode API.
 * setStatusBarMessage returns mock Disposable with dispose() method.
 */
export const createMockWindow = () => {
  return {
    activeTerminal: undefined as vscode.Terminal | undefined,
    activeTextEditor: undefined as vscode.TextEditor | undefined,
    setStatusBarMessage: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showTextDocument: jest.fn().mockResolvedValue(undefined),
  };
};

/**
 * Mock vscode.env object for environment detection tests
 *
 * Provides complete mock of vscode.env with:
 * - appName and uriScheme for environment detection
 * - clipboard.writeText() for VscodeAdapter clipboard operations
 * - clipboard.readText() for test completeness
 *
 * All clipboard methods return proper Promise types matching VSCode API.
 *
 * @param options - Environment properties to override
 * @returns Mock env object compatible with VscodeAdapter
 */
export const createMockEnv = (options?: {
  appName?: string;
  uriScheme?: string;
}): typeof vscode.env => {
  return {
    appName: options?.appName || 'Visual Studio Code',
    uriScheme: options?.uriScheme || 'vscode',
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
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
 * Create a mock TextDocument with sensible defaults and optional overrides.
 *
 * **Default behavior (for link detection tests):**
 * - `getText()` returns full text content
 * - `positionAt()` converts string indices to Position objects
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
    lineAt: jest.fn((line: number) => ({
      text: text.split('\n')[line] || '',
      lineNumber: line,
    })),
  };

  return {
    ...baseDocument,
    ...overrides,
  } as unknown as vscode.TextDocument;
};

/**
 * Create a mock TextEditor with sensible defaults and optional overrides.
 *
 * **Default behavior:**
 * - `document` with default line content
 * - `selection` set to null
 * - `selections` set to empty array
 * - `revealRange` mock function
 *
 * **For specialized tests, provide overrides:**
 * - Custom document: `document: createMockDocument(...)`
 * - Pre-set selection: `selection: { anchor: ..., active: ... }`
 *
 * @param overrides - Optional property overrides for specialized behavior
 * @returns Mock TextEditor with default + overridden properties
 */
export const createMockEditor = (
  overrides?: Partial<vscode.TextEditor>,
): vscode.TextEditor => {
  const defaultDocument = createMockDocument('const x = 42; // Sample line content');

  const baseEditor = {
    document: defaultDocument,
    selection: null as any,
    selections: [] as any[],
    revealRange: jest.fn(),
  };

  return {
    ...baseEditor,
    ...overrides,
  } as unknown as vscode.TextEditor;
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
 * Accepts either string paths (for convenience) or full WorkspaceFolder objects.
 * String paths are automatically converted to WorkspaceFolder objects.
 *
 * @param workspaceFolders - Optional workspace folders (defaults to single workspace at /workspace)
 *                          Can be string paths or WorkspaceFolder objects
 * @returns Mock workspace with file operations and document handling
 */
export const createMockWorkspace = (
  workspaceFolders:
    | Array<string | vscode.WorkspaceFolder>
    | undefined = ['/workspace'],
) => {
  const folders = workspaceFolders?.map((folder) =>
    typeof folder === 'string' ? createMockWorkspaceFolder(folder) : folder,
  );

  return {
    workspaceFolders: folders,
    openTextDocument: jest.fn(),
    fs: {
      stat: jest.fn(),
    },
  };
};

/**
 * Create a complete vscode module mock for VscodeAdapter tests.
 *
 * Specialized factory that provides all VSCode API mocks required by VscodeAdapter:
 * - env.clipboard for clipboard operations
 * - window.setStatusBarMessage for status bar (synchronous, returns Disposable)
 * - window.show*Message for notifications (async, return Promise)
 * - window.showTextDocument for document display
 * - workspace.openTextDocument for document loading
 * - workspace.fs.stat for file system operations
 * - workspace.workspaceFolders for workspace path resolution
 * - Uri.file for URI creation
 * - Position, Selection, Range constructors
 * - TextEditorRevealType enum
 *
 * Composes from existing factories (createMockEnv, createMockWindow, createMockWorkspace)
 * to ensure consistency across all tests.
 *
 * @returns Complete typeof vscode mock suitable for VscodeAdapter constructor
 */
export const createVSCodeAdapterMock = (): typeof vscode => {
  return {
    env: createMockEnv(),
    window: createMockWindow(),
    workspace: createMockWorkspace(),
    Uri: createMockUri(),
    Position: jest.fn((line: number, character: number) => ({ line, character })),
    Selection: jest.fn((anchor: any, active: any) => ({ anchor, active })),
    Range: jest.fn((start: any, end: any) => ({ start, end })),
  } as unknown as typeof vscode;
};

/**
 * Create a mock Uri namespace for navigation tests.
 *
 * Provides mock implementations for Uri.file() and Uri.parse() methods.
 * For creating actual URI instances, use createMockUriInstance().
 *
 * @param overrides - Optional overrides for file/parse implementations
 * @returns Mock Uri with file and parse methods
 */
export const createMockUri = (overrides?: {
  file?: jest.Mock;
  parse?: jest.Mock;
}) => ({
  file:
    overrides?.file ||
    jest.fn((fsPath: string) => ({
      fsPath,
      scheme: 'file',
      path: fsPath,
      toString: () => `file://${fsPath}`,
    })),
  parse:
    overrides?.parse ||
    jest.fn((str: string) => ({
      scheme: str.startsWith('file:') ? 'file' : 'command',
      path: str,
      toString: () => str,
      fsPath: str.replace(/^file:\/\//, ''),
    })),
});

/**
 * Create a mock URI instance with sensible defaults.
 *
 * Provides a mock vscode.Uri object with file:// scheme by default.
 * Use this for creating workspace folder URIs, file URIs in tests, etc.
 *
 * @param fsPath - File system path for the URI
 * @param overrides - Optional property overrides (scheme, path, etc.)
 * @returns Mock URI instance
 */
export const createMockUriInstance = (
  fsPath: string,
  overrides?: Partial<vscode.Uri>,
): vscode.Uri => {
  return {
    fsPath,
    scheme: 'file',
    path: fsPath,
    toString: () => `file://${fsPath}`,
    ...overrides,
  } as vscode.Uri;
};

/**
 * Create a mock workspace folder with sensible defaults.
 *
 * Provides a mock vscode.WorkspaceFolder object for testing
 * workspace-relative path resolution.
 *
 * @param fsPath - File system path for the workspace root
 * @param overrides - Optional property overrides (name, index, etc.)
 * @returns Mock workspace folder
 */
export const createMockWorkspaceFolder = (
  fsPath: string,
  overrides?: Partial<vscode.WorkspaceFolder>,
): vscode.WorkspaceFolder => {
  const uri = createMockUriInstance(fsPath);
  return {
    uri,
    name: fsPath.split('/').pop() || 'workspace',
    index: 0,
    ...overrides,
  } as vscode.WorkspaceFolder;
};

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
 * Mock IDE adapter interface matching VscodeAdapter public API.
 * Used for type-safe overrides in createMockIdeAdapter.
 */
interface MockIdeAdapter {
  writeTextToClipboard: jest.Mock;
  setStatusBarMessage: jest.Mock;
  showWarningMessage: jest.Mock;
  showInformationMessage: jest.Mock;
  showErrorMessage: jest.Mock;
  showTextDocument: jest.Mock;
  resolveWorkspacePath: jest.Mock;
  createPosition: jest.Mock;
  createSelection: jest.Mock;
  createRange: jest.Mock;
}

/**
 * Create a mock IDE adapter for testing VscodeAdapter-dependent code.
 *
 * Provides complete mock of VscodeAdapter interface with sensible defaults:
 * - UI operations (notifications, status bar)
 * - Document operations (showTextDocument)
 * - Workspace operations (resolveWorkspacePath)
 * - Primitive factories (Position, Selection, Range)
 *
 * Composes from existing mock components for consistency across tests.
 *
 * @param overrides - Optional overrides for specific methods
 * @returns Mock IDE adapter with all VscodeAdapter methods
 */
export const createMockIdeAdapter = (overrides?: Partial<MockIdeAdapter>) => {
  const window = createMockWindow();
  const mockPosition = createMockPosition();
  const mockSelection = createMockSelection();
  const mockRange = createMockRange();

  return {
    // Clipboard operations
    writeTextToClipboard: jest.fn().mockResolvedValue(undefined),

    // Status bar
    setStatusBarMessage: window.setStatusBarMessage,

    // Notifications
    showWarningMessage: window.showWarningMessage,
    showInformationMessage: window.showInformationMessage,
    showErrorMessage: window.showErrorMessage,

    // Document/editor operations
    showTextDocument: window.showTextDocument,

    // Workspace operations
    resolveWorkspacePath: jest.fn().mockResolvedValue({ fsPath: '/workspace/file.ts' }),

    // Primitive factories
    createPosition: mockPosition,
    createSelection: mockSelection,
    createRange: mockRange,

    // Apply overrides
    ...overrides,
  };
};
