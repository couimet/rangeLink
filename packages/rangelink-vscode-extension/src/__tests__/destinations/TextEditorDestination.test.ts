import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

// Mock vscode.workspace for text editor tests
jest.mock('vscode', () => {
  // Define MockTabInputText inside the factory function
  class MockTabInputText {
    constructor(public uri: any) {}
  }

  return {
    ...jest.requireActual('vscode'),
    window: {
      ...jest.requireActual('vscode').window,
      tabGroups: {
        all: [],
      },
      visibleTextEditors: [],
      showTextDocument: jest.fn(),
    },
    workspace: {
      getWorkspaceFolder: jest.fn(),
      asRelativePath: jest.fn(),
      onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
    },
    TabInputText: MockTabInputText,
  };
});

import { TextEditorDestination } from '../../destinations/TextEditorDestination';

describe('TextEditorDestination', () => {
  let destination: TextEditorDestination;
  let mockLogger: Logger;
  let mockEditor: vscode.TextEditor;

  beforeEach(() => {
    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock text editor
    mockEditor = {
      document: {
        uri: {
          scheme: 'file',
          fsPath: '/workspace/src/file.ts',
          toString: () => 'file:///workspace/src/file.ts',
        },
        isClosed: false,
        isUntitled: false,
      },
      selection: {
        active: { line: 10, character: 5 },
      },
      edit: jest.fn().mockResolvedValue(true),
    } as unknown as vscode.TextEditor;

    // Mock workspace
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({
      uri: { fsPath: '/workspace' },
    });
    (vscode.workspace.asRelativePath as jest.Mock).mockReturnValue('src/file.ts');

    destination = new TextEditorDestination(mockLogger);
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
    beforeEach(() => {
      destination.setEditor(mockEditor);

      // Mock tab groups to simulate editor being topmost in a tab group
      (vscode.window as any).tabGroups = {
        all: [
          {
            activeTab: {
              input: new vscode.TabInputText(mockEditor.document.uri),
            },
            tabs: [
              {
                input: new vscode.TabInputText(mockEditor.document.uri),
              },
            ],
          },
        ],
      };

      // Mock visibleTextEditors to include the bound editor
      (vscode.window as any).visibleTextEditors = [mockEditor];

      // Mock showTextDocument to resolve successfully
      (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(mockEditor);
    });

    it('should paste text at cursor position', async () => {
      const text = 'src/auth.ts#L10-L20';
      const result = await destination.paste(text);

      expect(result).toBe(true);
      expect(mockEditor.edit).toHaveBeenCalled();
    });

    it('should return true on successful paste', async () => {
      const result = await destination.paste('src/file.ts#L1');

      expect(result).toBe(true);
    });

    it('should return false when no editor bound', async () => {
      destination.setEditor(undefined);

      const result = await destination.paste('src/file.ts#L1');

      expect(result).toBe(false);
    });

    it('should return false when text is empty', async () => {
      const result = await destination.paste('');

      expect(result).toBe(false);
    });

    it('should return false when text is whitespace only', async () => {
      const result = await destination.paste('   ');

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
      (vscode.window as any).tabGroups = { all: [] };
      (vscode.window as any).visibleTextEditors = [];

      const result = await destination.paste('src/file.ts#L1');

      expect(result).toBe(false);
    });

    it('should return false when edit operation fails', async () => {
      (mockEditor.edit as jest.Mock).mockResolvedValue(false);

      const result = await destination.paste('src/file.ts#L1');

      expect(result).toBe(false);
    });

    it('should handle edit operation errors', async () => {
      (mockEditor.edit as jest.Mock).mockRejectedValue(new Error('Edit failed'));

      const result = await destination.paste('src/file.ts#L1');

      expect(result).toBe(false);
    });

    it('should focus editor after successful paste', async () => {
      const text = 'src/auth.ts#L10-L20';
      const result = await destination.paste(text);

      expect(result).toBe(true);
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockEditor.document, {
        preserveFocus: false,
        viewColumn: mockEditor.viewColumn,
      });
    });

    it('should not focus editor when edit fails', async () => {
      (mockEditor.edit as jest.Mock).mockResolvedValue(false);

      const result = await destination.paste('src/file.ts#L1');

      expect(result).toBe(false);
      expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
    });

    it('should not focus editor when paste validation fails', async () => {
      destination.setEditor(undefined);

      const result = await destination.paste('src/file.ts#L1');

      expect(result).toBe(false);
      expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
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
        expect.objectContaining({
          fn: 'TextEditorDestination.setEditor',
          editorDisplayName: 'src/file.ts',
        }),
        expect.stringContaining('Text editor bound'),
      );
    });

    it('should log when editor is cleared', () => {
      destination.setEditor(undefined);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'TextEditorDestination.setEditor',
        }),
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
      (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue(undefined);

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
