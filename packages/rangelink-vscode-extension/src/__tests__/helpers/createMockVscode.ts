/**
 * ============================================================================
 * WARNING: THIS IS A LOW-LEVEL TESTING UTILITY - DO NOT USE DIRECTLY
 * ============================================================================
 *
 * This function creates raw mock vscode instances and is intended for:
 *
 * 1. VscodeAdapter.test.ts - Tests VscodeAdapter directly using the constructor
 * 2. createMockVscodeAdapter.ts - The helper that wraps this for other tests
 *
 * FOR ALL OTHER TESTS: Use createMockVscodeAdapter() instead!
 *
 * The createMockVscodeAdapter() helper provides:
 * - A real VscodeAdapter instance backed by mocks
 * - Test hooks like __getVscodeInstance() for state mutation
 * - Proper encapsulation of the mock vscode internals
 *
 * @see createMockVscodeAdapter.ts
 * ============================================================================
 */

import * as vscode from 'vscode';

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
 * WARNING: This is a low-level utility. See file header for usage guidance.
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
 * @param options - Optional configuration
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
    extensions: createMockExtensions(options?.extensionsOptions),
    commands: createMockCommands(options?.commandsOptions),
    languages: createMockLanguages(),
    Uri: createMockUri(),
    Position: jest.fn((line: number, character: number) => ({ line, character })),
    Selection: jest.fn((anchor: vscode.Position, active: vscode.Position) => ({ anchor, active })),
    Range: jest.fn((start: vscode.Position, end: vscode.Position) => ({ start, end })),
    DocumentLink: createMockDocumentLink(),
    TabInputText: MockTabInputText,
    ...overrides,
  };
};
