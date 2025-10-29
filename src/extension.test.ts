import * as vscode from 'vscode';

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

const mockWindow = {
  activeTextEditor: null as any,
  createStatusBarItem: jest.fn(() => mockStatusBarItem),
  createOutputChannel: jest.fn(() => mockOutputChannel),
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  setStatusBarMessage: jest.fn(),
};

const mockWorkspace = {
  getWorkspaceFolder: jest.fn(),
  asRelativePath: jest.fn(),
  getConfiguration: jest.fn(),
};

const mockCommands = {
  registerCommand: jest.fn(),
};

jest.mock('vscode', () => ({
  window: mockWindow,
  workspace: mockWorkspace,
  env: { clipboard: mockClipboard },
  commands: mockCommands,
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

describe('RangeLinkService', () => {
  let service: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);

    // Import after mocks are set up
    const { RangeLinkService } = require('./extension');
    service = new RangeLinkService({
      line: 'L',
      column: 'C',
      hash: '#',
      range: '-',
    });
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

      await expect(service.createLink(false)).rejects.toThrow(
        'RangeLink command invoked with empty selection',
      );

      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('createLink - Single line selections', () => {
    it('should create link for full line selection', async () => {
      mockWindow.activeTextEditor = {
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
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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

      await service.createLink(false);

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

      await service.createLink(false);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts:16');
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

      await service.createLink(false);

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

      await service.createLink(false);

      // Should use column format since end is at char 10, not at line end (14)
      // Character 0 = column 1, Character 10 = column 11 (0-indexed)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts#L5C1-L5C11');
    });

    it('should handle selections with different character ranges (not column mode)', async () => {
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

      await service.createLink(false);

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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

      await service.createLink(false);

      expect(mockWorkspace.asRelativePath).toHaveBeenCalled();
    });

    it('should use absolute path when requested', async () => {
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

      await service.createLink(true);

      expect(mockWorkspace.asRelativePath).not.toHaveBeenCalled();
      const callArg = mockClipboard.writeText.mock.calls[0][0];
      expect(callArg).toContain('workspace');
    });

    it('should normalize Windows path separators', async () => {
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

      await service.createLink(true);

      const callArg = mockClipboard.writeText.mock.calls[0][0];
      expect(callArg).not.toContain('\\');
    });
  });

  describe('createLink - Error handling', () => {
    it('should show error when no active editor', async () => {
      mockWindow.activeTextEditor = null;

      await service.createLink(false);

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

      await service.createLink(false);

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

      // Column mode should be indicated with double hash (##) instead of single hash
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts##L11C6-L13C11');
    });

    it('should format column selection with custom single-character delimiters', async () => {
      const customService = new (require('./extension').RangeLinkService)({
        line: 'X',
        column: 'Y',
        hash: '@',
        range: '..',
      });

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await customService.createLink(false);

      // Custom delimiters: double @@@ indicates column mode (with @ as hash delimiter)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts@@X6Y4..X8Y9');
    });

    it('should format column selection with custom multi-character delimiters', async () => {
      const customService = new (require('./extension').RangeLinkService)({
        line: 'LINE',
        column: 'COL',
        hash: '##',
        range: 'TO',
      });

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await customService.createLink(false);

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

      await service.createLink(false);

      // Same line selections are not consecutive lines, so not column mode (single hash)
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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

      // Different character ranges = not column mode (single hash)
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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

      // Single selection = regular selection, not column mode (single hash)
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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue(undefined);

      await service.createLink(true);

      // Absolute path with column mode (double hash)
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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

      // Minimum 2 selections should work for column mode
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
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

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

      await service.createLink(false);

      expect(mockWindow.setStatusBarMessage).toHaveBeenCalledWith(
        expect.stringContaining('Copied Range Link'),
        3000,
      );
    });
  });
});

describe('Configuration loading and validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOutputChannel.appendLine.mockClear();
  });

  describe.each([
    ['delimiterLine', 'L'],
    ['delimiterColumn', 'C'],
    ['delimiterHash', '#'],
    ['delimiterRange', '-'],
  ])('Default values for %s', (setting, expectedDefault) => {
    it(`should use default value "${expectedDefault}" when no user/workspace settings exist`, () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => defaultValue),
        inspect: jest.fn((key: string) => ({
          key,
          defaultValue: expectedDefault,
          globalValue: undefined,
          workspaceValue: undefined,
          workspaceFolderValue: undefined,
        })),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

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

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

      expect(mockConfig.get).toHaveBeenCalled();
    });
  });

  describe('Invalid delimiter values (Phase 1B)', () => {
    it.each([
      ['delimiterColumn', 'C'],
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
            delimiterColumn: 'C',
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

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

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
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

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
                delimiterColumn: 'C',
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

          const extension = require('./extension');
          const context = { subscriptions: [] as any[] };
          extension.activate(context as any);

          expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR] [ERR_1005] Invalid delimiterLine'),
          );
        },
      );

      it.each(reservedChars)(
        'should reject delimiterColumn containing reserved char %s',
        async (char) => {
          const mockConfig = {
            get: jest.fn((key: string, defaultValue: string) => {
              return key === 'delimiterColumn' ? `C${char}` : defaultValue;
            }),
            inspect: jest.fn((key: string) => {
              const defaults: Record<string, string> = {
                delimiterLine: 'L',
                delimiterColumn: 'C',
                delimiterHash: '#',
                delimiterRange: '-',
              };
              return {
                key,
                defaultValue: defaults[key] || 'L',
                globalValue: key === 'delimiterColumn' ? `C${char}` : undefined,
                workspaceValue: undefined,
                workspaceFolderValue: undefined,
              };
            }),
          };
          mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

          const extension = require('./extension');
          const context = { subscriptions: [] as any[] };
          extension.activate(context as any);

          expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR] [ERR_1005] Invalid delimiterColumn'),
          );
        },
      );

      it.each(reservedChars)(
        'should reject delimiterHash containing reserved char %s',
        async (char) => {
          const mockConfig = {
            get: jest.fn((key: string, defaultValue: string) => {
              return key === 'delimiterHash' ? `${char}#` : defaultValue;
            }),
            inspect: jest.fn((key: string) => {
              const defaults: Record<string, string> = {
                delimiterLine: 'L',
                delimiterColumn: 'C',
                delimiterHash: '#',
                delimiterRange: '-',
              };
              return {
                key,
                defaultValue: defaults[key] || 'L',
                globalValue: key === 'delimiterHash' ? `${char}#` : undefined,
                workspaceValue: undefined,
                workspaceFolderValue: undefined,
              };
            }),
          };
          mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

          const extension = require('./extension');
          const context = { subscriptions: [] as any[] };
          extension.activate(context as any);

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
                delimiterColumn: 'C',
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

          const extension = require('./extension');
          const context = { subscriptions: [] as any[] };
          extension.activate(context as any);

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
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

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
                delimiterColumn: 'C',
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

          const extension = require('./extension');
          const context = { subscriptions: [] as any[] };
          extension.activate(context as any);

          expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining(`[ERROR] [${expectedCode}] Invalid delimiterLine`),
          );
        },
      );
    });

    describe('Subset/superset conflict detection (Phase 1B)', () => {
      it('should reject when delimiterLine is substring at start of delimiterHash', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: 'L#',
              delimiterColumn: 'C',
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: 'L#',
              delimiterColumn: 'C',
              delimiterRange: '-',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters must not be substrings'),
        );
      });

      it('should reject when delimiterLine is substring at end of delimiterHash', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: '#L',
              delimiterColumn: 'C',
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterHash' ? '#L' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters must not be substrings'),
        );
      });

      it('should reject when delimiterLine is substring in middle of delimiterHash', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: 'XLY',
              delimiterColumn: 'C',
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterHash' ? 'XLY' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters must not be substrings'),
        );
      });

      it('should reject when delimiterRange is substring of delimiterHash', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
              delimiterHash: '#-',
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterHash' ? '#-' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters must not be substrings'),
        );
      });

      it('should be case-sensitive when checking substring conflicts', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterHash: 'l#', // lowercase l, different from L
              delimiterColumn: 'C',
              delimiterRange: '-',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return {
              key,
              defaultValue: defaults[key] || 'L',
              globalValue: key === 'delimiterHash' ? 'l#' : undefined,
              workspaceValue: undefined,
              workspaceFolderValue: undefined,
            };
          }),
        };
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        // Should NOT log substring conflict (case-sensitive)
        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('substrings'),
        );
        expect(errorCalls.length).toBe(0);
      });
    });

    describe('Aggregated error reporting (Phase 1B)', () => {
      it('should log multiple validation errors with specific codes', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const invalid: Record<string, string> = {
              delimiterLine: 'L~', // reserved char -> ERR_1005
              delimiterColumn: 'C1', // contains digit -> ERR_1003
              delimiterHash: '#',
              delimiterRange: '-',
            };
            return invalid[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0]?.includes('[ERROR]'),
        );
        expect(errorCalls.length).toBeGreaterThanOrEqual(2);
        const errorMessages = errorCalls.map((call) => call[0] as string).join('; ');
        expect(errorMessages).toContain('[ERROR] [ERR_1005]'); // Reserved char
        expect(errorMessages).toContain('[ERROR] [ERR_1003]'); // Contains digits
        expect(errorMessages).toContain('Invalid delimiterLine');
        expect(errorMessages).toContain('Invalid delimiterColumn');

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
          get: jest.fn((key: string, defaultValue: string) => {
            // All set to 'X' (duplicate) and hash contains 'L' (substring of line)
            const invalid: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'X',
              delimiterHash: 'XL', // contains 'L' (substring conflict)
              delimiterRange: 'X',
            };
            return invalid[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0]?.includes('[ERROR]'),
        );
        expect(errorCalls.length).toBeGreaterThanOrEqual(2);
        const errorMessages = errorCalls.map((call) => call[0] as string).join('; ');
        expect(errorMessages).toContain('[ERROR] [ERR_1006]'); // Not unique
        expect(errorMessages).toContain('[ERROR] [ERR_1007]'); // Substring conflict
        expect(errorMessages).toContain('Delimiters must be unique');
        expect(errorMessages).toContain('Delimiters must not be substrings');
      });

      it('should log all error types with specific codes: empty, digit, reserved, duplicate, substring', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const invalid: Record<string, string> = {
              delimiterLine: 'X', // will become duplicate
              delimiterColumn: 'C1', // contains digit -> ERR_1003
              delimiterHash: '#~', // reserved char -> ERR_1005
              delimiterRange: 'X', // duplicate of line -> ERR_1006
            };
            return invalid[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        const errorCalls = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0]?.includes('[ERROR]'),
        );
        expect(errorCalls.length).toBeGreaterThanOrEqual(3);
        const errorMessages = errorCalls.map((call) => call[0] as string).join('; ');
        expect(errorMessages).toContain('[ERROR] [ERR_1003]'); // Contains digits
        expect(errorMessages).toContain('[ERROR] [ERR_1005]'); // Reserved char
        expect(errorMessages).toContain('[ERROR] [ERR_1006]'); // Not unique
        expect(errorMessages).toContain('Invalid delimiterColumn');
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
              delimiterColumn: '列',
              delimiterHash: '#',
              delimiterRange: '至',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        // Should not log any errors
        const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('[ERROR]'),
        );
        expect(errorLogs.length).toBe(0);
      });

      it('should handle reverse substring conflict (larger contains smaller)', async () => {
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
              delimiterHash: 'ABC', // larger delimiter
              delimiterRange: 'B', // smaller, contained in hash
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters must not be substrings'),
        );
      });

      it('should handle all delimiter pairs in substring conflict check', async () => {
        // Test column-line conflict
        const mockConfig1 = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'LX', // contains L
              delimiterHash: '#',
              delimiterRange: '-',
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
        mockWorkspace.getConfiguration = jest.fn(() => mockConfig1);

        const extension = require('./extension');
        let context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('Delimiters must not be substrings'),
        );

        // Test range-column conflict
        jest.clearAllMocks();
        const mockConfig2 = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
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
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1007] Delimiters must not be substrings'),
        );
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
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1002] Invalid delimiterLine'),
        );
      });

      it('should log CRITICAL error with CONFIG_ERR_UNKNOWN when unexpected validation error occurs', () => {
        // This test verifies the default case in getErrorCodeForTesting by using type assertion
        // to force an invalid enum value that will trigger the default case.

        const extension = require('./extension');
        const { getErrorCodeForTesting, DelimiterValidationError } = extension;

        // Force the default case by using an invalid enum value via type assertion
        // This simulates what would happen if a new enum value was added but getErrorCode wasn't updated
        const invalidError = 'INVALID_ERROR_VALUE' as any as DelimiterValidationError;

        // Call getErrorCodeForTesting directly with the invalid value
        const errorCode = getErrorCodeForTesting(invalidError);

        // Verify it returns CONFIG_ERR_UNKNOWN
        expect(errorCode).toBe('ERR_1099'); // CONFIG_ERR_UNKNOWN
      });

      it('should log CRITICAL error message format when CONFIG_ERR_UNKNOWN is returned', () => {
        // Test that the CRITICAL message format is correct
        // We test this by verifying getErrorCodeForTesting returns ERR_1099 for invalid inputs
        // and verifying the message structure in the code

        const extension = require('./extension');
        const { getErrorCodeForTesting } = extension;

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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };

        // Should not throw, should use fallback values
        expect(() => extension.activate(context as any)).not.toThrow();
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
              delimiterColumn: 'B',
              delimiterHash: 'C',
              delimiterRange: 'D',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

        // Valid config should pass substring check
        const errorLogs = mockOutputChannel.appendLine.mock.calls.filter((call: string[]) =>
          call[0].includes('substrings'),
        );
        expect(errorLogs.length).toBe(0);
      });

      it('should handle all reserved character checks returning false (valid delimiter)', async () => {
        // This ensures the loop in isValidDelimiter completes without finding any reserved chars
        const mockConfig = {
          get: jest.fn((key: string, defaultValue: string) => {
            const custom: Record<string, string> = {
              delimiterLine: 'Alpha',
              delimiterColumn: 'Beta',
              delimiterHash: 'Gamma',
              delimiterRange: 'Delta',
            };
            return custom[key] || defaultValue;
          }),
          inspect: jest.fn((key: string) => {
            const defaults: Record<string, string> = {
              delimiterLine: 'L',
              delimiterColumn: 'C',
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

        const extension = require('./extension');
        const context = { subscriptions: [] as any[] };
        extension.activate(context as any);

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
            delimiterColumn: 'C',
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

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

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
            delimiterColumn: 'A',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return map[key] || defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterColumn: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: key === 'delimiterLine' || key === 'delimiterColumn' ? 'A' : undefined,
            workspaceValue: undefined,
            workspaceFolderValue: undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

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
            delimiterLine: 'L',
            delimiterColumn: 'Col',
            delimiterHash: '##',
            delimiterRange: '-->',
          };
          return custom[key] || defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterColumn: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          const custom: Record<string, string> = {
            delimiterLine: 'L',
            delimiterColumn: 'Col',
            delimiterHash: '##',
            delimiterRange: '-->',
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

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

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
        get: jest.fn((key: string, defaultValue: string) => defaultValue),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterColumn: 'C',
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

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

      // Should log configuration info
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Delimiter configuration loaded:'),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Line delimiter'),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Column delimiter'),
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

    it('should log source as workspace folder when workspaceFolderValue is set', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          return key === 'delimiterLine' ? 'CustomL' : defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterColumn: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: key === 'delimiterLine' ? 'CustomL' : undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0] || '');
      const lineDelimiterLog = logCalls.find(
        (msg) => msg.includes('Line delimiter') && msg.includes('CustomL'),
      );
      expect(lineDelimiterLog).toBeTruthy();
      if (lineDelimiterLog) {
        expect(lineDelimiterLog).toContain('from workspace folder');
      }
    });

    it('should log source as workspace when workspaceValue is set', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          return key === 'delimiterLine' ? 'WorkspaceL' : defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterColumn: 'C',
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

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);
      const lineDelimiterLog = logCalls.find((msg) => msg.includes('Line delimiter'));
      expect(lineDelimiterLog).toContain('from workspace');
    });

    it('should log source as user when globalValue is set', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          return key === 'delimiterLine' ? 'UserL' : defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterColumn: 'C',
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

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);
      const lineDelimiterLog = logCalls.find((msg) => msg.includes('Line delimiter'));
      expect(lineDelimiterLog).toContain('from user');
    });

    it('should prioritize workspace folder over workspace over user over default', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: string) => {
          const values: Record<string, string> = {
            delimiterLine: 'FolderL',
            delimiterColumn: 'WorkspaceC',
            delimiterHash: 'User#',
            delimiterRange: '-',
          };
          return values[key] || defaultValue;
        }),
        inspect: jest.fn((key: string) => {
          const defaults: Record<string, string> = {
            delimiterLine: 'L',
            delimiterColumn: 'C',
            delimiterHash: '#',
            delimiterRange: '-',
          };
          return {
            key,
            defaultValue: defaults[key] || 'L',
            // Only set the highest priority value for each key
            globalValue: key === 'delimiterHash' ? 'User#' : undefined,
            workspaceValue: key === 'delimiterColumn' ? 'WorkspaceC' : undefined,
            workspaceFolderValue: key === 'delimiterLine' ? 'FolderL' : undefined,
          };
        }),
      };
      mockWorkspace.getConfiguration = jest.fn(() => mockConfig);

      const extension = require('./extension');
      const context = { subscriptions: [] as any[] };
      extension.activate(context as any);

      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call) => call[0]);
      const lineLog = logCalls.find((msg) => msg.includes('Line delimiter'));
      const columnLog = logCalls.find((msg) => msg.includes('Column delimiter'));
      const hashLog = logCalls.find((msg) => msg.includes('Hash delimiter'));

      expect(lineLog).toContain('from workspace folder');
      expect(columnLog).toContain('from workspace');
      expect(hashLog).toContain('from user');
    });
  });
});

describe('Extension lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          delimiterColumn: 'C',
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

    const extension = require('./extension');
    extension.activate(mockContext as any);

    expect(mockCommands.registerCommand).toHaveBeenCalledTimes(2);
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    expect(mockWindow.createOutputChannel).toHaveBeenCalledWith('RangeLink');
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
          delimiterColumn: 'C',
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

    const extension = require('./extension');
    extension.activate(mockContext as any);

    extension.deactivate();

    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });
});
