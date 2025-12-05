/**
 * Create a mock vscode.Extension object for testing
 */

import * as vscode from 'vscode';

import { createMockUri } from './createMockUri';

/**
 * Options for creating a mock extension.
 * All fields are optional - reasonable defaults will be provided.
 */
export interface MockExtensionOptions {
  /** Extension ID (e.g., 'anthropic.claude-code') */
  id?: string;
  /** Whether extension is active (default: true) */
  isActive?: boolean;
  /** Extension URI (default: auto-generated from id) */
  extensionUri?: vscode.Uri;
  /** Extension file path (default: auto-generated from id) */
  extensionPath?: string;
  /** Package.json contents (default: {}) */
  packageJSON?: any;
  /** Extension exports (default: undefined) */
  exports?: any;
}

/**
 * Create a mock vscode.Extension object with sensible defaults.
 *
 * Provides a consistent way to create mock extensions across all tests.
 * All options are optional - defaults will be provided.
 *
 * @param options - Optional configuration for the mock extension
 * @returns Mock vscode.Extension<unknown> object
 */
export const createMockExtension = (
  options: MockExtensionOptions = {},
): vscode.Extension<unknown> => {
  const id = options.id ?? 'test.extension';
  const defaultPath = `/mock/path/${id}`;

  return {
    id,
    isActive: options.isActive ?? true,
    exports: options.exports ?? undefined,
    extensionUri: options.extensionUri ?? createMockUri(defaultPath),
    extensionPath: options.extensionPath ?? defaultPath,
    packageJSON: options.packageJSON ?? {},
    activate: jest.fn(),
    extensionKind: 1,
  } as unknown as vscode.Extension<unknown>;
};
