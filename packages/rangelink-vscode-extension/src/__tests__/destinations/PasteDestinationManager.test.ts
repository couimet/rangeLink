import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import { DestinationFactory } from '../../destinations/DestinationFactory';
import type { PasteDestination } from '../../destinations/PasteDestination';
import { PasteDestinationManager } from '../../destinations/PasteDestinationManager';
import { TerminalDestination } from '../../destinations/TerminalDestination';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';

describe('PasteDestinationManager', () => {
  let manager: PasteDestinationManager;
  let mockContext: vscode.ExtensionContext;
  let mockFactory: DestinationFactory;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let terminalCloseListener: (terminal: vscode.Terminal) => void;
  let documentCloseListener: (document: vscode.TextDocument) => void;

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

    // Create adapter with test hooks
    mockAdapter = createMockVscodeAdapter();

    // Configure event listeners via test hook
    const mockVscode = mockAdapter.__getVscodeInstance();
    (mockVscode.window.onDidCloseTerminal as jest.Mock) = jest.fn((listener) => {
      terminalCloseListener = listener;
      return { dispose: jest.fn() };
    });
    (mockVscode.workspace.onDidCloseTextDocument as jest.Mock) = jest.fn((listener) => {
      documentCloseListener = listener;
      return { dispose: jest.fn() };
    });

    // Create factory
    mockFactory = new DestinationFactory(mockAdapter, mockLogger);

    // Create manager
    manager = new PasteDestinationManager(mockContext, mockFactory, mockAdapter, mockLogger);

    jest.clearAllMocks();
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

    it('should fail when already bound to terminal', async () => {
      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Try binding again
      const result = await manager.bind('terminal');

      expect(result).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to Terminal. Unbind first.',
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
      // Mock Cursor IDE detection (appName check)
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';

      const result = await manager.bind('cursor-ai');

      expect(result).toBe(true);
      expect(manager.isBound()).toBe(true);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to Cursor AI Assistant',
        3000,
      );
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

    it('should fail when already bound to chat destination', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
      await manager.bind('cursor-ai');

      // Try binding again
      const result = await manager.bind('cursor-ai');

      expect(result).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to Cursor AI Assistant. Unbind first.',
      );
    });
  });

  describe('bind() - cross-destination conflicts', () => {
    it('should prevent binding chat when terminal already bound', async () => {
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      await manager.bind('terminal');

      // Try binding to Cursor AI
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
      const result = await manager.bind('cursor-ai');

      expect(result).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to Terminal. Unbind first.',
      );
    });

    it('should prevent binding terminal when chat already bound', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
      await manager.bind('cursor-ai');

      // Try binding to terminal
      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      mockAdapter.__getVscodeInstance().window.activeTerminal = mockTerminal;
      const result = await manager.bind('terminal');

      expect(result).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to Cursor AI Assistant. Unbind first.',
      );
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
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
      await manager.bind('cursor-ai');

      manager.unbind();

      expect(manager.isBound()).toBe(false);
      expect(mockAdapter.__getVscodeInstance().window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink unbound from Cursor AI Assistant',
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
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
      (mockVscode.env.clipboard.writeText as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      (mockVscode.commands.executeCommand as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      (mockVscode.window.showInformationMessage as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);

      await manager.bind('cursor-ai');

      const result = await manager.sendToDestination('src/file.ts#L10');

      expect(result).toBe(true);
      expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledWith('src/file.ts#L10');
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
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
      await manager.bind('cursor-ai');

      const mockTerminal = {
        name: 'bash',
        sendText: jest.fn(),
        show: jest.fn(),
      } as unknown as vscode.Terminal;

      // Simulate terminal close (should not affect chat binding)
      terminalCloseListener(mockTerminal);

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
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
      await manager.bind('cursor-ai');

      expect(manager.isBound()).toBe(true);
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
        (mockVscode.window.tabGroups as { all: vscode.TabGroup[] }).all = [{}, {}] as vscode.TabGroup[];

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
        (mockVscode.window.tabGroups as { all: vscode.TabGroup[] }).all = [{}, {}] as vscode.TabGroup[];

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
        (mockVscode.window.tabGroups as { all: vscode.TabGroup[] }).all = [{}, {}] as vscode.TabGroup[];

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
