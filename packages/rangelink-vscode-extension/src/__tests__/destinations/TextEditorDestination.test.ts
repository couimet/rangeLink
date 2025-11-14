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
    it('should have correct id', () => {
      expect(destination.id).toBe('text-editor');
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe('Text Editor');
    });
  });

  describe('isAvailable()', () => {
    it('should return false when no editor bound', async () => {
      expect(await destination.isAvailable()).toBe(false);
    });

    it('should return true when editor is bound', async () => {
      destination.setEditor(mockEditor);
      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false after editor is unbound', async () => {
      destination.setEditor(mockEditor);
      destination.setEditor(undefined);
      expect(await destination.isAvailable()).toBe(false);
    });
  });

  describe('paste()', () => {
    let mockTabGroup: vscode.TabGroup;
    let mockTab: vscode.Tab;

    beforeEach(() => {
      destination.setEditor(mockEditor);

      // Create mock tab and tab group using helpers
      mockTab = createMockTab(mockEditor.document.uri);
      mockTabGroup = createMockTabGroup([mockTab]);

      // Spy on adapter methods (respecting abstraction layer)
      jest.spyOn(mockAdapter, 'findTabGroupForDocument').mockReturnValue(mockTabGroup);
      jest.spyOn(mockAdapter, 'isTextEditorTab').mockReturnValue(true);

      // Mock visibleTextEditors to include the bound editor
      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [mockEditor];

      // Mock showTextDocument to resolve successfully
      (mockAdapter.__getVscodeInstance().window.showTextDocument as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockEditor);

      // Mock utility functions
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);
      (applySmartPadding as jest.Mock).mockImplementation((text: string) => ` ${text} `);
    });

    it('should paste text at cursor position', async () => {
      const text = 'src/auth.ts#L10-L20';
      const result = await destination.pasteLink(createMockFormattedLink(text));

      expect(result).toBe(true);
      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should return true on successful paste', async () => {
      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L1'));

      expect(result).toBe(true);
    });

    it('should return false when no editor bound', async () => {
      destination.setEditor(undefined);

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L1'));

      expect(result).toBe(false);
    });

    it('should return false when text is empty', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);

      const result = await destination.pasteLink(createMockFormattedLink(''));

      expect(result).toBe(false);
    });

    it('should return false when text is whitespace only', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);

      const result = await destination.pasteLink(createMockFormattedLink('   '));

      expect(result).toBe(false);
    });

    it('should return false when editor is closed', async () => {
      const closedEditor = {
        ...mockEditor,
        document: {
          ...mockEditor.document,
          isClosed: true,
        },
      } as unknown as vscode.TextEditor;

      destination.setEditor(closedEditor);

      // Simulate closed editor: no longer in tab groups or visibleTextEditors
      simulateClosedEditor(mockAdapter.__getVscodeInstance());

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L1'));

      expect(result).toBe(false);
    });

    it('should return false when edit operation fails', async () => {
      (mockEditor.edit as jest.Mock).mockResolvedValue(false);

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L1'));

      expect(result).toBe(false);
    });

    it('should handle edit operation errors', async () => {
      (mockEditor.edit as jest.Mock).mockRejectedValue(new Error('Edit failed'));

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L1'));

      expect(result).toBe(false);
    });

    it('should focus editor after successful paste', async () => {
      const text = 'src/auth.ts#L10-L20';
      const result = await destination.pasteLink(createMockFormattedLink(text));

      expect(result).toBe(true);
      // VscodeAdapter.showTextDocument() calls workspace.openTextDocument() first,
      // then passes the document (not URI) to window.showTextDocument()
      expect(mockAdapter.__getVscodeInstance().window.showTextDocument).toHaveBeenCalledWith(
        { uri: mockEditor.document.uri },
        {
          preserveFocus: false,
          viewColumn: mockEditor.viewColumn,
        },
      );
    });

    it('should not focus editor when edit fails', async () => {
      (mockEditor.edit as jest.Mock).mockResolvedValue(false);

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L1'));

      expect(result).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showTextDocument).not.toHaveBeenCalled();
    });

    it('should not focus editor when paste validation fails', async () => {
      destination.setEditor(undefined);

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L1'));

      expect(result).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showTextDocument).not.toHaveBeenCalled();
    });
  });

  describe('setEditor()', () => {
    it('should set bound document URI', () => {
      destination.setEditor(mockEditor);

      expect(destination.getBoundDocumentUri()).toBe(mockEditor.document.uri);
    });

    it('should clear bound document URI when undefined', () => {
      destination.setEditor(mockEditor);
      destination.setEditor(undefined);

      expect(destination.getBoundDocumentUri()).toBeUndefined();
    });

    it('should log when editor is bound', () => {
      destination.setEditor(mockEditor);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.setEditor',
          editorDisplayName: 'src/file.ts',
          editorPath: mockEditor.document.uri.toString(),
        },
        'Text editor bound: src/file.ts',
      );
    });

    it('should log when editor is cleared', () => {
      destination.setEditor(undefined);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'TextEditorDestination.setEditor',
        },
        'Text editor unbound',
      );
    });
  });

  describe('getEditorDisplayName()', () => {
    it('should return workspace-relative path for file in workspace', () => {
      destination.setEditor(mockEditor);

      expect(destination.getEditorDisplayName()).toBe('src/file.ts');
    });

    it('should return Untitled-N for untitled files', () => {
      const untitledEditor = {
        ...mockEditor,
        document: {
          ...mockEditor.document,
          uri: {
            scheme: 'untitled',
            path: '/1',
            fsPath: '',
            toString: () => 'untitled:Untitled-1',
          },
          isUntitled: true,
        },
      } as unknown as vscode.TextEditor;

      destination.setEditor(untitledEditor);

      expect(destination.getEditorDisplayName()).toBe('Untitled-1');
    });

    it('should return filename for file outside workspace', () => {
      // Simulate file outside workspace
      simulateFileOutsideWorkspace(mockAdapter.__getVscodeInstance());

      const outsideEditor = {
        ...mockEditor,
        document: {
          ...mockEditor.document,
          uri: {
            ...mockEditor.document.uri,
            fsPath: '/outside/workspace/file.ts',
          },
        },
      } as unknown as vscode.TextEditor;

      destination.setEditor(outsideEditor);

      expect(destination.getEditorDisplayName()).toBe('file.ts');
    });

    it('should return undefined when no editor bound', () => {
      expect(destination.getEditorDisplayName()).toBeUndefined();
    });
  });

  describe('getEditorPath()', () => {
    it('should return absolute URI for bound editor', () => {
      destination.setEditor(mockEditor);

      expect(destination.getEditorPath()).toBe('file:///workspace/src/file.ts');
    });

    it('should return undefined when no editor bound', () => {
      expect(destination.getEditorPath()).toBeUndefined();
    });
  });

  describe('isTextLikeFile()', () => {
    it('should return true for file:// scheme with text extension', () => {
      const result = TextEditorDestination.isTextLikeFile(mockEditor);

      expect(result).toBe(true);
    });

    it('should return true for untitled:// scheme', () => {
      const untitledEditor = {
        ...mockEditor,
        document: {
          ...mockEditor.document,
          uri: {
            scheme: 'untitled',
            path: '/1',
            fsPath: '',
          },
        },
      } as unknown as vscode.TextEditor;

      const result = TextEditorDestination.isTextLikeFile(untitledEditor);

      expect(result).toBe(true);
    });

    it('should return false for binary file extensions', () => {
      const binaryExtensions = ['.png', '.pdf', '.zip', '.exe'];

      binaryExtensions.forEach((ext) => {
        const binaryEditor = {
          ...mockEditor,
          document: {
            ...mockEditor.document,
            uri: {
              ...mockEditor.document.uri,
              fsPath: `/workspace/file${ext}`,
            },
          },
        } as unknown as vscode.TextEditor;

        const result = TextEditorDestination.isTextLikeFile(binaryEditor);

        expect(result).toBe(false);
      });
    });

    it('should return false for non-file schemes', () => {
      const schemes = ['output', 'debug', 'git', 'vscode'];

      schemes.forEach((scheme) => {
        const specialEditor = {
          ...mockEditor,
          document: {
            ...mockEditor.document,
            uri: {
              scheme,
              fsPath: '/some/path',
            },
          },
        } as unknown as vscode.TextEditor;

        const result = TextEditorDestination.isTextLikeFile(specialEditor);

        expect(result).toBe(false);
      });
    });

    it('should be case-insensitive for binary extensions', () => {
      const upperCaseEditor = {
        ...mockEditor,
        document: {
          ...mockEditor.document,
          uri: {
            ...mockEditor.document.uri,
            fsPath: '/workspace/IMAGE.PNG',
          },
        },
      } as unknown as vscode.TextEditor;

      const result = TextEditorDestination.isTextLikeFile(upperCaseEditor);

      expect(result).toBe(false);
    });
  });

  describe('getBoundDocumentUri()', () => {
    it('should return bound document URI', () => {
      destination.setEditor(mockEditor);

      expect(destination.getBoundDocumentUri()).toBe(mockEditor.document.uri);
    });

    it('should return undefined when no document bound', () => {
      expect(destination.getBoundDocumentUri()).toBeUndefined();
    });
  });
});
