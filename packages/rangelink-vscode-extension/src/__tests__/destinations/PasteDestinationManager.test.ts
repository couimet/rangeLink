import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

// Mock vscode.window and vscode.workspace for status bar messages and event listeners
jest.mock('vscode', () => ({
  ...jest.requireActual('vscode'),
  window: {
    ...jest.requireActual('vscode').window,
    setStatusBarMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeVisibleTextEditors: jest.fn(() => ({ dispose: jest.fn() })),
    activeTerminal: undefined,
  },
  workspace: {
    onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  },
}));

import { DestinationFactory } from '../../destinations/DestinationFactory';
import type { PasteDestination } from '../../destinations/PasteDestination';
import { PasteDestinationManager } from '../../destinations/PasteDestinationManager';
import { MessageCode } from '../../types/MessageCode';
import * as formatMessageModule from '../../utils/formatMessage';
import { configureEmptyTabGroups } from '../helpers/configureEmptyTabGroups';
import { createMockClaudeCodeDestination } from '../helpers/createMockClaudeCodeDestination';
import { createMockCursorAIDestination } from '../helpers/createMockCursorAIDestination';
import { createMockDocument } from '../helpers/createMockDocument';
import { createMockEditor } from '../helpers/createMockEditor';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';
import { createMockTerminalDestination } from '../helpers/createMockTerminalDestination';
import { createMockText } from '../helpers/createMockText';
import { createMockTextEditorDestination } from '../helpers/createMockTextEditorDestination';
import { createMockUri } from '../helpers/createMockUri';
import {
  createMockVscodeAdapter,
  type MockVscodeOptions,
  type VscodeAdapterWithTestHooks,
} from '../helpers/mockVSCode';

/**
 * Helper to assert QuickPick was called with confirmation dialog for smart bind.
 * Validates that items contain expected labels and that placeholder is present.
 */
const expectQuickPickConfirmation = (
  showQuickPickMock: jest.Mock,
  expectedStrings: { currentDestination: string; newDestination: string },
): void => {
  expect(showQuickPickMock).toHaveBeenCalledTimes(1);

  const [items, options] = showQuickPickMock.mock.calls[0] as [
    vscode.QuickPickItem[],
    vscode.QuickPickOptions,
  ];

  // Verify items structure
  expect(items).toHaveLength(2);
  expect(items[0].label).toContain('replace');
  expect(items[0].description).toContain(expectedStrings.currentDestination);
  expect(items[0].description).toContain(expectedStrings.newDestination);
  expect(items[1].label).toContain('keep');

  // Verify placeholder
  expect(options.placeHolder).toContain(expectedStrings.currentDestination);
  expect(options.placeHolder).toContain(expectedStrings.newDestination);
};

