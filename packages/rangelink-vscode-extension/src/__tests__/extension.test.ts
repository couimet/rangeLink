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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
      extension.activate(context as any);

      // Verify error was logged with specific error code (digits = ERR_1003, reserved = ERR_1005, etc.)
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERROR\].*ERR_100/),
      );
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        // Verify error was logged with specific error code
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(new RegExp(`\\[ERROR\\].*\\[${expectedCode}\\]`)),
        );
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
          const context = {
            subscriptions: [] as vscode.Disposable[],
            globalState: createMockMemento(),
          };
          extension.activate(context as any);

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
          const context = {
            subscriptions: [] as vscode.Disposable[],
            globalState: createMockMemento(),
          };
          extension.activate(context as any);

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
          const context = {
            subscriptions: [] as vscode.Disposable[],
            globalState: createMockMemento(),
          };
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
          const context = {
            subscriptions: [] as vscode.Disposable[],
            globalState: createMockMemento(),
          };
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
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
          const context = {
            subscriptions: [] as vscode.Disposable[],
            globalState: createMockMemento(),
          };
          extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        // Should log uniqueness error (L and l are same when case-insensitive)
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1006]'),
        );
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        // Should log error for reserved char (ERR_1005) and digits (ERR_1003)
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(/\[ERROR\] \[ERR_1005\].*Invalid delimiterLine/),
        );
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(/\[ERROR\] \[ERR_1003\].*Invalid delimiterPosition/),
        );

        // Should also log INFO about using defaults
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(/\[INFO\].*(CONFIG_USING_DEFAULTS|MSG_1002)/),
        );
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        // Should log error for uniqueness (ERR_1006) and substring conflict (ERR_1007)
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(/\[ERROR\] \[ERR_1006\].*Delimiters must be unique/),
        );
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(/\[ERROR\] \[ERR_1007\].*Delimiters cannot be substrings/),
        );
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        // Should log error for digits (ERR_1003), reserved char (ERR_1005), and uniqueness (ERR_1006)
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(/\[ERROR\] \[ERR_1003\].*Invalid delimiterPosition/),
        );
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(/\[ERROR\] \[ERR_1005\].*Invalid delimiterHash/),
        );
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringMatching(/\[ERROR\] \[ERR_1006\].*Delimiters must be unique/),
        );
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        let context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('Delimiters cannot be substrings'),
        );

        // Test range-column conflict
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
        context = { subscriptions: [] as vscode.Disposable[], globalState: createMockMemento() };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        // Should not log any errors - no conflicts between these delimiters (even when compared case-insensitively)
        expect(mockOutputChannel.appendLine).not.toHaveBeenCalledWith(
          expect.stringContaining('[ERROR]'),
        );
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        // Should log ERR_1005 (reserved char), not ERR_1008 (single char check passes)
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1005]'),
        );
        // Should NOT log single-char error
        expect(mockOutputChannel.appendLine).not.toHaveBeenCalledWith(
          expect.stringContaining('[ERR_1008]'),
        );
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] [ERR_1002] Invalid delimiterLine'),
        );
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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };

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
        const context = {
          subscriptions: [] as vscode.Disposable[],
          globalState: createMockMemento(),
        };
        extension.activate(context as any);

        // Valid config should pass substring check
        expect(mockOutputChannel.appendLine).not.toHaveBeenCalledWith(
          expect.stringContaining('substrings'),
        );
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
      extension.activate(context as any);

      // Verify Line delimiter logged with workspace folder source
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/Line delimiter.*FolderL.*from workspace folder/),
      );
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
      const context = {
        subscriptions: [] as vscode.Disposable[],
        globalState: createMockMemento(),
      };
      extension.activate(context as any);

      // Verify Line delimiter logged with workspace source (but not "folder" or "user")
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/Line delimiter.*WorkspaceL.*from workspace(?! folder)/),
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
    expect(mockCommands.registerCommand).toHaveBeenCalledTimes(20);
    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('RangeLink');

    // Verify all command IDs are registered correctly (sorted alphabetically)
    const expectedCommands = [
      'rangelink.bindToClaudeCode',
      'rangelink.bindToCursorAI',
      'rangelink.bindToGitHubCopilotChat',
      'rangelink.bindToTerminal',
      'rangelink.bindToTextEditor',
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
