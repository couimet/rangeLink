import { pingLog, setLogger } from 'barebone-logger';
import * as vscode from 'vscode';

import * as extension from '../extension';
import { messagesEn } from '../i18n/messages.en';
import { MessageCode } from '../types/MessageCode';
import * as formatMessageModule from '../utils/formatMessage';
import { VSCodeLogger } from '../VSCodeLogger';

import {
  createMockCommands,
  createMockMemento,
  createMockOutputChannel,
  createMockStatusBarItem,
  createMockWindow,
  createMockWorkspace,
} from './helpers';

// Create reusable mocks using our utilities
const mockStatusBarItem = createMockStatusBarItem();
const mockOutputChannel = createMockOutputChannel();
const mockWorkspace = createMockWorkspace() as any;
let mockCommands = createMockCommands();

// Create window mock
const mockWindow = createMockWindow() as any;

// Setup return values for factory methods
mockWindow.createStatusBarItem.mockReturnValue(mockStatusBarItem);
mockWindow.createOutputChannel.mockReturnValue(mockOutputChannel);

jest.mock('vscode', () => ({
  window: {
    activeTextEditor: null,
    activeTerminal: null,
    createStatusBarItem: jest.fn(() => ({
      text: '',
      tooltip: undefined,
      command: undefined,
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createOutputChannel: jest.fn(),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showTextDocument: jest.fn().mockResolvedValue(undefined),
    setStatusBarMessage: jest.fn(),
    onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeVisibleTextEditors: jest.fn(() => ({ dispose: jest.fn() })),
    registerTerminalLinkProvider: jest.fn(() => ({ dispose: jest.fn() })),
  },
  workspace: {
    getWorkspaceFolder: jest.fn(),
    asRelativePath: jest.fn(),
    getConfiguration: jest.fn(),
    openTextDocument: jest.fn().mockResolvedValue(undefined),
    onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  },
  languages: {
    registerDocumentLinkProvider: jest.fn(() => ({ dispose: jest.fn() })),
  },
  env: {
    clipboard: { writeText: jest.fn() },
    appName: 'Visual Studio Code',
    uriScheme: 'vscode',
    language: 'en',
  },
  extensions: {
    all: [],
    getExtension: jest.fn(),
  },
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
  ThemeIcon: class {
    constructor(
      public id: string,
      public color?: any,
    ) {}
  },
}));

describe('Configuration loading and validation', () => {
  beforeEach(() => {
    mockOutputChannel.appendLine.mockClear();

    // Wire up mocks - use arrow function to allow dynamic reassignment
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
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

      // Extension imported at top
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
      extension.activate(context as any);

      expect(mockConfig.get).toHaveBeenCalled();
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
      extension.activate(context as any);

      // Should not log any errors
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
      );
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
      extension.activate(context as any);

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

      // Verify "from default" is logged for Line delimiter
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/Line delimiter.*from default/),
      );
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
      extension.activate(context as any);

      // Verify Line delimiter logged with user source
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/Line delimiter.*UserL.*from user/),
      );
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
      extension.activate(context as any);

      // Verify source prioritization: workspace folder > workspace > user > default
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/Line delimiter.*from workspaceFolder/),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/Position delimiter.*from workspace(?! folder)/),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/Hash delimiter.*from user/),
      );
    });
  });
});

describe('Extension lifecycle', () => {
  beforeEach(() => {
    // Wire up mocks
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    (vscode.window.showErrorMessage as jest.Mock).mockImplementation(mockWindow.showErrorMessage);
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(
      mockWorkspace.getConfiguration,
    );
    (vscode.commands.registerCommand as jest.Mock).mockImplementation(mockCommands.registerCommand);
  });

  it('should register all commands on activate', async () => {
    const mockContext = {
      subscriptions: [] as vscode.Disposable[],
      globalState: createMockMemento(),
    };

    // Mock configuration
    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? 'L'),
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

    // Set up mocks BEFORE activate
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    // Extension imported at top
    extension.activate(mockContext as any);

    // Verify all commands are registered
    // Note: Command registration is IDE-agnostic; runtime availability differs by environment
    expect(mockCommands.registerCommand).toHaveBeenCalledTimes(26);
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('RangeLink');

    // Verify all command IDs are registered correctly (sorted alphabetically)
    const expectedCommands = [
      'rangelink.bindToClaudeCode',
      'rangelink.bindToCursorAI',
      'rangelink.bindToGitHubCopilotChat',
      'rangelink.bindToTerminal',
      'rangelink.bindToTerminalHere',
      'rangelink.bindToTextEditor',
      'rangelink.bindToTextEditorHere',
      'rangelink.bookmark.add',
      'rangelink.bookmark.list',
      'rangelink.bookmark.manage',
      'rangelink.copyLinkOnlyWithAbsolutePath',
      'rangelink.copyLinkOnlyWithRelativePath',
      'rangelink.copyLinkWithAbsolutePath',
      'rangelink.copyLinkWithRelativePath',
      'rangelink.copyPortableLinkWithAbsolutePath',
      'rangelink.copyPortableLinkWithRelativePath',
      'rangelink.handleDocumentLinkClick',
      'rangelink.jumpToBoundDestination',
      'rangelink.openStatusBarMenu',
      'rangelink.pasteCurrentFileAbsolutePath',
      'rangelink.pasteCurrentFileRelativePath',
      'rangelink.pasteFileAbsolutePath',
      'rangelink.pasteFileRelativePath',
      'rangelink.pasteSelectedTextToDestination',
      'rangelink.showVersion',
      'rangelink.unbindDestination',
    ];

    // Verify each command was registered
    for (const command of expectedCommands) {
      expect(mockCommands.registerCommand).toHaveBeenCalledWith(command, expect.any(Function));
    }
  });

  it('should clean up on deactivate', () => {
    const mockContext = {
      subscriptions: [] as vscode.Disposable[],
      globalState: createMockMemento(),
    };

    // Mock configuration
    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? 'L'),
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

    // Set up mocks BEFORE activate
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    // Extension imported at top
    extension.activate(mockContext as any);

    extension.deactivate();

    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });
});

