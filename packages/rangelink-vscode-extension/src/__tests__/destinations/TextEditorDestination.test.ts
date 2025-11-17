import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

// Mock utility functions
jest.mock('../../utils/isEligibleForPaste');
jest.mock('../../utils/applySmartPadding');

import { TextEditorDestination } from '../../destinations/TextEditorDestination';
import { applySmartPadding } from '../../utils/applySmartPadding';
import { isEligibleForPaste } from '../../utils/isEligibleForPaste';
import { createMockFormattedLink } from '../helpers/destinationTestHelpers';
import {
  configureWorkspaceMocks,
  createMockDocument,
  createMockEditor,
  createMockTab,
  createMockTabGroup,
  createMockUriInstance,
  createMockVscodeAdapter,
  simulateClosedEditor,
  simulateFileOutsideWorkspace,
  type VscodeAdapterWithTestHooks,
} from '../helpers/mockVSCode';

describe('TextEditorDestination', () => {
  let destination: TextEditorDestination;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let mockEditor: vscode.TextEditor;

  beforeEach(() => {
    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock text editor using helper
    const mockUri = createMockUriInstance('/workspace/src/file.ts');
    const mockDocument = createMockDocument('const x = 42;', mockUri, {
      isClosed: false,
      isUntitled: false,
    });
    mockEditor = createMockEditor({
      document: mockDocument,
      selection: {
        active: { line: 10, character: 5 },
      } as any,
    });

    // Create adapter and configure workspace mocks
    mockAdapter = createMockVscodeAdapter();
    configureWorkspaceMocks(mockAdapter.__getVscodeInstance(), {
      workspacePath: '/workspace',
      relativePath: 'src/file.ts',
    });

    destination = new TextEditorDestination(mockAdapter, mockLogger);
  });

  describe('Interface compliance', () => {
    it('should implement PasteDestination interface', () => {
      expect(destination.id).toBe('text-editor');
      expect(destination.displayName).toBe('Text Editor');
      expect(typeof destination.pasteLink).toBe('function');
      expect(typeof destination.isEligibleForPasteLink).toBe('function');
      expect(typeof destination.getUserInstruction).toBe('function');
    });
  });
});
