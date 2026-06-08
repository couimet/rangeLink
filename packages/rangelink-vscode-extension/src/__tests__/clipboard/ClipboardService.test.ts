import { createMockLogger } from 'barebone-logger-testing';

import { ClipboardService } from '../../clipboard/ClipboardService';
import { createMockConfigReader, createMockVscodeAdapter } from '../helpers';

const PRIOR = 'prior-content';
const NEW_TEXT = 'new text';
const TEST_RESULT = 'test-result';
const CAPTURED_TEXT = 'captured-content';

describe('ClipboardService', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  // ── stage ──────────────────────────────────────────────────────

  describe('stage', () => {
    it('saves prior clipboard, writes text, runs fn, then restores prior', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue(PRIOR);
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);

      const result = await service.stage(NEW_TEXT, fn);

      expect(result).toBeOkWith((value: string) => {
        expect(value).toBe(TEST_RESULT);
      });
      expect(writeSpy).toHaveBeenNthCalledWith(1, NEW_TEXT);
      expect(writeSpy).toHaveBeenNthCalledWith(2, PRIOR);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ClipboardService::stage::read', priorLength: PRIOR.length },
        'Clipboard current value read and saved',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ClipboardService::stage::write', textLength: NEW_TEXT.length },
        'Clipboard write succeeded',
      );
    });

    it('bails out on clipboard read failure', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const readError = new Error('clipboard read failed');
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockRejectedValue(readError);
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);

      const result = await service.stage(NEW_TEXT, fn);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_READ_FAILED', {
        message: 'Failed to read clipboard',
        functionName: 'ClipboardService::stage::read',
        details: { error: readError },
      });
      expect(fn).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardService::stage::read', error: readError },
        'Clipboard read failed',
      );
    });

    it('bails out on clipboard write failure', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue(PRIOR);
      const writeError = new Error('write failed');
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockRejectedValue(writeError);
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);

      const result = await service.stage(NEW_TEXT, fn);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_STAGE_WRITE_FAILED', {
        message: 'Failed to write text to clipboard',
        functionName: 'ClipboardService::stage::write',
        details: { error: writeError },
      });
      expect(fn).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardService::stage::write', error: writeError },
        'Clipboard write failed',
      );
    });

    it('restores clipboard and returns error when fn throws', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue(PRIOR);
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const fnError = new Error('fn failed');
      const fn = jest.fn().mockRejectedValue(fnError);

      const result = await service.stage(NEW_TEXT, fn);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_FN_EXECUTION_FAILED', {
        message: 'The callback threw an error',
        functionName: 'ClipboardService::stage',
        details: { error: fnError },
      });
      expect(writeSpy).toHaveBeenCalledWith(PRIOR);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardService::stage', error: fnError },
        'Callback threw',
      );
    });

    it('returns fn result even when restore fails', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue(PRIOR);
      let callCount = 0;
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockImplementation(() => {
        callCount++;
        // First call succeeds (stage write), second fails (restore)
        if (callCount === 2) return Promise.reject(new Error('restore failed'));
        return Promise.resolve(undefined);
      });
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);

      const result = await service.stage(NEW_TEXT, fn);

      expect(result).toBeOkWith((value: string) => {
        expect(value).toBe(TEST_RESULT);
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardService::stage::restoreClipboard', error: new Error('restore failed') },
        'Clipboard restoration failed',
      );
    });
  });

  // ── route ─────────────────────────────────────────────────────

  describe('route', () => {
    it("calls fn directly when mode is 'never'", async () => {
      const mockAdapter = createMockVscodeAdapter();
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('never'),
      });
      const service = new ClipboardService(mockAdapter, configReader, mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);

      const result = await service.route(fn);

      expect(result).toBeOkWith((value: string) => {
        expect(value).toBe(TEST_RESULT);
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ClipboardService::route', mode: 'never' },
        'Clipboard preservation disabled; executing directly',
      );
    });

    it("returns error when fn throws in 'never' mode", async () => {
      const mockAdapter = createMockVscodeAdapter();
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('never'),
      });
      const service = new ClipboardService(mockAdapter, configReader, mockLogger);
      const fnError = new Error('fn failed');
      const fn = jest.fn().mockRejectedValue(fnError);

      const result = await service.route(fn);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_FN_EXECUTION_FAILED', {
        message: 'The callback threw an error',
        functionName: 'ClipboardService::route',
        details: { error: fnError },
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardService::route', mode: 'never', error: fnError },
        'Callback threw',
      );
    });

    it('saves clipboard, runs fn, then restores on success', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue(PRIOR);
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });
      const service = new ClipboardService(mockAdapter, configReader, mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);

      const result = await service.route(fn);

      expect(result).toBeOkWith((value: string) => {
        expect(value).toBe(TEST_RESULT);
      });
      expect(writeSpy).toHaveBeenCalledWith(PRIOR);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'ClipboardService::route::read',
          mode: 'always',
          priorLength: PRIOR.length,
        },
        'Clipboard current value read and saved',
      );
    });

    it('skips restore when shouldRestore returns false', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue(PRIOR);
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });
      const service = new ClipboardService(mockAdapter, configReader, mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);
      const shouldRestore = jest.fn().mockReturnValue(false);

      const result = await service.route(fn, shouldRestore);

      expect(result).toBeOkWith((value: string) => {
        expect(value).toBe(TEST_RESULT);
      });
      expect(shouldRestore).toHaveBeenCalled();
      expect(writeSpy).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ClipboardService::route', mode: 'always' },
        'Clipboard restoration skipped',
      );
    });

    it('bails out on clipboard read failure', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const readError = new Error('read failed');
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockRejectedValue(readError);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });
      const service = new ClipboardService(mockAdapter, configReader, mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);

      const result = await service.route(fn);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_READ_FAILED', {
        message: 'Failed to read clipboard',
        functionName: 'ClipboardService::route::read',
        details: { error: readError },
      });
      expect(fn).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardService::route::read', mode: 'always', error: readError },
        'Clipboard read failed',
      );
    });

    it('restores clipboard and returns error when fn throws', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue(PRIOR);
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });
      const service = new ClipboardService(mockAdapter, configReader, mockLogger);
      const fnError = new Error('fn failed');
      const fn = jest.fn().mockRejectedValue(fnError);

      const result = await service.route(fn);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_FN_EXECUTION_FAILED', {
        message: 'The callback threw an error',
        functionName: 'ClipboardService::route',
        details: { error: fnError },
      });
      expect(writeSpy).toHaveBeenCalledWith(PRIOR);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardService::route', mode: 'always', error: fnError },
        'Callback threw',
      );
    });

    it('returns fn result even when restore fails', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValue(PRIOR);
      const restoreError = new Error('restore failed');
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockRejectedValue(restoreError);
      const configReader = createMockConfigReader({
        getWithDefault: jest.fn().mockReturnValue('always'),
      });
      const service = new ClipboardService(mockAdapter, configReader, mockLogger);
      const fn = jest.fn().mockResolvedValue(TEST_RESULT);

      const result = await service.route(fn);

      expect(result).toBeOkWith((value: string) => {
        expect(value).toBe(TEST_RESULT);
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardService::route::restoreClipboard', mode: 'always', error: restoreError },
        'Clipboard restoration failed',
      );
    });
  });

  // ── capture ────────────────────────────────────────────────────

  describe('capture', () => {
    const LOG_CTX = { fn: 'test' };

    it('saves prior clipboard, runs producer, captures result, then restores prior', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValueOnce(PRIOR);
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValueOnce(CAPTURED_TEXT);
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const producer = jest.fn().mockResolvedValue(undefined);

      const result = await service.capture(producer, LOG_CTX);

      expect(result).toBeOkWith((value: { clipboard: string; produced: unknown }) => {
        expect(value).toStrictEqual({ clipboard: CAPTURED_TEXT, produced: undefined });
      });
      expect(producer).toHaveBeenCalledTimes(1);
      expect(writeSpy).toHaveBeenCalledWith(PRIOR);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test::capture::read', priorLength: PRIOR.length },
        'Clipboard current value read and saved',
      );
    });

    it('returns error when initial clipboard read fails', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const readError = new Error('read failed');
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockRejectedValue(readError);
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const producer = jest.fn().mockResolvedValue(undefined);

      const result = await service.capture(producer, LOG_CTX);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_READ_FAILED', {
        message: 'Failed to read clipboard',
        functionName: 'test::capture::read',
        details: { error: readError },
      });
      expect(producer).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'test::capture::read', error: readError },
        'Clipboard read failed',
      );
    });

    it('restores clipboard and returns error when producer throws', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValueOnce(PRIOR);
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const producerError = new Error('producer failed');
      const producer = jest.fn().mockRejectedValue(producerError);

      const result = await service.capture(producer, LOG_CTX);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_CAPTURE_EXECUTION_FAILED', {
        message: 'The producer callback threw an error',
        functionName: 'test::capture',
        details: { error: producerError },
      });
      expect(writeSpy).toHaveBeenCalledWith(PRIOR);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'test::capture', error: producerError },
        'Producer callback threw during capture',
      );
    });

    it('restores clipboard and returns error when read after producer fails', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValueOnce(PRIOR);
      const readError = new Error('post-producer read failed');
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockRejectedValueOnce(readError);
      const writeSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const producer = jest.fn().mockResolvedValue(undefined);

      const result = await service.capture(producer, LOG_CTX);

      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_READ_FAILED', {
        message: 'Failed to read clipboard',
        functionName: 'test::capture::read',
        details: { error: readError },
      });
      expect(writeSpy).toHaveBeenCalledWith(PRIOR);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'test::capture::read', error: readError },
        'Clipboard read failed',
      );
    });

    it('returns captured text even when restore fails', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValueOnce(PRIOR);
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockResolvedValueOnce(CAPTURED_TEXT);
      let callCount = 0;
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('restore failed'));
        return Promise.resolve(undefined);
      });
      const service = new ClipboardService(mockAdapter, createMockConfigReader(), mockLogger);
      const producer = jest.fn().mockResolvedValue(undefined);

      const result = await service.capture(producer, LOG_CTX);

      expect(result).toBeOkWith((value: { clipboard: string; produced: unknown }) => {
        expect(value).toStrictEqual({ clipboard: CAPTURED_TEXT, produced: undefined });
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'test::capture::restoreClipboard', error: new Error('restore failed') },
        'Clipboard restoration failed',
      );
    });
  });
});
