/**
 * Mock VSCode objects and utilities for testing
 *
 * Provides pre-configured mocks for common VSCode API objects used across
 * destination tests. Reduces boilerplate and ensures consistent test setups.
 *
 * NOTE: Some commonly used utilities have been extracted to separate files for better
 * discoverability. This file serves as a barrel export while keeping complex utilities
 * that depend on multiple other functions.
 */

import * as vscode from 'vscode';

import { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { createMockCommands } from './createMockCommands';
import { createMockDocumentLink } from './createMockDocumentLink';
import { createMockEnv } from './createMockEnv';
import { createMockExtensions } from './createMockExtensions';
import { createMockPosition } from './createMockPosition';
import { createMockRange } from './createMockRange';
import { createMockSelection } from './createMockSelection';
import { createMockUri } from './createMockUri';
import { createMockWindow } from './createMockWindow';
import { createMockWorkspace } from './createMockWorkspace';




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
 * Options for creating mock vscode instances.
 */
export interface MockVscodeOptions {
  /** Environment overrides (appName, uriScheme, or any other env properties) */
  envOptions?: Record<string, unknown>;
  /** Window overrides (event listeners, activeTerminal, etc.) */
  windowOptions?: Record<string, unknown>;
  /** Workspace overrides (event listeners, workspaceFolders, etc.) */
  workspaceOptions?: Record<string, unknown>;
}

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
 * - DocumentLink constructor
 * - TextEditorRevealType enum
 *
 * This mock object can be passed to `new VscodeAdapter(mockVscode)` to create
 * a real VscodeAdapter instance that delegates to mocked VSCode API.
 *
 * Tests can mutate properties like `mockVscode.window.activeTerminal` to simulate
 * IDE state changes.
 *
 * @param options - Optional configuration for environment overrides (envOptions)
 * @param overrides - Optional VSCode API property overrides (spread last for flexibility)
 * @returns Mock vscode module compatible with VscodeAdapter constructor
 */
export const createMockVscode = (
  options?: MockVscodeOptions,
  overrides?: Partial<typeof vscode>,
): any => {
  return {
    window: createMockWindow(options?.windowOptions),
    workspace: createMockWorkspace(options?.workspaceOptions),
    env: createMockEnv(options?.envOptions),
    extensions: createMockExtensions(),
    commands: createMockCommands(),
    Uri: createMockUri(),
    Position: createMockPosition(),
    Selection: createMockSelection(),
    Range: createMockRange(),
    DocumentLink: createMockDocumentLink(),
    TabInputText: MockTabInputText,
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
 * **Environment overrides:** Pass `options` to simulate different IDE environments:
 *
 * ```typescript
 * // Simulate Cursor IDE
 * const adapter = createMockVscodeAdapter(undefined, { envOptions: { appName: 'Cursor' } });
 *
 * // Use existing mock instance with custom env
 * const adapter = createMockVscodeAdapter(existingMock, { envOptions: { uriScheme: 'cursor' } });
 * ```
 *
 * @param mockVscodeInstance - Optional mock vscode module (creates default if not provided)
 * @param options - Optional configuration for environment and VSCode API overrides
 * @returns Real VscodeAdapter instance with test hooks for accessing underlying mock
 */
export const createMockVscodeAdapter = (
  mockVscodeInstance?: typeof vscode,
  options?: MockVscodeOptions,
): VscodeAdapterWithTestHooks => {
  const vscodeInstance = mockVscodeInstance || createMockVscode(options);
  const adapter = new VscodeAdapter(vscodeInstance) as VscodeAdapterWithTestHooks;

  // Add test-only hook to access the underlying vscode instance
  adapter.__getVscodeInstance = () => vscodeInstance;

  return adapter;
};

/**
 * Mock TabInputText class for instanceof checks in VscodeAdapter.
 *
 * Exported so createMockTab can create proper TabInputText instances.
 */
export class MockTabInputText {
  constructor(public uri: vscode.Uri) {}
}

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
  mockVscode.window.tabGroups = createMockTabGroups();
};

/**
 * Create a mock TabGroups structure with optional overrides
 *
 * Provides composable tab groups structure for testing. Can be used directly
 * or through convenience helpers like configureEmptyTabGroups().
 *
 * @param overrides - Optional overrides for TabGroups structure
 * @returns Mock TabGroups object
 */
export const createMockTabGroups = (
  overrides: Partial<vscode.TabGroups> = {},
): vscode.TabGroups => {
  return {
    all: [],
    activeTabGroup: undefined,
    onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
    close: jest.fn(),
    ...overrides,
  } as unknown as vscode.TabGroups;
};

/**
 * Configure empty tab groups for testing
 *
 * Common pattern for testing text editor binding which requires 2+ tab groups (split editor).
 * Creates N empty tab groups with no tabs and no active tab.
 *
 * Replaces manual pattern:
 * `(mockWindow.tabGroups as { all: vscode.TabGroup[] }).all = [{}, {}] as vscode.TabGroup[];`
 *
 * @param mockWindow - The mocked window object (from mockVscode.window or mockAdapter.__getVscodeInstance().window)
 * @param count - Number of empty tab groups to create (default: 2)
 */
export const configureEmptyTabGroups = (mockWindow: any, count = 2): void => {
  const emptyGroups = Array.from({ length: count }, () =>
    createMockTabGroup([], { activeTab: undefined }),
  );
  mockWindow.tabGroups = createMockTabGroups({ all: emptyGroups });
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
