import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import type { ClipboardProvider } from '../../ide/ClipboardProvider';
import { withClipboardPreservation } from '../../utils';
import { createMockConfigReader } from '../helpers/createMockConfigReader';

const createMockClipboard = (): jest.Mocked<ClipboardProvider> => ({
  readTextFromClipboard: jest.fn(),
  writeTextToClipboard: jest.fn(),
});

describe('withClipboardPreservation', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe("mode 'always'", () => {
    it('saves clipboard before fn executes and restores after success', async () => {
      const clipboard = createMockClipboard();
      clipboard.readTextFromClipboard.mockResolvedValue('prior content');
      clipboard.writeTextToClipboard.mockResolvedValue(undefined);
      const fn = jest.fn().mockResolvedValue(undefined);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });

      await withClipboardPreservation(clipboard, configReader, mockLogger, fn);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(clipboard.writeTextToClipboard).toHaveBeenCalledWith('prior content');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'withClipboardPreservation', restoredLength: 13 },
        'Clipboard restored',
      );
    });

    it('logs an error and does not re-throw when clipboard restoration fails', async () => {
      const clipboard = createMockClipboard();
      clipboard.readTextFromClipboard.mockResolvedValue('prior content');
      const writeError = new Error('clipboard write failed');
      clipboard.writeTextToClipboard.mockRejectedValue(writeError);
      const fn = jest.fn().mockResolvedValue(undefined);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });

      await withClipboardPreservation(clipboard, configReader, mockLogger, fn);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'withClipboardPreservation', error: writeError },
        'Clipboard restoration failed',
      );
    });

    it('preserves the original fn error when restoration also fails', async () => {
      const clipboard = createMockClipboard();
      clipboard.readTextFromClipboard.mockResolvedValue('prior content');
      clipboard.writeTextToClipboard.mockRejectedValue(new Error('clipboard write failed'));
      const fnError = new Error('operation failed');
      const fn = jest.fn().mockRejectedValue(fnError);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });

      await expect(
        withClipboardPreservation(clipboard, configReader, mockLogger, fn),
      ).rejects.toThrow(fnError);
    });

    it('restores clipboard after fn throws', async () => {
      const clipboard = createMockClipboard();
      clipboard.readTextFromClipboard.mockResolvedValue('prior content');
      clipboard.writeTextToClipboard.mockResolvedValue(undefined);
      const error = new Error('operation failed');
      const fn = jest.fn().mockRejectedValue(error);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });

      await expect(
        withClipboardPreservation(clipboard, configReader, mockLogger, fn),
      ).rejects.toThrow(error);

      expect(clipboard.writeTextToClipboard).toHaveBeenCalledWith('prior content');
    });

    it('calls fn without restoration and logs an error when clipboard read fails', async () => {
      const clipboard = createMockClipboard();
      const readError = new Error('clipboard unavailable');
      clipboard.readTextFromClipboard.mockRejectedValue(readError);
      const fn = jest.fn().mockResolvedValue(undefined);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });

      await withClipboardPreservation(clipboard, configReader, mockLogger, fn);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(clipboard.writeTextToClipboard).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'withClipboardPreservation', error: readError },
        'Clipboard read failed — skipping preservation',
      );
    });

    it('propagates the return value of fn', async () => {
      const clipboard = createMockClipboard();
      clipboard.readTextFromClipboard.mockResolvedValue('prior content');
      clipboard.writeTextToClipboard.mockResolvedValue(undefined);
      const fn = jest.fn().mockResolvedValue('result');
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });

      const result = await withClipboardPreservation(clipboard, configReader, mockLogger, fn);

      expect(result).toBe('result');
    });
  });

  describe("mode 'never'", () => {
    it('calls fn without saving or restoring clipboard', async () => {
      const clipboard = createMockClipboard();
      const fn = jest.fn().mockResolvedValue(undefined);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('never'),
      });

      await withClipboardPreservation(clipboard, configReader, mockLogger, fn);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(clipboard.readTextFromClipboard).not.toHaveBeenCalled();
      expect(clipboard.writeTextToClipboard).not.toHaveBeenCalled();
    });
  });
});
