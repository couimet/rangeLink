import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import {
  type BindSuccessInfo,
  ComposablePasteDestination,
  type FocusSuccessInfo,
  type PasteDestination,
  PasteDestinationManager,
} from '../../destinations';
import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import {
  AutoPasteResult,
  type BindOptions,
  type DestinationKind,
  ExtensionResult,
} from '../../types';
import {
  configureEmptyTabGroups,
  createBaseMockPasteDestination,
  createMockClaudeCodeDestination,
  createMockCursorAIDestination,
  createMockDestinationRegistry,
  createMockDocument,
  createMockEditor,
  createMockEditorComposablePasteDestination,
  createMockFocusCapability,
  createMockFormattedLink,
  createMockOperationFeedbackProvider,
  createMockBoundSession,
  createMockGeminiCodeAssistDestination,
  createMockGitHubCopilotChatDestination,
  createMockTerminal,
  createMockTerminalComposablePasteDestination,
  createMockTerminalPasteDestination,
  createMockUri,
  createMockVscodeAdapter,
  type MockVscodeOptions,
  spyOnFormatMessage,
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
  expect(showQuickPickMock).toHaveBeenCalledWith(
    [
      {
        label: 'Yes, replace',
        description: `Switch from ${expectedStrings.currentDestination} to ${expectedStrings.newDestination}`,
        confirmed: true,
      },
      {
        label: 'No, keep current binding',
        description: `Stay bound to ${expectedStrings.currentDestination}`,
        confirmed: false,
      },
    ],
    {
      placeHolder: `Already bound to ${expectedStrings.currentDestination}. Replace with ${expectedStrings.newDestination}?`,
    },
  );
};

