import { getLogger } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { TerminalBindingManager } from '../TerminalBindingManager';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    onDidCloseTerminal: jest.fn(),
    activeTerminal: undefined,
    showErrorMessage: jest.fn(),
    setStatusBarMessage: jest.fn(),
  },
}));

// Mock logger
jest.mock('rangelink-core-ts', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('TerminalBindingManager', () => {
  let manager: TerminalBindingManager;
  let mockContext: vscode.ExtensionContext;
  let mockTerminal: vscode.Terminal;
  let mockLogger: ReturnType<typeof getLogger>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Create mock terminal
    mockTerminal = {
      name: 'Test Terminal',
      sendText: jest.fn(),
      show: jest.fn(),
    } as unknown as vscode.Terminal;

    // Get mock logger
    mockLogger = getLogger();

    // Create manager
    manager = new TerminalBindingManager(mockContext);
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('sendToTerminal', () => {
    describe('when terminal is bound', () => {
      beforeEach(() => {
        // Mock active terminal
        (vscode.window as any).activeTerminal = mockTerminal;
        // Bind terminal
        manager.bind();
      });

      it('should send text with space padding', () => {
        const text = 'src/auth.ts#L10-L20';
        manager.sendToTerminal(text);

        expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${text} `, false);
      });

      it('should auto-focus the terminal', () => {
        const text = 'src/auth.ts#L10-L20';
        manager.sendToTerminal(text);

        expect(mockTerminal.show).toHaveBeenCalledWith(false);
      });

      it('should log the operation', () => {
        const text = 'src/auth.ts#L10-L20';
        manager.sendToTerminal(text);

        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'sendToTerminal',
            terminalName: 'Test Terminal',
            textLength: text.length,
          },
          'Sent text to terminal: Test Terminal',
        );
      });

      it('should return true on success', () => {
        const result = manager.sendToTerminal('src/auth.ts#L10');
        expect(result).toBe(true);
      });

      it('should handle special characters in text', () => {
        const text = 'file#123.ts#L10C5-L20C10';
        manager.sendToTerminal(text);

        expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${text} `, false);
      });

      it('should pad empty string', () => {
        const text = '';
        manager.sendToTerminal(text);

        expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${text} `, false);
      });

      it('should pad text with existing spaces', () => {
        const text = ' src/auth.ts#L10 ';
        manager.sendToTerminal(text);

        expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${text} `, false);
      });
    });

    describe('when no terminal is bound', () => {
      it('should not send text', () => {
        const text = 'src/auth.ts#L10-L20';
        manager.sendToTerminal(text);

        expect(mockTerminal.sendText).not.toHaveBeenCalled();
      });

      it('should not call show', () => {
        const text = 'src/auth.ts#L10-L20';
        manager.sendToTerminal(text);

        expect(mockTerminal.show).not.toHaveBeenCalled();
      });

      it('should log warning', () => {
        const text = 'src/auth.ts#L10-L20';
        manager.sendToTerminal(text);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'sendToTerminal',
            textLength: text.length,
          },
          'Cannot send to terminal: No terminal is bound',
        );
      });

      it('should return false', () => {
        const result = manager.sendToTerminal('src/auth.ts#L10');
        expect(result).toBe(false);
      });
    });

    describe('workflow integration', () => {
      beforeEach(() => {
        (vscode.window as any).activeTerminal = mockTerminal;
        manager.bind();
      });

      it('should enable Cursor-like UX (send + focus in one operation)', () => {
        const text = 'src/auth.ts#L10-L20';
        const result = manager.sendToTerminal(text);

        // Verify complete workflow
        expect(result).toBe(true);
        expect(mockTerminal.sendText).toHaveBeenCalledWith(` ${text} `, false);
        expect(mockTerminal.show).toHaveBeenCalledWith(false);

        // Verify ordering: sendText called before show
        const sendTextCall = (mockTerminal.sendText as jest.Mock).mock.invocationCallOrder[0];
        const showCall = (mockTerminal.show as jest.Mock).mock.invocationCallOrder[0];
        expect(sendTextCall).toBeLessThan(showCall);
      });

      it('should allow immediate typing after link generation', () => {
        // Simulate user workflow: generate link → terminal focuses → user types
        manager.sendToTerminal('src/auth.ts#L10');

        // Verify terminal is focused (show called)
        expect(mockTerminal.show).toHaveBeenCalledWith(false);

        // Verify link has trailing space for immediate typing
        const sentText = (mockTerminal.sendText as jest.Mock).mock.calls[0][0];
        expect(sentText.endsWith(' ')).toBe(true);
      });
    });
  });

  describe('bind', () => {
    it('should bind to active terminal successfully', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;

      const result = manager.bind();

      expect(result).toBe(true);
      expect(manager.isBound()).toBe(true);
      expect(manager.getBoundTerminal()).toBe(mockTerminal);
    });

    it('should log success and show status message', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;

      manager.bind();

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'bind', terminalName: 'Test Terminal' },
        'Successfully bound to terminal: Test Terminal',
      );
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink bound to Test Terminal',
        3000,
      );
    });

    it('should return false when no active terminal', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = undefined;

      const result = manager.bind();

      expect(result).toBe(false);
      expect(manager.isBound()).toBe(false);
    });

    it('should show error when no active terminal', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = undefined;

      manager.bind();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'bind' },
        'Failed to bind: No active terminal',
      );
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: No active terminal. Open a terminal and try again.',
      );
    });

    it('should return false when already bound', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind(); // First bind

      const newTerminal = { name: 'New Terminal', sendText: jest.fn(), show: jest.fn() };
      (vscode.window as Record<string, unknown>).activeTerminal =
        newTerminal as unknown as vscode.Terminal;

      const result = manager.bind(); // Try to bind again

      expect(result).toBe(false);
      expect(manager.getBoundTerminal()).toBe(mockTerminal); // Still bound to first
    });

    it('should show error when already bound', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();

      const newTerminal = { name: 'New Terminal', sendText: jest.fn(), show: jest.fn() };
      (vscode.window as Record<string, unknown>).activeTerminal =
        newTerminal as unknown as vscode.Terminal;

      manager.bind();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'bind',
          currentTerminal: 'Test Terminal',
          requestedTerminal: 'New Terminal',
        },
        'Already bound to a terminal',
      );
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Already bound to Test Terminal. Unbind first to bind to a different terminal.',
      );
    });
  });

  describe('unbind', () => {
    it('should unbind successfully when terminal is bound', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();

      manager.unbind();

      expect(manager.isBound()).toBe(false);
      expect(manager.getBoundTerminal()).toBeUndefined();
    });

    it('should log success and show status message', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();
      jest.clearAllMocks();

      manager.unbind();

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'unbind', terminalName: 'Test Terminal' },
        'Successfully unbound from terminal: Test Terminal',
      );
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        '✓ RangeLink unbound from Test Terminal',
        2000,
      );
    });

    it('should handle unbind when nothing is bound', () => {
      manager.unbind();

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'unbind' },
        'No terminal bound, nothing to unbind',
      );
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        'RangeLink: No terminal bound',
        2000,
      );
    });
  });

  describe('isBound', () => {
    it('should return false initially', () => {
      expect(manager.isBound()).toBe(false);
    });

    it('should return true after binding', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();

      expect(manager.isBound()).toBe(true);
    });

    it('should return false after unbinding', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();
      manager.unbind();

      expect(manager.isBound()).toBe(false);
    });
  });

  describe('getBoundTerminal', () => {
    it('should return undefined initially', () => {
      expect(manager.getBoundTerminal()).toBeUndefined();
    });

    it('should return bound terminal after binding', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();

      expect(manager.getBoundTerminal()).toBe(mockTerminal);
    });

    it('should return undefined after unbinding', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();
      manager.unbind();

      expect(manager.getBoundTerminal()).toBeUndefined();
    });
  });

  describe('getTerminalDisplayName', () => {
    it('should return terminal name when present', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();

      const result = manager.sendToTerminal('test');

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ terminalName: 'Test Terminal' }),
        expect.any(String),
      );
    });

    it('should return "Unnamed Terminal" when name is missing', () => {
      const unnamedTerminal = { sendText: jest.fn(), show: jest.fn() };
      (vscode.window as Record<string, unknown>).activeTerminal =
        unnamedTerminal as unknown as vscode.Terminal;
      manager.bind();

      manager.sendToTerminal('test');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ terminalName: 'Unnamed Terminal' }),
        expect.any(String),
      );
    });
  });

  describe('onDidCloseTerminal', () => {
    let terminalCloseCallback: (terminal: vscode.Terminal) => void;

    beforeEach(() => {
      // Capture the callback registered with onDidCloseTerminal
      (vscode.window.onDidCloseTerminal as jest.Mock).mockImplementation((callback) => {
        terminalCloseCallback = callback;
        return { dispose: jest.fn() };
      });

      // Create new manager to register the callback
      manager = new TerminalBindingManager(mockContext);
    });

    it('should auto-unbind when bound terminal closes', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();
      jest.clearAllMocks();

      // Simulate terminal close
      terminalCloseCallback(mockTerminal);

      expect(manager.isBound()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'onDidCloseTerminal', terminalName: 'Test Terminal' },
        'Bound terminal closed: Test Terminal - auto-unbinding',
      );
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        'Terminal binding removed (terminal closed)',
        3000,
      );
    });

    it('should not unbind when different terminal closes', () => {
      (vscode.window as Record<string, unknown>).activeTerminal = mockTerminal;
      manager.bind();

      const otherTerminal = { name: 'Other Terminal', sendText: jest.fn(), show: jest.fn() };

      // Simulate different terminal close
      terminalCloseCallback(otherTerminal as unknown as vscode.Terminal);

      expect(manager.isBound()).toBe(true);
      expect(manager.getBoundTerminal()).toBe(mockTerminal);
    });
  });

  describe('dispose', () => {
    it('should dispose all disposables', () => {
      const disposeSpy = jest.fn();
      (vscode.window.onDidCloseTerminal as jest.Mock).mockReturnValue({ dispose: disposeSpy });

      const testManager = new TerminalBindingManager(mockContext);
      testManager.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});
