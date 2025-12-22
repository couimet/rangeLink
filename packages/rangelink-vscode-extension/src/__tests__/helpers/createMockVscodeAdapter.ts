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

import {
  createMockCommands,
  type MockCommands,
  type MockCommandsOverrides,
} from './createMockCommands';
import { createMockDocumentLink } from './createMockDocumentLink';
import { createMockEnv, type MockEnvOptions } from './createMockEnv';
import { createMockExtensions, type MockExtensionConfig } from './createMockExtensions';
import { createMockLanguages } from './createMockLanguages';
import { createMockUri } from './createMockUri';
import { createMockWindow } from './createMockWindow';
import { createMockWorkspace } from './createMockWorkspace';
import { MockTabInputText } from './tabTestHelpers';

/**
 * Options for creating mock vscode instances.
 */
export interface MockVscodeOptions {
  /** Commands configuration - accepts MockCommands object or overrides */
  commandsOptions?: MockCommands | MockCommandsOverrides;
  /** Environment overrides for appName, uriScheme, clipboard, etc.. */
  envOptions?: MockEnvOptions;
  /** Window overrides - accepts either a config object or a partial vscode.Window */
  windowOptions?: Record<string, unknown> | Partial<typeof vscode.window>;
  /** Workspace overrides - accepts either a config object or a partial vscode.Workspace */
  workspaceOptions?: Record<string, unknown> | Partial<typeof vscode.workspace>;
  /** Extensions to mock - array of extension IDs (shorthand) or detailed configs */
  extensionsOptions?: MockExtensionConfig[];
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
 * - extensions.all, extensions.getExtension
 * - Uri.file, Uri.parse
 * - Position, Selection, Range constructors
 * - DocumentLink constructor
 *
 * This mock object is passed to `new VscodeAdapter(mockVscode)` internally
 * by `createMockVscodeAdapter()` to create real VscodeAdapter instances.
 *
 * @param options - Optional configuration
 * @param overrides - Optional VSCode API property overrides (spread last for flexibility)
 * @returns Mock vscode module compatible with VscodeAdapter constructor
 */
const createMockVscode = (options?: MockVscodeOptions, overrides?: Partial<typeof vscode>): any => {
  return {
    window: createMockWindow(options?.windowOptions),
    workspace: createMockWorkspace(options?.workspaceOptions),
    env: createMockEnv(options?.envOptions),
    extensions: createMockExtensions(options?.extensionsOptions),
    commands: createMockCommands(options?.commandsOptions),
    languages: createMockLanguages(),
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
   * Use only for mutating vscode state (e.g., setting activeTextEditor to undefined).
   * VscodeAdapter properties are readonly, so use this to simulate IDE state changes.
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
