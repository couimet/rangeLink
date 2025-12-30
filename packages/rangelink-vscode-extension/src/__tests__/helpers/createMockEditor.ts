/**
 * Create a mock TextEditor for testing
 */

import * as vscode from 'vscode';

import { createMockDocument } from './createMockDocument';
import { createMockText } from './createMockText';
import { createMockUri } from './createMockUri';

/**
 * Structured options for creating mock editors with common test scenarios.
 * Use this when you need a quick mock with text content and selections.
 */
export interface MockEditorOptions {
  text?: string;
  isUntitled?: boolean;
  fsPath?: string;
  selectionStart?: { line: number; character: number };
  selectionEnd?: { line: number; character: number };
  isEmpty?: boolean;
}

const DEFAULT_FS_PATH = '/test/file.ts';

const isStructuredOptions = (
  options: MockEditorOptions | Partial<vscode.TextEditor> | undefined,
): options is MockEditorOptions => {
  if (!options) return false;
  const keys = Object.keys(options);
  const structuredKeys = [
    'text',
    'isUntitled',
    'fsPath',
    'selectionStart',
    'selectionEnd',
    'isEmpty',
  ];
  return keys.some((key) => structuredKeys.includes(key));
};

const createEditorFromStructuredOptions = (options: MockEditorOptions): vscode.TextEditor => {
  const {
    text = 'const foo = "bar";',
    isUntitled = false,
    fsPath = DEFAULT_FS_PATH,
    selectionStart = { line: 0, character: 0 },
    selectionEnd = { line: 0, character: 10 },
    isEmpty = false,
  } = options;

  const lines = text.split('\n');

  const document = {
    uri: { fsPath },
    isUntitled,
    lineCount: lines.length,
    getText: jest.fn(() => text),
    lineAt: jest.fn((line: number) => {
      const lineText = lines[line] || '';
      return {
        text: lineText,
        range: {
          end: {
            character: lineText.length,
          },
        },
      };
    }),
  };

  const selections = [
    {
      start: selectionStart,
      end: selectionEnd,
      isEmpty,
      active: selectionStart,
    },
  ];

  return {
    document,
    selections,
    selection: selections[0],
    revealRange: jest.fn(),
    edit: jest.fn().mockResolvedValue(true),
    viewColumn: 1,
  } as unknown as vscode.TextEditor;
};

/**
 * Create a mock TextEditor with sensible defaults.
 *
 * Supports two usage patterns:
 *
 * **Pattern 1: Structured options (recommended for most tests)**
 * ```typescript
 * createMockEditor({
 *   text: 'const x = 1;',
 *   fsPath: '/project/src/file.ts',
 *   selectionStart: { line: 0, character: 0 },
 *   selectionEnd: { line: 0, character: 5 },
 * });
 * ```
 *
 * **Pattern 2: Direct overrides (for specialized mocks)**
 * ```typescript
 * createMockEditor({
 *   document: createMockDocument({ ... }),
 *   selections: [...],
 * });
 * ```
 *
 * @param options - Structured options OR direct property overrides
 * @returns Mock TextEditor
 */
export const createMockEditor = (
  options?: MockEditorOptions | Partial<vscode.TextEditor>,
): vscode.TextEditor => {
  if (isStructuredOptions(options)) {
    return createEditorFromStructuredOptions(options);
  }

  const defaultDocument = createMockDocument({
    getText: createMockText('const x = 42; // Sample line content'),
    uri: createMockUri(DEFAULT_FS_PATH),
  });

  const baseEditor = {
    document: defaultDocument,
    selection: null as unknown as vscode.Selection,
    selections: [] as vscode.Selection[],
    revealRange: jest.fn(),
    edit: jest.fn().mockResolvedValue(true),
    viewColumn: 1,
  };

  return {
    ...baseEditor,
    ...options,
  } as unknown as vscode.TextEditor;
};
