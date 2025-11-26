/**
 * Create a mock vscode.extensions object for testing
 */

import * as vscode from 'vscode';

/**
 * Configuration for a mock extension.
 * Supports both string shorthand (active extension) and detailed config.
 */
export type MockExtensionConfig =
  | string  // Shorthand: extension ID (defaults to isActive: true)
  | {
      id: string;
      isActive?: boolean;
      extensionUri?: vscode.Uri;
      extensionPath?: string;
      packageJSON?: any;
      exports?: any;
    };

/**
 * Normalize extension config to full object format.
 */
const normalizeExtensionConfig = (config: MockExtensionConfig): vscode.Extension<unknown> => {
  if (typeof config === 'string') {
    return {
      id: config,
      isActive: true,
      exports: undefined,
      extensionUri: { fsPath: `/mock/path/${config}` } as vscode.Uri,
      extensionPath: `/mock/path/${config}`,
      packageJSON: {},
      activate: jest.fn(),
      extensionKind: 1,
    } as unknown as vscode.Extension<unknown>;
  }

  return {
    id: config.id,
    isActive: config.isActive ?? true,
    exports: config.exports ?? undefined,
    extensionUri: config.extensionUri ?? ({ fsPath: `/mock/path/${config.id}` } as vscode.Uri),
    extensionPath: config.extensionPath ?? `/mock/path/${config.id}`,
    packageJSON: config.packageJSON ?? {},
    activate: jest.fn(),
    extensionKind: 1,
  } as unknown as vscode.Extension<unknown>;
};

/**
 * Mock vscode.extensions object for extension detection tests.
 *
 * @param extensions - Array of extension configs (string IDs or detailed objects)
 * @returns Mock extensions object
 */
export const createMockExtensions = (
  extensions: MockExtensionConfig[] = [],
): typeof vscode.extensions => {
  const mockExtensions = extensions.map(normalizeExtensionConfig);

  return {
    all: mockExtensions,
    getExtension: jest.fn((id: string) => {
      return mockExtensions.find((ext) => ext.id === id);
    }),
  } as unknown as typeof vscode.extensions;
};
