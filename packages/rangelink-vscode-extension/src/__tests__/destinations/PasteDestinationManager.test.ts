import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import { DestinationFactory } from '../../destinations/DestinationFactory';
import type { PasteDestination } from '../../destinations/PasteDestination';
import { PasteDestinationManager } from '../../destinations/PasteDestinationManager';
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

/**
 * Validates that Cursor AI destination's paste workflow executed correctly.
 * Checks all three steps: clipboard copy, command execution, and notification.
 */
const expectCursorAIPasteWorkflow = (mockVscode: typeof vscode, expectedLink: string): void => {
  // Step 1: Clipboard copy with exact link
  expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledWith(expectedLink);

  // Step 2: Command execution (tries chat commands in order)
  const executeCommandMock = mockVscode.commands.executeCommand as jest.Mock;
  expect(executeCommandMock).toHaveBeenCalled();
  // Verify it's one of the expected chat commands
  const commands = executeCommandMock.mock.calls.map((call) => call[0]);
  const validCommands = ['aichat.newchataction', 'workbench.action.toggleAuxiliaryBar'];
  expect(commands.some((cmd) => validCommands.includes(cmd))).toBe(true);

  // Step 3: Notification with expected message
  expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
    'RangeLink copied to clipboard. Paste (Cmd/Ctrl+V) in Cursor chat to use.',
  );
};

describe('PasteDestinationManager', () => {
  let manager: PasteDestinationManager;
  let mockContext: vscode.ExtensionContext;
  let mockFactory: DestinationFactory;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let terminalCloseListener: (terminal: vscode.Terminal) => void;
  let documentCloseListener: (document: vscode.TextDocument) => void;

  /**
   * Helper to create a manager with optional environment overrides.
   * Useful for tests that need to simulate Cursor IDE.
   *
   * When appName is 'Cursor', automatically sets up mocks for Cursor AI destination's
   * paste workflow (clipboard, executeCommand, showInformationMessage).
   */
  const createManager = (envOptions?: MockVscodeOptions['envOptions']) => {
    const adapter = createMockVscodeAdapter(undefined, {
      envOptions,
      windowOptions: {
        onDidCloseTerminal: jest.fn((listener) => {
          terminalCloseListener = listener;
          return { dispose: jest.fn() };
        }),
        // Mock Cursor AI destination's paste workflow when running in Cursor IDE
        ...(envOptions?.appName === 'Cursor' && {
          showInformationMessage: jest.fn().mockResolvedValue(undefined),
        }),
      },
      workspaceOptions: {
        onDidCloseTextDocument: jest.fn((listener) => {
          documentCloseListener = listener;
          return { dispose: jest.fn() };
        }),
      },
      // Mock Cursor AI destination's paste workflow when running in Cursor IDE
      ...(envOptions?.appName === 'Cursor' && {
        env: {
          appName: 'Cursor',
          uriScheme: 'cursor',
          clipboard: {
            writeText: jest.fn().mockResolvedValue(undefined),
            readText: jest.fn().mockResolvedValue(''),
          },
        },
        commands: {
          executeCommand: jest.fn().mockResolvedValue(undefined),
        },
      }),
    });

    const factory = new DestinationFactory(adapter, mockLogger);
    const mgr = new PasteDestinationManager(mockContext, factory, adapter, mockLogger);

    return { manager: mgr, adapter, factory };
  };

  beforeEach(() => {
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
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: No active terminal. Open a terminal and try again.',
      );
    });

    it('should show info message when binding same terminal twice', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Try binding again to same destination
      const result = await manager.bind('terminal');

      expect(result).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Already bound to Terminal'),
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
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Cannot bind Cursor AI Assistant'),
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
    it('should send to bound terminal successfully', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      const result = await manager.sendToDestination('src/file.ts#L10');

      expect(result).toBe(true);
      expect(mockTerminal.sendText).toHaveBeenCalled();
    });

    it('should send to bound chat destination successfully', async () => {
      const { manager: localManager, adapter: localAdapter } = createManager({
        appName: 'Cursor',
      });

      await localManager.bind('cursor-ai');

      const result = await localManager.sendToDestination('src/file.ts#L10');

      expect(result).toBe(true);
      expectCursorAIPasteWorkflow(localAdapter.__getVscodeInstance(), 'src/file.ts#L10');

      localManager.dispose();
    });

    it('should return false when no destination bound', async () => {
      const result = await manager.sendToDestination('src/file.ts#L10');

      expect(result).toBe(false);
    });

    it('should return false when paste fails', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Unbind terminal to simulate closed terminal
      manager.unbind();

      const result = await manager.sendToDestination('src/file.ts#L10');

      expect(result).toBe(false);
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
      (mockAdapter.__getVscodeInstance().window.tabGroups as { all: vscode.TabGroup[] }).all = [
        {},
        {},
      ] as vscode.TabGroup[];

      await manager.bind('text-editor');
      expect(manager.isBound()).toBe(true);

      // Simulate document close
      documentCloseListener(mockDocument);

      expect(manager.isBound()).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showInformationMessage).toHaveBeenCalledWith(
        'RangeLink: Bound editor closed. Unbound.',
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
      (mockAdapter.__getVscodeInstance().window.tabGroups as { all: vscode.TabGroup[] }).all = [
        {},
        {},
      ] as vscode.TabGroup[];

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
        (mockVscode.window.tabGroups as { all: vscode.TabGroup[] }).all = [
          {},
          {},
        ] as vscode.TabGroup[];

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
        (mockVscode.window.tabGroups as { all: vscode.TabGroup[] }).all = [
          {},
          {},
        ] as vscode.TabGroup[];

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
        (mockVscode.window.tabGroups as { all: vscode.TabGroup[] }).all = [
          {},
          {},
        ] as vscode.TabGroup[];

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
});
