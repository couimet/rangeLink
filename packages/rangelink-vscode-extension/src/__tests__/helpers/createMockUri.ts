/**
 * Create a mock Uri namespace or Uri instance for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock Uri namespace or Uri instance.
 *
 * **Two modes:**
 * - **Namespace mode** (no args or namespace overrides): Returns `{ file, parse }` for mocking vscode.Uri
 * - **Instance mode** (fsPath string): Returns a Uri instance for actual Uri objects
 */

// Instance mode: string fsPath returns Uri instance
export function createMockUri(
  fsPath: string,
  instanceOverrides?: Partial<vscode.Uri>,
): vscode.Uri;

// Namespace mode: namespace overrides or no args returns Uri namespace
export function createMockUri(
  namespaceOverrides?: { file?: jest.Mock; parse?: jest.Mock },
): { file: jest.Mock; parse: jest.Mock };

// Implementation
export function createMockUri(
  fsPathOrOverrides?: string | { file?: jest.Mock; parse?: jest.Mock },
  instanceOverrides?: Partial<vscode.Uri>,
): vscode.Uri | { file: jest.Mock; parse: jest.Mock } {
  // Simple check: if first arg is string, it's instance mode
  if (typeof fsPathOrOverrides === 'string') {
    // Instance mode - create a Uri instance
    const fsPath = fsPathOrOverrides;
    return {
      fsPath,
      scheme: 'file',
      path: fsPath,
      toString: () => `file://${fsPath}`,
      ...instanceOverrides,
    } as vscode.Uri;
  }

  // Namespace mode - create Uri namespace with file/parse methods
  const namespaceOverrides = fsPathOrOverrides;
  return {
    file:
      namespaceOverrides?.file ||
      jest.fn((fsPath: string) => ({
        fsPath,
        scheme: 'file',
        path: fsPath,
        toString: () => `file://${fsPath}`,
      })),
    parse:
      namespaceOverrides?.parse ||
      jest.fn((str: string) => ({
        scheme: str.startsWith('file:') ? 'file' : 'command',
        path: str,
        toString: () => str,
        fsPath: str.replace(/^file:\/\//, ''),
      })),
  };
}
