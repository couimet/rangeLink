/**
 * Create a mock vscode.extensions object for testing
 */

import * as vscode from 'vscode';

import { createMockExtension, type MockExtensionOptions } from './createMockExtension';

/**
 * Configuration for a mock extension.
 * Supports both string shorthand (active extension) and detailed config.
 */
export type MockExtensionConfig =
  | string  // Shorthand: extension ID (defaults to isActive: true)
  | MockExtensionOptions;  // Detailed config via createMockExtension options

/**
 * Normalize extension config to full object format.
 */
const normalizeExtensionConfig = (config: MockExtensionConfig): vscode.Extension<unknown> => {
  if (typeof config === 'string') {
    return createMockExtension({ id: config });
  }

  return createMockExtension(config);
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
