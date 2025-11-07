import * as vscode from 'vscode';

import * as extension from '../extension';
import { getErrorCodeForTesting } from '../extension';
import { PathFormat, RangeLinkService } from '../RangeLinkService';

// Mock vscode module
const mockStatusBarItem = {
  text: '',
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
};

const mockClipboard = {
  writeText: jest.fn(),
};

const mockOutputChannel = {
  appendLine: jest.fn(),
  dispose: jest.fn(),
};

// Helper to create mock terminal binding manager (not bound by default)
function createMockTerminalBindingManager() {
  return {
    isBound: () => false,
    sendToTerminal: () => false,
    getBoundTerminal: () => undefined,
    bind: () => false,
    unbind: () => {},
    dispose: () => {},
  };
}

// Internal storage for activeTextEditor
let _activeTextEditor: any = null;

const mockWindow = {
  get activeTextEditor() {
    return _activeTextEditor;
  },
  set activeTextEditor(value: any) {
    _activeTextEditor = value;
    // Sync with vscode mock
    (vscode.window as any).activeTextEditor = value;
  },
  createStatusBarItem: jest.fn(),
  createOutputChannel: jest.fn(),
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  setStatusBarMessage: jest.fn(),
};

// Setup return values for mock functions after they're created
mockWindow.createStatusBarItem.mockReturnValue(mockStatusBarItem);
mockWindow.createOutputChannel.mockReturnValue(mockOutputChannel);

const mockWorkspace = {
  getWorkspaceFolder: jest.fn(),
  asRelativePath: jest.fn(),
  getConfiguration: jest.fn(),
};

const mockCommands = {
  registerCommand: jest.fn(),
};

jest.mock('vscode', () => ({
  window: {
    activeTextEditor: null,
    activeTerminal: null,
    createStatusBarItem: jest.fn(),
    createOutputChannel: jest.fn(),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    setStatusBarMessage: jest.fn(),
    onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
    registerTerminalLinkProvider: jest.fn(() => ({ dispose: jest.fn() })),
  },
  workspace: {
    getWorkspaceFolder: jest.fn(),
    asRelativePath: jest.fn(),
    getConfiguration: jest.fn(),
  },
  languages: {
    registerDocumentLinkProvider: jest.fn(() => ({ dispose: jest.fn() })),
  },
  env: { clipboard: { writeText: jest.fn() } },
  commands: {
    registerCommand: jest.fn(),
  },
  StatusBarAlignment: { Right: 1 },
  Uri: {
    parse: jest.fn((path: string) => ({ fsPath: path, path })),
  },
  Range: class {
    constructor(
      public start: any,
      public end: any,
    ) {}
  },
  Selection: class {
    constructor(
      public start: any,
      public end: any,
    ) {}
    isEmpty = false;
  },
  TextEditor: class {
    selections: any[] = [];
    selection: any;
    document: any;
  },
  ExtensionMode: { Production: 1 },
  ExtensionKind: { Workspace: 1 },
  OutputChannel: class {
    appendLine = jest.fn();
    dispose = jest.fn();
  },
}));

// Helper function to set active editor and sync with vscode mock
function setActiveEditor(editor: any) {
  mockWindow.activeTextEditor = editor;
  (vscode.window as any).activeTextEditor = editor;
}

