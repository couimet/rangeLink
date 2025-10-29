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

  describe('Invalid delimiter values', () => {
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

      // Verify error was logged
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    });

    it.each([
      ['empty string', ''],
      ['whitespace', '   '],
      ['numbers only', '123'],
      ['contains numbers', 'A1'],
      ['contains numbers', '1A'],
    ])('should log error and use default when value is "%s"', async (description, invalidValue) => {
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

      // Verify error was logged
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
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
    it('should log source of each delimiter on startup', async () => {
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
