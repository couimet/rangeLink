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

  describe('pasteContent()', () => {
    beforeEach(() => {
      destination.setEditor(mockEditor);

      // Mock tab groups - bound document only in second tab group
      const otherUri = createMockUriInstance('/workspace/other.ts');
      const mockVscode = mockAdapter.__getVscodeInstance();

      mockVscode.window.tabGroups = {
        all: [
          createMockTabGroup([createMockTab(otherUri)], {
            activeTab: createMockTab(otherUri),
          }),
          createMockTabGroup([createMockTab(mockEditor.document.uri)], {
            activeTab: createMockTab(mockEditor.document.uri),
          }),
        ],
      } as any;

      // Mock visibleTextEditors to include the bound editor
      jest.spyOn(mockAdapter, 'visibleTextEditors', 'get').mockReturnValue([mockEditor]);

      // Mock showTextDocument to resolve successfully
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);

      // Mock utility functions
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      (applySmartPadding as jest.Mock).mockImplementation((text: string) => ` ${text} `);
    });

    it('should return false when content is ineligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);

      const result = await destination.pasteContent('');

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 0,
        },
        'Content not eligible for paste',
      );
    });

    it('should return false when no editor bound', async () => {
      destination.setEditor(undefined);

      const result = await destination.pasteContent('some text');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 9,
        },
        'Cannot operate: No text editor bound',
      );
    });

    it('should return false when bound document not found in any tab group', async () => {
      // Empty tab groups - document not found
      const mockVscode = mockAdapter.__getVscodeInstance();
      mockVscode.window.tabGroups = { all: [] } as any;

      const result = await destination.pasteContent('text');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 4,
          boundDocumentUri: mockEditor.document.uri.toString(),
          boundDisplayName: 'src/file.ts',
        },
        'Bound document not found in any tab group - likely closed',
      );
    });

    it('should return false when tab group has no active tab', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      const tabGroups = mockVscode.window.tabGroups as any;
      tabGroups.all[1].activeTab = undefined;

      const result = await destination.pasteContent('text');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 4,
          boundDisplayName: 'src/file.ts',
        },
        'Tab group has no active tab',
      );
    });

    it('should return false when active tab is not a text editor', async () => {
      // Make active tab a non-text editor (e.g., terminal)
      const mockVscode = mockAdapter.__getVscodeInstance();
      const tabGroups = mockVscode.window.tabGroups as any;
      tabGroups.all[1].activeTab = {
        input: {}, // Plain object, not a TabInputText instance
        label: 'Terminal',
        isActive: true,
        isDirty: false,
        isPinned: false,
        isPreview: false,
        group: tabGroups.all[1],
      };

      const result = await destination.pasteContent('text');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 4,
          boundDisplayName: 'src/file.ts',
          tabInputType: 'object',
        },
        'Active tab is not a text editor',
      );
    });

    it('should return false when bound document not topmost in group', async () => {
      // Make a different document topmost
      const differentUri = createMockUriInstance('/workspace/other.ts');
      const mockVscode = mockAdapter.__getVscodeInstance();
      const tabGroups = mockVscode.window.tabGroups as any;
      tabGroups.all[1].activeTab = createMockTab(differentUri, {
        label: 'other.ts',
        isActive: true,
        isDirty: false,
        isPinned: false,
        isPreview: false,
        group: tabGroups.all[1],
      });

      const result = await destination.pasteContent('text');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 4,
          boundDocumentUri: mockEditor.document.uri.toString(),
          activeTabUri: differentUri.toString(),
          boundDisplayName: 'src/file.ts',
        },
        'Bound document is not topmost in its tab group',
      );
    });

    it('should return false when editor object not found in visibleTextEditors', async () => {
      // Editor in tab group but not visible
      jest.spyOn(mockAdapter, 'visibleTextEditors', 'get').mockReturnValue([]);

      const result = await destination.pasteContent('text');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 4,
          boundDocumentUri: mockEditor.document.uri.toString(),
          boundDisplayName: 'src/file.ts',
        },
        'TextEditor object not found in visibleTextEditors',
      );
    });

    it('should return true and insert content when all validations pass', async () => {
      const testContent = 'selected text';
      (applySmartPadding as jest.Mock).mockReturnValue(' selected text ');

      const result = await destination.pasteContent(testContent);

      expect(result).toBe(true);
      expect(mockEditor.edit).toHaveBeenCalled();
      expect(applySmartPadding).toHaveBeenCalledWith(testContent);
    });

    it('should insert padded content at cursor position', async () => {
      const testContent = 'text';
      (applySmartPadding as jest.Mock).mockReturnValue(' text ');
      let capturedEditBuilder: vscode.TextEditorEdit | undefined;

      (mockEditor.edit as jest.Mock).mockImplementation((callback) => {
        const mockEditBuilder = {
          insert: jest.fn(),
        };
        callback(mockEditBuilder);
        capturedEditBuilder = mockEditBuilder as unknown as vscode.TextEditorEdit;
        return Promise.resolve(true);
      });

      await destination.pasteContent(testContent);

      expect(capturedEditBuilder?.insert).toHaveBeenCalledWith(
        mockEditor.selection.active,
        ' text ',
      );
    });

    it('should focus editor after successful paste', async () => {
      const showTextDocumentSpy = jest.spyOn(mockAdapter, 'showTextDocument');

      await destination.pasteContent('text');

      expect(showTextDocumentSpy).toHaveBeenCalledWith(mockEditor.document.uri, {
        preserveFocus: false,
        viewColumn: mockEditor.viewColumn,
      });
    });

    it('should log success with editor name and content length', async () => {
      const testContent = 'selected text';
      (applySmartPadding as jest.Mock).mockReturnValue(' selected text ');

      await destination.pasteContent(testContent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: testContent.length,
          boundDisplayName: 'src/file.ts',
          boundDocumentUri: mockEditor.document.uri.toString(),
          originalLength: testContent.length,
          paddedLength: testContent.length + 2,
        },
        'Pasted content to text editor: src/file.ts',
      );
    });

    it('should return false when edit operation fails', async () => {
      const testContent = 'text';
      (mockEditor.edit as jest.Mock).mockResolvedValue(false);

      const result = await destination.pasteContent(testContent);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          boundDisplayName: 'src/file.ts',
          boundDocumentUri: mockEditor.document.uri.toString(),
          contentLength: testContent.length,
        },
        'Edit operation failed',
      );
    });

    it('should return false and log error when paste throws exception', async () => {
      const testContent = 'text';
      const testError = new Error('Paste failed');
      (mockEditor.edit as jest.Mock).mockRejectedValue(testError);

      const result = await destination.pasteContent(testContent);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 4,
          boundDisplayName: 'src/file.ts',
          boundDocumentUri: mockEditor.document.uri.toString(),
          error: testError,
        },
        'Exception during paste operation',
      );
    });
  });

  describe('getLoggingDetails()', () => {
    beforeEach(() => {
      destination.setEditor(mockEditor);
    });

    it('should return editor display name and path', () => {
      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual({
        editorDisplayName: 'src/file.ts',
        editorPath: mockEditor.document.uri.toString(),
      });
    });

    it('should return undefined values when no editor bound', () => {
      destination.setEditor(undefined);

      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual({
        editorDisplayName: undefined,
        editorPath: undefined,
      });
    });
  });
});