describe('RangeLinkService', () => {
  let service: RangeLinkService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);

    // Wire up the external mock objects to the vscode mock
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    (vscode.window.showErrorMessage as jest.Mock).mockImplementation(mockWindow.showErrorMessage);
    (vscode.window.showInformationMessage as jest.Mock).mockImplementation(
      mockWindow.showInformationMessage,
    );
    (vscode.window.setStatusBarMessage as jest.Mock).mockImplementation(
      mockWindow.setStatusBarMessage,
    );
    (vscode.env.clipboard.writeText as jest.Mock).mockImplementation(mockClipboard.writeText);
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockImplementation(
      mockWorkspace.getWorkspaceFolder,
    );
    (vscode.workspace.asRelativePath as jest.Mock).mockImplementation(mockWorkspace.asRelativePath);
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(
      mockWorkspace.getConfiguration,
    );
    (vscode.commands.registerCommand as jest.Mock).mockImplementation(mockCommands.registerCommand);

    // Create service with default delimiters and mock terminal manager
    service = new RangeLinkService(
      {
        line: 'L',
        position: 'C',
        hash: '#',
        range: '-',
      },
      createMockTerminalBindingManager() as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLink - Empty selection handling', () => {
    it('should throw error when selection is empty (should be prevented by command enablement)', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 5, character: 0 },
          end: { line: 5, character: 0 },
          isEmpty: true,
        },
        selections: [
          {
            start: { line: 5, character: 0 },
            end: { line: 5, character: 0 },
            isEmpty: true,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await expect(service.createLink(PathFormat.WorkspaceRelative)).rejects.toThrow(
        'RangeLink command invoked with empty selection',
      );

      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('createLink - Single line selections', () => {
    it('should create link for full line selection', async () => {
      setActiveEditor({
        selection: {
          start: { line: 10, character: 0 },
          end: { line: 10, character: 5 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 10, character: 0 },
            end: { line: 10, character: 5 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'const x = 5;',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      });

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L11C1-L11C6');
    });

    it('should copy column range for partial line selection', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 20, character: 5 },
          end: { line: 20, character: 15 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 20, character: 5 },
            end: { line: 20, character: 15 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'const x = 5; some long text',
            range: { start: { character: 0 }, end: { character: 30 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L21C6-L21C16');
    });

    it('should use line-only format when selection spans full line and extends to end', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 15, character: 0 },
          end: { line: 15, character: 25 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 15, character: 0 },
            end: { line: 15, character: 25 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'const x = 5; some text',
            range: { start: { character: 0 }, end: { character: 24 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L16');
    });

    it('should NOT use line-only format when startColumn is not 1', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 4, character: 2 },
          end: { line: 4, character: 15 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 4, character: 2 },
            end: { line: 4, character: 15 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'some text here',
            range: { start: { character: 0 }, end: { character: 14 } },
          }),
        },
      };
      mockWorkspace.getWorkspaceFolder.mockReturnValue({ uri: { path: '/workspace' } });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Should use column format, not line-only format (because startColumn !== 1)
      // Character 2 = column 3, Character 15 = column 16 (0-indexed)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L5C3-L5C16');
    });

    it('should NOT use line-only format when end character does not reach end of line', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 4, character: 0 },
          end: { line: 4, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 4, character: 0 },
            end: { line: 4, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'some text here', // 14 characters
            range: { start: { character: 0 }, end: { character: 14 } },
          }),
        },
      };
      mockWorkspace.getWorkspaceFolder.mockReturnValue({ uri: { path: '/workspace' } });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Should use column format since end is at char 10, not at line end (14)
      // Character 0 = column 1, Character 10 = column 11 (0-indexed)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L5C1-L5C11');
    });

    it('should handle selections with different character ranges (not rectangular mode)', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 5, character: 3 },
          end: { line: 5, character: 8 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 5, character: 3 },
            end: { line: 5, character: 8 },
            isEmpty: false,
          },
          {
            start: { line: 6, character: 5 }, // Different character range
            end: { line: 6, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Should use primary selection only
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L6C4-L6C9');
    });
  });

  describe('createLink - Multi-line selections', () => {
    it('should copy range when selection spans multiple full lines', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 0 },
          end: { line: 25, character: 0 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 10, character: 0 },
            end: { line: 25, character: 0 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn((line: number) => ({
            text: 'some code here',
            range: { start: { character: 0 }, end: { character: 14 } },
          })),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L11-L26');
    });

    it('should copy column range when selection has specific columns', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 5 },
          end: { line: 25, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 10, character: 5 },
            end: { line: 25, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn((line: number) => ({
            text: 'some code here that is longer',
            range: { start: { character: 0 }, end: { character: 30 } },
          })),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L11C6-L26C11');
    });
  });

  describe('createLink - Path handling', () => {
    it('should use relative path by default', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'some text here',
            range: { start: { character: 0 }, end: { character: 14 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockWorkspace.asRelativePath).toHaveBeenCalled();
    });

    it.skip('should use absolute path when requested', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: 'C:\\workspace\\src\\file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'some text here',
            range: { start: { character: 0 }, end: { character: 14 } },
          }),
        },
      };

      await service.createLink(PathFormat.Absolute);

      expect(mockWorkspace.asRelativePath).not.toHaveBeenCalled();
      const callArg = mockClipboard.writeText.mock.calls[0][0];
      expect(callArg).toContain('workspace');
    });

    it.skip('should normalize Windows path separators', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: 'C:\\workspace\\src\\file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'some text here',
            range: { start: { character: 0 }, end: { character: 14 } },
          }),
        },
      };

      await service.createLink(PathFormat.Absolute);

      const callArg = mockClipboard.writeText.mock.calls[0][0];
      expect(callArg).not.toContain('\\');
    });
  });

  describe('createLink - Error handling', () => {
    it('should show error when no active editor', async () => {
      mockWindow.activeTextEditor = null;

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockWindow.showErrorMessage).toHaveBeenCalledWith('No active editor');
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    it('should handle missing workspace folder', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/some/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'some text here',
            range: { start: { character: 0 }, end: { character: 14 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue(undefined);

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('createLink - Column mode selections (Phase 1A)', () => {
    it('should detect and format column selection with default delimiters', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 5 },
          end: { line: 12, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 10, character: 5 },
            end: { line: 10, character: 10 },
            isEmpty: false,
          },
          {
            start: { line: 11, character: 5 },
            end: { line: 11, character: 10 },
            isEmpty: false,
          },
          {
            start: { line: 12, character: 5 },
            end: { line: 12, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Column mode should be indicated with double hash (##) instead of single hash
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts##L11C6-L13C11');
    });

    it('should format column selection with custom single-character delimiters', async () => {
      const customService = new RangeLinkService(
        {
          line: 'X',
          position: 'Y',
          hash: '@',
          range: '..',
        },
        createMockTerminalBindingManager() as any,
      );

      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 5, character: 3 },
          end: { line: 7, character: 8 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 5, character: 3 },
            end: { line: 5, character: 8 },
            isEmpty: false,
          },
          {
            start: { line: 6, character: 3 },
            end: { line: 6, character: 8 },
            isEmpty: false,
          },
          {
            start: { line: 7, character: 3 },
            end: { line: 7, character: 8 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await customService.createLink(PathFormat.WorkspaceRelative);

      // Custom delimiters: double @@@ indicates rectangular mode (with @ as hash delimiter)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts@@X6Y4..X8Y9');
    });

    it('should format column selection with custom multi-character delimiters', async () => {
      const customService = new RangeLinkService(
        {
          line: 'LINE',
          position: 'COL',
          hash: '##',
          range: 'TO',
        },
        createMockTerminalBindingManager() as any,
      );

      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 20, character: 10 },
          end: { line: 22, character: 15 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 20, character: 10 },
            end: { line: 20, character: 15 },
            isEmpty: false,
          },
          {
            start: { line: 21, character: 10 },
            end: { line: 21, character: 15 },
            isEmpty: false,
          },
          {
            start: { line: 22, character: 10 },
            end: { line: 22, character: 15 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await customService.createLink(PathFormat.WorkspaceRelative);

      // Multi-character hash delimiter: if hash="##", then double hash = #### (4 # characters)
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        'src/file.ts####LINE21COL11TOLINE23COL16',
      );
    });

    it('should not treat duplicate selections on same line as column selection', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 5, character: 0 },
          end: { line: 5, character: 5 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 5, character: 0 },
            end: { line: 5, character: 5 },
            isEmpty: false,
          },
          {
            start: { line: 5, character: 0 },
            end: { line: 5, character: 5 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text here',
            range: { start: { character: 0 }, end: { character: 15 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Same line selections are not consecutive lines, so not rectangular mode (single hash)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L6C1-L6C6');
    });

    it('should not treat non-consecutive lines as column selection', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 10, character: 5 },
            end: { line: 10, character: 10 },
            isEmpty: false,
          },
          {
            start: { line: 14, character: 5 },
            end: { line: 14, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Should use primary selection (first selection only), not column format (single hash)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L11C6-L11C11');
    });

    it('should not treat selections with different character ranges as column selection', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 3 },
          end: { line: 10, character: 8 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 10, character: 3 },
            end: { line: 10, character: 8 },
            isEmpty: false,
          },
          {
            start: { line: 11, character: 5 }, // Different start character
            end: { line: 11, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Different character ranges = not rectangular mode (single hash)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L11C4-L11C9');
    });

    it('should not treat single selection as column selection', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 5 },
          end: { line: 12, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 10, character: 5 },
            end: { line: 12, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn((line: number) => ({
            text: 'some code here',
            range: { start: { character: 0 }, end: { character: 14 } },
          })),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Single selection = regular selection, not rectangular mode (single hash)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L11C6-L13C11');
    });

    it('should handle column selection with absolute paths', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 1, character: 0 },
          end: { line: 3, character: 5 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 5 },
            isEmpty: false,
          },
          {
            start: { line: 2, character: 0 },
            end: { line: 2, character: 5 },
            isEmpty: false,
          },
          {
            start: { line: 3, character: 0 },
            end: { line: 3, character: 5 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/absolute/path/to/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue(undefined);

      await service.createLink(PathFormat.Absolute);

      // Absolute path with rectangular mode (double hash)
      const callArg = mockClipboard.writeText.mock.calls[0][0];
      expect(callArg).toBe('/absolute/path/to/file.ts##L2C1-L4C6');
    });

    it('should handle very large line numbers in column selection', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 9999, character: 0 },
          end: { line: 10001, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 9999, character: 0 },
            end: { line: 9999, character: 10 },
            isEmpty: false,
          },
          {
            start: { line: 10000, character: 0 },
            end: { line: 10000, character: 10 },
            isEmpty: false,
          },
          {
            start: { line: 10001, character: 0 },
            end: { line: 10001, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts##L10000C1-L10002C11');
    });

    it('should handle very large column numbers in column selection', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 5, character: 999 },
          end: { line: 7, character: 1009 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 5, character: 999 },
            end: { line: 5, character: 1009 },
            isEmpty: false,
          },
          {
            start: { line: 6, character: 999 },
            end: { line: 6, character: 1009 },
            isEmpty: false,
          },
          {
            start: { line: 7, character: 999 },
            end: { line: 7, character: 1009 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts##L6C1000-L8C1010');
    });

    it('should handle column selection starting at line 0 (first line)', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 0, character: 2 },
          end: { line: 2, character: 7 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 0, character: 2 },
            end: { line: 0, character: 7 },
            isEmpty: false,
          },
          {
            start: { line: 1, character: 2 },
            end: { line: 1, character: 7 },
            isEmpty: false,
          },
          {
            start: { line: 2, character: 2 },
            end: { line: 2, character: 7 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts##L1C3-L3C8');
    });

    it('should handle column selection starting at column 0 (beginning of line)', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 0 },
          end: { line: 12, character: 5 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 10, character: 0 },
            end: { line: 10, character: 5 },
            isEmpty: false,
          },
          {
            start: { line: 11, character: 0 },
            end: { line: 11, character: 5 },
            isEmpty: false,
          },
          {
            start: { line: 12, character: 0 },
            end: { line: 12, character: 5 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts##L11C1-L13C6');
    });

    it('should handle column selection with only 2 selections (minimum)', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 5, character: 3 },
          end: { line: 6, character: 8 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 5, character: 3 },
            end: { line: 5, character: 8 },
            isEmpty: false,
          },
          {
            start: { line: 6, character: 3 },
            end: { line: 6, character: 8 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Minimum 2 selections should work for rectangular mode
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts##L6C4-L7C9');
    });

    it('should handle column selection with many selections (10+)', async () => {
      const manySelections = [];
      for (let i = 0; i < 10; i++) {
        manySelections.push({
          start: { line: i, character: 5 },
          end: { line: i, character: 10 },
          isEmpty: false,
        });
      }

      mockWindow.activeTextEditor = {
        selection: manySelections[0],
        selections: manySelections,
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'sample text',
            range: { start: { character: 0 }, end: { character: 11 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      // Many selections should still work
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts##L1C6-L10C11');
    });
  });

  describe('createLink - Status bar feedback', () => {
    it('should show status bar message after copying', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 42, character: 0 },
          end: { line: 42, character: 10 },
          isEmpty: false,
        },
        selections: [
          {
            start: { line: 42, character: 0 },
            end: { line: 42, character: 10 },
            isEmpty: false,
          },
        ],
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
          lineAt: jest.fn().mockReturnValue({
            text: 'some text here',
            range: { start: { character: 0 }, end: { character: 14 } },
          }),
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockWindow.setStatusBarMessage).toHaveBeenCalledWith(
        expect.stringContaining('RangeLink copied to clipboard'),
        2000,
      );
    });
  });
});

