import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import type { DestinationAvailabilityService } from '../../destinations/DestinationAvailabilityService';
import type { PasteDestination } from '../../destinations/PasteDestination';
import { PasteDestinationManager } from '../../destinations/PasteDestinationManager';
import { AutoPasteResult, MessageCode } from '../../types';
import * as formatMessageModule from '../../utils/formatMessage';
import {
  configureEmptyTabGroups,
  createBaseMockPasteDestination,
  createMockClaudeCodeDestination,
  createMockCursorAIDestination,
  createMockDestinationAvailabilityService,
  createMockDestinationRegistry,
  createMockDocument,
  createMockEditor,
  createMockEditorComposablePasteDestination,
  createMockFormattedLink,
  createMockGitHubCopilotChatDestination,
  createMockTerminal,
  createMockTerminalPasteDestination,
  createMockText,
  createMockPasteExecutor,
  createMockUri,
  createMockVscodeAdapter,
  type MockVscodeOptions,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

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
  let mockRegistry: ReturnType<typeof createMockDestinationRegistry>;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let terminalCloseListener: (terminal: vscode.Terminal) => void;
  let documentCloseListener: (document: vscode.TextDocument) => void;
  let formatMessageSpy: jest.SpyInstance;

  /**
   * Helper to create a manager with optional environment and window overrides.
   * Useful for tests that need to simulate Cursor IDE or configure message mocks.
   */
  const createManager = (options?: {
    envOptions?: MockVscodeOptions['envOptions'];
    windowOptions?: MockVscodeOptions['windowOptions'];
  }) => {
    const adapter = createMockVscodeAdapter({
      envOptions: options?.envOptions,
      windowOptions: options?.windowOptions,
    });

    // Cache for destinations so same instance is returned for same terminal/editor
    const destinationCache = new Map<string, any>();

    // Create registry that generates mock destinations on demand with correct context
    const registry = createMockDestinationRegistry({
      createImpl: (options) => {
        if (options.type === 'terminal' && options.terminal) {
          const terminalName = options.terminal.name;
          const cacheKey = `terminal:${terminalName}`;
          if (!destinationCache.has(cacheKey)) {
            const dest = createMockTerminalPasteDestination({
              displayName: `Terminal ("${terminalName}")`,
              resourceName: terminalName,
              getLoggingDetails: jest.fn().mockReturnValue({ terminalName }),
              getJumpSuccessMessage: jest
                .fn()
                .mockReturnValue(`✓ Focused Terminal: "${terminalName}"`),
            });
            // Override equals to return true when comparing to same terminal name
            (dest.equals as jest.Mock).mockImplementation(async (other) => {
              return other?.id === 'terminal' && other?.resourceName === terminalName;
            });
            destinationCache.set(cacheKey, dest);
          }
          return destinationCache.get(cacheKey);
        }
        if (options.type === 'text-editor' && options.editor) {
          const cacheKey = `text-editor:${options.editor.document.uri.fsPath}`;
          if (!destinationCache.has(cacheKey)) {
            destinationCache.set(
              cacheKey,
              createMockEditorComposablePasteDestination({ editor: options.editor }),
            );
          }
          return destinationCache.get(cacheKey);
        }
        if (options.type === 'cursor-ai') {
          if (!destinationCache.has('cursor-ai')) {
            const dest = createMockCursorAIDestination();
            // Override isAvailable to check actual environment
            (dest.isAvailable as jest.Mock).mockImplementation(async () => {
              return adapter.__getVscodeInstance().env.appName === 'Cursor';
            });
            // Override equals to return true when comparing to same type
            (dest.equals as jest.Mock).mockImplementation(
              async (other) => other?.id === 'cursor-ai',
            );
            destinationCache.set('cursor-ai', dest);
          }
          return destinationCache.get('cursor-ai');
        }
        if (options.type === 'claude-code') {
          if (!destinationCache.has('claude-code')) {
            destinationCache.set('claude-code', createMockClaudeCodeDestination());
          }
          return destinationCache.get('claude-code');
        }
        return undefined;
      },
    });
    const availabilityService = createMockDestinationAvailabilityService();
    const mgr = new PasteDestinationManager(
      mockContext,
      registry,
      availabilityService,
      adapter,
      mockLogger,
    );

    // Extract event listeners from mock calls (made by PasteDestinationManager constructor)
    // These are needed for tests that simulate terminal/document closure events
    const vscode = adapter.__getVscodeInstance();
    const onDidCloseTerminalMock = vscode.window.onDidCloseTerminal as jest.Mock;
    const onDidCloseTextDocumentMock = vscode.workspace.onDidCloseTextDocument as jest.Mock;

    // Store listeners in test-scoped variables for event simulation
    terminalCloseListener = onDidCloseTerminalMock.mock.calls[0]?.[0];
    documentCloseListener = onDidCloseTextDocumentMock.mock.calls[0]?.[0];

    return { manager: mgr, adapter, registry };
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
    mockRegistry = result.registry;
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('bind() - terminal', () => {
    let mockTerminal: vscode.Terminal;

    beforeEach(() => {
      mockTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
    });

    it('should bind to active terminal successfully', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

      const result = await manager.bind('terminal');

      expect(result).toBe(true);
      expect(manager.isBound()).toBe(true);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to Terminal ("bash")',
        3000,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.bindTerminal',
          displayName: 'Terminal ("bash")',
          terminalName: 'bash',
        },
        'Successfully bound to "Terminal ("bash")"',
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

      // Create terminal destination that recognizes itself as equal
      const terminalDest = createMockTerminalPasteDestination({
        displayName: 'Terminal ("bash")',
        resourceName: 'bash',
      });
      // Override equals to return true when comparing to same instance
      (terminalDest.equals as jest.Mock).mockImplementation(
        async (other) => other === terminalDest,
      );

      // Create manager with a fresh factory that returns the same terminal instance
      const controlledFactory = createMockDestinationRegistry({
        destinations: {
          terminal: terminalDest,
          'text-editor':
            createMockEditorComposablePasteDestination() as unknown as jest.Mocked<PasteDestination>,
          'cursor-ai': createMockCursorAIDestination(),
          'claude-code': createMockClaudeCodeDestination(),
        },
      });
      const controlledManager = new PasteDestinationManager(
        mockContext,
        controlledFactory,
        createMockDestinationAvailabilityService(),
        mockAdapter,
        mockLogger,
      );

      // First bind
      await controlledManager.bind('terminal');

      formatMessageSpy.mockClear();

      // Try binding again to same destination
      const result = await controlledManager.bind('terminal');

      expect(result).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ALREADY_BOUND_TO_DESTINATION, {
        destinationName: 'Terminal ("bash")',
      });
      expect(mockAdapter.__getVscodeInstance().window.showInformationMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to Terminal ("bash")',
      );

      controlledManager.dispose();
    });

    it('should handle terminal with custom name', async () => {
      const customTerminal = createMockTerminal({
        name: 'zsh',
        processId: Promise.resolve(54321),
      });

      mockAdapter.__getVscodeInstance().window.activeTerminal = customTerminal;

      const result = await manager.bind('terminal');

      expect(result).toBe(true);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to Terminal ("zsh")',
        3000,
      );
    });
  });

  describe('bind() - chat destinations', () => {
    it('should bind to cursor-ai when available', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
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

      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_CURSOR_AI_NOT_AVAILABLE');

      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot bind Cursor AI Assistant - not running in Cursor IDE',
      );
    });

    it('should fail when claude-code not available', async () => {
      const mockDestination = createMockClaudeCodeDestination({ isAvailable: false });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind('claude-code');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_CLAUDE_CODE_NOT_AVAILABLE');
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot bind Claude Code - extension not installed or not active',
      );
    });

    it('should bind to github-copilot-chat when available', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind('github-copilot-chat');

      expect(result).toBe(true);
      expect(manager.isBound()).toBe(true);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to GitHub Copilot Chat',
        3000,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.bindGenericDestination',
          displayName: 'GitHub Copilot Chat',
        },
        'Successfully bound to GitHub Copilot Chat',
      );
    });

    it('should fail when github-copilot-chat not available', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: false });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind('github-copilot-chat');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_GITHUB_COPILOT_CHAT_NOT_AVAILABLE');
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot bind GitHub Copilot Chat - extension not installed or not active',
      );
    });

    it('should show info message when binding same chat destination twice', async () => {
      // Create manager with Cursor IDE environment
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });
      await localManager.bind('cursor-ai');

      // Try binding again to same destination
      const result = await localManager.bind('cursor-ai');

      expect(result).toBe(false);
      expect(localAdapter.__getVscodeInstance().window.showInformationMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to Cursor AI Assistant',
      );

      localManager.dispose();
    });

    it('should show info message when already bound to github-copilot-chat', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({
        isAvailable: true,
        equals: jest.fn().mockImplementation(async (other) => other?.id === 'github-copilot-chat'),
      });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      // Bind first time
      await manager.bind('github-copilot-chat');

      // Clear adapter calls to isolate second bind attempt (but keep factory mock intact)
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();
      (mockVscode.window.showInformationMessage as jest.Mock).mockClear();

      // Try binding again to same destination
      const result = await manager.bind('github-copilot-chat');

      expect(result).toBe(false);
      expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to GitHub Copilot Chat',
      );
    });
  });

  describe('bind() - text-editor', () => {
    it('should bind to active text editor successfully', async () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({
        document: mockDocument,
        selection: { active: { line: 0, character: 0 } } as vscode.Selection,
      });

      mockAdapter.__getVscodeInstance().window.activeTextEditor = mockEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      const result = await manager.bind('text-editor');

      expect(result).toBe(true);
      expect(manager.isBound()).toBe(true);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to Text Editor ("file.ts")',
        3000,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.bindTextEditor',
          displayName: 'Text Editor ("file.ts")',
          editorName: 'file.ts',
          editorPath: '/workspace/src/file.ts',
          tabGroupCount: 2,
        },
        'Successfully bound to "Text Editor ("file.ts")" (2 tab groups)',
      );
    });

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

    it('should fail to bind text editor to read-only scheme', async () => {
      mockAdapter.__getVscodeInstance().window.activeTextEditor = {
        document: {
          uri: { scheme: 'git', fsPath: '/repo/file.ts' },
        },
      } as vscode.TextEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      const result = await manager.bind('text-editor');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ERROR_TEXT_EDITOR_READ_ONLY, {
        scheme: 'git',
      });
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot bind to read-only editor (git)',
      );
    });

    it('should fail to bind text editor to binary file', async () => {
      const testFileName = 'binary.dat';
      mockAdapter.__getVscodeInstance().window.activeTextEditor = {
        document: {
          uri: { scheme: 'file', fsPath: `/test/${testFileName}` },
        },
      } as vscode.TextEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      const result = await manager.bind('text-editor');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.ERROR_TEXT_EDITOR_BINARY_FILE, {
        fileName: testFileName,
      });
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        `RangeLink: Cannot bind to ${testFileName} - binary file`,
      );
    });
  });

  describe('bind() - cross-destination conflicts', () => {
    it('should show confirmation when binding chat while terminal already bound', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });

      const mockTerminal = createMockTerminal();

      localAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await localManager.bind('terminal');

      // Mock user cancels confirmation
      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to Cursor AI
      const result = await localManager.bind('cursor-ai');

      expect(result).toBe(false);
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Terminal ("bash")',
        newDestination: 'Cursor AI Assistant',
      });

      localManager.dispose();
    });

    it('should show confirmation when binding terminal while chat already bound', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });
      await localManager.bind('cursor-ai');

      // Mock user cancels confirmation
      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to terminal
      const mockTerminal = createMockTerminal();

      localAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      const result = await localManager.bind('terminal');

      expect(result).toBe(false);
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Cursor AI Assistant',
        newDestination: 'Terminal ("bash")',
      });

      localManager.dispose();
    });

    it('should show confirmation when binding github-copilot-chat while terminal already bound', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Mock GitHub Copilot Chat as available
      const mockCopilotDest = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockCopilotDest);

      // Mock user cancels confirmation
      const showQuickPickMock = mockAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to GitHub Copilot Chat
      const result = await manager.bind('github-copilot-chat');

      expect(result).toBe(false);
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Terminal ("bash")',
        newDestination: 'GitHub Copilot Chat',
      });
    });

    it('should show confirmation when binding terminal while github-copilot-chat already bound', async () => {
      // Mock GitHub Copilot Chat as available
      const mockCopilotDest = createMockGitHubCopilotChatDestination({
        isAvailable: true,
        equals: jest.fn().mockImplementation(async (other) => other?.id === 'github-copilot-chat'),
      });

      // Mock terminal destination
      const mockTerminalDest = createMockTerminalPasteDestination({
        displayName: 'Terminal ("bash")',
        resourceName: 'bash',
      });

      // Configure factory to return appropriate destination based on type
      jest.spyOn(mockRegistry, 'create').mockImplementation((options) => {
        if (options.type === 'github-copilot-chat') return mockCopilotDest;
        if (options.type === 'terminal') return mockTerminalDest;
        return undefined as any;
      });

      await manager.bind('github-copilot-chat');

      // Mock user cancels confirmation
      const showQuickPickMock = mockAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to terminal
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      const result = await manager.bind('terminal');

      expect(result).toBe(false);
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'GitHub Copilot Chat',
        newDestination: 'Terminal ("bash")',
      });
    });

    it('should show confirmation when replacing cursor-ai with github-copilot-chat', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });
      await localManager.bind('cursor-ai');

      // Mock GitHub Copilot Chat as available
      const mockCopilotDest = createMockGitHubCopilotChatDestination({ isAvailable: true });
      const mockRegistryForCopilot = createMockDestinationRegistry({
        destinations: { 'github-copilot-chat': mockCopilotDest as any },
      });
      // Override the registry's create method to return our mock
      (localManager as unknown as { registry: typeof mockRegistryForCopilot }).registry =
        mockRegistryForCopilot;

      // Mock user cancels confirmation
      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to GitHub Copilot Chat
      const result = await localManager.bind('github-copilot-chat');

      expect(result).toBe(false);
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Cursor AI Assistant',
        newDestination: 'GitHub Copilot Chat',
      });

      localManager.dispose();
    });
  });

  describe('unbind()', () => {
    it('should unbind terminal successfully', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      manager.unbind();

      expect(manager.isBound()).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink unbound from Terminal ("bash")',
        2000,
      );
    });

    it('should unbind chat destination successfully', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
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

    it('should unbind github-copilot-chat successfully', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      await manager.bind('github-copilot-chat');

      manager.unbind();

      expect(manager.isBound()).toBe(false);
      expect(manager.getBoundDestination()).toBeUndefined();
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink unbound from GitHub Copilot Chat',
        2000,
      );
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

  describe('sendLinkToDestination()', () => {
    const TEST_STATUS_MESSAGE = 'RangeLink copied to clipboard';

    // Mock factory and destinations for unit tests
    let mockRegistryForSend: ReturnType<typeof createMockDestinationRegistry>;
    let mockTerminalDest: jest.Mocked<PasteDestination>;
    let mockChatDest: jest.Mocked<PasteDestination>;

    beforeEach(() => {
      mockTerminalDest = createMockTerminalPasteDestination({
        displayName: 'Terminal ("bash")',
        resourceName: 'bash',
        getUserInstruction: jest.fn().mockReturnValue('Instructions'),
        getLoggingDetails: jest.fn().mockReturnValue({ terminalName: 'bash' }),
      });

      mockChatDest = createMockCursorAIDestination({
        getUserInstruction: jest.fn().mockReturnValue('Instructions'),
      });

      mockRegistryForSend = createMockDestinationRegistry({
        createImpl: (options) => {
          if (options.type === 'terminal') return mockTerminalDest;
          if (options.type === 'cursor-ai') return mockChatDest;
          throw new Error(`Unexpected type: ${options.type}`);
        },
      });

      // Recreate manager with mock factory
      manager = new PasteDestinationManager(
        mockContext,
        mockRegistryForSend,
        createMockDestinationAvailabilityService(),
        mockAdapter,
        mockLogger,
      );
    });

    it('should send to bound terminal successfully and show enhanced status bar message', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

      // Override getUserInstruction to return undefined (non-chat destinations don't provide instructions)
      mockTerminalDest.getUserInstruction = jest.fn().mockReturnValue(undefined);

      await manager.bind('terminal');

      const setStatusBarSpy = jest.spyOn(mockAdapter, 'setStatusBarMessage');

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      const result = await manager.sendLinkToDestination(
        formattedLink,
        TEST_STATUS_MESSAGE,
        'both',
      );

      expect(result).toBe(true);
      expect(mockTerminalDest.pasteLink).toHaveBeenCalledTimes(1);
      expect(mockTerminalDest.pasteLink).toHaveBeenCalledWith(formattedLink, 'both');

      expect(setStatusBarSpy).toHaveBeenCalledWith(
        '✓ RangeLink copied to clipboard & sent to Terminal ("bash")',
      );
    });

    it('should send to bound chat destination successfully with user instructions', async () => {
      const mockSetStatusBarMessage = jest.fn();
      const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
      const { manager: cursorManager } = createManager({
        envOptions: { appName: 'Cursor' },
        windowOptions: {
          setStatusBarMessage: mockSetStatusBarMessage,
          showInformationMessage: mockShowInformationMessage,
        },
      });

      await cursorManager.bind('cursor-ai');
      mockSetStatusBarMessage.mockClear();

      const boundDest = cursorManager.getBoundDestination()!;
      const successInstruction = 'Paste the link in Cursor AI chat';
      boundDest.getUserInstruction = jest
        .fn()
        .mockImplementation((result) =>
          result === AutoPasteResult.Success ? successInstruction : undefined,
        );

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      const result = await cursorManager.sendLinkToDestination(
        formattedLink,
        TEST_STATUS_MESSAGE,
        'both',
      );

      expect(result).toBe(true);
      expect(boundDest.pasteLink).toHaveBeenCalledTimes(1);
      expect(boundDest.pasteLink).toHaveBeenCalledWith(formattedLink, 'both');

      expect(mockSetStatusBarMessage).toHaveBeenCalledWith(TEST_STATUS_MESSAGE, 2000);
      expect(mockShowInformationMessage).toHaveBeenCalledWith(successInstruction);

      cursorManager.dispose();
    });

    it('should send to bound GitHub Copilot Chat successfully', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistryForSend, 'create').mockReturnValue(mockDestination);

      await manager.bind('github-copilot-chat');

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      const result = await manager.sendLinkToDestination(
        formattedLink,
        TEST_STATUS_MESSAGE,
        'both',
      );

      expect(result).toBe(true);
      expect(mockDestination.pasteLink).toHaveBeenCalledTimes(1);
      expect(mockDestination.pasteLink).toHaveBeenCalledWith(formattedLink, 'both');
    });

    it('should return false when no destination bound', async () => {
      const result = await manager.sendLinkToDestination(
        createMockFormattedLink('src/file.ts#L10'),
        TEST_STATUS_MESSAGE,
        'both',
      );

      expect(result).toBe(false);
      expect(mockTerminalDest.pasteLink).not.toHaveBeenCalled();
      expect(mockChatDest.pasteLink).not.toHaveBeenCalled();
    });

    it('should show warning message when terminal paste fails', async () => {
      const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
      const { manager: localManager, adapter: localAdapter } = createManager({
        windowOptions: { showWarningMessage: mockShowWarningMessage },
      });

      const mockTerminal = createMockTerminal();
      localAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

      await localManager.bind('terminal');

      const boundDest = localManager.getBoundDestination()!;
      boundDest.getUserInstruction = jest.fn().mockReturnValue(undefined);
      (boundDest.pasteLink as jest.Mock).mockResolvedValueOnce(false);

      const result = await localManager.sendLinkToDestination(
        createMockFormattedLink('src/file.ts#L10'),
        TEST_STATUS_MESSAGE,
        'both',
      );

      expect(result).toBe(false);
      expect(boundDest.pasteLink).toHaveBeenCalledTimes(1);

      expect(mockShowWarningMessage).toHaveBeenCalledTimes(1);
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'RangeLink copied to clipboard. Could not send to terminal. Terminal may be closed or not accepting input.',
      );

      localManager.dispose();
    });

    it('should show warning with user instructions when chat paste fails', async () => {
      const mockSetStatusBarMessage = jest.fn();
      const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
      const { manager: cursorManager } = createManager({
        envOptions: { appName: 'Cursor' },
        windowOptions: {
          setStatusBarMessage: mockSetStatusBarMessage,
          showWarningMessage: mockShowWarningMessage,
        },
      });

      await cursorManager.bind('cursor-ai');
      mockSetStatusBarMessage.mockClear();

      const boundDest = cursorManager.getBoundDestination()!;
      const failureInstruction = 'Manual paste: Open Cursor AI and paste the link';
      boundDest.getUserInstruction = jest
        .fn()
        .mockImplementation((result) =>
          result === AutoPasteResult.Failure ? failureInstruction : undefined,
        );

      (boundDest.pasteLink as jest.Mock).mockResolvedValueOnce(false);

      const result = await cursorManager.sendLinkToDestination(
        createMockFormattedLink('src/file.ts#L10'),
        TEST_STATUS_MESSAGE,
        'both',
      );

      expect(result).toBe(false);
      expect(boundDest.pasteLink).toHaveBeenCalledTimes(1);

      expect(mockSetStatusBarMessage).toHaveBeenCalledWith(TEST_STATUS_MESSAGE, 2000);
      expect(mockShowWarningMessage).toHaveBeenCalledWith(failureInstruction);

      cursorManager.dispose();
    });

    it('should log destination details when sending to terminal', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      await manager.sendLinkToDestination(formattedLink, TEST_STATUS_MESSAGE, 'both');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.sendLinkToDestination',
          destinationType: 'terminal',
          displayName: 'Terminal ("bash")',
          formattedLink,
          paddingMode: 'both',
          terminalName: 'bash',
        },
        'Sending link to Terminal ("bash")',
      );
    });

    it('should show text-editor specific warning when editor paste fails', async () => {
      const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
      const { manager: localManager } = createManager({
        windowOptions: { showWarningMessage: mockShowWarningMessage },
      });

      const mockFailingExecutor = createMockPasteExecutor(false);
      const mockTextEditorDest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor',
        pasteExecutor: mockFailingExecutor,
      });

      const pasteLinkSpy = jest.spyOn(mockTextEditorDest, 'pasteLink');

      (localManager as any).boundDestination = mockTextEditorDest;

      const result = await localManager.sendLinkToDestination(
        createMockFormattedLink('src/file.ts#L10'),
        TEST_STATUS_MESSAGE,
        'both',
      );

      expect(result).toBe(false);
      expect(pasteLinkSpy).toHaveBeenCalledTimes(1);

      expect(mockShowWarningMessage).toHaveBeenCalledTimes(1);
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'RangeLink copied to clipboard. Could not send to editor. Bound editor is hidden behind other tabs.',
      );

      localManager.dispose();
    });

    it('should throw UNEXPECTED_CODE_PATH when chat assistant reaches buildPasteFailureMessage', async () => {
      // Create a mock cursor-ai destination that incorrectly returns undefined for getUserInstruction
      const mockBrokenChatDest = createMockCursorAIDestination({
        getUserInstruction: jest.fn().mockReturnValue(undefined), // Chat assistants should always provide instructions
        pasteLink: jest.fn().mockResolvedValue(false), // Simulate paste failure
      });

      // Manually set the bound destination
      (manager as any).boundDestination = mockBrokenChatDest;

      // This should throw UNEXPECTED_CODE_PATH error because chat assistants should never reach buildPasteFailureMessage
      await expect(async () =>
        manager.sendLinkToDestination(
          createMockFormattedLink('src/file.ts#L10'),
          TEST_STATUS_MESSAGE,
          'both',
        ),
      ).toThrowRangeLinkExtensionErrorAsync('UNEXPECTED_CODE_PATH', {
        message:
          "Chat assistant destination 'cursor-ai' should provide getUserInstruction() and never reach buildPasteFailureMessage()",
        functionName: 'PasteDestinationManager.buildPasteFailureMessage',
      });
    });

    it('should throw DESTINATION_NOT_IMPLEMENTED for unknown destination type', async () => {
      // Create a mock destination with an unknown ID
      const mockUnknownDest = createMockTerminalPasteDestination({
        id: 'unknown-destination-type' as any,
        displayName: 'Unknown Destination',
        getUserInstruction: jest.fn().mockReturnValue(undefined),
        pasteLink: jest.fn().mockResolvedValue(false), // Simulate paste failure
      });

      // Manually set the bound destination
      (manager as any).boundDestination = mockUnknownDest;

      // This should throw DESTINATION_NOT_IMPLEMENTED error for unknown destination types
      await expect(async () =>
        manager.sendLinkToDestination(
          createMockFormattedLink('src/file.ts#L10'),
          TEST_STATUS_MESSAGE,
          'both',
        ),
      ).toThrowRangeLinkExtensionErrorAsync('DESTINATION_NOT_IMPLEMENTED', {
        message:
          "Unknown destination type 'unknown-destination-type' - missing case in buildPasteFailureMessage()",
        functionName: 'PasteDestinationManager.buildPasteFailureMessage',
      });
    });

    it('should log error when paste fails', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Mock paste failure
      mockTerminalDest.pasteLink.mockResolvedValueOnce(false);

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      await manager.sendLinkToDestination(formattedLink, TEST_STATUS_MESSAGE, 'both');

      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.sendLinkToDestination',
          destinationType: 'terminal',
          displayName: 'Terminal ("bash")',
          formattedLink,
          paddingMode: 'both',
          terminalName: 'bash',
        },
        'Paste link failed to Terminal ("bash")',
      );
    });
  });

  describe('Terminal closure auto-unbind', () => {
    it('should auto-unbind when bound terminal closes', async () => {
      const mockTerminal = createMockTerminal();

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
      const mockTerminal = createMockTerminal();

      const otherTerminal = createMockTerminal({ name: 'zsh' });

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Simulate other terminal close
      terminalCloseListener(otherTerminal);

      expect(manager.isBound()).toBe(true);
    });

    it('should not auto-unbind for chat destinations', async () => {
      const { manager: localManager } = createManager({ envOptions: { appName: 'Cursor' } });
      await localManager.bind('cursor-ai');

      const mockTerminal = createMockTerminal();

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
        '✓ RangeLink unbound from Text Editor ("file.ts")',
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
      const mockTerminal = createMockTerminal();

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
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      const destination = manager.getBoundDestination();

      expect(destination).toBeDefined();
      expect(destination?.id).toBe('terminal');
      expect(destination?.displayName).toBe('Terminal ("bash")');
    });

    it('should return undefined when nothing bound', () => {
      const destination = manager.getBoundDestination();

      expect(destination).toBeUndefined();
    });
  });

  describe('isBound()', () => {
    it('should return true when terminal bound', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      expect(manager.isBound()).toBe(true);
    });

    it('should return true when chat destination bound', async () => {
      const { manager: localManager } = createManager({ envOptions: { appName: 'Cursor' } });
      await localManager.bind('cursor-ai');

      expect(localManager.isBound()).toBe(true);

      localManager.dispose();
    });

    it('should return false when nothing bound', () => {
      expect(manager.isBound()).toBe(false);
    });

    it('should return false after unbind', async () => {
      const mockTerminal = createMockTerminal();

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
        mockRegistry,
        createMockDestinationAvailabilityService(),
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
    let mockRegistryForSmartBind: ReturnType<typeof createMockDestinationRegistry>;

    // Helper to create mock destinations using the existing infrastructure
    const createMockDestinationForTest = (
      id: string,
      displayName: string,
      isAvailable = true,
    ): jest.Mocked<PasteDestination> => {
      // Use createBaseMockPasteDestination with custom equals for instance comparison
      const dest = createBaseMockPasteDestination({
        id: id as import('../../destinations').DestinationType,
        displayName,
        isAvailable: jest.fn().mockResolvedValue(isAvailable),
      });
      // Override equals to compare by instance reference
      dest.equals = jest
        .fn()
        .mockImplementation(async (other: PasteDestination | undefined) => dest === other);
      return dest as jest.Mocked<PasteDestination>;
    };

    beforeEach(() => {
      // Create mock factory for smart bind tests
      mockRegistryForSmartBind = createMockDestinationRegistry();

      // Recreate manager with mock factory
      manager = new PasteDestinationManager(
        mockContext,
        mockRegistryForSmartBind,
        createMockDestinationAvailabilityService(),
        mockAdapter,
        mockLogger,
      );

      // Setup default 2 tab groups (required for text editor binding in smart bind scenarios)
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);
    });

    describe('Scenario 1: User confirms replacement', () => {
      it('should unbind old destination and bind new one when user confirms', async () => {
        // Setup: Create mock destinations
        const terminalDest = createMockDestinationForTest('terminal', 'Terminal ("TestTerminal")');
        const textEditorDest = createMockDestinationForTest(
          'text-editor',
          'Text Editor ("file.ts")',
        );

        // Mock factory to return destinations
        (mockRegistryForSmartBind.create as jest.Mock).mockImplementation((options) => {
          if (options.type === 'terminal') return terminalDest;
          if (options.type === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${options.type}`);
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
          '✓ RangeLink bound to Terminal ("TestTerminal")',
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
          [
            {
              label: 'Yes, replace',
              description: 'Switch from Terminal ("TestTerminal") to Text Editor ("file.ts")',
            },
            {
              label: 'No, keep current binding',
              description: 'Stay bound to Terminal ("TestTerminal")',
            },
          ],
          {
            placeHolder:
              'Already bound to Terminal ("TestTerminal"). Replace with Text Editor ("file.ts")?',
          },
        );

        // Assert: Bind succeeded
        expect(secondBindResult).toBe(true);
        expect(manager.isBound()).toBe(true);
        expect(manager.getBoundDestination()?.id).toBe('text-editor');

        // Assert: Toast shows replacement info
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          'Unbound Terminal ("TestTerminal"), now bound to Text Editor ("file.ts")',
          3000,
        );
      });
    });

    describe('Scenario 2: User cancels replacement', () => {
      it('should keep current binding when user cancels confirmation', async () => {
        // Setup: Create mock destinations
        const terminalDest = createMockDestinationForTest('terminal', 'Terminal ("TestTerminal")');
        const textEditorDest = createMockDestinationForTest(
          'text-editor',
          'Text Editor ("file.ts")',
        );

        (mockRegistryForSmartBind.create as jest.Mock).mockImplementation((options) => {
          if (options.type === 'terminal') return terminalDest;
          if (options.type === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${options.type}`);
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
        // Mock equals() to return true when comparing instances of same terminal
        (mockRegistryForSmartBind.create as jest.Mock).mockImplementation(() => {
          const newDest = createMockDestinationForTest('terminal', 'Terminal ("TestTerminal")');
          // Make all terminal destinations equal to each other
          (newDest.equals as jest.Mock).mockImplementation(
            async (other: PasteDestination | undefined) => {
              return other?.id === 'terminal';
            },
          );
          return newDest;
        });

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

        // Assert: Info message shown (not error) with actual terminal name
        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
          'RangeLink: Already bound to Terminal ("TestTerminal")',
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
        const terminalDest = createMockDestinationForTest('terminal', 'Terminal ("TestTerminal")');
        (mockRegistryForSmartBind.create as jest.Mock).mockReturnValue(terminalDest);

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
          '✓ RangeLink bound to Terminal ("TestTerminal")',
          3000,
        );

        // Assert: QuickPick NOT shown (no existing binding)
        expect(mockVscode.window.showQuickPick).not.toHaveBeenCalled();
      });
    });

    describe('Scenario 5: QuickPick cancellation (Esc key)', () => {
      it('should keep current binding when user presses Esc', async () => {
        // Setup: Create mock destinations
        const terminalDest = createMockDestinationForTest('terminal', 'Terminal ("TestTerminal")');
        const textEditorDest = createMockDestinationForTest(
          'text-editor',
          'Text Editor ("file.ts")',
        );

        (mockRegistryForSmartBind.create as jest.Mock).mockImplementation((options) => {
          if (options.type === 'terminal') return terminalDest;
          if (options.type === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${options.type}`);
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
    let mockRegistryForJump: ReturnType<typeof createMockDestinationRegistry>;
    let mockAvailabilityService: jest.Mocked<DestinationAvailabilityService>;
    let mockTerminalDest: jest.Mocked<PasteDestination>;
    let mockEditorDest: PasteDestination;
    let mockEditorDestFocusSpy: jest.SpyInstance;
    let mockCursorAIDest: jest.Mocked<PasteDestination>;
    let mockClaudeCodeDest: jest.Mocked<PasteDestination>;

    beforeEach(() => {
      // Use specialized factories with default values (all already have sensible defaults)
      mockTerminalDest = createMockTerminalPasteDestination();
      mockEditorDest = createMockEditorComposablePasteDestination();
      mockEditorDestFocusSpy = jest.spyOn(mockEditorDest, 'focus');
      mockCursorAIDest = createMockCursorAIDestination();
      mockClaudeCodeDest = createMockClaudeCodeDestination();

      mockRegistryForJump = createMockDestinationRegistry({
        createImpl: (options) => {
          if (options.type === 'terminal') return mockTerminalDest;
          if (options.type === 'text-editor') return mockEditorDest;
          if (options.type === 'cursor-ai') return mockCursorAIDest;
          if (options.type === 'claude-code') return mockClaudeCodeDest;
          throw new Error(`Unexpected type: ${options.type}`);
        },
      });

      mockAvailabilityService = createMockDestinationAvailabilityService();

      // Recreate manager with mock factory
      manager = new PasteDestinationManager(
        mockContext,
        mockRegistryForJump,
        mockAvailabilityService,
        mockAdapter,
        mockLogger,
      );

      // Setup default 2 tab groups (required for text editor binding)
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);
    });

    describe('when no destination bound', () => {
      it('shows info message and returns false when no destinations available', async () => {
        const result = await manager.jumpToBoundDestination();

        expect(result).toBe(false);
        expect(
          mockAdapter.__getVscodeInstance().window.showInformationMessage,
        ).toHaveBeenCalledWith(
          'No destinations available. Open a terminal, split editor, or install an AI assistant extension.',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.showDestinationQuickPickAndJump::showDestinationQuickPickAndBind',
          },
          'No destination bound, showing quick pick',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.showDestinationQuickPickAndJump::showDestinationQuickPickAndBind',
          },
          'No destinations available',
        );
      });

      it('shows quick pick with available destinations', async () => {
        mockAvailabilityService.getAvailableDestinations.mockResolvedValueOnce([
          { type: 'terminal', displayName: 'Terminal' },
          { type: 'claude-code', displayName: 'Claude Code Chat' },
        ]);
        mockAdapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce(undefined);

        await manager.jumpToBoundDestination();

        expect(mockAdapter.__getVscodeInstance().window.showQuickPick).toHaveBeenCalledWith(
          [
            { label: 'Terminal', destinationType: 'terminal' },
            { label: 'Claude Code Chat', destinationType: 'claude-code' },
          ],
          { placeHolder: 'No destination bound. Choose destination to jump to:' },
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.showDestinationQuickPickAndJump::showDestinationQuickPickAndBind',
          },
          'No destination bound, showing quick pick',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.showDestinationQuickPickAndJump::showDestinationQuickPickAndBind',
            availableCount: 2,
          },
          'Showing quick pick with 2 destinations',
        );
      });

      it('returns false when user cancels quick pick', async () => {
        mockAvailabilityService.getAvailableDestinations.mockResolvedValueOnce([
          { type: 'terminal', displayName: 'Terminal' },
        ]);
        mockAdapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce(undefined);

        const result = await manager.jumpToBoundDestination();

        expect(result).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.showDestinationQuickPickAndJump::showDestinationQuickPickAndBind',
          },
          'User cancelled quick pick',
        );
      });

      it('binds to selected destination and focuses it', async () => {
        const mockTerminal = createMockTerminal();
        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
        mockAvailabilityService.getAvailableDestinations.mockResolvedValueOnce([
          { type: 'terminal', displayName: 'Terminal' },
        ]);
        mockAdapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce({
          label: 'Terminal',
          destinationType: 'terminal',
        });

        const result = await manager.jumpToBoundDestination();

        expect(result).toBe(true);
        expect(manager.isBound()).toBe(true);
        expect(mockTerminalDest.focus).toHaveBeenCalledTimes(1);
      });
    });

    it('should focus bound terminal successfully', async () => {
      const mockTerminal = createMockTerminal();

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
      expect(mockEditorDestFocusSpy).toHaveBeenCalledTimes(1);
    });

    it('should focus bound Cursor AI successfully', async () => {
      // Create manager with Cursor environment
      const { manager: cursorManager } = createManager({ envOptions: { appName: 'Cursor' } });

      await cursorManager.bind('cursor-ai');

      // Get the actual bound destination
      const boundDest = cursorManager.getBoundDestination()!;

      const result = await cursorManager.jumpToBoundDestination();

      expect(result).toBe(true);
      expect(boundDest.focus).toHaveBeenCalledTimes(1);

      cursorManager.dispose();
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

    it('should focus bound GitHub Copilot Chat successfully', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistryForJump, 'create').mockReturnValue(mockDestination);

      await manager.bind('github-copilot-chat');

      const result = await manager.jumpToBoundDestination();

      expect(result).toBe(true);
      expect(mockDestination.focus).toHaveBeenCalledTimes(1);
    });

    it('should return false when focus fails', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Mock focus failure
      mockTerminalDest.focus.mockResolvedValueOnce(false);

      const result = await manager.jumpToBoundDestination();

      expect(result).toBe(false);
      expect(mockTerminalDest.focus).toHaveBeenCalledTimes(1);
    });

    it('should show failure message when focus fails', async () => {
      const mockTerminal = createMockTerminal();

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
      const mockTerminal = createMockTerminal();

      const mockVscode = mockAdapter.__getVscodeInstance();
      mockVscode.window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Clear bind's status bar message
      (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();

      await manager.jumpToBoundDestination();

      expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ Focused Terminal: "bash"',
        2000,
      );
    });

    it('should log success with destination details for terminal', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Clear logger calls from bind()
      jest.clearAllMocks();

      await manager.jumpToBoundDestination();

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationType: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        },
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
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationType: 'text-editor',
          displayName: 'Text Editor ("file.ts")',
          editorName: 'file.ts',
          editorPath: '/workspace/src/file.ts',
        },
        'Successfully focused Text Editor ("file.ts")',
      );
    });

    it('should log success with empty details for AI assistants', async () => {
      // Create manager with Cursor environment
      const { manager: cursorManager } = createManager({ envOptions: { appName: 'Cursor' } });

      await cursorManager.bind('cursor-ai');

      // Clear logger calls from bind()
      jest.clearAllMocks();

      await cursorManager.jumpToBoundDestination();

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationType: 'cursor-ai',
          displayName: 'Cursor AI Assistant',
        },
        'Successfully focused Cursor AI Assistant',
      );

      cursorManager.dispose();
    });

    it('should log success with empty details for GitHub Copilot Chat', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistryForJump, 'create').mockReturnValue(mockDestination);

      await manager.bind('github-copilot-chat');

      // Clear logger calls from bind()
      jest.clearAllMocks();

      await manager.jumpToBoundDestination();

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationType: 'github-copilot-chat',
          displayName: 'GitHub Copilot Chat',
        },
        'Successfully focused GitHub Copilot Chat',
      );
    });

    it('should log warning when focus fails', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Clear logger calls from bind()
      jest.clearAllMocks();

      // Mock focus failure
      mockTerminalDest.focus.mockResolvedValueOnce(false);

      await manager.jumpToBoundDestination();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationType: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        },
        'Failed to focus Terminal',
      );
    });

    it('should not call focus when no destination bound', async () => {
      await manager.jumpToBoundDestination();

      expect(mockTerminalDest.focus).not.toHaveBeenCalled();
      expect(mockEditorDestFocusSpy).not.toHaveBeenCalled();
      expect(mockCursorAIDest.focus).not.toHaveBeenCalled();
      expect(mockClaudeCodeDest.focus).not.toHaveBeenCalled();
    });

    it('should not show success message when no destination bound', async () => {
      await manager.jumpToBoundDestination();

      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).not.toHaveBeenCalled();
    });

    it('should not show success message when focus fails', async () => {
      const mockTerminal = createMockTerminal();

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

  describe('bindAndJump()', () => {
    let mockRegistryForBindAndJump: ReturnType<typeof createMockDestinationRegistry>;
    let mockAvailabilityService: jest.Mocked<DestinationAvailabilityService>;
    let mockTerminalDest: jest.Mocked<PasteDestination>;
    let mockTerminal: vscode.Terminal;

    beforeEach(() => {
      mockTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      mockTerminalDest = createMockTerminalPasteDestination();

      mockRegistryForBindAndJump = createMockDestinationRegistry({
        createImpl: (options) => {
          if (options.type === 'terminal') return mockTerminalDest;
          throw new Error(`Unexpected type: ${options.type}`);
        },
      });

      mockAvailabilityService = createMockDestinationAvailabilityService();

      manager = new PasteDestinationManager(
        mockContext,
        mockRegistryForBindAndJump,
        mockAvailabilityService,
        mockAdapter,
        mockLogger,
      );
    });

    it('binds and jumps to destination when bind succeeds', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

      const result = await manager.bindAndJump('terminal');

      expect(result).toBe(true);
      expect(manager.isBound()).toBe(true);
      expect(mockTerminalDest.focus).toHaveBeenCalled();
    });

    it('returns false without jumping when bind fails', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = undefined;

      const result = await manager.bindAndJump('terminal');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
      expect(mockTerminalDest.focus).not.toHaveBeenCalled();
    });

    it('returns false when focus fails after successful bind', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      mockTerminalDest.focus.mockResolvedValueOnce(false);

      const result = await manager.bindAndJump('terminal');

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(true);
    });
  });

  describe('Edge Cases Coverage', () => {
    describe('sendTextToDestination() - Error Path', () => {
      const TEST_CONTENT = 'Test content to paste';
      const TEST_STATUS = 'Content sent successfully';

      let mockTerminalDest: jest.Mocked<PasteDestination>;
      let mockRegistryForSend: ReturnType<typeof createMockDestinationRegistry>;
      let mockVscode: ReturnType<typeof mockAdapter.__getVscodeInstance>;

      beforeEach(() => {
        mockTerminalDest = createMockTerminalPasteDestination({
          displayName: 'Terminal ("bash")',
        });

        mockRegistryForSend = createMockDestinationRegistry({
          createImpl: () => mockTerminalDest,
        });

        manager = new PasteDestinationManager(
          mockContext,
          mockRegistryForSend,
          createMockDestinationAvailabilityService(),
          mockAdapter,
          mockLogger,
        );

        mockVscode = mockAdapter.__getVscodeInstance();
      });

      it('should successfully send text to bound destination', async () => {
        const mockTerminal = createMockTerminal();
        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

        await manager.bind('terminal');
        mockTerminalDest.pasteContent.mockResolvedValueOnce(true);

        const result = await manager.sendTextToDestination(TEST_CONTENT, TEST_STATUS, 'none');

        expect(result).toBe(true);
        expect(mockTerminalDest.pasteContent).toHaveBeenCalledWith(TEST_CONTENT, 'none');
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Content sent successfully & sent to Terminal ("bash")',
          2000,
        );

        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should successfully send text to bound GitHub Copilot Chat', async () => {
        const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
        jest.spyOn(mockRegistryForSend, 'create').mockReturnValue(mockDestination);

        await manager.bind('github-copilot-chat');
        mockDestination.pasteContent.mockResolvedValueOnce(true);

        const result = await manager.sendTextToDestination(TEST_CONTENT, TEST_STATUS, 'none');

        expect(result).toBe(true);
        expect(mockDestination.pasteContent).toHaveBeenCalledWith(TEST_CONTENT, 'none');
      });

      it('should handle destination.pasteContent returning false', async () => {
        const mockTerminal = createMockTerminal();
        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

        await manager.bind('terminal');

        // Clear bind() messages to isolate sendTextToDestination behavior
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();

        mockTerminalDest.pasteContent.mockResolvedValueOnce(false);

        const result = await manager.sendTextToDestination(TEST_CONTENT, TEST_STATUS, 'none');

        expect(result).toBe(false);
        expect(mockTerminalDest.pasteContent).toHaveBeenCalledWith(TEST_CONTENT, 'none');

        expect(mockLogger.error).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.sendTextToDestination',
            contentLength: TEST_CONTENT.length,
            displayName: 'Terminal ("bash")',
            destinationType: 'terminal',
            paddingMode: 'none',
            terminalName: 'bash',
          },
          'Paste content failed to Terminal ("bash")',
        );

        expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should verify status bar message shown on success', async () => {
        const mockTerminal = createMockTerminal();
        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

        await manager.bind('terminal');
        mockTerminalDest.pasteContent.mockResolvedValueOnce(true);

        await manager.sendTextToDestination(TEST_CONTENT, TEST_STATUS, 'none');

        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Content sent successfully & sent to Terminal ("bash")',
          2000,
        );

        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should test with large content (>1000 chars)', async () => {
        const largeContent = 'x'.repeat(1500);
        const mockTerminal = createMockTerminal();
        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

        await manager.bind('terminal');
        mockTerminalDest.pasteContent.mockResolvedValueOnce(true);

        const result = await manager.sendTextToDestination(largeContent, TEST_STATUS, 'none');

        expect(result).toBe(true);
        expect(mockTerminalDest.pasteContent).toHaveBeenCalledWith(largeContent, 'none');

        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Content sent successfully & sent to Terminal ("bash")',
          2000,
        );

        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
      });
    });

    describe('Replace Binding Confirmation', () => {
      let mockTerminalDest1: jest.Mocked<PasteDestination>;
      let mockTerminalDest2: jest.Mocked<PasteDestination>;
      let mockRegistryForReplace: ReturnType<typeof createMockDestinationRegistry>;
      let mockVscode: ReturnType<typeof mockAdapter.__getVscodeInstance>;

      beforeEach(() => {
        mockTerminalDest1 = createMockTerminalPasteDestination({
          displayName: 'Terminal ("bash")',
          resourceName: 'bash',
        });

        mockTerminalDest2 = createMockTerminalPasteDestination({
          displayName: 'Terminal ("zsh")',
          resourceName: 'zsh',
        });

        mockRegistryForReplace = createMockDestinationRegistry({
          createImpl: (options) => {
            if (options.terminal?.name === 'bash') return mockTerminalDest1;
            if (options.terminal?.name === 'zsh') return mockTerminalDest2;
            throw new Error(`Unexpected terminal: ${options.terminal?.name}`);
          },
        });

        manager = new PasteDestinationManager(
          mockContext,
          mockRegistryForReplace,
          createMockDestinationAvailabilityService(),
          mockAdapter,
          mockLogger,
        );

        mockVscode = mockAdapter.__getVscodeInstance();
      });

      it('should set replacedDestinationName when user confirms replacement', async () => {
        const mockTerminal1 = createMockTerminal({ name: 'bash' });
        const mockTerminal2 = createMockTerminal({ name: 'zsh' });

        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal1;
        await manager.bind('terminal');

        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal2;
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce({
          label: 'Yes, replace',
        });

        await manager.bind('terminal');

        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          'Unbound Terminal ("bash"), now bound to Terminal ("zsh")',
          3000,
        );

        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();

        expect(mockVscode.window.showQuickPick).toHaveBeenCalledTimes(1);
      });

      it('should unbind old destination when user confirms replacement', async () => {
        const mockTerminal1 = createMockTerminal({ name: 'bash' });
        const mockTerminal2 = createMockTerminal({ name: 'zsh' });

        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal1;
        await manager.bind('terminal');

        expect(manager.getBoundDestination()).toBe(mockTerminalDest1);

        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal2;
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce({
          label: 'Yes, replace',
        });

        await manager.bind('terminal');

        expect(manager.getBoundDestination()).toBe(mockTerminalDest2);

        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledWith(
          'Unbound Terminal ("bash"), now bound to Terminal ("zsh")',
          3000,
        );

        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should verify no changes when user cancels replacement', async () => {
        const mockTerminal1 = createMockTerminal({ name: 'bash' });
        const mockTerminal2 = createMockTerminal({ name: 'zsh' });

        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal1;
        await manager.bind('terminal');

        const originalDest = manager.getBoundDestination();

        // Clear previous bind() calls to isolate cancel behavior
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();
        (mockVscode.window.showErrorMessage as jest.Mock).mockClear();
        (mockVscode.window.showInformationMessage as jest.Mock).mockClear();

        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal2;
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce(undefined);

        const result = await manager.bind('terminal');

        expect(result).toBe(false);
        expect(manager.getBoundDestination()).toBe(originalDest);

        expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
      });
    });

    describe('Already Bound Check', () => {
      let mockTerminalDest: jest.Mocked<PasteDestination>;
      let mockRegistryForDuplicate: ReturnType<typeof createMockDestinationRegistry>;
      let mockVscode: ReturnType<typeof mockAdapter.__getVscodeInstance>;

      beforeEach(() => {
        mockTerminalDest = createMockTerminalPasteDestination({
          displayName: 'Terminal ("bash")',
        });

        mockRegistryForDuplicate = createMockDestinationRegistry({
          createImpl: () => mockTerminalDest,
        });

        manager = new PasteDestinationManager(
          mockContext,
          mockRegistryForDuplicate,
          createMockDestinationAvailabilityService(),
          mockAdapter,
          mockLogger,
        );

        mockVscode = mockAdapter.__getVscodeInstance();
      });

      it('should show already bound message when binding to same terminal twice', async () => {
        const mockTerminal = createMockTerminal();
        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

        await manager.bind('terminal');

        // Clear mocks from first bind to isolate second bind behavior
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();
        (mockVscode.window.showInformationMessage as jest.Mock).mockClear();
        (mockVscode.window.showErrorMessage as jest.Mock).mockClear();

        // Mock equals() to return true (same destination)
        mockTerminalDest.equals.mockResolvedValueOnce(true);

        const result = await manager.bind('terminal');

        expect(result).toBe(false);

        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
          'RangeLink: Already bound to Terminal ("bash")',
        );
        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledTimes(1);

        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
      });

      it('should verify no rebind occurs when already bound to same destination', async () => {
        const mockTerminal = createMockTerminal();
        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

        await manager.bind('terminal');
        const firstDest = manager.getBoundDestination();

        // Clear mocks from first bind
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();
        (mockVscode.window.showInformationMessage as jest.Mock).mockClear();
        (mockVscode.window.showErrorMessage as jest.Mock).mockClear();

        mockTerminalDest.equals.mockResolvedValueOnce(true);
        await manager.bind('terminal');

        expect(manager.getBoundDestination()).toBe(firstDest);

        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
          'RangeLink: Already bound to Terminal ("bash")',
        );

        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
      });

      it('should verify info message shown to user for duplicate binding', async () => {
        const mockTerminal = createMockTerminal();
        mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

        await manager.bind('terminal');

        // Clear mocks from first bind
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();
        (mockVscode.window.showInformationMessage as jest.Mock).mockClear();
        (mockVscode.window.showErrorMessage as jest.Mock).mockClear();

        mockTerminalDest.equals.mockResolvedValueOnce(true);
        await manager.bind('terminal');

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.bindTerminal',
            displayName: 'Terminal ("bash")',
          },
          'Already bound to Terminal ("bash"), no action taken',
        );

        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
          'RangeLink: Already bound to Terminal ("bash")',
        );
        expect(mockVscode.window.showInformationMessage).toHaveBeenCalledTimes(1);

        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
      });
    });

    describe('Document Close Auto-Unbind', () => {
      let mockTextEditorDest: ReturnType<typeof createMockEditorComposablePasteDestination>;
      let mockRegistryForDocument: ReturnType<typeof createMockDestinationRegistry>;
      let localDocumentCloseListener: (doc: vscode.TextDocument) => void;

      beforeEach(() => {
        mockRegistryForDocument = createMockDestinationRegistry({
          createImpl: (options) => {
            if (options.type === 'text-editor' && options.editor) {
              const doc = options.editor.document;
              const fileName = doc.uri.fsPath.split('/').pop() || 'Unknown';
              // Use real ComposablePasteDestination for document close listener to work
              mockTextEditorDest = createMockEditorComposablePasteDestination({
                displayName: `Text Editor (${fileName})`,
                editor: options.editor,
              });
              return mockTextEditorDest;
            }
            return undefined;
          },
        });

        manager = new PasteDestinationManager(
          mockContext,
          mockRegistryForDocument,
          createMockDestinationAvailabilityService(),
          mockAdapter,
          mockLogger,
        );

        // Capture the document close listener from THIS manager instance
        const vscode = mockAdapter.__getVscodeInstance();
        const onDidCloseTextDocumentMock = vscode.workspace.onDidCloseTextDocument as jest.Mock;
        localDocumentCloseListener =
          onDidCloseTextDocumentMock.mock.calls[
            onDidCloseTextDocumentMock.mock.calls.length - 1
          ]?.[0];

        // Configure tab groups (required for text editor binding)
        configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);
      });

      it('should auto-unbind when bound document closes', async () => {
        const mockUri = {
          toString: () => 'file:///workspace/file.ts',
          fsPath: '/workspace/file.ts',
          scheme: 'file',
        } as vscode.Uri;
        const mockDocument = {
          uri: mockUri,
          languageId: 'typescript',
        } as vscode.TextDocument;
        const mockEditor = { document: mockDocument } as vscode.TextEditor;

        mockAdapter.__getVscodeInstance().window.activeTextEditor = mockEditor;

        await manager.bind('text-editor');

        // Clear bind() messages to isolate close behavior
        const mockVscode = mockAdapter.__getVscodeInstance();
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();

        // Simulate document closure (URI matches bound document)
        localDocumentCloseListener(mockDocument);

        // Verify auto-unbind occurred
        expect(manager.getBoundDestination()).toBeUndefined();

        // Verify unbind messages shown (unbind() + document close message)
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenCalledTimes(2);
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenNthCalledWith(
          1,
          '✓ RangeLink unbound from Text Editor (file.ts)',
          2000,
        );
        expect(mockVscode.window.setStatusBarMessage).toHaveBeenNthCalledWith(
          2,
          'RangeLink: Bound editor closed. Unbound.',
          2000,
        );

        // Verify no error/info messages
        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should not unbind when different document closes', async () => {
        // Use same URI for binding as test 1 (the default from beforeEach)
        const mockUri = {
          toString: () => 'file:///workspace/file.ts',
          fsPath: '/workspace/file.ts',
          scheme: 'file',
        } as vscode.Uri;
        const mockDocument = {
          uri: mockUri,
          languageId: 'typescript',
        } as vscode.TextDocument;
        const mockEditor = { document: mockDocument } as vscode.TextEditor;

        mockAdapter.__getVscodeInstance().window.activeTextEditor = mockEditor;

        const bindResult = await manager.bind('text-editor');

        // Verify binding succeeded
        expect(bindResult).toBe(true);
        expect(manager.getBoundDestination()).toBe(mockTextEditorDest);

        // Clear bind() messages to isolate close behavior
        const mockVscode = mockAdapter.__getVscodeInstance();
        (mockVscode.window.setStatusBarMessage as jest.Mock).mockClear();
        (mockVscode.window.showErrorMessage as jest.Mock).mockClear();
        (mockVscode.window.showInformationMessage as jest.Mock).mockClear();

        // Create a DIFFERENT document to close (different URI)
        const closedUri = {
          toString: () => 'file:///workspace/different-file.ts',
          fsPath: '/workspace/different-file.ts',
          scheme: 'file',
        } as vscode.Uri;
        const closedDocument = {
          uri: closedUri,
          languageId: 'typescript',
        } as vscode.TextDocument;

        // Simulate different document closure (URI does NOT match bound document)
        localDocumentCloseListener(closedDocument);

        // Should still be bound since we closed a different document
        expect(manager.getBoundDestination()).toBe(mockTextEditorDest);

        expect(mockVscode.window.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
      });
    });
  });

  describe('showDestinationQuickPickForPaste()', () => {
    let mockAvailabilityService: jest.Mocked<DestinationAvailabilityService>;
    let showQuickPickMock: jest.Mock;
    let mockWindow: ReturnType<typeof mockAdapter.__getVscodeInstance>['window'];

    beforeEach(() => {
      mockAvailabilityService = createMockDestinationAvailabilityService();
      mockWindow = mockAdapter.__getVscodeInstance().window;
      showQuickPickMock = mockWindow.showQuickPick as jest.Mock;

      manager = new PasteDestinationManager(
        mockContext,
        mockRegistry,
        mockAvailabilityService,
        mockAdapter,
        mockLogger,
      );
    });

    it('shows quick pick with available destinations and returns Bound on selection', async () => {
      const mockTerminal = createMockTerminal();
      mockWindow.activeTerminal = mockTerminal;
      mockAvailabilityService.getAvailableDestinations.mockResolvedValueOnce([
        { type: 'terminal', displayName: 'Terminal ("bash")' },
        { type: 'claude-code', displayName: 'Claude Code Chat' },
      ]);
      showQuickPickMock.mockResolvedValueOnce({
        label: 'Terminal ("bash")',
        destinationType: 'terminal',
      });

      const result = await manager.showDestinationQuickPickForPaste();

      expect(result).toBe('Bound');
      expect(manager.isBound()).toBe(true);
      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'Terminal ("bash")', destinationType: 'terminal' },
          { label: 'Claude Code Chat', destinationType: 'claude-code' },
        ],
        { placeHolder: 'No bound destination. Choose below to bind and paste:' },
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.showDestinationQuickPickForPaste::showDestinationQuickPickAndBind',
        },
        'No destination bound, showing quick pick',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.showDestinationQuickPickForPaste::showDestinationQuickPickAndBind',
          availableCount: 2,
        },
        'Showing quick pick with 2 destinations',
      );
    });

    it('returns NoDestinationsAvailable and shows message when no destinations available', async () => {
      mockAvailabilityService.getAvailableDestinations.mockResolvedValueOnce([]);

      const result = await manager.showDestinationQuickPickForPaste();

      expect(result).toBe('NoDestinationsAvailable');
      expect(showQuickPickMock).not.toHaveBeenCalled();
      expect(mockAdapter.__getVscodeInstance().window.showInformationMessage).toHaveBeenCalledWith(
        'No destinations available. Open a terminal, split editor, or install an AI assistant extension.',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.showDestinationQuickPickForPaste::showDestinationQuickPickAndBind',
        },
        'No destinations available',
      );
    });

    it('returns Cancelled when user cancels quick pick (Escape)', async () => {
      mockAvailabilityService.getAvailableDestinations.mockResolvedValueOnce([
        { type: 'terminal', displayName: 'Terminal' },
      ]);
      showQuickPickMock.mockResolvedValueOnce(undefined);

      const result = await manager.showDestinationQuickPickForPaste();

      expect(result).toBe('Cancelled');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.showDestinationQuickPickForPaste::showDestinationQuickPickAndBind',
        },
        'User cancelled quick pick',
      );
    });

    it('returns BindingFailed when binding fails', async () => {
      mockWindow.activeTerminal = undefined;
      mockAvailabilityService.getAvailableDestinations.mockResolvedValueOnce([
        { type: 'terminal', displayName: 'Terminal' },
      ]);
      showQuickPickMock.mockResolvedValueOnce({
        label: 'Terminal',
        destinationType: 'terminal',
      });

      const result = await manager.showDestinationQuickPickForPaste();

      expect(result).toBe('BindingFailed');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.showDestinationQuickPickForPaste::showDestinationQuickPickAndBind',
        },
        'Binding failed',
      );
    });
  });
});