describe('PasteDestinationManager', () => {
  let manager: PasteDestinationManager;
  let mockRegistry: ReturnType<typeof createMockDestinationRegistry>;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let mockTerminalDest: ReturnType<typeof createMockTerminalPasteDestination>;
  let mockTerminal: vscode.Terminal;
  let formatMessageSpy: jest.SpyInstance;
  let mockSession: ReturnType<typeof createMockBoundSession>;
  let mockFeedback: ReturnType<typeof createMockOperationFeedbackProvider>;

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
        if (options.kind === 'terminal' && options.terminal) {
          const terminalName = options.terminal.name;
          const cacheKey = `terminal:${terminalName}`;
          if (!destinationCache.has(cacheKey)) {
            destinationCache.set(
              cacheKey,
              createMockTerminalComposablePasteDestination({
                displayName: `Terminal ("${terminalName}")`,
                terminal: options.terminal,
              }),
            );
          }
          return destinationCache.get(cacheKey);
        }
        if (options.kind === 'text-editor' && options.uri) {
          const fsPath = options.uri.fsPath;
          const cacheKey = `text-editor:${fsPath}`;
          if (!destinationCache.has(cacheKey)) {
            destinationCache.set(
              cacheKey,
              createMockEditorComposablePasteDestination({
                uri: options.uri,
                viewColumn: options.viewColumn,
              }),
            );
          }
          return destinationCache.get(cacheKey);
        }
        if (options.kind === 'cursor-ai') {
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
        if (options.kind === 'claude-code') {
          if (!destinationCache.has('claude-code')) {
            destinationCache.set('claude-code', createMockClaudeCodeDestination());
          }
          return destinationCache.get('claude-code');
        }
        return undefined;
      },
    });
    const mgr = new PasteDestinationManager(
      registry,
      adapter,
      mockSession,
      mockFeedback,
      mockLogger,
    );

    return { manager: mgr, adapter, registry };
  };

  beforeEach(() => {
    // Spy on formatMessage to verify MessageCode usage
    formatMessageSpy = spyOnFormatMessage();

    // Create mock logger
    mockLogger = createMockLogger();

    // Create default manager with VSCode environment
    mockSession = createMockBoundSession();
    mockFeedback = createMockOperationFeedbackProvider();
    const result = createManager();
    manager = result.manager;
    mockAdapter = result.adapter;
    mockRegistry = result.registry;
  });

  describe('bind() - terminal', () => {
    beforeEach(() => {
      mockTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
    });

    it('should bind to active terminal successfully', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

      const result = await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'Terminal ("bash")',
          destinationKind: 'terminal',
        });
      });
      expect(mockSession.isSet()).toBe(true);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal ("bash")', undefined);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'terminal',
          displayName: 'Terminal ("bash")',
          terminalName: 'bash',
        },
        'Successfully bound to "Terminal ("bash")"',
      );
    });

    it('should show info message when binding same terminal twice', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;

      // Registry always returns the same composable destination for terminal,
      // so equals() naturally returns true (same processId)
      const terminalDest = createMockTerminalComposablePasteDestination({
        displayName: 'Terminal ("bash")',
        terminal: mockTerminal,
      });
      const controlledFactory = createMockDestinationRegistry({
        createImpl: () => terminalDest,
      });
      const controlledManager = new PasteDestinationManager(
        controlledFactory,
        mockAdapter,
        mockSession,
        mockFeedback,
        mockLogger,
      );

      // First bind
      await controlledManager.bind({ kind: 'terminal', terminal: mockTerminal });

      formatMessageSpy.mockClear();

      // Try binding again to same destination
      const result = await controlledManager.bind({ kind: 'terminal', terminal: mockTerminal });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Already bound to same destination',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'ALREADY_BOUND_TO_SAME' },
      });
      expect(mockFeedback.notifyAlreadyBound).toHaveBeenCalledWith('Terminal ("bash")');
      expect(mockFeedback.notifyAlreadyBound).toHaveBeenCalledWith('Terminal ("bash")');
    });

    it('should handle terminal with custom name', async () => {
      const customTerminal = createMockTerminal({
        name: 'zsh',
        processId: Promise.resolve(54321),
      });

      const result = await manager.bind({ kind: 'terminal', terminal: customTerminal });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'Terminal ("zsh")',
          destinationKind: 'terminal',
        });
      });
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal ("zsh")', undefined);
    });
  });

  describe('bind() - chat destinations', () => {
    it('should bind to cursor-ai when available', async () => {
      const { manager: localManager } = createManager({
        envOptions: { appName: 'Cursor' },
      });

      const result = await localManager.bind({ kind: 'cursor-ai' });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'Cursor AI Assistant',
          destinationKind: 'cursor-ai',
        });
      });
      expect(mockSession.isSet()).toBe(true);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Cursor AI Assistant', undefined);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'cursor-ai',
          displayName: 'Cursor AI Assistant',
        },
        'Successfully bound to "Cursor AI Assistant"',
      );
    });

    it('should fail when cursor-ai not available', async () => {
      // Mock non-Cursor IDE (already configured in beforeEach as non-Cursor)
      const result = await manager.bind({ kind: 'cursor-ai' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Cursor AI Assistant not available',
        functionName: 'PasteDestinationManager.bindGenericDestination',
        details: { failedBindDetails: 'DESTINATION_NOT_AVAILABLE' },
      });
      expect(mockSession.isSet()).toBe(false);

      expect(mockFeedback.notifyBindFailedNotAvailable).toHaveBeenCalledWith(
        'Cursor AI Assistant',
        'cursor-ai',
      );

      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('should fail when claude-code not available', async () => {
      const mockDestination = createMockClaudeCodeDestination({ isAvailable: false });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind({ kind: 'claude-code' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Claude Code Chat not available',
        functionName: 'PasteDestinationManager.bindGenericDestination',
        details: { failedBindDetails: 'DESTINATION_NOT_AVAILABLE' },
      });
      expect(mockSession.isSet()).toBe(false);
      expect(mockFeedback.notifyBindFailedNotAvailable).toHaveBeenCalledWith(
        'Claude Code Chat',
        'claude-code',
      );

      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('should bind to claude-code when available', async () => {
      const mockDestination = createMockClaudeCodeDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind({ kind: 'claude-code' });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'Claude Code Chat',
          destinationKind: 'claude-code',
        });
      });
      expect(mockSession.isSet()).toBe(true);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Claude Code Chat', undefined);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'claude-code',
          displayName: 'Claude Code Chat',
        },
        'Successfully bound to "Claude Code Chat"',
      );
    });

    it('should bind to gemini-code-assist when available', async () => {
      const mockDestination = createMockGeminiCodeAssistDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind({ kind: 'gemini-code-assist' });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'Gemini Code Assist',
          destinationKind: 'gemini-code-assist',
        });
      });
      expect(mockSession.isSet()).toBe(true);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Gemini Code Assist', undefined);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'gemini-code-assist',
          displayName: 'Gemini Code Assist',
        },
        'Successfully bound to "Gemini Code Assist"',
      );
    });

    it('should fail when gemini-code-assist not available', async () => {
      const mockDestination = createMockGeminiCodeAssistDestination({ isAvailable: false });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind({ kind: 'gemini-code-assist' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Gemini Code Assist not available',
        functionName: 'PasteDestinationManager.bindGenericDestination',
        details: { failedBindDetails: 'DESTINATION_NOT_AVAILABLE' },
      });
      expect(mockSession.isSet()).toBe(false);
      expect(mockFeedback.notifyBindFailedNotAvailable).toHaveBeenCalledWith(
        'Gemini Code Assist',
        'gemini-code-assist',
      );

      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('should bind to github-copilot-chat when available', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind({ kind: 'github-copilot-chat' });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'GitHub Copilot Chat',
          destinationKind: 'github-copilot-chat',
        });
      });
      expect(mockSession.isSet()).toBe(true);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'GitHub Copilot Chat', undefined);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'github-copilot-chat',
          displayName: 'GitHub Copilot Chat',
        },
        'Successfully bound to "GitHub Copilot Chat"',
      );
    });

    it('should fail when github-copilot-chat not available', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: false });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      const result = await manager.bind({ kind: 'github-copilot-chat' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'GitHub Copilot Chat not available',
        functionName: 'PasteDestinationManager.bindGenericDestination',
        details: { failedBindDetails: 'DESTINATION_NOT_AVAILABLE' },
      });
      expect(mockSession.isSet()).toBe(false);
      expect(mockFeedback.notifyBindFailedNotAvailable).toHaveBeenCalledWith(
        'GitHub Copilot Chat',
        'github-copilot-chat',
      );

      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('should show info message when binding same chat destination twice', async () => {
      // Create manager with Cursor IDE environment
      const { manager: localManager } = createManager({
        envOptions: { appName: 'Cursor' },
      });
      await localManager.bind({ kind: 'cursor-ai' });

      // Try binding again to same destination
      const result = await localManager.bind({ kind: 'cursor-ai' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Already bound to same destination',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'ALREADY_BOUND_TO_SAME' },
      });
      expect(mockFeedback.notifyAlreadyBound).toHaveBeenCalledWith('Cursor AI Assistant');
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Cursor AI Assistant', undefined);
    });

    it('should show info message when already bound to github-copilot-chat', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({
        isAvailable: true,
        equals: jest.fn().mockImplementation(async (other) => other?.id === 'github-copilot-chat'),
      });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      // Bind first time
      await manager.bind({ kind: 'github-copilot-chat' });

      // Try binding again to same destination
      const result = await manager.bind({ kind: 'github-copilot-chat' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Already bound to same destination',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'ALREADY_BOUND_TO_SAME' },
      });
      expect(mockFeedback.notifyAlreadyBound).toHaveBeenCalledWith('GitHub Copilot Chat');
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'GitHub Copilot Chat', undefined);
    });

    it('should bind to custom AI assistant kind successfully', async () => {
      const CUSTOM_AI_KIND = 'custom-ai:acme.spark-ai';
      const mockCustomAiDest = createBaseMockPasteDestination({
        id: CUSTOM_AI_KIND as DestinationKind,
        displayName: 'Acme Spark AI',
      });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockCustomAiDest);

      const result = await manager.bind({ kind: CUSTOM_AI_KIND });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'Acme Spark AI',
          destinationKind: CUSTOM_AI_KIND,
        });
      });
      expect(mockSession.isSet()).toBe(true);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Acme Spark AI', undefined);
    });

    it('should show ERROR_CUSTOM_AI_NOT_AVAILABLE when custom AI assistant is not available', async () => {
      const CUSTOM_AI_KIND = 'custom-ai:some.nonexistent';
      const DISPLAY_NAME = 'NonExistent AI';
      const mockCustomAiDest = createBaseMockPasteDestination({
        id: CUSTOM_AI_KIND as DestinationKind,
        displayName: DISPLAY_NAME,
        isAvailable: false,
      });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockCustomAiDest);

      const result = await manager.bind({ kind: CUSTOM_AI_KIND });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: `${DISPLAY_NAME} not available`,
        functionName: 'PasteDestinationManager.bindGenericDestination',
        details: { failedBindDetails: 'DESTINATION_NOT_AVAILABLE' },
      });
      expect(mockSession.isSet()).toBe(false);
      expect(mockFeedback.notifyBindFailedNotAvailable).toHaveBeenCalledWith(
        DISPLAY_NAME,
        CUSTOM_AI_KIND,
      );
      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
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

      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [mockEditor];

      const result = await manager.bind({ kind: 'text-editor', uri: mockUri, viewColumn: 1 });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'Text Editor ("file.ts")',
          destinationKind: 'text-editor',
        });
      });
      expect(mockSession.isSet()).toBe(true);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
        1,
        'Text Editor ("file.ts")',
        undefined,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'text-editor',
          displayName: 'Text Editor ("file.ts")',
          editorName: 'file.ts',
          editorPath: '/workspace/src/file.ts',
        },
        'Successfully bound to "Text Editor ("file.ts")"',
      );
    });

    it('should fail to bind text editor when file is closed', async () => {
      mockAdapter.__getVscodeInstance().window.activeTextEditor = undefined;
      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [];
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);
      const missingUri = createMockUri('/workspace/src/gone.ts');
      mockAdapter
        .__getVscodeInstance()
        .workspace.openTextDocument.mockRejectedValueOnce(new Error('File not found'));

      const result = await manager.bind({ kind: 'text-editor', uri: missingUri, viewColumn: 1 });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'No visible editor for file:///workspace/src/gone.ts at viewColumn 1',
        functionName: 'PasteDestinationManager.bindTextEditor',
        details: { failedBindDetails: 'NO_ACTIVE_EDITOR' },
      });
      expect(mockSession.isSet()).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.bindTextEditor',
          uri: 'file:///workspace/src/gone.ts',
          viewColumn: 1,
          fileName: 'gone.ts',
        },
        'Editor not visible, bringing background tab to foreground',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.bindTextEditor',
          uri: 'file:///workspace/src/gone.ts',
          viewColumn: 1,
          fileName: 'gone.ts',
        },
        'showTextDocument threw for background tab',
      );

      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('should bind to background tab by bringing it to foreground', async () => {
      mockAdapter.__getVscodeInstance().window.activeTextEditor = undefined;
      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [];
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);
      const backgroundUri = createMockUri('/workspace/src/file.ts');

      mockAdapter.__getVscodeInstance().window.showTextDocument.mockImplementationOnce(async () => {
        mockAdapter.__getVscodeInstance().window.visibleTextEditors = [
          { document: { uri: backgroundUri }, viewColumn: 1 } as unknown as vscode.TextEditor,
        ];
        return undefined;
      });

      const result = await manager.bind({
        kind: 'text-editor',
        uri: backgroundUri,
        viewColumn: 1,
      });

      expect(result).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({
          destinationName: 'Text Editor ("file.ts")',
          destinationKind: 'text-editor',
          suppressAutoPaste: true,
        });
      });
      expect(mockSession.isSet()).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.bindTextEditor',
          uri: 'file:///workspace/src/file.ts',
          viewColumn: 1,
          fileName: 'file.ts',
        },
        'Editor not visible, bringing background tab to foreground',
      );
      expect(mockAdapter.__getVscodeInstance().workspace.openTextDocument).toHaveBeenCalledWith(
        backgroundUri,
      );
      expect(mockFeedback.notifyBackgroundTabOpened).toHaveBeenCalledWith('file.ts');
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
        1,
        'Text Editor ("file.ts")',
        undefined,
      );
    });

    it('should fail when showTextDocument resolves but editor not at expected viewColumn', async () => {
      mockAdapter.__getVscodeInstance().window.activeTextEditor = undefined;
      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [];
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);
      const backgroundUri = createMockUri('/workspace/src/file.ts');

      const result = await manager.bind({
        kind: 'text-editor',
        uri: backgroundUri,
        viewColumn: 1,
      });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Editor opened but not visible at expected viewColumn 1',
        functionName: 'PasteDestinationManager.bindTextEditor',
        details: { failedBindDetails: 'NO_ACTIVE_EDITOR' },
      });
      expect(mockSession.isSet()).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.bindTextEditor',
          uri: 'file:///workspace/src/file.ts',
          viewColumn: 1,
          fileName: 'file.ts',
        },
        'Editor not visible, bringing background tab to foreground',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.bindTextEditor',
          uri: 'file:///workspace/src/file.ts',
          viewColumn: 1,
          fileName: 'file.ts',
        },
        'showTextDocument resolved but editor not at expected viewColumn',
      );

      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('should fail to bind text editor to read-only scheme', async () => {
      const readOnlyUri = createMockUri('/repo/file.ts', { scheme: 'git' });
      const readOnlyEditor = {
        document: { uri: readOnlyUri },
        viewColumn: 1,
      } as vscode.TextEditor;
      mockAdapter.__getVscodeInstance().window.activeTextEditor = readOnlyEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [readOnlyEditor];

      const result = await manager.bind({ kind: 'text-editor', uri: readOnlyUri, viewColumn: 1 });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Editor is read-only (scheme: git)',
        functionName: 'PasteDestinationManager.bindTextEditor',
        details: { failedBindDetails: 'EDITOR_READ_ONLY' },
      });
      expect(mockSession.isSet()).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'PasteDestinationManager.bindTextEditor', scheme: 'git', fileName: 'file.ts' },
        'Cannot bind: Editor is read-only (scheme: git)',
      );
      expect(mockFeedback.notifyBindFailedEditor).toHaveBeenCalledWith(
        'ERROR_TEXT_EDITOR_READ_ONLY',
        { scheme: 'git' },
      );

      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('should fail to bind text editor to binary file', async () => {
      const testFileName = 'binary.dat';
      const binaryUri = createMockUri(`/test/${testFileName}`);
      const binaryEditor = {
        document: { uri: binaryUri },
        viewColumn: 1,
      } as vscode.TextEditor;
      mockAdapter.__getVscodeInstance().window.activeTextEditor = binaryEditor;
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [binaryEditor];

      const result = await manager.bind({ kind: 'text-editor', uri: binaryUri, viewColumn: 1 });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Editor is a binary file',
        functionName: 'PasteDestinationManager.bindTextEditor',
        details: { failedBindDetails: 'EDITOR_BINARY_FILE' },
      });
      expect(mockSession.isSet()).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'PasteDestinationManager.bindTextEditor', scheme: 'file', fileName: testFileName },
        'Cannot bind: Editor is a binary file',
      );
      expect(mockFeedback.notifyBindFailedEditor).toHaveBeenCalledWith(
        'ERROR_TEXT_EDITOR_BINARY_FILE',
        { fileName: testFileName },
      );
      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });
  });

  describe('bind() - cross-destination conflicts', () => {
    it('should show confirmation when binding chat while terminal already bound', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });

      const mockTerminal = createMockTerminal();

      await localManager.bind({ kind: 'terminal', terminal: mockTerminal });

      // Mock user cancels confirmation
      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to Cursor AI
      const result = await localManager.bind({ kind: 'cursor-ai' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'User cancelled binding replacement',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'USER_CANCELLED_REPLACEMENT' },
      });
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Terminal ("bash")',
        newDestination: 'Cursor AI Assistant',
      });
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal ("bash")', undefined);
    });

    it('should show confirmation when binding terminal while chat already bound', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });
      await localManager.bind({ kind: 'cursor-ai' });

      // Mock user cancels confirmation
      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to terminal
      const mockTerminal = createMockTerminal();

      const result = await localManager.bind({ kind: 'terminal', terminal: mockTerminal });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'User cancelled binding replacement',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'USER_CANCELLED_REPLACEMENT' },
      });
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Cursor AI Assistant',
        newDestination: 'Terminal ("bash")',
      });
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Cursor AI Assistant', undefined);
    });

    it('should show confirmation when binding github-copilot-chat while terminal already bound', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      // Mock GitHub Copilot Chat as available
      const mockCopilotDest = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockCopilotDest);

      // Mock user cancels confirmation
      const showQuickPickMock = mockAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to GitHub Copilot Chat
      const result = await manager.bind({ kind: 'github-copilot-chat' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'User cancelled binding replacement',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'USER_CANCELLED_REPLACEMENT' },
      });
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Terminal ("bash")',
        newDestination: 'GitHub Copilot Chat',
      });
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal ("bash")', undefined);
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
        if (options.kind === 'github-copilot-chat') return mockCopilotDest;
        if (options.kind === 'terminal') return mockTerminalDest;
        return undefined as any;
      });

      await manager.bind({ kind: 'github-copilot-chat' });

      // Mock user cancels confirmation
      const showQuickPickMock = mockAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      // Try binding to terminal
      const mockTerminal = createMockTerminal();

      const result = await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'User cancelled binding replacement',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'USER_CANCELLED_REPLACEMENT' },
      });
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'GitHub Copilot Chat',
        newDestination: 'Terminal ("bash")',
      });
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'GitHub Copilot Chat', undefined);
    });

    it('should show confirmation when replacing cursor-ai with github-copilot-chat', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });
      await localManager.bind({ kind: 'cursor-ai' });

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
      const result = await localManager.bind({ kind: 'github-copilot-chat' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'User cancelled binding replacement',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'USER_CANCELLED_REPLACEMENT' },
      });
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Cursor AI Assistant',
        newDestination: 'GitHub Copilot Chat',
      });
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Cursor AI Assistant', undefined);
    });

    it('should skip confirmation when re-binding the same AI assistant', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });

      const localRegistry = createMockDestinationRegistry({
        createImpl: (opts) =>
          ComposablePasteDestination.createAiAssistant({
            id: opts.kind as 'claude-code',
            displayName: 'Claude Code Chat',
            focusCapability: createMockFocusCapability(),
            isAvailable: jest.fn().mockResolvedValue(true),
            jumpSuccessMessage: 'Focused Claude Code',
            loggingDetails: {},
            logger: mockLogger,
          }),
      });
      (localManager as unknown as { registry: typeof localRegistry }).registry = localRegistry;

      await localManager.bind({ kind: 'claude-code' });

      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;

      const result = await localManager.bind({ kind: 'claude-code' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'Already bound to same destination',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'ALREADY_BOUND_TO_SAME' },
      });
      expect(showQuickPickMock).not.toHaveBeenCalled();
      expect(mockFeedback.notifyAlreadyBound).toHaveBeenCalledWith('Claude Code Chat');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'claude-code',
          displayName: 'Claude Code Chat',
        },
        'Already bound to Claude Code Chat, no action taken',
      );
    });

    it('should show confirmation when switching between different AI assistants', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        envOptions: { appName: 'Cursor' },
      });

      const localRegistry = createMockDestinationRegistry({
        createImpl: (opts) =>
          ComposablePasteDestination.createAiAssistant({
            id: opts.kind as 'claude-code' | 'cursor-ai',
            displayName: opts.kind === 'claude-code' ? 'Claude Code Chat' : 'Cursor AI Assistant',
            focusCapability: createMockFocusCapability(),
            isAvailable: jest.fn().mockResolvedValue(true),
            jumpSuccessMessage: `Focused ${opts.kind}`,
            loggingDetails: {},
            logger: mockLogger,
          }),
      });
      (localManager as unknown as { registry: typeof localRegistry }).registry = localRegistry;

      await localManager.bind({ kind: 'claude-code' });

      const showQuickPickMock = localAdapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);

      const result = await localManager.bind({ kind: 'cursor-ai' });

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
        message: 'User cancelled binding replacement',
        functionName: 'PasteDestinationManager.commitBind',
        details: { failedBindDetails: 'USER_CANCELLED_REPLACEMENT' },
      });
      expectQuickPickConfirmation(showQuickPickMock, {
        currentDestination: 'Claude Code Chat',
        newDestination: 'Cursor AI Assistant',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.confirmReplaceBinding',
          currentKind: 'claude-code',
          newKind: 'cursor-ai',
          confirmed: false,
        },
        'User cancelled replacement',
      );
    });
  });

  describe('unbind()', () => {
    it('should unbind terminal successfully', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      manager.unbind();

      expect(mockSession.isSet()).toBe(false);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal ("bash")', undefined);
      expect(mockFeedback.notifyUnbound).toHaveBeenCalledWith('Terminal ("bash")');
    });

    it('should unbind chat destination successfully', async () => {
      const { manager: localManager } = createManager({
        envOptions: { appName: 'Cursor' },
      });
      await localManager.bind({ kind: 'cursor-ai' });

      localManager.unbind();

      expect(mockSession.isSet()).toBe(false);
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Cursor AI Assistant', undefined);
      expect(mockFeedback.notifyUnbound).toHaveBeenCalledWith('Cursor AI Assistant');
    });

    it('should unbind github-copilot-chat successfully', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      await manager.bind({ kind: 'github-copilot-chat' });

      manager.unbind();

      expect(mockSession.isSet()).toBe(false);
      expect(mockSession.get()).toBeUndefined();
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'GitHub Copilot Chat', undefined);
      expect(mockFeedback.notifyUnbound).toHaveBeenCalledWith('GitHub Copilot Chat');
    });

    it('should unbind claude-code successfully', async () => {
      const mockDestination = createMockClaudeCodeDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      await manager.bind({ kind: 'claude-code' });

      manager.unbind();

      expect(mockSession.isSet()).toBe(false);
      expect(mockSession.get()).toBeUndefined();
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Claude Code Chat', undefined);
      expect(mockFeedback.notifyUnbound).toHaveBeenCalledWith('Claude Code Chat');
    });

    it('should unbind gemini-code-assist successfully', async () => {
      const mockDestination = createMockGeminiCodeAssistDestination({ isAvailable: true });
      jest.spyOn(mockRegistry, 'create').mockReturnValue(mockDestination);

      await manager.bind({ kind: 'gemini-code-assist' });

      manager.unbind();

      expect(mockSession.isSet()).toBe(false);
      expect(mockSession.get()).toBeUndefined();
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Gemini Code Assist', undefined);
      expect(mockFeedback.notifyUnbound).toHaveBeenCalledWith('Gemini Code Assist');
    });

    it('should unbind text-editor successfully', async () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      const mockDocument = createMockDocument({ uri: mockUri });
      const mockEditor = createMockEditor({
        document: mockDocument,
        selection: { active: { line: 0, character: 0 } } as vscode.Selection,
      });

      mockAdapter.__getVscodeInstance().window.activeTextEditor = mockEditor;
      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [mockEditor];
      configureEmptyTabGroups(mockAdapter.__getVscodeInstance().window, 2);

      await manager.bind({ kind: 'text-editor', uri: mockUri, viewColumn: 1 });

      manager.unbind();

      expect(mockSession.isSet()).toBe(false);
      expect(mockSession.get()).toBeUndefined();
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
        1,
        'Text Editor ("file.ts")',
        undefined,
      );
      expect(mockFeedback.notifyUnbound).toHaveBeenCalledWith('Text Editor ("file.ts")');
    });

    it('should handle unbind when nothing bound', () => {
      manager.unbind();

      expect(mockSession.isSet()).toBe(false);
      expect(mockFeedback.notifyNothingToUnbind).toHaveBeenCalled();
    });
  });

  describe('sendLinkToDestination()', () => {
    // Mock factory and destinations for unit tests
    let mockRegistryForSend: ReturnType<typeof createMockDestinationRegistry>;
    let mockChatDest: ReturnType<typeof createMockCursorAIDestination>;

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
          if (options.kind === 'terminal') return mockTerminalDest;
          if (options.kind === 'cursor-ai') return mockChatDest;
          throw new Error(`Unexpected type: ${options.kind}`);
        },
      });

      // Recreate manager with mock factory
      manager = new PasteDestinationManager(
        mockRegistryForSend,
        mockAdapter,
        mockSession,
        mockFeedback,
        mockLogger,
      );
    });

    it('should send to bound terminal successfully', async () => {
      const mockTerminal = createMockTerminal();

      // Override getUserInstruction to return undefined (non-chat destinations don't provide instructions)
      mockTerminalDest.getUserInstruction = jest.fn().mockReturnValue(undefined);

      await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      const result = await manager.sendLinkToDestination(formattedLink);

      expect(result).toBe(true);
      expect(mockTerminalDest.pasteLink).toHaveBeenCalledTimes(1);
      expect(mockTerminalDest.pasteLink).toHaveBeenCalledWith(formattedLink);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.sendLinkToDestination',
          destinationKind: 'terminal',
          displayName: 'Terminal ("bash")',
          formattedLink,
          terminalName: 'bash',
        },
        'Sending link to Terminal ("bash")',
      );
    });

    it('should send to bound chat destination successfully with user instructions', async () => {
      const { manager: cursorManager } = createManager({
        envOptions: { appName: 'Cursor' },
      });

      await cursorManager.bind({ kind: 'cursor-ai' });

      const boundDest = mockSession.get()!;
      boundDest.getUserInstruction = jest
        .fn()
        .mockImplementation((result) =>
          result === AutoPasteResult.Success ? 'Manual paste instruction' : undefined,
        );

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      const result = await cursorManager.sendLinkToDestination(formattedLink);

      expect(result).toBe(true);
      expect(boundDest.pasteLink).toHaveBeenCalledTimes(1);
      expect(boundDest.pasteLink).toHaveBeenCalledWith(formattedLink);
    });

    it('should send to bound GitHub Copilot Chat successfully', async () => {
      const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
      jest.spyOn(mockRegistryForSend, 'create').mockReturnValue(mockDestination);

      await manager.bind({ kind: 'github-copilot-chat' });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      const result = await manager.sendLinkToDestination(formattedLink);

      expect(result).toBe(true);
      expect(mockDestination.pasteLink).toHaveBeenCalledTimes(1);
      expect(mockDestination.pasteLink).toHaveBeenCalledWith(formattedLink);
    });

    it('should return false when no destination bound', async () => {
      const result = await manager.sendLinkToDestination(
        createMockFormattedLink('src/file.ts#L10'),
      );

      expect(result).toBe(false);
      expect(mockTerminalDest.pasteLink).not.toHaveBeenCalled();
      expect(mockChatDest.pasteLink).not.toHaveBeenCalled();
      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('should return false when terminal paste fails', async () => {
      const { manager: localManager } = createManager();

      const mockTerminal = createMockTerminal();
      await localManager.bind({ kind: 'terminal', terminal: mockTerminal });

      const boundDest = mockSession.get()!;
      boundDest.getUserInstruction = jest.fn().mockReturnValue(undefined);
      jest.spyOn(boundDest, 'pasteLink').mockResolvedValueOnce(false);

      const result = await localManager.sendLinkToDestination(
        createMockFormattedLink('src/file.ts#L10'),
      );

      expect(result).toBe(false);
      expect(boundDest.pasteLink).toHaveBeenCalledTimes(1);
    });

    it('should return false when chat paste fails', async () => {
      const { manager: cursorManager } = createManager({
        envOptions: { appName: 'Cursor' },
      });

      await cursorManager.bind({ kind: 'cursor-ai' });

      const boundDest = mockSession.get()!;
      boundDest.getUserInstruction = jest
        .fn()
        .mockImplementation((result) =>
          result === AutoPasteResult.Failure ? 'Manual paste instruction' : undefined,
        );

      (boundDest.pasteLink as jest.Mock).mockResolvedValueOnce(false);

      const result = await cursorManager.sendLinkToDestination(
        createMockFormattedLink('src/file.ts#L10'),
      );

      expect(result).toBe(false);
      expect(boundDest.pasteLink).toHaveBeenCalledTimes(1);
    });

    it('should log destination details when sending to terminal', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      await manager.sendLinkToDestination(formattedLink);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.sendLinkToDestination',
          destinationKind: 'terminal',
          displayName: 'Terminal ("bash")',
          formattedLink,
          terminalName: 'bash',
        },
        'Sending link to Terminal ("bash")',
      );
    });

    it('should return false when editor paste fails', async () => {
      const { manager: localManager } = createManager();

      const mockFailingFocusCapability = createMockFocusCapability(false);
      const mockTextEditorDest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor',
        focusCapability: mockFailingFocusCapability,
      });

      const pasteLinkSpy = jest.spyOn(mockTextEditorDest, 'pasteLink');
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(mockTextEditorDest);

      const result = await localManager.sendLinkToDestination(
        createMockFormattedLink('src/file.ts#L10'),
      );

      expect(result).toBe(false);
      expect(pasteLinkSpy).toHaveBeenCalledTimes(1);
    });

    it('should log error when paste fails', async () => {
      const mockTerminal = createMockTerminal();

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      // Mock paste failure
      mockTerminalDest.pasteLink.mockResolvedValueOnce(false);

      const formattedLink = createMockFormattedLink('src/file.ts#L10');
      await manager.sendLinkToDestination(formattedLink);

      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.sendLinkToDestination',
          destinationKind: 'terminal',
          displayName: 'Terminal ("bash")',
          formattedLink,
          terminalName: 'bash',
        },
        'Paste link failed to Terminal ("bash")',
      );
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
        id: id as DestinationKind,
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
        mockRegistryForSmartBind,
        mockAdapter,
        mockSession,
        mockFeedback,
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
          if (options.kind === 'terminal') return terminalDest;
          if (options.kind === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${options.kind}`);
        });

        // Mock QuickPick to confirm replacement
        const mockVscode = mockAdapter.__getVscodeInstance();
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValue({
          label: 'Yes, replace',
          description: 'Switch from Terminal to Text Editor',
          confirmed: true,
        });

        // Mock active terminal for first bind
        const testTerminal = { name: 'TestTerminal' } as vscode.Terminal;
        mockVscode.window.activeTerminal = testTerminal;

        // First bind: Bind to Terminal (normal bind)
        const firstBindResult = await manager.bind({ kind: 'terminal', terminal: testTerminal });
        expect(firstBindResult).toBeOkWith((value: BindSuccessInfo) => {
          expect(value).toStrictEqual({
            destinationName: 'Terminal ("TestTerminal")',
            destinationKind: 'terminal',
          });
        });
        expect(mockSession.isSet()).toBe(true);
        expect(mockSession.get()?.id).toBe('terminal');

        // Mock active text editor for second bind
        const textEditorUri = createMockUri('/test/file.ts');
        const textEditor = {
          document: { uri: textEditorUri },
          viewColumn: 1,
        } as vscode.TextEditor;
        mockVscode.window.activeTextEditor = textEditor;
        mockVscode.window.visibleTextEditors = [textEditor];

        // Second bind: Bind to Text Editor (should show confirmation)
        const secondBindResult = await manager.bind({
          kind: 'text-editor',
          uri: textEditorUri,
          viewColumn: 1,
        });

        // Assert: QuickPick was shown
        expect(mockVscode.window.showQuickPick).toHaveBeenCalledWith(
          [
            {
              label: 'Yes, replace',
              description: 'Switch from Terminal ("TestTerminal") to Text Editor ("file.ts")',
              confirmed: true,
            },
            {
              label: 'No, keep current binding',
              description: 'Stay bound to Terminal ("TestTerminal")',
              confirmed: false,
            },
          ],
          {
            placeHolder:
              'Already bound to Terminal ("TestTerminal"). Replace with Text Editor ("file.ts")?',
          },
        );

        // Assert: Bind succeeded
        expect(secondBindResult).toBeOkWith((value: BindSuccessInfo) => {
          expect(value).toStrictEqual({
            destinationName: 'Text Editor ("file.ts")',
            destinationKind: 'text-editor',
          });
        });
        expect(mockSession.isSet()).toBe(true);
        expect(mockSession.get()?.id).toBe('text-editor');

        // Assert: Exactly 2 toasts across both binds — first bind + rebound
        expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(2);
        expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
          1,
          'Terminal ("TestTerminal")',
          undefined,
        );
        expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
          2,
          'Text Editor ("file.ts")',
          'Terminal ("TestTerminal")',
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
          if (options.kind === 'terminal') return terminalDest;
          if (options.kind === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${options.kind}`);
        });

        // Mock QuickPick to cancel (user selects "No, keep current binding")
        const mockVscode = mockAdapter.__getVscodeInstance();
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValue({
          label: 'No, keep current binding',
          description: 'Stay bound to Terminal',
        });

        // Mock active terminal for first bind
        const testTerminal = { name: 'TestTerminal' } as vscode.Terminal;
        mockVscode.window.activeTerminal = testTerminal;

        // First bind: Bind to Terminal
        const firstBindResult = await manager.bind({ kind: 'terminal', terminal: testTerminal });
        expect(firstBindResult).toBeOkWith((value: BindSuccessInfo) => {
          expect(value).toStrictEqual({
            destinationName: 'Terminal ("TestTerminal")',
            destinationKind: 'terminal',
          });
        });

        // Mock active text editor for second bind
        const textEditorUri = createMockUri('/test/file.ts');
        const textEditor = {
          document: { uri: textEditorUri },
          viewColumn: 1,
        } as vscode.TextEditor;
        mockVscode.window.activeTextEditor = textEditor;
        mockVscode.window.visibleTextEditors = [textEditor];

        // Second bind: Try to bind to Text Editor (user cancels)
        const secondBindResult = await manager.bind({
          kind: 'text-editor',
          uri: textEditorUri,
          viewColumn: 1,
        });

        // Assert: Bind failed (cancelled)
        expect(secondBindResult).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
          message: 'User cancelled binding replacement',
          functionName: 'PasteDestinationManager.commitBind',
          details: { failedBindDetails: 'USER_CANCELLED_REPLACEMENT' },
        });

        // Assert: Still bound to Terminal
        expect(mockSession.isSet()).toBe(true);
        expect(mockSession.get()?.id).toBe('terminal');

        // Assert: Only first bind toast, no replacement toast
        expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
        expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
          1,
          'Terminal ("TestTerminal")',
          undefined,
        );
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
        const testTerminal = { name: 'TestTerminal' } as vscode.Terminal;
        mockVscode.window.activeTerminal = testTerminal;

        // First bind: Bind to Terminal
        await manager.bind({ kind: 'terminal', terminal: testTerminal });
        expect(mockSession.isSet()).toBe(true);

        // Second bind: Try to bind to Terminal again
        const result = await manager.bind({ kind: 'terminal', terminal: testTerminal });

        expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
          message: 'Already bound to same destination',
          functionName: 'PasteDestinationManager.commitBind',
          details: { failedBindDetails: 'ALREADY_BOUND_TO_SAME' },
        });

        // Assert: Info message shown (not error) with actual terminal name
        expect(mockFeedback.notifyAlreadyBound).toHaveBeenCalledWith('Terminal ("TestTerminal")');

        // Assert: QuickPick NOT shown (no confirmation needed)
        expect(mockVscode.window.showQuickPick).toHaveBeenCalledTimes(0);

        // Assert: Only first bind toast, no second toast
        expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
        expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
          1,
          'Terminal ("TestTerminal")',
          undefined,
        );

        // Assert: Still bound to Terminal
        expect(mockSession.get()?.id).toBe('terminal');
      });
    });

    describe('Scenario 4: Normal bind without existing binding', () => {
      it('should show standard toast without replacement prefix', async () => {
        // Setup: Create mock terminal destination
        const terminalDest = createMockDestinationForTest('terminal', 'Terminal ("TestTerminal")');
        (mockRegistryForSmartBind.create as jest.Mock).mockReturnValue(terminalDest);

        // Mock active terminal
        const mockVscode = mockAdapter.__getVscodeInstance();
        const testTerminal = { name: 'TestTerminal' } as vscode.Terminal;
        mockVscode.window.activeTerminal = testTerminal;

        // Bind to Terminal (no existing binding)
        const result = await manager.bind({ kind: 'terminal', terminal: testTerminal });

        expect(result).toBeOkWith((value: BindSuccessInfo) => {
          expect(value).toStrictEqual({
            destinationName: 'Terminal ("TestTerminal")',
            destinationKind: 'terminal',
          });
        });
        expect(mockSession.isSet()).toBe(true);

        // Assert: Standard toast shown (no "Unbound..." prefix)
        expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
        expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
          1,
          'Terminal ("TestTerminal")',
          undefined,
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
          if (options.kind === 'terminal') return terminalDest;
          if (options.kind === 'text-editor') return textEditorDest;
          throw new Error(`Unexpected type: ${options.kind}`);
        });

        // Mock QuickPick to return undefined (Esc key pressed)
        const mockVscode = mockAdapter.__getVscodeInstance();
        (mockVscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

        // Mock active terminal for first bind
        const testTerminal = { name: 'TestTerminal' } as vscode.Terminal;
        mockVscode.window.activeTerminal = testTerminal;

        // First bind: Bind to Terminal
        await manager.bind({ kind: 'terminal', terminal: testTerminal });

        // Mock active text editor for second bind
        const textEditorUri = createMockUri('/test/file.ts');
        const textEditor = {
          document: { uri: textEditorUri },
          viewColumn: 1,
        } as vscode.TextEditor;
        mockVscode.window.activeTextEditor = textEditor;
        mockVscode.window.visibleTextEditors = [textEditor];

        // Second bind: Try to bind to Text Editor (user presses Esc)
        const result = await manager.bind({
          kind: 'text-editor',
          uri: textEditorUri,
          viewColumn: 1,
        });

        expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
          message: 'User cancelled binding replacement',
          functionName: 'PasteDestinationManager.commitBind',
          details: { failedBindDetails: 'USER_CANCELLED_REPLACEMENT' },
        });

        // Assert: Still bound to Terminal
        expect(mockSession.isSet()).toBe(true);
        expect(mockSession.get()?.id).toBe('terminal');

        // Assert: Only first bind toast, no replacement toast
        expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
        expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(
          1,
          'Terminal ("TestTerminal")',
          undefined,
        );
      });
    });
  });

  describe('Edge Cases Coverage', () => {
    describe('sendTextToDestination() - Error Path', () => {
      const TEST_CONTENT = 'Test content to paste';

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
          mockRegistryForSend,
          mockAdapter,
          mockSession,
          mockFeedback,
          mockLogger,
        );

        mockVscode = mockAdapter.__getVscodeInstance();
      });

      it('should successfully send text to bound destination', async () => {
        const mockTerminal = createMockTerminal();
        await manager.bind({ kind: 'terminal', terminal: mockTerminal });
        mockTerminalDest.pasteContent.mockResolvedValueOnce(true);

        const result = await manager.sendTextToDestination(TEST_CONTENT);

        expect(result).toBe(true);
        expect(mockTerminalDest.pasteContent).toHaveBeenCalledWith(TEST_CONTENT);
      });

      it('should successfully send text to bound GitHub Copilot Chat', async () => {
        const mockDestination = createMockGitHubCopilotChatDestination({ isAvailable: true });
        jest.spyOn(mockRegistryForSend, 'create').mockReturnValue(mockDestination);

        await manager.bind({ kind: 'github-copilot-chat' });
        mockDestination.pasteContent.mockResolvedValueOnce(true);

        const result = await manager.sendTextToDestination(TEST_CONTENT);

        expect(result).toBe(true);
        expect(mockDestination.pasteContent).toHaveBeenCalledWith(TEST_CONTENT);
      });

      it('should handle destination.pasteContent returning false', async () => {
        const mockTerminal = createMockTerminal();
        await manager.bind({ kind: 'terminal', terminal: mockTerminal });

        mockTerminalDest.pasteContent.mockResolvedValueOnce(false);

        const result = await manager.sendTextToDestination(TEST_CONTENT);

        expect(result).toBe(false);
        expect(mockTerminalDest.pasteContent).toHaveBeenCalledWith(TEST_CONTENT);

        expect(mockLogger.error).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.sendTextToDestination',
            contentLength: TEST_CONTENT.length,
            displayName: 'Terminal ("bash")',
            destinationKind: 'terminal',
            terminalName: 'bash',
          },
          'Paste content failed to Terminal ("bash")',
        );

        expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
        expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal ("bash")', undefined);
        expect(mockVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(mockFeedback.notifyAlreadyBound).not.toHaveBeenCalled();
      });

      it('should test with large content (>1000 chars)', async () => {
        const largeContent = 'x'.repeat(1500);
        const mockTerminal = createMockTerminal();
        await manager.bind({ kind: 'terminal', terminal: mockTerminal });
        mockTerminalDest.pasteContent.mockResolvedValueOnce(true);

        const result = await manager.sendTextToDestination(largeContent);

        expect(result).toBe(true);
        expect(mockTerminalDest.pasteContent).toHaveBeenCalledWith(largeContent);
      });
    });

    describe('Already Bound Check', () => {
      let mockRegistryForDuplicate: ReturnType<typeof createMockDestinationRegistry>;

      beforeEach(() => {
        mockTerminalDest = createMockTerminalPasteDestination({
          displayName: 'Terminal ("bash")',
        });

        mockRegistryForDuplicate = createMockDestinationRegistry({
          createImpl: () => mockTerminalDest,
        });

        manager = new PasteDestinationManager(
          mockRegistryForDuplicate,
          mockAdapter,
          mockSession,
          mockFeedback,
          mockLogger,
        );
      });

      it('should show already-bound info message and preserve state', async () => {
        const mockTerminal = createMockTerminal();
        await manager.bind({ kind: 'terminal', terminal: mockTerminal });
        const firstDest = mockSession.get();

        mockTerminalDest.equals.mockResolvedValueOnce(true);

        const result = await manager.bind({ kind: 'terminal', terminal: mockTerminal });

        expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_BIND_FAILED', {
          message: 'Already bound to same destination',
          functionName: 'PasteDestinationManager.commitBind',
          details: { failedBindDetails: 'ALREADY_BOUND_TO_SAME' },
        });
        expect(mockSession.get()).toBe(firstDest);
        expect(mockFeedback.notifyAlreadyBound).toHaveBeenCalledWith('Terminal ("bash")');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'PasteDestinationManager.commitBind',
            kind: 'terminal',
            displayName: 'Terminal ("bash")',
          },
          'Already bound to Terminal ("bash"), no action taken',
        );
        expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
        expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal ("bash")', undefined);
      });
    });
  });

  describe('focusBoundDestination()', () => {
    let mockRegistryForFocus: ReturnType<typeof createMockDestinationRegistry>;

    beforeEach(() => {
      mockTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      mockTerminalDest = createMockTerminalPasteDestination();

      mockRegistryForFocus = createMockDestinationRegistry({
        createImpl: (options) => {
          if (options.kind === 'terminal') return mockTerminalDest;
          throw new Error(`Unexpected kind: ${options.kind}`);
        },
      });

      manager = new PasteDestinationManager(
        mockRegistryForFocus,
        mockAdapter,
        mockSession,
        mockFeedback,
        mockLogger,
      );
    });

    it('returns err with DESTINATION_NOT_BOUND when no destination bound', async () => {
      const result = await manager.focusBoundDestination();

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_NOT_BOUND', {
        message: 'No destination is currently bound',
        functionName: 'PasteDestinationManager.focusBoundDestination',
      });
      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });

    it('returns ok with FocusSuccessInfo on successful focus', async () => {
      await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      const result = await manager.focusBoundDestination();

      expect(result).toBeOkWith((value: FocusSuccessInfo) => {
        expect(value).toStrictEqual({ destinationName: 'Terminal', destinationKind: 'terminal' });
      });
      expect(mockTerminalDest.focus).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationKind: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        },
        'Successfully focused Terminal',
      );
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal', undefined);
      expect(mockFeedback.notifyJumpFocused).toHaveBeenCalledWith('Focused Terminal: "bash"');
    });

    it('shows status bar message by default on success', async () => {
      const bindResult = await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      expect(bindResult).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({ destinationName: 'Terminal', destinationKind: 'terminal' });
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        },
        'Successfully bound to "Terminal"',
      );

      const focusResult = await manager.focusBoundDestination();

      expect(focusResult).toBeOkWith((value: FocusSuccessInfo) => {
        expect(value).toStrictEqual({ destinationName: 'Terminal', destinationKind: 'terminal' });
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationKind: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        },
        'Successfully focused Terminal',
      );
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal', undefined);
      expect(mockFeedback.notifyJumpFocused).toHaveBeenCalledWith('Focused Terminal: "bash"');
    });

    it('suppresses status bar message when skipMessage=true', async () => {
      const bindResult = await manager.bind({ kind: 'terminal', terminal: mockTerminal });

      expect(bindResult).toBeOkWith((value: BindSuccessInfo) => {
        expect(value).toStrictEqual({ destinationName: 'Terminal', destinationKind: 'terminal' });
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.commitBind',
          kind: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        },
        'Successfully bound to "Terminal"',
      );
      const focusResult = await manager.focusBoundDestination({ skipMessage: true });

      expect(focusResult).toBeOkWith((value: FocusSuccessInfo) => {
        expect(value).toStrictEqual({ destinationName: 'Terminal', destinationKind: 'terminal' });
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationKind: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        },
        'Successfully focused Terminal',
      );
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal', undefined);
    });

    it('returns err with DESTINATION_FOCUS_FAILED when focus fails', async () => {
      await manager.bind({ kind: 'terminal', terminal: mockTerminal });
      mockTerminalDest.focus.mockResolvedValueOnce(false);

      const result = await manager.focusBoundDestination();

      expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_FOCUS_FAILED', {
        message: 'Failed to focus destination: Terminal',
        functionName: 'PasteDestinationManager.focusBoundDestination',
        details: { destinationKind: 'terminal', displayName: 'Terminal' },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'PasteDestinationManager.focusBoundDestination',
          destinationKind: 'terminal',
          displayName: 'Terminal',
          terminalName: 'bash',
        },
        'Failed to focus Terminal',
      );
      expect(mockFeedback.notifyBound).toHaveBeenCalledTimes(1);
      expect(mockFeedback.notifyBound).toHaveBeenNthCalledWith(1, 'Terminal', undefined);
    });
  });

  describe('bind()', () => {
    it('throws UNEXPECTED_DESTINATION_KIND for unhandled options kind', async () => {
      const bogusOptions = { kind: 'unknown-kind' } as unknown as BindOptions;

      await expect(() => manager.bind(bogusOptions)).toThrowRangeLinkExtensionErrorAsync(
        'UNEXPECTED_DESTINATION_KIND',
        {
          message: 'Unhandled bind options kind: unknown-kind',
          functionName: 'PasteDestinationManager.bind',
          details: { options: bogusOptions },
        },
      );
      expect(mockFeedback.notifyBound).not.toHaveBeenCalled();
    });
  });

  describe('bindAndFocus()', () => {
    const options: BindOptions = { kind: 'terminal', terminal: mockTerminal };

    it('delegates to bind then focusBoundDestination({ skipMessage: true }), forwards focus result', async () => {
      const mockBindOk = ExtensionResult.ok<BindSuccessInfo>({
        destinationName: 'Terminal',
        destinationKind: 'terminal',
      });
      const mockFocusOk = ExtensionResult.ok<FocusSuccessInfo>({
        destinationName: 'Terminal',
        destinationKind: 'terminal',
      });
      const bindSpy = jest.spyOn(manager, 'bind').mockResolvedValue(mockBindOk);
      const focusSpy = jest.spyOn(manager, 'focusBoundDestination').mockResolvedValue(mockFocusOk);

      const result = await manager.bindAndFocus(options);

      expect(bindSpy).toHaveBeenCalledWith(options);
      expect(focusSpy).toHaveBeenCalledWith({ skipMessage: true });
      expect(result).toBe(mockFocusOk);
    });

    it('forwards bind error without calling focusBoundDestination', async () => {
      const bindError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
        message: 'Terminal bind failed',
        functionName: 'PasteDestinationManager.bind',
      });
      const mockBindErr = ExtensionResult.err<BindSuccessInfo>(bindError);
      const bindSpy = jest.spyOn(manager, 'bind').mockResolvedValue(mockBindErr);
      const focusSpy = jest.spyOn(manager, 'focusBoundDestination');

      const result = await manager.bindAndFocus(options);

      expect(bindSpy).toHaveBeenCalledWith(options);
      expect(focusSpy).not.toHaveBeenCalled();
      expect(result).toBeErrWith((error: RangeLinkExtensionError) => {
        expect(error).toBe(bindError);
      });
    });

    it('forwards focusBoundDestination error when focus fails after successful bind', async () => {
      const focusError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_FOCUS_FAILED,
        message: 'Failed to focus destination: Terminal',
        functionName: 'PasteDestinationManager.focusBoundDestination',
      });
      const mockBindOk = ExtensionResult.ok<BindSuccessInfo>({
        destinationName: 'Terminal',
        destinationKind: 'terminal',
      });
      const mockFocusErr = ExtensionResult.err<FocusSuccessInfo>(focusError);
      const bindSpy = jest.spyOn(manager, 'bind').mockResolvedValue(mockBindOk);
      const focusSpy = jest.spyOn(manager, 'focusBoundDestination').mockResolvedValue(mockFocusErr);

      const result = await manager.bindAndFocus(options);

      expect(bindSpy).toHaveBeenCalledWith(options);
      expect(focusSpy).toHaveBeenCalledWith({ skipMessage: true });
      expect(result).toBe(mockFocusErr);
    });
  });
});