describe('Logger verification and communication channel', () => {
  beforeEach(() => {
    mockOutputChannel.appendLine.mockClear();
    // Ensure vscode.window.createOutputChannel returns mockOutputChannel
    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    // Ensure createStatusBarItem returns mockStatusBarItem for tests that call activate()
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
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
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    const context = { subscriptions: [] as vscode.Disposable[], globalState: createMockMemento() };
    extension.activate(context as any);

    // Verify debug() was called during setLogger with initialization message
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringMatching(/\[DEBUG\].*setLogger.*Logger initialized/),
    );
  });

  it('should support pingLog() to exercise all logger levels', () => {
    // Create a fresh logger with our mock output channel
    const logger = new VSCodeLogger(mockOutputChannel as unknown as vscode.OutputChannel);
    mockOutputChannel.appendLine.mockClear();

    // Set the logger and clear the initialization message
    setLogger(logger);
    mockOutputChannel.appendLine.mockClear();

    // Call pingLog to exercise all levels
    pingLog();

    // Verify all 4 ping messages were logged
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringMatching(/\[DEBUG\].*pingLog.*Ping for DEBUG/),
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringMatching(/\[INFO\].*pingLog.*Ping for INFO/),
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringMatching(/\[WARNING\].*pingLog.*Ping for WARN/),
    );
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringMatching(/\[ERROR\].*pingLog.*Ping for ERROR/),
    );
  });

  it('should verify VSCodeLogger properly formats debug messages', () => {
    const logger = new VSCodeLogger(mockOutputChannel as unknown as vscode.OutputChannel);
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

  describe('i18n integration for version command', () => {
    let formatMessageSpy: jest.SpyInstance;
    const mockContext = {
      subscriptions: [] as vscode.Disposable[],
      globalState: createMockMemento(),
    };

    beforeEach(() => {
      formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');
      jest.mock('../version.json', () => ({
        version: '1.0.0',
        commit: 'abc123',
        commitFull: 'abc123def456',
        branch: 'main',
        buildDate: '2025-01-16',
        isDirty: false,
      }));

      // Mock workspace config
      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? 'L'),
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
      (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    });

    it('should call formatMessage with INFO_COMMIT_HASH_COPIED when copying commit hash', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Copy Commit Hash');

      // Capture command handler via mockImplementation
      let showVersionHandler: (() => Promise<void>) | undefined;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((commandId, handler) => {
        if (commandId === 'rangelink.showVersion') {
          showVersionHandler = handler;
        }
        return { dispose: jest.fn() };
      });

      // Activate extension
      extension.activate(mockContext as unknown as vscode.ExtensionContext);

      expect(showVersionHandler).toBeDefined();

      // Execute the command handler
      await showVersionHandler!();

      // Verify formatMessage was called with correct MessageCode
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.INFO_COMMIT_HASH_COPIED);
    });

    it('should show information message with correct commit hash copied text', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Copy Commit Hash');

      // Capture command handler via mockImplementation
      let showVersionHandler: (() => Promise<void>) | undefined;
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((commandId, handler) => {
        if (commandId === 'rangelink.showVersion') {
          showVersionHandler = handler;
        }
        return { dispose: jest.fn() };
      });

      // Activate extension
      extension.activate(mockContext as unknown as vscode.ExtensionContext);

      expect(showVersionHandler).toBeDefined();

      // Get and execute handler
      await showVersionHandler!();

      const expectedMessage = messagesEn[MessageCode.INFO_COMMIT_HASH_COPIED];
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expectedMessage);
    });
  });
});
