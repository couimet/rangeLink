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
import { createMockUri } from './createMockUri';
import { createMockWindow } from './createMockWindow';
import { createMockWorkspace } from './createMockWorkspace';
import { MockTabInputText } from './tabTestHelpers';

/**
 * Options for creating mock vscode instances.
 */
export interface MockVscodeOptions {
  /** Environment overrides - accepts either a config object or a partial vscode.Env */
  envOptions?: Record<string, unknown> | Partial<typeof vscode.env>;
  /** Window overrides - accepts either a config object or a partial vscode.Window */
  windowOptions?: Record<string, unknown> | Partial<typeof vscode.window>;
  /** Workspace overrides - accepts either a config object or a partial vscode.Workspace */
  workspaceOptions?: Record<string, unknown> | Partial<typeof vscode.workspace>;
}

/**
 * Create a mock vscode module for testing.
 *
 * **Internal function** - Use `createMockVscodeAdapter()` instead for all tests.
 * This function is an implementation detail and should not be exported.
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
 *
 * This mock object is passed to `new VscodeAdapter(mockVscode)` internally
 * by `createMockVscodeAdapter()` to create real VscodeAdapter instances.
 *
 * @param options - Optional configuration for environment overrides (envOptions)
 * @param overrides - Optional VSCode API property overrides (spread last for flexibility)
 * @returns Mock vscode module compatible with VscodeAdapter constructor
 */
const createMockVscode = (options?: MockVscodeOptions, overrides?: Partial<typeof vscode>): any => {
  return {
    window: createMockWindow(options?.windowOptions),
    workspace: createMockWorkspace(options?.workspaceOptions),
    env: createMockEnv(options?.envOptions),
    extensions: createMockExtensions(),
    commands: createMockCommands(),
    Uri: createMockUri(),
    // Constructor mocks - return jest.fn() that creates instances
    Position: jest.fn((line: number, character: number) => ({ line, character })),
    Selection: jest.fn((anchor: vscode.Position, active: vscode.Position) => ({ anchor, active })),
    Range: jest.fn((start: vscode.Position, end: vscode.Position) => ({ start, end })),
    DocumentLink: createMockDocumentLink(),
    TabInputText: MockTabInputText,
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
   *
   * **Use only for mutating vscode state** (e.g., `mockVscode.window.activeTextEditor = undefined`).
   * VscodeAdapter properties are readonly, so use this to simulate IDE state changes.
   *
   * **Don't use for spying** - spy on adapter methods directly:
   * ```typescript
   * jest.spyOn(adapter, 'writeTextToClipboard'); // ✅ Correct
   * ```
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
 * **Test-only feature:** The returned adapter includes `__getVscodeInstance()` for
 * mutating underlying vscode state (readonly properties):
 *
 * ```typescript
 * const adapter = createMockVscodeAdapter();
 *
 * // ✅ Spy on adapter methods directly (no __getVscodeInstance needed)
 * jest.spyOn(adapter, 'writeTextToClipboard');
 * jest.spyOn(adapter, 'showErrorMessage');
 *
 * // ✅ Mutate vscode state via __getVscodeInstance() (properties are readonly)
 * const mockVscode = adapter.__getVscodeInstance();
 * mockVscode.window.activeTextEditor = undefined; // Simulate no editor
 * mockVscode.window.activeTerminal = mockTerminal; // Simulate active terminal
 *
 * // Now adapter.activeTerminal returns mockTerminal
 * expect(adapter.activeTerminal).toBe(mockTerminal);
 * ```
 *
 * **Common options:** Configure adapter state for specific test scenarios:
 *
 * ```typescript
 * // Configure active editor and workspace paths
 * const adapter = createMockVscodeAdapter({
 *   windowOptions: { activeTextEditor: mockEditor },
 *   workspaceOptions: {
 *     getWorkspaceFolder: createMockGetWorkspaceFolder('/workspace'),
 *     asRelativePath: createMockAsRelativePath('src/file.ts'),
 *   },
 * });
 *
 * // Simulate Cursor IDE
 * const adapter = createMockVscodeAdapter({
 *   envOptions: { appName: 'Cursor', uriScheme: 'cursor' },
 * });
 * ```
 *
 * @param options - Optional configuration for environment and VSCode API overrides
 * @returns Real VscodeAdapter instance with test hooks for accessing underlying mock
 */
export const createMockVscodeAdapter = (
  options?: MockVscodeOptions,
): VscodeAdapterWithTestHooks => {
  const vscodeInstance = createMockVscode(options);
  const adapter = new VscodeAdapter(vscodeInstance) as VscodeAdapterWithTestHooks;

  // Add test-only hook to access the underlying vscode instance
  adapter.__getVscodeInstance = () => vscodeInstance;

  return adapter;
};
