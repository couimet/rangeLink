/**
 * Create a mock TextEditor for testing
 */

import * as vscode from 'vscode';

import { createMockDocument } from './createMockDocument';

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
export const createMockEditor = (overrides?: Partial<vscode.TextEditor>): vscode.TextEditor => {
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