describe('PasteDestinationManager', () => {
  let manager: PasteDestinationManager;
  let mockContext: vscode.ExtensionContext;
  let mockFactory: DestinationFactory;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let terminalCloseListener: (terminal: vscode.Terminal) => void;
  let documentCloseListener: (document: vscode.TextDocument) => void;
  let formatMessageSpy: jest.SpyInstance;

  /**
   * Helper to create a manager with optional environment overrides.
   * Useful for tests that need to simulate Cursor IDE.
   */
  const createManager = (envOptions?: MockVscodeOptions['envOptions']) => {
    const adapter = createMockVscodeAdapter({
      envOptions,
      windowOptions: {
        onDidCloseTerminal: jest.fn((listener) => {
          terminalCloseListener = listener;
          return { dispose: jest.fn() };
        }),
      },
      workspaceOptions: {
        onDidCloseTextDocument: jest.fn((listener) => {
          documentCloseListener = listener;
          return { dispose: jest.fn() };
        }),
      },
    });

    const factory = new DestinationFactory(adapter, mockLogger);
    const mgr = new PasteDestinationManager(mockContext, factory, adapter, mockLogger);

    return { manager: mgr, adapter, factory };
  };

  beforeEach(() => {
    // Spy on formatMessage to verify MessageCode usage
    formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Capture event listeners
    terminalCloseListener = jest.fn();
    documentCloseListener = jest.fn();

    // Create default manager with VSCode environment
    const result = createManager();
    manager = result.manager;
    mockAdapter = result.adapter;
    mockFactory = result.factory;
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('bind() - terminal', () => {
    let mockTerminal: vscode.Terminal;

    beforeEach(() => {
      mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;
    });

    it('should bind to active terminal successfully', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

      const result = await manager.bind('terminal');

      expect(result).toBe(true);
      expect(manager.isBound()).toBe(true);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to bash',
        3000,
      );
    });

    it('should fail when no active terminal', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = undefined;

      const result = await manager.bind('terminal');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ERROR_NO_ACTIVE_TERMINAL);
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: No active terminal. Open a terminal and try again.',
      );
    });

    it('should show info message when binding same terminal twice', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      formatMessageSpy.mockClear();
      // Try binding again to same destination
      const result = await manager.bind('terminal');

      expect(result).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ALREADY_BOUND_TO_DESTINATION, {
        destinationName: 'Terminal',
      });
      expect(mockAdapter.__getVscodeInstance().window.showInformationMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to Terminal',
      );
    });

    it('should handle unnamed terminal', async () => {
      const unnamedTerminal = {
        name: undefined,
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = unnamedTerminal;

      const result = await manager.bind('terminal');

      expect(result).toBe(true);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to Unnamed Terminal',
        3000,
      );
    });
  });

  describe('bind() - chat destinations', () => {
    it('should bind to cursor-ai when available', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        appName: 'Cursor',
      });

      const result = await localManager.bind('cursor-ai');

      expect(result).toBe(true);
      expect(localManager.isBound()).toBe(true);
      expect(localAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to Cursor AI Assistant',
        3000,
      );

      localManager.dispose();
    });

    it('should fail when cursor-ai not available', async () => {
      // Mock non-Cursor IDE (already configured in beforeEach as non-Cursor)
      const result = await manager.bind('cursor-ai');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);

      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ERROR_CURSOR_AI_NOT_AVAILABLE);

      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot bind Cursor AI Assistant - not running in Cursor IDE',
      );
    });

    it('should fail when claude-code not available', async () => {
      const mockDestination = createMockClaudeCodeDestination();
      mockDestination.isAvailable = jest.fn().mockResolvedValue(false);
      jest.spyOn(mockFactory, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind('claude-code');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ERROR_CLAUDE_CODE_NOT_AVAILABLE);
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot bind Claude Code - extension not installed or not active',
      );
    });

    it('should show info message when binding same chat destination twice', async () => {
      // Create manager with Cursor IDE environment
      const { manager: localManager, adapter: localAdapter } = createManager({
        appName: 'Cursor',
      });
      await localManager.bind('cursor-ai');

      // Try binding again to same destination
      const result = await localManager.bind('cursor-ai');

      expect(result).toBe(false);
      expect(localAdapter.__getVscodeInstance().window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Already bound to Cursor AI Assistant'),
      );

      localManager.dispose();
    });
  });

  describe('bind() - text-editor', () => {
    it('should fail to bind text editor with less than 2 tab groups', async () => {
      // Setup: Single tab group (no split editor)
      mockAdapter.__getVscodeInstance().window.activeTextEditor = {
        document: { uri: { scheme: 'file', fsPath: '/test/file.ts' } },
      } as vscode.TextEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 1);

      const result = await manager.bind('text-editor');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ERROR_TEXT_EDITOR_REQUIRES_SPLIT);
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Text editor binding requires split editor (2+ tab groups). Split your editor and try again.',
      );
    });

    it('should fail to bind text editor when no active editor', async () => {
      // Setup: No active text editor
      mockAdapter.__getVscodeInstance().window.activeTextEditor = undefined;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      const result = await manager.bind('text-editor');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ERROR_NO_ACTIVE_TEXT_EDITOR);
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: No active text editor. Open a file and try again.',
      );
    });

    it('should fail to bind text editor to binary file', async () => {
      // Setup: Binary file (non-text scheme)
      const testFileName = 'binary.dat';
      mockAdapter.__getVscodeInstance().window.activeTextEditor = {
        document: {
          uri: { scheme: 'vscode-userdata', fsPath: `/test/${testFileName}` },
        },
      } as vscode.TextEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      const result = await manager.bind('text-editor');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ERROR_TEXT_EDITOR_NOT_TEXT_LIKE, {
        fileName: testFileName,
      });
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        `RangeLink: Cannot bind to ${testFileName} - not a text-like file (binary or special scheme)`,
      );
    });
  });

  describe('bind() - cross-destination conflicts', () => {
    it('should show confirmation when binding chat while terminal already bound', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({ appName: 'Cursor' });

      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      localAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await localManager.bind('terminal');

      // Mock user cancels confirmation
      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to Cursor AI
      const result = await localManager.bind('cursor-ai');

      expect(result).toBe(false);
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Terminal',
        newDestination: 'Cursor AI Assistant',
      });

      localManager.dispose();
    });

    it('should show confirmation when binding terminal while chat already bound', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({ appName: 'Cursor' });
      await localManager.bind('cursor-ai');

      // Mock user cancels confirmation
      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to terminal
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      localAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      const result = await localManager.bind('terminal');

      expect(result).toBe(false);
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Cursor AI Assistant',
        newDestination: 'Terminal',
      });

      localManager.dispose();
    });
  });

  describe('unbind()', () => {
    it('should unbind terminal successfully', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      manager.unbind();

      expect(manager.isBound()).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink unbound from Terminal',
        2000,
      );
    });

    it('should unbind chat destination successfully', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        appName: 'Cursor',
      });
      await localManager.bind('cursor-ai');

      localManager.unbind();

      expect(localManager.isBound()).toBe(false);
      expect(localAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink unbound from Cursor AI Assistant',
        2000,
      );

      localManager.dispose();
    });

    it('should handle unbind when nothing bound', () => {
      manager.unbind();

      expect(manager.isBound()).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        'RangeLink: No destination bound',
        2000,
      );
    });
  });

  describe('sendToDestination()', () => {
    // Mock factory and destinations for unit tests
    let mockFactoryForSend: jest.Mocked<DestinationFactory>;
    let mockTerminalDest: jest.Mocked<PasteDestination>;
    let mockChatDest: jest.Mocked<PasteDestination>;

    // Helper to create mock destination
    const createMockDest = (
      id: string,
      displayName: string,
      loggingDetails: Record<string, unknown> = {},
    ): jest.Mocked<PasteDestination> =>
      ({
        id,
        displayName,
        isAvailable: jest.fn().mockResolvedValue(true),
        pasteLink: jest.fn().mockResolvedValue(true),
        getUserInstruction: jest.fn().mockReturnValue('Instructions'),
        setTerminal: jest.fn(),
        getLoggingDetails: jest.fn().mockReturnValue(loggingDetails),
      }) as unknown as jest.Mocked<PasteDestination>;

    beforeEach(() => {
      mockTerminalDest = createMockDest('terminal', 'Terminal', { terminalName: 'bash' });
      mockChatDest = createMockDest('cursor-ai', 'Cursor AI Assistant', {});

      mockFactoryForSend = {
        create: jest.fn().mockImplementation((type) => {
          if (type === 'terminal') return mockTerminalDest;
          if (type === 'cursor-ai') return mockChatDest;
          throw new Error(`Unexpected type: ${type}`);
        }),
      } as unknown as jest.Mocked<DestinationFactory>;

      // Recreate manager with mock factory
      manager = new PasteDestinationManager(
        mockContext,
        mockFactoryForSend,
        mockAdapter,
        mockLogger,
      );
    });

    it('should send to bound terminal successfully', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      const result = await manager.sendToDestination(formattedLink);

      expect(result).toBe(true);
      expect(mockTerminalDest.pasteLink).toHaveBeenCalledTimes(1);
      expect(mockTerminalDest.pasteLink).toHaveBeenCalledWith(formattedLink);
    });

    it('should send to bound chat destination successfully', async () => {
      // Mock Cursor environment
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';

      await manager.bind('cursor-ai');

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      const result = await manager.sendToDestination(formattedLink);

      // Test only manager orchestration - delegate calls pasteLink on destination
      expect(result).toBe(true);
      expect(mockChatDest.pasteLink).toHaveBeenCalledTimes(1);
      expect(mockChatDest.pasteLink).toHaveBeenCalledWith(formattedLink);
    });

    it('should return false when no destination bound', async () => {
      const result = await manager.sendToDestination(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(false);
      expect(mockTerminalDest.pasteLink).not.toHaveBeenCalled();
      expect(mockChatDest.pasteLink).not.toHaveBeenCalled();
    });

    it('should return false when paste fails', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Mock paste failure
      mockTerminalDest.pasteLink.mockResolvedValueOnce(false);

      const result = await manager.sendToDestination(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(false);
      expect(mockTerminalDest.pasteLink).toHaveBeenCalledTimes(1);
    });

    it('should log destination details when sending to terminal', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      await manager.sendToDestination(formattedLink);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'PasteDestinationManager.sendToDestination',
          destinationType: 'terminal',
          displayName: 'Terminal',
          formattedLink,
          terminalName: 'bash',
        }),
        expect.stringContaining('Sending text to Terminal'),
      );
    });

    it('should log error when paste fails', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Mock paste failure
      mockTerminalDest.pasteLink.mockResolvedValueOnce(false);

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      await manager.sendToDestination(formattedLink);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'PasteDestinationManager.sendToDestination',
          destinationType: 'terminal',
          displayName: 'Terminal',
          formattedLink,
        }),
        expect.stringContaining('Paste link failed to Terminal'),
      );
    });
  });

  describe('Terminal closure auto-unbind', () => {
    it('should auto-unbind when bound terminal closes', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Simulate terminal close
      terminalCloseListener(mockTerminal);

      expect(manager.isBound()).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        'Destination binding removed (terminal closed)',
        3000,
      );
    });

    it('should not unbind when different terminal closes', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      const otherTerminal = {
        name: 'zsh',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Simulate other terminal close
      terminalCloseListener(otherTerminal);

      expect(manager.isBound()).toBe(true);
    });

    it('should not auto-unbind for chat destinations', async () => {
      const { manager: localManager } = createManager({ appName: 'Cursor' });
      await localManager.bind('cursor-ai');

      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      // Simulate terminal close (should not affect chat binding)
      terminalCloseListener(mockTerminal);

      expect(localManager.isBound()).toBe(true);

      localManager.dispose();
    });
  });

  describe('Text editor closure auto-unbind', () => {
    it('should auto-unbind when bound text editor document closes', async () => {
      const mockDocument = {
        uri: { scheme: 'file', fsPath: '/test/file.ts', toString: () => 'file:///test/file.ts' },
      } as vscode.TextDocument;

      const mockEditor = {
        document: mockDocument,
      } as vscode.TextEditor;

      mockAdapter.__getVscodeInstance().window.activeTextEditor = mockEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      await manager.bind('text-editor');
      expect(manager.isBound()).toBe(true);

      // Clear mocks to isolate document close behavior
      formatMessageSpy.mockClear();
      (mockAdapter.__getVscodeInstance().window.setStatusBarMessage as jest.Mock).mockClear();
      (mockAdapter.__getVscodeInstance().window.showInformationMessage as jest.Mock).mockClear();

      // Simulate document close
      documentCloseListener(mockDocument);

      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.BOUND_EDITOR_CLOSED_AUTO_UNBOUND);
      expect(
        mockAdapter.__getVscodeInstance().window.showInformationMessage,
      ).not.toHaveBeenCalled();
      // Two calls: 1) unbind() message, 2) document close message
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledTimes(2);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenNthCalledWith(
        1,
        '✓ RangeLink unbound from Text Editor',
        2000,
      );
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenNthCalledWith(
        2,
        'RangeLink: Bound editor closed. Unbound.',
        2000,
      );
    });

    it('should not unbind when different document closes', async () => {
      const boundDocument = {
        uri: { scheme: 'file', fsPath: '/test/file.ts', toString: () => 'file:///test/file.ts' },
      } as vscode.TextDocument;

      const otherDocument = {
        uri: {
          scheme: 'file',
          fsPath: '/test/other.ts',
          toString: () => 'file:///test/other.ts',
        },
      } as vscode.TextDocument;

      const mockEditor = {
        document: boundDocument,
      } as vscode.TextEditor;

      mockAdapter.__getVscodeInstance().window.activeTextEditor = mockEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      await manager.bind('text-editor');
      expect(manager.isBound()).toBe(true);

      // Simulate different document close
      documentCloseListener(otherDocument);

      expect(manager.isBound()).toBe(true);
    });

    it('should not auto-unbind for non-text-editor destinations', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      const mockDocument = {
        uri: { scheme: 'file', fsPath: '/test/file.ts', toString: () => 'file:///test/file.ts' },
      } as vscode.TextDocument;

      // Simulate document close (should not affect terminal binding)
      documentCloseListener(mockDocument);

      expect(manager.isBound()).toBe(true);
    });
  });

  describe('getBoundDestination()', () => {
    it('should return bound destination', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      const destination = manager.getBoundDestination();

      expect(destination).toBeDefined();
      expect(destination?.id).toBe('terminal');
      expect(destination?.displayName).toBe('Terminal');
    });

    it('should return undefined when nothing bound', () => {
      const destination = manager.getBoundDestination();

      expect(destination).toBeUndefined();
    });
  });

  describe('isBound()', () => {
    it('should return true when terminal bound', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      expect(manager.isBound()).toBe(true);
    });

    it('should return true when chat destination bound', async () => {
      const { manager: localManager } = createManager({ appName: 'Cursor' });
      await localManager.bind('cursor-ai');

      expect(localManager.isBound()).toBe(true);

      localManager.dispose();
    });

    it('should return false when nothing bound', () => {
      expect(manager.isBound()).toBe(false);
    });

    it('should return false after unbind', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');
      manager.unbind();

      expect(manager.isBound()).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('should dispose of event listeners', () => {
      const disposeSpy = jest.fn();
      const testAdapter = createMockVscodeAdapter();
      const testVscode = testAdapter.__getVscodeInstance();
      (testVscode.window.onDidCloseTerminal as jest.Mock) = jest.fn(() => ({
        dispose: disposeSpy,
      }));
      (testVscode.workspace.onDidCloseTextDocument as jest.Mock) = jest.fn(() => ({
        dispose: disposeSpy,
      }));

      const newManager = new PasteDestinationManager(
        mockContext,
        mockFactory,
        testAdapter,
        mockLogger,
      );
      newManager.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should handle multiple dispose calls safely', () => {
      manager.dispose();
      manager.dispose(); // Should not throw

      expect(true).toBe(true); // If we reach here, no error was thrown
    });
  });

  /**
   * Smart Bind Feature Tests (Issue #108)
   *
   * Tests the confirmation flow when replacing existing destination bindings.
   */
  describe('Smart Bind Feature', () => {
    // Mock factory for smart bind tests
    let mockFactoryForSmartBind: jest.Mocked<DestinationFactory>;

    // Helper to create mock destinations with all required methods
    const createMockDestination = (
      id: string,
      displayName: string,
      isAvailable = true,
    ): jest.Mocked<PasteDestination> =>
      ({
        id,
        displayName,
        isAvailable: jest.fn().mockResolvedValue(isAvailable),
        paste: jest.fn().mockResolvedValue(true),
        // Terminal-specific methods
        setTerminal: jest.fn(),
        // TextEditor-specific methods
        setEditor: jest.fn(),
        getEditorDisplayName: jest.fn().mockReturnValue(displayName),
        getEditorPath: jest.fn().mockReturnValue('/test/file.ts'),
        getBoundDocumentUri: jest.fn(),
        getLoggingDetails: jest.fn().mockReturnValue({}),
      }) as unknown as jest.Mocked<PasteDestination>;

    beforeEach(() => {
      // Create mock factory for smart bind tests
      mockFactoryForSmartBind = {
        create: jest.fn(),
      } as unknown as jest.Mocked<DestinationFactory>;

      // Recreate manager with mock factory
      manager = new PasteDestinationManager(
        mockContext,
        mockFactoryForSmartBind,
        mockAdapter,
        mockLogger,
      );

      // Setup default 2 tab groups (required for text editor binding in smart bind scenarios)
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);
    });

    describe('Scenario 1: User confirms replacement', () => {
      it('should unbind old destination and bind new one when user confirms', async () => {
        // Setup: Create mock destinations
        const terminalDest = createMockDestination('terminal', 'Terminal');
        const textEditorDest = createMockDestination('text-editor', 'Text Editor');

        // Mock factory to return destinations
        mockFactoryForSmartBind.create.mockImplementation((type) => {
          if (type === 'terminal') return terminalDest;
          if (type === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${type}`);
        });

        // Mock QuickPick to confirm replacement
        const mockVscode = mockAdapter.__getVscodeInstance();
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValue({
          label: 'Yes, replace',
          description: 'Switch from Terminal to Text Editor',
        });

        // Mock active terminal for first bind
        mockVscode.window.activeTerminal = { name: 'TestTerminal' } as vscode.Terminal;

        // First bind: Bind to Terminal (normal bind)
        const firstBindResult = await manager.bind('terminal');
        expect(firstBindResult).toBe(true);
        expect(manager.isBound()).toBe(true);
        expect(manager.getBoundDestination()?.id).toBe('terminal');

        // Verify first bind toast (no replacement)
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink bound to TestTerminal',
          3000,
        );

        // Mock active text editor for second bind
        mockVscode.window.activeTextEditor = {
          document: { uri: { scheme: 'file', fsPath: '/test/file.ts' } },
        } as vscode.TextEditor;

        // Second bind: Bind to Text Editor (should show confirmation)
        const secondBindResult = await manager.bind('text-editor');

        // Assert: QuickPick was shown
        expect(mockVscode.window.showQuickPick).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ label: 'Yes, replace' }),
            expect.objectContaining({ label: 'No, keep current binding' }),
          ]),
          expect.objectContaining({
            placeHolder: expect.stringContaining('Already bound to Terminal'),
          }),
        );

        // Assert: Bind succeeded
        expect(secondBindResult).toBe(true);
        expect(manager.isBound()).toBe(true);
        expect(manager.getBoundDestination()?.id).toBe('text-editor');

        // Assert: Toast shows replacement info
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          'Unbound Terminal, now bound to Text Editor',
          3000,
        );
      });
    });

    describe('Scenario 2: User cancels replacement', () => {
      it('should keep current binding when user cancels confirmation', async () => {
        // Setup: Create mock destinations
        const terminalDest = createMockDestination('terminal', 'Terminal');
        const textEditorDest = createMockDestination('text-editor', 'Text Editor');

        mockFactoryForSmartBind.create.mockImplementation((type) => {
          if (type === 'terminal') return terminalDest;
          if (type === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${type}`);
        });

        // Mock QuickPick to cancel (user selects "No, keep current binding")
        const mockVscode = mockAdapter.__getVscodeInstance();
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValue({
          label: 'No, keep current binding',
          description: 'Stay bound to Terminal',
        });

        // Mock active terminal for first bind
        mockVscode.window.activeTerminal = { name: 'TestTerminal' } as vscode.Terminal;

        // First bind: Bind to Terminal
        const firstBindResult = await manager.bind('terminal');
        expect(firstBindResult).toBe(true);

        // Reset status bar message mock to verify second bind doesn't show toast
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();

        // Mock active text editor for second bind
        mockVscode.window.activeTextEditor = {
          document: { uri: { scheme: 'file', fsPath: '/test/file.ts' } },
        } as vscode.TextEditor;

        // Second bind: Try to bind to Text Editor (user cancels)
        const secondBindResult = await manager.bind('text-editor');

        // Assert: Bind failed (cancelled)
        expect(secondBindResult).toBe(false);

        // Assert: Still bound to Terminal
        expect(manager.isBound()).toBe(true);
        expect(manager.getBoundDestination()?.id).toBe('terminal');

        // Assert: No toast shown (no replacement happened)
        expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
      });
    });

    describe('Scenario 3: Prevent binding same destination twice', () => {
      it('should show info message when binding same destination', async () => {
        // Setup: Create mock terminal destination
        const terminalDest = createMockDestination('terminal', 'Terminal');
        mockFactoryForSmartBind.create.mockReturnValue(terminalDest);

        // Mock active terminal
        const mockVscode = mockAdapter.__getVscodeInstance();
        mockVscode.window.activeTerminal = { name: 'TestTerminal' } as vscode.Terminal;

        // First bind: Bind to Terminal
        await manager.bind('terminal');
        expect(manager.isBound()).toBe(true);

        // Clear mocks to verify second bind behavior
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();
        (mockVscode.window.showQuickPick as jest.Mock).mockClear();

        // Second bind: Try to bind to Terminal again
        const result = await manager.bind('terminal');

        // Assert: Bind failed
        expect(result).toBe(false);

        // Assert: Info message shown (not error)
        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
          'RangeLink: Already bound to Terminal',
        );

        // Assert: QuickPick NOT shown (no confirmation needed)
        expect(mockVscode.window.showQuickPick).not.toHaveBeenCalled();

        // Assert: Still bound to Terminal
        expect(manager.getBoundDestination()?.id).toBe('terminal');
      });
    });

    describe('Scenario 4: Normal bind without existing binding', () => {
      it('should show standard toast without replacement prefix', async () => {
        // Setup: Create mock terminal destination
        const terminalDest = createMockDestination('terminal', 'Terminal');
        mockFactoryForSmartBind.create.mockReturnValue(terminalDest);

        // Mock active terminal
        const mockVscode = mockAdapter.__getVscodeInstance();
        mockVscode.window.activeTerminal = { name: 'TestTerminal' } as vscode.Terminal;

        // Bind to Terminal (no existing binding)
        const result = await manager.bind('terminal');

        // Assert: Bind succeeded
        expect(result).toBe(true);
        expect(manager.isBound()).toBe(true);

        // Assert: Standard toast shown (no "Unbound..." prefix)
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink bound to TestTerminal',
          3000,
        );

        // Assert: QuickPick NOT shown (no existing binding)
        expect(mockVscode.window.showQuickPick).not.toHaveBeenCalled();
      });
    });

    describe('Scenario 5: QuickPick cancellation (Esc key)', () => {
      it('should keep current binding when user presses Esc', async () => {
        // Setup: Create mock destinations
        const terminalDest = createMockDestination('terminal', 'Terminal');
        const textEditorDest = createMockDestination('text-editor', 'Text Editor');

        mockFactoryForSmartBind.create.mockImplementation((type) => {
          if (type === 'terminal') return terminalDest;
          if (type === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${type}`);
        });

        // Mock QuickPick to return undefined (Esc key pressed)
        const mockVscode = mockAdapter.__getVscodeInstance();
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

        // Mock active terminal for first bind
        mockVscode.window.activeTerminal = { name: 'TestTerminal' } as vscode.Terminal;

        // First bind: Bind to Terminal
        await manager.bind('terminal');

        // Mock active text editor for second bind
        mockVscode.window.activeTextEditor = {
          document: { uri: { scheme: 'file', fsPath: '/test/file.ts' } },
        } as vscode.TextEditor;

        // Clear mocks
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();

        // Second bind: Try to bind to Text Editor (user presses Esc)
        const result = await manager.bind('text-editor');

        // Assert: Bind failed (cancelled)
        expect(result).toBe(false);

        // Assert: Still bound to Terminal
        expect(manager.isBound()).toBe(true);
        expect(manager.getBoundDestination()?.id).toBe('terminal');

        // Assert: No toast shown
        expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
      });
    });
  });

  describe('jumpToBoundDestination()', () => {
    // Mock factory and destinations for unit tests
    let mockFactoryForJump: jest.Mocked<DestinationFactory>;
    let mockTerminalDest: jest.Mocked<PasteDestination>;
    let mockEditorDest: jest.Mocked<PasteDestination>;
    let mockCursorAIDest: jest.Mocked<PasteDestination>;
    let mockClaudeCodeDest: jest.Mocked<PasteDestination>;

    beforeEach(() => {
      // Use specialized factories with default values (all already have sensible defaults)
      mockTerminalDest = createMockTerminalDestination();
      mockEditorDest = createMockTextEditorDestination();
      mockCursorAIDest = createMockCursorAIDestination();
      mockClaudeCodeDest = createMockClaudeCodeDestination();

      mockFactoryForJump = {
        create: jest.fn().mockImplementation((type) => {
          if (type === 'terminal') return mockTerminalDest;
          if (type === 'text-editor') return mockEditorDest;
          if (type === 'cursor-ai') return mockCursorAIDest;
          if (type === 'claude-code') return mockClaudeCodeDest;
          throw new Error(`Unexpected type: ${type}`);
        }),
      } as unknown as jest.Mocked<DestinationFactory>;

      // Recreate manager with mock factory
      manager = new PasteDestinationManager(
        mockContext,
        mockFactoryForJump,
        mockAdapter,
        mockLogger,
      );

      // Setup default 2 tab groups (required for text editor binding)
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);
    });

    it('should return false when no destination bound', async () => {
      const result = await manager.jumpToBoundDestination();

      expect(result).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showInformationMessage).toHaveBeenCalledWith(
        'RangeLink: No destination bound. Bind a destination first.',
      );
    });

    it('should focus bound terminal successfully', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      const result = await manager.jumpToBoundDestination();

      expect(result).toBe(true);
      expect(mockTerminalDest.focus).toHaveBeenCalledTimes(1);
    });

    it('should focus bound text editor successfully', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      const mockUri = createMockUri('/workspace/src/file.ts');
      const mockDocument = createMockDocument({
        getText: createMockText('const x = 42;'),
        uri: mockUri,
      });
      const mockEditor = createMockEditor({
        document: mockDocument,
        selection: { active: { line: 0, character: 0 } } as any,
      });

      mockVscode.window.activeTextEditor = mockEditor;

      await manager.bind('text-editor');

      const result = await manager.jumpToBoundDestination();

      expect(result).toBe(true);
      expect(mockEditorDest.focus).toHaveBeenCalledTimes(1);
    });

    it('should focus bound Cursor AI successfully', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';

      await manager.bind('cursor-ai');

      const result = await manager.jumpToBoundDestination();

      expect(result).toBe(true);
      expect(mockCursorAIDest.focus).toHaveBeenCalledTimes(1);
    });

    it('should focus bound Claude Code successfully', async () => {
      const mockExtension = {
        id: 'anthropic.claude-code',
        isActive: true,
      };
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([mockExtension] as any);

      await manager.bind('claude-code');

      const result = await manager.jumpToBoundDestination();

      expect(result).toBe(true);
      expect(mockClaudeCodeDest.focus).toHaveBeenCalledTimes(1);
    });

    it('should return false when focus fails', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Mock focus failure
      mockTerminalDest.focus.mockResolvedValueOnce(false);

      const result = await manager.jumpToBoundDestination();

      expect(result).toBe(false);
      expect(mockTerminalDest.focus).toHaveBeenCalledTimes(1);
    });

    it('should show failure message when focus fails', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      const mockVscode = mockAdapter.__getVscodeInstance();
      mockVscode.window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Mock focus failure
      mockTerminalDest.focus.mockResolvedValueOnce(false);

      await manager.jumpToBoundDestination();

      expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to focus Terminal',
      );
    });

    it('should show success message in status bar when focus succeeds', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      const mockVscode = mockAdapter.__getVscodeInstance();
      mockVscode.window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Clear bind's status bar message
      (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();

      await manager.jumpToBoundDestination();

      expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ Focused Terminal: bash',
        2000,
      );
    });

    it('should log success with destination details for terminal', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Clear logger calls from bind()
      jest.clearAllMocks();

      await manager.jumpToBoundDestination();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'PasteDestinationManager.jumpToBoundDestination',
          destinationType: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        }),
        'Successfully focused Terminal',
      );
    });

    it('should log success with destination details for text editor', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      const mockUri = createMockUri('/workspace/src/file.ts');
      const mockDocument = createMockDocument({
        getText: createMockText('const x = 42;'),
        uri: mockUri,
      });
      const mockEditor = createMockEditor({
        document: mockDocument,
        selection: { active: { line: 0, character: 0 } } as any,
      });

      mockVscode.window.activeTextEditor = mockEditor;

      await manager.bind('text-editor');

      // Clear logger calls from bind()
      jest.clearAllMocks();

      await manager.jumpToBoundDestination();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'PasteDestinationManager.jumpToBoundDestination',
          destinationType: 'text-editor',
          displayName: 'Text Editor',
          editorDisplayName: 'src/file.ts',
          editorPath: '/workspace/src/file.ts',
        }),
        'Successfully focused Text Editor',
      );
    });

    it('should log success with empty details for AI assistants', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';

      await manager.bind('cursor-ai');

      // Clear logger calls from bind()
      jest.clearAllMocks();

      await manager.jumpToBoundDestination();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'PasteDestinationManager.jumpToBoundDestination',
          destinationType: 'cursor-ai',
          displayName: 'Cursor AI Assistant',
        }),
        'Successfully focused Cursor AI Assistant',
      );
    });

    it('should log warning when focus fails', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Clear logger calls from bind()
      jest.clearAllMocks();

      // Mock focus failure
      mockTerminalDest.focus.mockResolvedValueOnce(false);

      await manager.jumpToBoundDestination();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'PasteDestinationManager.jumpToBoundDestination',
          destinationType: 'terminal',
          displayName: 'Terminal',
        }),
        'Failed to focus Terminal',
      );
    });

    it('should not call focus when no destination bound', async () => {
      await manager.jumpToBoundDestination();

      expect(mockTerminalDest.focus).not.toHaveBeenCalled();
      expect(mockEditorDest.focus).not.toHaveBeenCalled();
      expect(mockCursorAIDest.focus).not.toHaveBeenCalled();
      expect(mockClaudeCodeDest.focus).not.toHaveBeenCalled();
    });

    it('should not show success message when no destination bound', async () => {
      await manager.jumpToBoundDestination();

      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).not.toHaveBeenCalled();
    });

    it('should not show success message when focus fails', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      const mockVscode = mockAdapter.__getVscodeInstance();
      mockVscode.window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Clear bind's status bar message
      (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();

      // Mock focus failure
      mockTerminalDest.focus.mockResolvedValueOnce(false);

      await manager.jumpToBoundDestination();

      expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
    });
  });
});
