// ============================================================================
// Mock VSCode APIs
// ============================================================================

jest.mock('vscode', () => ({
  env: {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
  },
  window: {
    setStatusBarMessage: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showTextDocument: jest.fn().mockResolvedValue(undefined),
  },
  workspace: {
    openTextDocument: jest.fn().mockResolvedValue(undefined),
  },
}));

import * as vscode from 'vscode';

import { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';

// ============================================================================
// Tests
// ============================================================================

describe('VscodeAdapter', () => {
  let adapter: VscodeAdapter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore mock implementations after clearAll Mocks
    (vscode.window.setStatusBarMessage as jest.Mock).mockImplementation(() => ({
      dispose: jest.fn(),
    }));

    adapter = new VscodeAdapter(vscode);
  });

  describe('writeTextToClipboard', () => {
    it('should write text to clipboard using VSCode API', async () => {
      const text = 'test text';

      await adapter.writeTextToClipboard(text);

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(text);
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledTimes(1);
    });

    it('should handle empty string', async () => {
      await adapter.writeTextToClipboard('');

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should handle multi-line text', async () => {
      const multiLineText = 'line1\nline2\nline3';

      await adapter.writeTextToClipboard(multiLineText);

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(multiLineText);
    });

    it('should handle text with special characters', async () => {
      const specialText = 'text with $pecial ch@racters & émojis 🎉';

      await adapter.writeTextToClipboard(specialText);

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(specialText);
    });
  });

  describe('setStatusBarMessage', () => {
    it('should set status bar message without timeout', () => {
      const message = 'test message';

      const result = adapter.setStatusBarMessage(message);

      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(message);
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.dispose).toBeDefined();
    });

    it('should set status bar message with timeout', () => {
      const message = 'test message';
      const timeout = 5000;

      const result = adapter.setStatusBarMessage(message, timeout);

      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(message, timeout);
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should handle zero timeout', () => {
      const message = 'test message';

      adapter.setStatusBarMessage(message, 0);

      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(message, 0);
    });

    it('should return disposable that can be disposed', () => {
      const result = adapter.setStatusBarMessage('test');

      expect(result).toBeDefined();
      expect(result.dispose).toBeDefined();
      expect(typeof result.dispose).toBe('function');

      // Verify dispose can be called without errors
      expect(() => result.dispose()).not.toThrow();
    });
  });

  describe('showWarningMessage', () => {
    it('should show warning message using VSCode API', async () => {
      const message = 'warning message';

      await adapter.showWarningMessage(message);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(message);
      expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when no button is selected', async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.showWarningMessage('test');

      expect(result).toBeUndefined();
    });

    it('should return button text when button is selected', async () => {
      const buttonText = 'OK';
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(buttonText);

      const result = await adapter.showWarningMessage('test');

      expect(result).toBe(buttonText);
    });

    it('should handle empty message', async () => {
      await adapter.showWarningMessage('');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('');
    });
  });

  describe('showErrorMessage', () => {
    it('should show error message using VSCode API', async () => {
      const message = 'error message';

      await adapter.showErrorMessage(message);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(message);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when no button is selected', async () => {
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.showErrorMessage('test');

      expect(result).toBeUndefined();
    });

    it('should return button text when button is selected', async () => {
      const buttonText = 'Retry';
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(buttonText);

      const result = await adapter.showErrorMessage('test');

      expect(result).toBe(buttonText);
    });

    it('should handle error message with details', async () => {
      const detailedError =
        'RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.';

      await adapter.showErrorMessage(detailedError);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(detailedError);
    });

    it('should handle multi-line error messages', async () => {
      const multiLineError = 'Error occurred:\nLine 1 detail\nLine 2 detail';

      await adapter.showErrorMessage(multiLineError);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(multiLineError);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple clipboard operations sequentially', async () => {
      await adapter.writeTextToClipboard('first');
      await adapter.writeTextToClipboard('second');
      await adapter.writeTextToClipboard('third');

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple status bar messages', () => {
      const disposable1 = adapter.setStatusBarMessage('message 1', 1000);
      const disposable2 = adapter.setStatusBarMessage('message 2', 2000);

      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledTimes(2);
      expect(disposable1).toBeDefined();
      expect(disposable2).toBeDefined();
    });

    it('should handle showing multiple notification types', async () => {
      await adapter.showWarningMessage('warning');
      await adapter.showErrorMessage('error');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
    });
  });
});
