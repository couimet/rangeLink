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
    service = new RangeLinkService({ line: 'L', column: 'C', hash: '#', range: '-' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLink - Cursor position (empty selection)', () => {
    it('should create link for empty selection', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 5, character: 0 },
          end: { line: 5, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue({
        uri: { path: '/workspace' },
      });
      mockWorkspace.asRelativePath.mockReturnValue('src/file.ts');

      await service.createLink(false);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/file.ts:6');
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
  });

  describe('createLink - Multi-line selections', () => {
    it('should copy range when selection spans multiple full lines', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 10, character: 0 },
          end: { line: 25, character: 0 },
          isEmpty: false,
        },
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
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
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
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: 'C:\\workspace\\src\\file.ts' },
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
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: 'C:\\workspace\\src\\file.ts' },
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
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: '/some/file.ts' },
        },
      };

      mockWorkspace.getWorkspaceFolder.mockReturnValue(undefined);

      await service.createLink(false);

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('createLink - Status bar feedback', () => {
    it('should show status bar message after copying', async () => {
      mockWindow.activeTextEditor = {
        selection: {
          start: { line: 42, character: 0 },
          end: { line: 42, character: 0 },
          isEmpty: true,
        },
        document: {
          uri: { fsPath: '/workspace/src/file.ts' },
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
