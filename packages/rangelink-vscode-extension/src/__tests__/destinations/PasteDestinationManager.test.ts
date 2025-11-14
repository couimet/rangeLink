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
      (mockVscode.window.showInformationMessage as jest.Mock) = jest.fn().mockResolvedValue(undefined);

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
});