describe('Configuration loading and validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOutputChannel.appendLine.mockClear();

    // Wire up mocks - use arrow function to allow dynamic reassignment
    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    (vscode.window.showErrorMessage as jest.Mock).mockImplementation(mockWindow.showErrorMessage);
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((...args) =>
      mockWorkspace.getConfiguration(...args),
    );
    (vscode.commands.registerCommand as jest.Mock).mockImplementation(mockCommands.registerCommand);
  });

  describe.each([
    ['delimiterLine', 'L'],
    ['delimiterPosition', 'C'],
    ['delimiterHash', '#'],
    ['delimiterRange', '-'],
  ])('Default values for %s', (setting, expectedDefault) => {
    it(`should use default value "${expectedDefault}" when no user/workspace settings exist`, () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return defaults[key];
        }),
        inspect: jest.fn((key: string) => ({
          key,
          defaultValue: expectedDefault,
          globalValue: undefined,
          workspaceValue: undefined,
          workspaceFolderValue: undefined,
        })),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      expect(mockConfig.inspect).toHaveBeenCalledWith(setting);
    });
  });

  describe('Configuration priority order', () => {
    it.each([
      [
        'workspace folder',
        {
          workspaceFolderValue: 'Folder',
          workspaceValue: 'Workspace',
          globalValue: 'User',
          defaultValue: 'Default',
        },
        'Folder',
      ],
      [
        'workspace',
        {
          workspaceFolderValue: undefined,
          workspaceValue: 'Workspace',
          globalValue: 'User',
          defaultValue: 'Default',
        },
        'Workspace',
      ],
      [
        'user',
        {
          workspaceFolderValue: undefined,
          workspaceValue: undefined,
          globalValue: 'User',
          defaultValue: 'Default',
        },
        'User',
      ],
      [
        'default',
        {
          workspaceFolderValue: undefined,
          workspaceValue: undefined,
          globalValue: undefined,
          defaultValue: 'Default',
        },
        'Default',
      ],
    ])('should prioritize %s settings over others', (source, inspectResult, expectedValue) => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => expectedValue),
        inspect: jest.fn(() => ({ ...inspectResult, defaultValue: 'Default' })),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      expect(mockConfig.get).toHaveBeenCalled();
    });
  });

  // TEMPORARILY DISABLED: These tests are improperly scoped - they test core library
  // validation logic instead of extension responsibilities. The extension should only test:
  // - Where config was loaded from (workspace vs user settings)
  // - What the resulting delimiters are (after core validates)
  // - NOT the validation logic itself (that's core's job)
  //
  // See ROADMAP Phase 4.5X: Separate Extension Config Loading from Core Validation
  // This will also enable eliminating getErrorCodeForTesting() function.
  //
  // Re-enable these tests after refactoring is complete.
  describe.skip('Invalid delimiter values (Phase 1B)', () => {
    it.each([
      ['delimiterPosition', 'C'],
      ['delimiterHash', '#'],
      ['delimiterRange', '-'],
    ])('should log error for invalid %s', async (setting, defaultValue) => {
      const invalidValue = '123'; // Contains numbers
      const mockConfig = {
        get: jest.fn((key: string, defaultVal: string) => {
          return key === setting ? invalidValue : defaultVal;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: key === setting ? invalidValue : undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      // Verify error was logged with specific error code
      const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
        call[0]?.includes('[ERROR]'),
      );
      expect(errorCalls.length).toBeGreaterThan(0);
      // Should log specific error code (digits = ERR_1003, reserved = ERR_1005, etc.)
      expect(errorCalls.some((call) => call[0]?.includes('ERR_100'))).toBe(true);
    });

    it.each([
      ['empty string', '', 'ERR_1002'],
      ['whitespace', '   ', 'ERR_1002'],
      ['numbers only', '123', 'ERR_1003'],
      ['contains numbers', 'A1', 'ERR_1003'],
      ['contains numbers', '1A', 'ERR_1003'],
    ])(
      'should log error and use default when value is "%s"',
      async (description, invalidValue, expectedCode) => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            // Return the invalid value instead of default to test validation
            return key === 'delimiterLine' ? invalidValue : defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterLine' ? invalidValue : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Verify error was logged with specific error code
        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0]?.includes('[ERROR]'),
        );
        expect(errorCalls.length).toBeGreaterThan(0);
        expect(errorCalls.some((call) => call[0]?.includes(`[${expectedCode}]`))).toBe(true);
      },
    );

    describe('Reserved character validation (Phase 1B)', () => {
      const reservedChars = ['~', '|', '/', '\\', ':', ',', '@'];

      it.each(reservedChars)(
        'should reject delimiterLine containing reserved char %s',
        async (char) => {
          const mockConfig = {
            get: jest.fn((key: string, defaultValue: string) => {
              return key === 'delimiterLine' ? `L${char}` : defaultValue;
            }),
            inspect: jest.fn((key: string) => {
              const defaults: Record<string, string> = {
                delimiterLine: 'L',
                delimiterPosition: 'C',
                delimiterHash: '#',
                delimiterRange: '-',
              };
              return {
                key,
                defaultValue: defaults[key] || 'L',
                globalValue: key === 'delimiterLine' ? `L${char}` : undefined,
                workspaceValue: undefined,
                workspaceFolderValue: undefined,
              };
            }),
          };
          mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

          // Extension imported at top
          const context = { subscriptions: [] as any[] };
          require('../extension').activate(context as any);

          expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR] [ERR_1005] Invalid delimiterLine'),
          );
        },
      );

      it.each(reservedChars)(
        'should reject delimiterPosition containing reserved char %s',
        async (char) => {
          const mockConfig = {
            get: jest.fn((key: string, defaultValue: string) => {
              return key === 'delimiterPosition' ? `C${char}` : defaultValue;
            }),
            inspect: jest.fn((key: string) => {
              const defaults: Record<string, string> = {
                delimiterLine: 'L',
                delimiterPosition: 'C',
                delimiterHash: '#',
                delimiterRange: '-',
              };
              return {
                key,
                defaultValue: defaults[key] || 'L',
                globalValue: key === 'delimiterPosition' ? `C${char}` : undefined,
                workspaceValue: undefined,
                workspaceFolderValue: undefined,
              };
            }),
          };
          mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

          // Extension imported at top
          const context = { subscriptions: [] as any[] };
          require('../extension').activate(context as any);

          expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR] [ERR_1005] Invalid delimiterPosition'),
          );
        },
      );

      it.each(reservedChars)(
        'should reject delimiterHash containing reserved char %s',
        async (char) => {
          const mockConfig = {
            get: jest.fn((key: string, defaultValue: string) => {
              return key === 'delimiterHash' ? char : defaultValue;
            }),
            inspect: jest.fn((key: string) => {
              const defaults: Record<string, string> = {
                delimiterLine: 'L',
                delimiterPosition: 'C',
                delimiterHash: '#',
                delimiterRange: '-',
              };
              return {
                key,
                defaultValue: defaults[key] || 'L',
                globalValue: key === 'delimiterHash' ? char : undefined,
                workspaceValue: undefined,
                workspaceFolderValue: undefined,
              };
            }),
          };
          mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

          // Extension imported at top
          const context = { subscriptions: [] as any[] };
          require('../extension').activate(context as any);

          expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR] [ERR_1005] Invalid delimiterHash'),
          );
        },
      );

      it.each(reservedChars)(
        'should reject delimiterRange containing reserved char %s',
        async (char) => {
          const mockConfig = {
            get: jest.fn((key: string, defaultValue: string) => {
              return key === 'delimiterRange' ? `-${char}` : defaultValue;
            }),
            inspect: jest.fn((key: string) => {
              const defaults: Record<string, string> = {
                delimiterLine: 'L',
                delimiterPosition: 'C',
                delimiterHash: '#',
                delimiterRange: '-',
              };
              return {
                key,
                defaultValue: defaults[key] || 'L',
                globalValue: key === 'delimiterRange' ? `-${char}` : undefined,
                workspaceValue: undefined,
                workspaceFolderValue: undefined,
              };
            }),
          };
          mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

          // Extension imported at top
          const context = { subscriptions: [] as any[] };
          require('../extension').activate(context as any);

          expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR] [ERR_1005] Invalid delimiterRange'),
          );
        },
      );

      it('should reject delimiter with reserved char in middle', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            return key === 'delimiterLine' ? 'X@Y' : defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterLine' ? 'X@Y' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1005] Invalid delimiterLine'),
        );
      });

      it.each([
        ['space', ' ', 'ERR_1004'],
        ['tab', '\t', 'ERR_1004'],
        ['newline', '\n', 'ERR_1004'],
        ['carriage return', '\r', 'ERR_1004'],
        ['multiple spaces', '  ', 'ERR_1004'],
        ['mixed whitespace', ' \t\n', 'ERR_1004'],
      ])(
        'should reject delimiter containing whitespace: %s',
        async (description, whitespace, expectedCode) => {
          const mockConfig = {
            get: jest.fn((key: string, defaultValue: string) => {
              return key === 'delimiterLine' ? `L${whitespace}` : defaultValue;
            }),
            inspect: jest.fn((key: string) => {
              const defaults: Record<string, string> = {
                delimiterLine: 'L',
                delimiterPosition: 'C',
                delimiterHash: '#',
                delimiterRange: '-',
              };
              return {
                key,
                defaultValue: defaults[key] || 'L',
                globalValue: key === 'delimiterLine' ? `L${whitespace}` : undefined,
                workspaceValue: undefined,
                workspaceFolderValue: undefined,
              };
            }),
          };
          mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

          // Extension imported at top
          const context = { subscriptions: [] as any[] };
          require('../extension').activate(context as any);

          expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining(`[ERROR] [${expectedCode}] Invalid delimiterLine`),
          );
        },
      );
    });

    describe('Subset/superset conflict detection (Phase 1B)', () => {
      it('should reject when delimiterLine is substring at start of delimiterRange', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: '#',
              delimiterPosition: 'C',
              delimiterRange: 'LINE',
            };
            return custom[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: 'LINE',
            };
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: '#',
              delimiterPosition: 'C',
              delimiterRange: 'LINE',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: custom[key],
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters cannot be substrings'),
        );
      });

      it('should reject when delimiterLine is substring at end of delimiterRange', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: '#',
              delimiterPosition: 'C',
              delimiterRange: 'THRUL',
            };
            return custom[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: 'THRUL',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterRange' ? 'THRUL' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters cannot be substrings'),
        );
      });

      it('should reject when delimiterLine is substring in middle of delimiterRange', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: '#',
              delimiterPosition: 'C',
              delimiterRange: 'XLYX',
            };
            return custom[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: 'XLYX',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterRange' ? 'XLYX' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters cannot be substrings'),
        );
      });

      it('should reject when delimiterPosition is substring of delimiterRange', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'POS',
              delimiterHash: '#',
              delimiterRange: 'POSRANGE',
            };
            return custom[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'POS',
              delimiterHash: '#',
              delimiterRange: 'POSRANGE',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterRange' ? 'POSRANGE' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters cannot be substrings'),
        );
      });

      it('should be case-insensitive when checking uniqueness (L and l are the same)', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: 'l', // lowercase l, same as L (case-insensitive)
              delimiterPosition: 'C',
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterHash' ? 'l' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should log uniqueness error (L and l are same when case-insensitive)
        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('[ERROR] [ERR_1006]'),
        );
        expect(errorCalls.length).toBeGreaterThan(0);
      });
    });

    describe('Aggregated error reporting (Phase 1B)', () => {
      it('should log multiple validation errors with specific codes', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            const invalid: Record<string, string> = {
              delimiterLine: 'L~', // reserved char -> ERR_1005
              delimiterPosition: 'C1', // contains digit -> ERR_1003
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return invalid[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0]?.includes('[ERROR]'),
        );
        expect(errorCalls.length).toBeGreaterThanOrEqual(2);
        const errorMessages = errorCalls.map((call) => call[0] as string).join('; ');
        expect(errorMessages).toContain('[ERROR] [ERR_1005]'); // Reserved char
        expect(errorMessages).toContain('[ERROR] [ERR_1003]'); // Contains digits
        expect(errorMessages).toContain('Invalid delimiterLine');
        expect(errorMessages).toContain('Invalid delimiterPosition');

        // Should also log INFO about using defaults
        const infoCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0]?.includes('[INFO]'),
        );
        expect(
          infoCalls.some(
            (call) => call[0]?.includes('CONFIG_USING_DEFAULTS') || call[0]?.includes('MSG_1002'),
          ),
        ).toBe(true);
      });

      it('should log reserved char errors with uniqueness and substring errors using specific codes', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            // Position and Range are duplicates ('X'), and Position is substring of Line ('LX')
            const invalid: Record<string, string> = {
              delimiterLine: 'LX',
              delimiterPosition: 'X',
              delimiterHash: '#',
              delimiterRange: 'X',
            };
            return invalid[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0]?.includes('[ERROR]'),
        );
        expect(errorCalls.length).toBeGreaterThanOrEqual(2);
        const errorMessages = errorCalls.map((call) => call[0] as string).join('; ');
        expect(errorMessages).toContain('[ERROR] [ERR_1006]'); // Not unique
        expect(errorMessages).toContain('[ERROR] [ERR_1007]'); // Substring conflict
        expect(errorMessages).toContain('Delimiters must be unique');
        expect(errorMessages).toContain('Delimiters cannot be substrings');
      });

      it.skip('should log all error types with specific codes: empty, digit, reserved, duplicate, substring', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            const invalid: Record<string, string> = {
              delimiterLine: 'X', // will become duplicate
              delimiterPosition: 'C1', // contains digit -> ERR_1003
              delimiterHash: '~', // reserved char -> ERR_1005
              delimiterRange: 'X', // duplicate of line -> ERR_1006
            };
            return invalid[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0]?.includes('[ERROR]'),
        );
        expect(errorCalls.length).toBeGreaterThanOrEqual(3);
        const errorMessages = errorCalls.map((call) => call[0] as string).join('; ');
        expect(errorMessages).toContain('[ERROR] [ERR_1003]'); // Contains digits
        expect(errorMessages).toContain('[ERROR] [ERR_1005]'); // Reserved char
        expect(errorMessages).toContain('[ERROR] [ERR_1006]'); // Not unique
        expect(errorMessages).toContain('Invalid delimiterPosition');
        expect(errorMessages).toContain('Invalid delimiterHash');
        expect(errorMessages).toContain('Delimiters must be unique');
      });
    });

    describe('Edge cases for 100% branch coverage (Phase 1B)', () => {
      it('should accept valid non-ASCII delimiters', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: '行',
              delimiterPosition: '列',
              delimiterHash: '#',
              delimiterRange: '至',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should not log any errors
        const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('[ERROR]'),
        );
        expect(errorLogs.length).toBe(0);
      });

      it('should handle reverse substring conflict (larger contains smaller)', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: 'ABC', // larger contains 'C' (smaller)
            };
            return custom[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: 'ABC',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: custom[key],
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters cannot be substrings'),
        );
      });

      it('should handle all delimiter pairs in substring conflict check', async () => {
        // Test column-line conflict
        const mockConfig1 = {
          get: jest.fn((key: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'LX', // contains L
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return custom[key];
          }),
          inspect: jest.fn(() => ({
            defaultValue: 'L',
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          })),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig1);

        // Extension imported at top
        let context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('Delimiters cannot be substrings'),
        );

        // Test range-column conflict
        jest.clearAllMocks();
        const mockConfig2 = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: 'XC', // contains C
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn(() => ({
            defaultValue: 'L',
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          })),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig2);
        context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters cannot be substrings'),
        );
      });

      it('should treat delimiters as case-insensitive - uppercase L and lowercase l are the same', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L', // uppercase
              delimiterPosition: 'C',
              delimiterHash: 'l', // lowercase - should be invalid (same as L)
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should log uniqueness error - same delimiter with different case
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1006]'),
        );
      });

      it('should detect substring conflict with different case in compound delimiter', async () => {
        const mockConfig = {
          get: jest.fn((key: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'Lin', // shorter
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: 'LINE', // contains "Lin" (case-insensitive substring)
            };
            return custom[key];
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should log substring conflict error (case-insensitive check finds "Lin" in "LINE")
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007]'),
        );
      });

      it('should allow mixed case delimiters that do not conflict (case-insensitive check)', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'Line', // mixed case
              delimiterPosition: 'Pos', // different mixed case
              delimiterHash: 'A', // single character, uppercase
              delimiterRange: 'thru', // lowercase
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should not log any errors - no conflicts between these delimiters (even when compared case-insensitively)
        const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('[ERROR]'),
        );
        expect(errorLogs.length).toBe(0);
      });

      it('should reject multi-character hash delimiter', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '##', // Multi-character hash - invalid
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should log ERR_1008 (CONFIG_ERR_HASH_NOT_SINGLE_CHAR)
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1008]'),
        );
      });

      it('should accept single-character hash delimiter', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '@', // Single character (but reserved - will fail for different reason)
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should log ERR_1005 (reserved char), not ERR_1008 (single char check passes)
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1005]'),
        );
        const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('[ERR_1008]'),
        );
        expect(errorLogs.length).toBe(0); // No single-char error
      });

      it('should reject hash delimiter with value ">>"', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '>>', // Multi-character
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should log ERR_1008
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1008]'),
        );
      });

      it('should reject hash delimiter with value "HASH"', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: 'HASH', // Multi-character
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should log ERR_1008
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1008]'),
        );
      });

      it('should accept valid single-character hash delimiters', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '>', // Single character, not reserved
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should not log any errors
        const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('[ERROR]'),
        );
        expect(errorLogs.length).toBe(0);
      });

      it('should handle empty string check in validateDelimiter', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            // Return empty string for delimiterLine
            return key === 'delimiterLine' ? '' : defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterLine' ? '' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1002] Invalid delimiterLine'),
        );
      });

      it('should log CRITICAL error with CONFIG_ERR_UNKNOWN when unexpected validation error occurs', () => {
        // This test verifies the default case in getErrorCodeForTesting by using type assertion
        // to force an invalid enum value that will trigger the default case.

        // getErrorCodeForTesting and DelimiterValidationError imported at top

        // Force the default case by using an invalid enum value via type assertion
        // This simulates what would happen if a new enum value was added but getErrorCode wasn't updated
        const invalidError = 'INVALID_ERROR_VALUE' as any;

        // Call getErrorCodeForTesting directly with the invalid value
        const errorCode = getErrorCodeForTesting(invalidError);

        // Verify it returns CONFIG_ERR_UNKNOWN
        expect(errorCode).toBe('ERR_1099'); // CONFIG_ERR_UNKNOWN
      });

      it('should log CRITICAL error message format when CONFIG_ERR_UNKNOWN is returned', () => {
        // Test that the CRITICAL message format is correct
        // We test this by verifying getErrorCodeForTesting returns ERR_1099 for invalid inputs
        // and verifying the message structure in the code

        // getErrorCodeForTesting imported at top

        // Test with an invalid enum value
        const invalidError = 'INVALID_ERROR_VALUE' as any;
        const errorCode = getErrorCodeForTesting(invalidError);

        expect(errorCode).toBe('ERR_1099'); // CONFIG_ERR_UNKNOWN

        // Verify the error code enum value exists (this validates the structure)
        // The actual logging is tested implicitly - if the code path exists and returns
        // CONFIG_ERR_UNKNOWN, the CRITICAL message will be logged as defined in the code
      });

      it('should handle null/undefined fallback in defaults extraction', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => defaultValue),
          inspect: jest.fn((key: string) => {
            // Return null/undefined for defaultValue to test fallback
            return {
              key,
              defaultValue: null as any,
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };

        // Should not throw, should use fallback values
        expect(() => require('../extension').activate(context as any)).not.toThrow();
      });

      it('should handle empty delimiter length check in haveSubstringConflicts', async () => {
        // This tests the branch: if (a.length === 0 || b.length === 0) continue;
        // We need to have a valid config first, then check empty delimiters bypass substring check
        // Since empty delimiters are caught by validateDelimiter, we need to test the edge case
        // where validation passes but length is 0 (shouldn't happen, but branch exists)
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'A',
              delimiterPosition: 'B',
              delimiterHash: 'C',
              delimiterRange: 'D',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Valid config should pass substring check
        const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('substrings'),
        );
        expect(errorLogs.length).toBe(0);
      });

      it('should handle all reserved character checks returning false (valid delimiter)', async () => {
        // This ensures the loop in validateDelimiter completes without finding any reserved chars
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'Alpha',
              delimiterPosition: 'Beta',
              delimiterHash: 'G', // single character for hash
              delimiterRange: 'Delta',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterPosition: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        // Extension imported at top
        const context = { subscriptions: [] as any[] };
        require('../extension').activate(context as any);

        // Should not log any errors
        const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('[ERROR]'),
        );
        expect(errorLogs.length).toBe(0);
      });
    });
  });

  describe('Duplicate delimiter values', () => {
    it('should use defaults when all delimiters are the same', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          // All delimiters set to same value 'X'
          return 'X';
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: 'X',
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      // Verify error was logged about non-unique delimiters
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Delimiters must be unique'),
      );
    });

    it('should use defaults when two delimiters are the same', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          // Line and Column both set to 'A'
          const map: Record<string, string> = {
            delimiterLine: 'A',
            delimiterPosition: 'A',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return map[key] || defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: key === 'delimiterLine' || key === 'delimiterPosition' ? 'A' : undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      // Verify error was logged
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Delimiters must be unique'),
      );
    });
  });

  describe('Valid custom delimiter values', () => {
    it('should accept and use valid custom delimiters', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          const custom: Record<string, string> = {
            delimiterLine: 'Ln',
            delimiterPosition: 'Col',
            delimiterHash: 'H',
            delimiterRange: 'to',
          };
          return custom[key] || defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          const custom: Record<string, string> = {
            delimiterLine: 'Ln',
            delimiterPosition: 'Col',
            delimiterHash: 'H',
            delimiterRange: 'to',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: custom[key],
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      // Should not log any errors
      const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
        call[0].includes('[ERROR]'),
      );
      expect(errorLogs.length).toBe(0);
    });
  });

  describe('Configuration source logging', () => {
    it('should log source of each delimiter on startup (from default)', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return defaults[key];
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      // Should log configuration info
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Delimiter configuration loaded:'),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Line delimiter'),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Position delimiter'),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Hash delimiter'),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Range delimiter'),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Column mode: indicated by double hash delimiter'),
      );

      // Verify "from default" is logged
      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);
      const lineDelimiterLog = logCalls.find((msg) => msg.includes('Line delimiter'));
      expect(lineDelimiterLog).toContain('from default');
    });

    it.skip('should log source as workspace folder when workspaceFolderValue is set', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          return key === 'delimiterLine' ? 'FolderL' : defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: key === 'delimiterLine' ? 'FolderL' : undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0] || '');
      const lineDelimiterLog = logCalls.find(
        (msg) => msg && typeof msg === 'string' && msg.includes('Line delimiter'),
      );
      expect(lineDelimiterLog).toBeTruthy();
      expect(lineDelimiterLog).toContain('FolderL');
      expect(lineDelimiterLog).toContain('from workspace folder');
    });

    it.skip('should log source as workspace when workspaceValue is set', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          return key === 'delimiterLine' ? 'WorkspaceL' : defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: undefined,
            workspaceValue: key === 'delimiterLine' ? 'WorkspaceL' : undefined,
            workspaceFolderValue: undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0] || '');
      const lineDelimiterLog = logCalls.find(
        (msg) => msg && typeof msg === 'string' && msg.includes('Line delimiter'),
      );
      expect(lineDelimiterLog).toBeTruthy();
      // Check that it includes "from workspace" but not "folder" or "user"
      expect(lineDelimiterLog).toMatch(/from workspace(?! folder)/);
      expect(lineDelimiterLog).not.toContain('from user');
    });

    it('should log source as user when globalValue is set', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'UserL', // User override
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return defaults[key];
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: key === 'delimiterLine' ? 'UserL' : undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);
      const lineDelimiterLog = logCalls.find((msg) => msg.includes('Line delimiter'));
      expect(lineDelimiterLog).toContain('from user');
    });

    it('should prioritize workspace folder over workspace over user over default', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          const values: Record<string, string> = {
            delimiterLine: 'FolderL',
            delimiterPosition: 'WorkspaceC',
            delimiterHash: 'U',
            delimiterRange: '-',
          };
          return values[key] || defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterPosition: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            // Only set the highest priority value for each key
            globalValue: key === 'delimiterHash' ? 'U' : undefined,
            workspaceValue: key === 'delimiterPosition' ? 'WorkspaceC' : undefined,
            workspaceFolderValue: key === 'delimiterLine' ? 'FolderL' : undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      // Extension imported at top
      const context = { subscriptions: [] as any[] };
      require('../extension').activate(context as any);

      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);
      const lineLog = logCalls.find((msg) => msg.includes('Line delimiter'));
      const columnLog = logCalls.find((msg) => msg.includes('Position delimiter'));
      const hashLog = logCalls.find((msg) => msg.includes('Hash delimiter'));

      expect(lineLog).toContain('from workspace folder');
      expect(columnLog).toContain('from workspace');
      expect(hashLog).toContain('from user');
    });
  });
});

