/**
 * Create a mock vscode.extensions object for testing
 */

import * as vscode from 'vscode';

/**
 * Mock vscode.extensions object for extension detection tests.
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
