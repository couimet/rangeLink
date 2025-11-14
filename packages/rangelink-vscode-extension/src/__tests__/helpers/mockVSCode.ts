/**
 * Mock VSCode objects and utilities for testing
 *
 * Provides pre-configured mocks for common VSCode API objects used across
 * destination tests. Reduces boilerplate and ensures consistent test setups.
 */

import * as vscode from 'vscode';

import { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

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
    visibleTextEditors: [] as vscode.TextEditor[],
    tabGroups: {
      all: [],
      activeTabGroup: undefined,
      onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
      close: jest.fn(),
    } as unknown as vscode.TabGroups,
    setStatusBarMessage: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showTextDocument: jest.fn().mockResolvedValue(undefined),
    onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
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
    edit: jest.fn().mockResolvedValue(true),
    viewColumn: 1,
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
    getWorkspaceFolder: jest.fn(),
    asRelativePath: jest.fn(),
    onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
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
 * Create a mock vscode module for testing.
 *
 * Provides complete mock of VSCode API with sensible defaults:
 * - window.activeTerminal, activeTextEditor
 * - window.visibleTextEditors
 * - window.setStatusBarMessage (returns Disposable)
 * - window.show*Message methods (return Promise)
 * - window.showTextDocument
 * - window.tabGroups
 * - workspace.openTextDocument
 * - workspace.workspaceFolders
 * - workspace.getWorkspaceFolder
 * - workspace.fs.stat
 * - workspace.asRelativePath
 * - workspace.onDidCloseTextDocument
 * - env.clipboard.writeText
 * - Uri.file, Uri.parse
 * - Position, Selection, Range constructors
 * - TextEditorRevealType enum
 *
 * This mock object can be passed to `new VscodeAdapter(mockVscode)` to create
 * a real VscodeAdapter instance that delegates to mocked VSCode API.
 *
 * Tests can mutate properties like `mockVscode.window.activeTerminal` to simulate
 * IDE state changes.
 *
 * @param overrides - Optional overrides for specific VSCode API properties
 * @returns Mock vscode module compatible with VscodeAdapter constructor
 */
export const createMockVscode = (overrides?: Partial<typeof vscode>): any => {
  const window = createMockWindow();
  const workspace = createMockWorkspace();

  return {
    window,
    workspace,
    env: createMockEnv(),
    Uri: createMockUri(),
    Position: createMockPosition(),
    Selection: createMockSelection(),
    Range: createMockRange(),
    TextEditorRevealType: {
      Default: 0,
      InCenter: 1,
      InCenterIfOutsideViewport: 2,
      AtTop: 3,
    },
    ...overrides,
  };
};

/**
 * Test-only extension of VscodeAdapter that exposes the underlying vscode instance.
 *
 * This allows tests to mutate the mock vscode instance for test scenarios without
 * polluting the production VscodeAdapter class or breaking encapsulation.
 */
export interface VscodeAdapterWithTestHooks extends VscodeAdapter {
  /**
   * Test-only accessor to the underlying vscode instance.
   * Allows tests to mutate mock state (e.g., window.activeTerminal) for test scenarios.
   *
   * Returns `any` to allow property mutation in tests (the actual return is the mock vscode instance).
   */
  __getVscodeInstance(): any;
}

/**
 * Create a mock VscodeAdapter instance for testing.
 *
 * This creates a **real VscodeAdapter instance** backed by a mocked VSCode API,
 * not a mock object. This ensures tests verify actual adapter behavior and
 * maintain type safety with the production VscodeAdapter class.
 *
 * **Test-only feature:** The returned adapter includes `__getVscodeInstance()` for tests
 * to access and mutate the underlying mock vscode instance:
 *
 * ```typescript
 * const adapter = createMockVscodeAdapter();
 * const mockVscode = adapter.__getVscodeInstance();
 *
 * // Simulate terminal becoming active
 * mockVscode.window.activeTerminal = mockTerminal;
 *
 * // Now adapter.activeTerminal returns mockTerminal
 * expect(adapter.activeTerminal).toBe(mockTerminal);
 * ```
 *
 * @param mockVscodeInstance - Optional mock vscode module (creates default if not provided)
 * @returns Real VscodeAdapter instance with test hooks for accessing underlying mock
 */
export const createMockVscodeAdapter = (
  mockVscodeInstance?: typeof vscode,
): VscodeAdapterWithTestHooks => {
  const vscodeInstance = mockVscodeInstance || createMockVscode();
  const adapter = new VscodeAdapter(vscodeInstance) as VscodeAdapterWithTestHooks;

  // Add test-only hook to access the underlying vscode instance
  adapter.__getVscodeInstance = () => vscodeInstance;

  return adapter;
};

/**
 * Create a mock Tab for tab group tests.
 *
 * Provides minimal Tab structure for testing tab group operations.
 * The input property is intentionally simple (just uri) since tests
 * spy on isTextEditorTab() and don't need full TabInputText structure.
 *
 * @param uri - Document URI for the tab
 * @param overrides - Optional property overrides
 * @returns Mock Tab instance
 */
export const createMockTab = (
  uri: vscode.Uri,
  overrides?: Partial<vscode.Tab>,
): vscode.Tab => {
  return {
    input: { uri },
    ...overrides,
  } as unknown as vscode.Tab;
};

/**
 * Create a mock TabGroup for tab group tests.
 *
 * Provides minimal TabGroup structure for testing tab operations.
 * By default, creates a group with a single tab that is also the active tab.
 *
 * @param tabs - Array of tabs in the group (defaults to empty array)
 * @param overrides - Optional property overrides (e.g., activeTab)
 * @returns Mock TabGroup instance
 */
export const createMockTabGroup = (
  tabs: vscode.Tab[] = [],
  overrides?: Partial<vscode.TabGroup>,
): vscode.TabGroup => {
  return {
    tabs,
    activeTab: tabs[0], // First tab is active by default
    ...overrides,
  } as unknown as vscode.TabGroup;
};

/**
 * Configure workspace mocks for typical file editor tests.
 *
 * Sets up common workspace API mocks including:
 * - getWorkspaceFolder: Returns mock workspace folder for given document
 * - asRelativePath: Returns relative path for display
 * - openTextDocument: Returns document with URI
 * - visibleTextEditors: Empty array by default
 * - tabGroups: Empty tab groups structure
 *
 * This centralizes the repetitive workspace mock configuration found in many tests.
 *
 * @param mockVscode - The mocked vscode instance (from adapter.__getVscodeInstance())
 * @param options - Configuration options
 * @param options.workspacePath - Workspace root path (default: '/workspace')
 * @param options.relativePath - Relative path for document (default: 'src/file.ts')
 * @param options.visibleEditors - Array of visible editors (default: [])
 */
export const configureWorkspaceMocks = (
  mockVscode: any,
  options: {
    workspacePath?: string;
    relativePath?: string;
    visibleEditors?: vscode.TextEditor[];
  } = {},
): void => {
  const {
    workspacePath = '/workspace',
    relativePath = 'src/file.ts',
    visibleEditors = [],
  } = options;

  // Mock workspace folder lookup
  (mockVscode.workspace.getWorkspaceFolder as jest.Mock) = jest.fn().mockReturnValue({
    uri: { fsPath: workspacePath },
  });

  // Mock relative path conversion
  (mockVscode.workspace.asRelativePath as jest.Mock) = jest.fn().mockReturnValue(relativePath);

  // Mock document opening
  (mockVscode.workspace.openTextDocument as jest.Mock) = jest
    .fn()
    .mockImplementation((uri: vscode.Uri) => Promise.resolve({ uri }));

  // Set visible editors
  mockVscode.window.visibleTextEditors = visibleEditors;

  // Initialize empty tab groups structure
  mockVscode.window.tabGroups = {
    all: [],
    activeTabGroup: undefined,
    onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
    close: jest.fn(),
  } as unknown as vscode.TabGroups;
};

/**
 * Simulate a closed editor by clearing all editors and tab groups.
 *
 * Useful for testing scenarios where an editor has been closed:
 * - Empty visibleTextEditors array
 * - Empty tab groups
 *
 * @param mockVscode - The mocked vscode instance (from adapter.__getVscodeInstance())
 */
export const simulateClosedEditor = (mockVscode: any): void => {
  mockVscode.window.visibleTextEditors = [];
  mockVscode.window.tabGroups = {
    all: [],
    activeTabGroup: undefined,
    onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
    close: jest.fn(),
  } as unknown as vscode.TabGroups;
};

/**
 * Configure workspace to simulate a file outside any workspace folder.
 *
 * Sets getWorkspaceFolder to return undefined, indicating the file
 * is not within any workspace. Useful for testing edge cases like
 * standalone files or files from external locations.
 *
 * @param mockVscode - The mocked vscode instance (from adapter.__getVscodeInstance())
 */
export const simulateFileOutsideWorkspace = (mockVscode: any): void => {
  (mockVscode.workspace.getWorkspaceFolder as jest.Mock) = jest.fn().mockReturnValue(undefined);
};