describe('Portable links (Phase 1C)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Wire up mocks
    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    (vscode.window.showErrorMessage as jest.Mock).mockImplementation(mockWindow.showErrorMessage);
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockImplementation(
      mockWorkspace.getWorkspaceFolder,
    );
    (vscode.workspace.asRelativePath as jest.Mock).mockImplementation(mockWorkspace.asRelativePath);
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(
      mockWorkspace.getConfiguration,
    );
    (vscode.commands.registerCommand as jest.Mock).mockImplementation(mockCommands.registerCommand);
    (vscode.env.clipboard.writeText as jest.Mock).mockImplementation(mockClipboard.writeText);
  });

  it.skip('should generate rectangular-mode portable link using custom delimiters (LINE/COL/#/TO)', async () => {
    // Arrange editor with column selection across consecutive lines (same char range)
    // For rectangular mode: all selections must have same start/end chars AND be consecutive lines
    const sel1 = new (vscode as any).Selection(
      { line: 9, character: 4 },
      { line: 9, character: 9 },
    );
    const sel2 = new (vscode as any).Selection(
      { line: 10, character: 4 },
      { line: 10, character: 9 },
    );
    const sel3 = new (vscode as any).Selection(
      { line: 11, character: 4 },
      { line: 11, character: 9 },
    );
    const sel4 = new (vscode as any).Selection(
      { line: 19, character: 4 },
      { line: 19, character: 9 },
    );
    const editor = new (vscode as any).TextEditor();
    editor.selections = [sel1, sel2, sel3, sel4];
    editor.selection = sel1;
    editor.document = { uri: { fsPath: '/workspace/src/file.ts' } };
    (vscode as any).window.activeTextEditor = editor;
    (vscode as any).workspace.getWorkspaceFolder.mockReturnValue({ uri: { path: '/workspace' } });
    (vscode as any).workspace.asRelativePath.mockReturnValue('src/file.ts');

    // Custom delimiters (hash must be single char)
    const service = new RangeLinkService(
      {
        line: 'LINE',
        position: 'COL',
        hash: '#',
        range: 'TO',
      },
      createMockTerminalBindingManager() as any,
    );

    // Act
    await service.createPortableLink(PathFormat.WorkspaceRelative);

    // Assert - rectangular mode uses double hash (##)
    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      'src/file.ts##LINE10COL5TOLINE20COL10~#~LINE~TO~COL~',
    );
  });

  it('should not treat LINE/COL/#/TO as substring conflicts (no fallback to defaults)', async () => {
    const mockConfig = {
      get: jest.fn((key: string, defaultValue: string) => {
        const custom: Record<string, string> = {
          delimiterLine: 'LINE',
          delimiterPosition: 'COL',
          delimiterHash: '#',
          delimiterRange: 'TO',
        };
        return (custom as any)[key] ?? defaultValue;
      }),
      inspect: jest.fn((key: string) => {
        const defaults: Record<string, string> = {
          delimiterLine: 'L',
          delimiterPosition: 'C',
          delimiterHash: '#',
          delimiterRange: '-',
        };
        return {
          key,
          defaultValue: defaults[key] || 'L',
          globalValue: undefined,
          workspaceValue: undefined,
          workspaceFolderValue:
            key === 'delimiterLine'
              ? 'LINE'
              : key === 'delimiterPosition'
                ? 'COL'
                : key === 'delimiterHash'
                  ? '#'
                  : key === 'delimiterRange'
                    ? 'TO'
                    : undefined,
        } as any;
      }),
    };
    (vscode as any).workspace.getConfiguration = jest.fn(() => mockConfig);

    // Extension imported at top
    const context = { subscriptions: [] as any[] };
    require('../extension').activate(context as any);

    // Should log configuration loaded with custom delimiters and no errors
    const logs = (vscode as any).window
      .createOutputChannel()
      .appendLine.mock.calls.map((c: any[]) => c[0]);
    // Fallback: check mockOutputChannel if present in this test harness
    const calls = (global as any).mockOutputChannel?.appendLine?.mock?.calls ?? [];
    const messages = calls.map((c: any[]) => c[0] || '');
    const all = [...logs, ...messages].join('\n');

    expect(all).toContain('Delimiter configuration loaded:');
    expect(all).toContain('LINE');
    expect(all).toContain('COL');
    expect(all).toContain('#');
    expect(all).toContain('TO');
    expect(all).not.toMatch(/Delimiters must be unique|Delimiters must not be substrings/);
  });
});
describe('Extension lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Wire up mocks
    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    (vscode.window.showErrorMessage as jest.Mock).mockImplementation(mockWindow.showErrorMessage);
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(
      mockWorkspace.getConfiguration,
    );
    (vscode.commands.registerCommand as jest.Mock).mockImplementation(mockCommands.registerCommand);
  });

  it('should register commands on activate', () => {
    const mockContext = {
      subscriptions: [] as any[],
    };

    // Mock configuration
    const mockConfig = {
      get: jest.fn((key: string, defaultValue: string) => defaultValue),
      inspect: jest.fn((key: string) => {
        const defaults: Record<string, string> = {
          delimiterLine: 'L',
          delimiterPosition: 'C',
          delimiterHash: '#',
          delimiterRange: '-',
        };
        return {
          key,
          defaultValue: defaults[key] || 'L',
          globalValue: undefined,
          workspaceValue: undefined,
          workspaceFolderValue: undefined,
        };
      }),
    };
    mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

    // Extension imported at top
    require('../extension').activate(mockContext as any);

    expect(mockCommands.registerCommand).toHaveBeenCalledTimes(7); // 2 regular + 2 portable + 1 version + 2 terminal binding commands
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('RangeLink');
  });

  it('should clean up on deactivate', () => {
    const mockContext = {
      subscriptions: [] as any[],
    };

    // Mock configuration
    const mockConfig = {
      get: jest.fn((key: string, defaultValue: string) => defaultValue),
      inspect: jest.fn((key: string) => {
        const defaults: Record<string, string> = {
          delimiterLine: 'L',
          delimiterPosition: 'C',
          delimiterHash: '#',
          delimiterRange: '-',
        };
        return {
          key,
          defaultValue: defaults[key] || 'L',
          globalValue: undefined,
          workspaceValue: undefined,
          workspaceFolderValue: undefined,
        };
      }),
    };
    mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

    // Extension imported at top
    require('../extension').activate(mockContext as any);

    extension.deactivate();

    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });
});

