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
});
