import { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';
import * as resolveWorkspacePathModule from '../../../utils/resolveWorkspacePath';
import { createVSCodeAdapterMock } from '../../helpers/mockVSCode';

// ============================================================================
// Tests
// ============================================================================

describe('VscodeAdapter', () => {
  let adapter: VscodeAdapter;
  let mockVSCode: ReturnType<typeof createVSCodeAdapterMock>;

  beforeEach(() => {
    mockVSCode = createVSCodeAdapterMock();
    adapter = new VscodeAdapter(mockVSCode);
  });

  describe('writeTextToClipboard', () => {
    it('should write text to clipboard using VSCode API', async () => {
      const text = 'test text';

      await adapter.writeTextToClipboard(text);

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(text);
      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledTimes(1);
    });

    it('should handle empty string', async () => {
      await adapter.writeTextToClipboard('');

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should handle multi-line text', async () => {
      const multiLineText = 'line1\nline2\nline3';

      await adapter.writeTextToClipboard(multiLineText);

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(multiLineText);
    });

    it('should handle text with special characters', async () => {
      const specialText = 'text with $pecial ch@racters & émojis 🎉';

      await adapter.writeTextToClipboard(specialText);

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledWith(specialText);
    });
  });

  describe('setStatusBarMessage', () => {
    it('should set status bar message with default timeout when not specified', () => {
      const message = 'test message';

      const result = adapter.setStatusBarMessage(message);

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledWith(message, 2000);
      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.dispose).toBeDefined();
    });

    it('should forward custom timeout to underlying VSCode API', () => {
      const message = 'test message';
      const customTimeout = 31416;

      const result = adapter.setStatusBarMessage(message, customTimeout);

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledWith(message, customTimeout);
      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should handle zero timeout', () => {
      const message = 'test message';

      adapter.setStatusBarMessage(message, 0);

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledWith(message, 0);
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

      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith(message);
      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when no button is selected', async () => {
      (mockVSCode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.showWarningMessage('test');

      expect(result).toBeUndefined();
    });

    it('should return button text when button is selected', async () => {
      const buttonText = 'OK';
      (mockVSCode.window.showWarningMessage as jest.Mock).mockResolvedValue(buttonText);

      const result = await adapter.showWarningMessage('test');

      expect(result).toBe(buttonText);
    });

    it('should handle empty message', async () => {
      await adapter.showWarningMessage('');

      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith('');
    });
  });

  describe('showErrorMessage', () => {
    it('should show error message using VSCode API', async () => {
      const message = 'error message';

      await adapter.showErrorMessage(message);

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(message);
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when no button is selected', async () => {
      (mockVSCode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await adapter.showErrorMessage('test');

      expect(result).toBeUndefined();
    });

    it('should return button text when button is selected', async () => {
      const buttonText = 'Retry';
      (mockVSCode.window.showErrorMessage as jest.Mock).mockResolvedValue(buttonText);

      const result = await adapter.showErrorMessage('test');

      expect(result).toBe(buttonText);
    });

    it('should handle error message with details', async () => {
      const detailedError =
        'RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.';

      await adapter.showErrorMessage(detailedError);

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(detailedError);
    });

    it('should handle multi-line error messages', async () => {
      const multiLineError = 'Error occurred:\nLine 1 detail\nLine 2 detail';

      await adapter.showErrorMessage(multiLineError);

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(multiLineError);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple clipboard operations sequentially', async () => {
      await adapter.writeTextToClipboard('first');
      await adapter.writeTextToClipboard('second');
      await adapter.writeTextToClipboard('third');

      expect(mockVSCode.env.clipboard.writeText).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple status bar messages', () => {
      const disposable1 = adapter.setStatusBarMessage('message 1', 1000);
      const disposable2 = adapter.setStatusBarMessage('message 2', 2000);

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledTimes(2);
      expect(disposable1).toBeDefined();
      expect(disposable2).toBeDefined();
    });

    it('should handle showing multiple notification types', async () => {
      await adapter.showWarningMessage('warning');
      await adapter.showErrorMessage('error');

      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledTimes(1);
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolveWorkspacePath', () => {
    it('should delegate to resolveWorkspacePath utility with ideInstance', async () => {
      const linkPath = 'src/auth.ts';
      const mockUri = { fsPath: '/workspace/src/auth.ts' };
      const spy = jest
        .spyOn(resolveWorkspacePathModule, 'resolveWorkspacePath')
        .mockResolvedValue(mockUri as any);

      const result = await adapter.resolveWorkspacePath(linkPath);

      expect(result).toStrictEqual(mockUri);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(linkPath, mockVSCode);
    });
  });

  describe('createPosition', () => {
    it('should create Position with line and character', () => {
      const position = adapter.createPosition(10, 5);

      expect(position).toStrictEqual({ line: 10, character: 5 });
      expect(mockVSCode.Position).toHaveBeenCalledWith(10, 5);
    });

    it('should create Position at line start (character 0)', () => {
      const position = adapter.createPosition(0, 0);

      expect(position).toStrictEqual({ line: 0, character: 0 });
    });
  });

  describe('createSelection', () => {
    it('should create Selection with anchor and active positions', () => {
      const anchor = { line: 10, character: 5 } as any;
      const active = { line: 15, character: 10 } as any;

      const selection = adapter.createSelection(anchor, active);

      expect(selection).toStrictEqual({ anchor, active });
      expect(mockVSCode.Selection).toHaveBeenCalledWith(anchor, active);
    });

    it('should create single-position selection (anchor === active)', () => {
      const position = { line: 5, character: 3 } as any;

      const selection = adapter.createSelection(position, position);

      expect(selection).toStrictEqual({ anchor: position, active: position });
    });
  });

  describe('createRange', () => {
    it('should create Range with start and end positions', () => {
      const start = { line: 10, character: 5 } as any;
      const end = { line: 15, character: 10 } as any;

      const range = adapter.createRange(start, end);

      expect(range).toStrictEqual({ start, end });
      expect(mockVSCode.Range).toHaveBeenCalledWith(start, end);
    });

    it('should create single-line range', () => {
      const start = { line: 5, character: 0 } as any;
      const end = { line: 5, character: 10 } as any;

      const range = adapter.createRange(start, end);

      expect(range).toStrictEqual({ start, end });
    });
  });
});
