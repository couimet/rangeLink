import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

// Mock utility functions
jest.mock('../../utils/isEligibleForPaste');
jest.mock('../../utils/applySmartPadding');

import { TextEditorDestination } from '../../destinations/TextEditorDestination';
import { applySmartPadding } from '../../utils/applySmartPadding';
import { isEligibleForPaste } from '../../utils/isEligibleForPaste';
import { configureEmptyTabGroups } from '../helpers/configureEmptyTabGroups';
import { configureWorkspaceMocks } from '../helpers/configureWorkspaceMocks';
import { createMockDocument } from '../helpers/createMockDocument';
import { createMockEditor } from '../helpers/createMockEditor';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';
import { createMockTab } from '../helpers/createMockTab';
import { createMockTabGroup } from '../helpers/createMockTabGroup';
import { createMockTabGroups } from '../helpers/createMockTabGroups';
import { createMockText } from '../helpers/createMockText';
import { createMockUri } from '../helpers/createMockUri';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';
import { simulateClosedEditor } from '../helpers/simulateClosedEditor';
import { simulateFileOutsideWorkspace } from '../helpers/simulateFileOutsideWorkspace';

describe('TextEditorDestination', () => {
  let destination: TextEditorDestination;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let mockEditor: vscode.TextEditor;

  beforeEach(() => {
    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock text editor using helper
    const mockUri = createMockUri('/workspace/src/file.ts');
    const mockDocument = createMockDocument({
      getText: createMockText('const x = 42;'),
      uri: mockUri,
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

    destination = new TextEditorDestination(mockEditor, mockAdapter, mockLogger);
  });

  describe('Interface compliance', () => {
    it('should have correct id', () => {
      expect(destination.id).toBe('text-editor');
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe('Text Editor ("src/file.ts")');
    });
  });

  describe('pasteContent()', () => {
    beforeEach(() => {
      // Mock tab groups - bound document only in second tab group
      const otherUri = createMockUri('/workspace/other.ts');
      const mockVscode = mockAdapter.__getVscodeInstance();

      mockVscode.window.tabGroups = createMockTabGroups({
        all: [
          createMockTabGroup([createMockTab(otherUri)], {
            activeTab: createMockTab(otherUri),
          }),
          createMockTabGroup([createMockTab(mockEditor.document.uri)], {
            activeTab: createMockTab(mockEditor.document.uri),
          }),
        ],
      });

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

    it('should return false when bound document not found in any tab group', async () => {
      // Empty tab groups - document not found
      const mockVscode = mockAdapter.__getVscodeInstance();
      configureEmptyTabGroups(mockVscode.window, 0);

      const result = await destination.pasteContent('text');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: 4,
          boundDocumentUri: mockEditor.document.uri.toString(),
          editorName: 'src/file.ts',
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
          editorName: 'src/file.ts',
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
          editorName: 'src/file.ts',
          tabInputType: 'object',
        },
        'Active tab is not a text editor',
      );
    });

    it('should return false when bound document not topmost in group', async () => {
      // Make a different document topmost
      const differentUri = createMockUri('/workspace/other.ts');
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
          editorName: 'src/file.ts',
        },
        'Bound document is not topmost in its tab group',
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

    it('should focus editor with correct URI and options after successful paste', async () => {
      const showTextDocumentSpy = jest.spyOn(mockAdapter, 'showTextDocument');

      await destination.pasteContent('text');

      expect(showTextDocumentSpy).toHaveBeenCalledWith(mockEditor.document.uri, {
        preserveFocus: false,
        viewColumn: mockEditor.viewColumn,
      });
      expect(showTextDocumentSpy).toHaveBeenCalledTimes(1);
    });

    it('should log success with editor name and content length', async () => {
      const testContent = 'selected text';
      (applySmartPadding as jest.Mock).mockReturnValue(' selected text ');

      await destination.pasteContent(testContent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.pasteContent',
          contentLength: testContent.length,
          editorName: 'src/file.ts',
          editorPath: mockEditor.document.uri.toString(),
          originalLength: testContent.length,
          paddedLength: testContent.length + 2,
        },
        'Pasted content to text editor',
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
          editorName: 'src/file.ts',
          editorPath: mockEditor.document.uri.toString(),
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
          editorName: 'src/file.ts',
          editorPath: mockEditor.document.uri.toString(),
          error: testError,
        },
        'Exception during paste operation',
      );
    });
  });

  describe('resourceName getter', () => {
    it('should return raw editor name from bound editor', () => {
      expect(destination.resourceName).toBe('src/file.ts');
    });

    it('should call getDocumentUri with the bound editor', () => {
      const spy = jest.spyOn(mockAdapter, 'getDocumentUri');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const name = destination.resourceName;

      expect(spy).toHaveBeenCalledWith(mockEditor);
    });
  });

  describe('getLoggingDetails()', () => {
    it('should return editor resource name and path', () => {
      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual({
        editorName: 'src/file.ts',
        editorPath: mockEditor.document.uri.toString(),
      });
    });
  });

  describe('focus()', () => {
    beforeEach(() => {
      // Mock tab groups - bound document in second tab group
      const otherUri = createMockUri('/workspace/other.ts');
      const mockVscode = mockAdapter.__getVscodeInstance();

      mockVscode.window.tabGroups = createMockTabGroups({
        all: [
          createMockTabGroup([createMockTab(otherUri)], {
            activeTab: createMockTab(otherUri),
          }),
          createMockTabGroup([createMockTab(mockEditor.document.uri)], {
            activeTab: createMockTab(mockEditor.document.uri),
          }),
        ],
      });

      // Mock visibleTextEditors to include the bound editor
      jest.spyOn(mockAdapter, 'visibleTextEditors', 'get').mockReturnValue([mockEditor]);

      // Mock showTextDocument to resolve successfully
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
    });

    it('should return true when focus succeeds', async () => {
      const result = await destination.focus();

      expect(result).toBe(true);
    });

    it('should call showTextDocument with correct URI and options', async () => {
      const showTextDocumentSpy = jest.spyOn(mockAdapter, 'showTextDocument');

      await destination.focus();

      expect(showTextDocumentSpy).toHaveBeenCalledWith(mockEditor.document.uri, {
        preserveFocus: false,
        viewColumn: mockEditor.viewColumn,
      });
      expect(showTextDocumentSpy).toHaveBeenCalledTimes(1);
    });

    it('should call getDocumentUri with the bound editor', async () => {
      const spy = jest.spyOn(mockAdapter, 'getDocumentUri');

      await destination.focus();

      expect(spy).toHaveBeenCalledWith(mockEditor);
    });

    it('should log success with editor name', async () => {
      await destination.focus();

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.focus',
          editorName: 'src/file.ts',
          editorPath: mockEditor.document.uri.toString(),
        },
        'Focused text editor',
      );
    });

    it('should return false and log error when showTextDocument throws', async () => {
      const testError = new Error('Focus failed');
      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(testError);

      const result = await destination.focus();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.focus',
          editorName: 'src/file.ts',
          editorPath: mockEditor.document.uri.toString(),
          error: testError,
        },
        'Failed to focus text editor',
      );
    });
  });

  describe('equals()', () => {
    it('should return true when comparing same editor (same URI)', async () => {
      const sameUri = mockEditor.document.uri;
      const sameDocument = createMockDocument({
        getText: createMockText('const x = 42;'),
        uri: sameUri,
        isClosed: false,
        isUntitled: false,
      });
      const sameEditor = createMockEditor({ document: sameDocument });
      const otherDestination = new TextEditorDestination(sameEditor, mockAdapter, mockLogger);

      const result = await destination.equals(otherDestination);

      expect(result).toBe(true);
    });

    it('should call getDocumentUri with both the bound editor and comparison editor', async () => {
      const otherUri = createMockUri('/workspace/other.ts');
      const otherDocument = createMockDocument({ uri: otherUri });
      const otherEditor = createMockEditor({ document: otherDocument });
      const otherDestination = new TextEditorDestination(otherEditor, mockAdapter, mockLogger);

      const spy = jest.spyOn(mockAdapter, 'getDocumentUri');

      await destination.equals(otherDestination);

      // Should pass both editors: the bound editor and the other editor
      expect(spy).toHaveBeenCalledWith(mockEditor);
      expect(spy).toHaveBeenCalledWith(otherEditor);
    });

    it('should return false when comparing different editors (different URI)', async () => {
      const differentUri = createMockUri('/workspace/other.ts');
      const differentDocument = createMockDocument({
        getText: createMockText('const y = 10;'),
        uri: differentUri,
      });
      const differentEditor = createMockEditor({ document: differentDocument });
      const otherDestination = new TextEditorDestination(differentEditor, mockAdapter, mockLogger);

      const result = await destination.equals(otherDestination);

      expect(result).toBe(false);
    });

    it('should return false when comparing with undefined', async () => {
      const result = await destination.equals(undefined);

      expect(result).toBe(false);
    });

    it('should return false when comparing with different destination type', async () => {
      const cursorAIDest = {
        id: 'cursor-ai',
        displayName: 'Cursor AI Assistant',
      } as any;

      const result = await destination.equals(cursorAIDest);

      expect(result).toBe(false);
    });

    it('should return false when other editor is missing document/uri', async () => {
      const brokenEditor = {
        document: null,
      } as any;
      const otherDestination = new TextEditorDestination(brokenEditor, mockAdapter, mockLogger);

      const result = await destination.equals(otherDestination);

      expect(result).toBe(false);
    });

    it('should log warning when other editor is missing document/uri', async () => {
      const brokenEditor = {
        document: null,
      } as any;
      const otherDestination = new TextEditorDestination(brokenEditor, mockAdapter, mockLogger);

      await destination.equals(otherDestination);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'TextEditorDestination.equals' },
        'Other editor destination missing editor/document/uri',
      );
    });
  });

  describe('getJumpSuccessMessage()', () => {
    it('should return formatted message with editor display name', () => {
      const message = destination.getJumpSuccessMessage();

      expect(message).toBe('✓ Focused Editor: "src/file.ts"');
    });

    it('should return formatted message for untitled editor', () => {
      // Create untitled document and editor
      const untitledUri = createMockUri('untitled:Untitled-1');
      const untitledDocument = createMockDocument({
        getText: createMockText(''),
        uri: untitledUri,
        isClosed: false,
        isUntitled: true,
      });
      const untitledEditor = createMockEditor({ document: untitledDocument });

      // Configure workspace mocks to return undefined for untitled files
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.workspace.asRelativePath as jest.Mock).mockReturnValue('Untitled-1');

      // Create new destination with untitled editor
      const untitledDestination = new TextEditorDestination(
        untitledEditor,
        mockAdapter,
        mockLogger,
      );

      const message = untitledDestination.getJumpSuccessMessage();

      expect(message).toBe('✓ Focused Editor: "Untitled-1"');
    });
  });
});