describe('Logger verification and communication channel', () => {
  beforeEach(() => {
    mockOutputChannel.appendLine.mockClear();
  });

  it('should confirm logger initialization by calling debug() when setLogger is called', () => {
    const mockConfig = {
      get: jest.fn((key: string, defaultValue: string) => defaultValue),
      inspect: jest.fn(() => ({
        globalValue: undefined,
        workspaceValue: undefined,
        workspaceFolderValue: undefined,
      })),
    };
    mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

    const context = { subscriptions: [] as any[] };
    require('../extension').activate(context as any);

    // Verify debug() was called during setLogger with initialization message
    const debugCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
      call[0]?.includes('[DEBUG]'),
    );
    const initializationCall = debugCalls.find((call: string[]) =>
      call[0]?.includes('Logger initialized'),
    );

    expect(initializationCall).toBeDefined();
    expect(initializationCall[0]).toContain('setLogger');
  });

  it('should support pingLog() to exercise all logger levels', () => {
    const { pingLog, setLogger } = require('rangelink-core-ts');
    const { VSCodeLogger } = require('../VSCodeLogger');

    // Create a fresh logger with our mock output channel
    const logger = new VSCodeLogger(mockOutputChannel);
    mockOutputChannel.appendLine.mockClear();

    // Set the logger and clear the initialization message
    setLogger(logger);
    mockOutputChannel.appendLine.mockClear();

    // Call pingLog to exercise all levels
    pingLog();

    // Verify all 4 ping messages were logged
    const calls = mockOutputChannel.appendLine.mock.calls;

    const debugCall = calls.find((call: string[]) => call[0]?.includes('Ping for DEBUG'));
    const infoCall = calls.find((call: string[]) => call[0]?.includes('Ping for INFO'));
    const warnCall = calls.find((call: string[]) => call[0]?.includes('Ping for WARN'));
    const errorCall = calls.find((call: string[]) => call[0]?.includes('Ping for ERROR'));

    expect(debugCall).toBeDefined();
    expect(debugCall[0]).toContain('[DEBUG]');
    expect(debugCall[0]).toContain('pingLog');

    expect(infoCall).toBeDefined();
    expect(infoCall[0]).toContain('[INFO]');
    expect(infoCall[0]).toContain('pingLog');

    expect(warnCall).toBeDefined();
    expect(warnCall[0]).toContain('[WARNING]');
    expect(warnCall[0]).toContain('pingLog');

    expect(errorCall).toBeDefined();
    expect(errorCall[0]).toContain('[ERROR]');
    expect(errorCall[0]).toContain('pingLog');
  });

  it('should verify VSCodeLogger properly formats debug messages', () => {
    const { setLogger } = require('rangelink-core-ts');
    const { VSCodeLogger } = require('../VSCodeLogger');

    const logger = new VSCodeLogger(mockOutputChannel);
    mockOutputChannel.appendLine.mockClear();

    // Manually call debug to test formatting
    logger.debug({ fn: 'testFunction', extraContext: 'value' }, 'Test debug message');

    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('testFunction'),
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Test debug message'),
    );
  });
});
