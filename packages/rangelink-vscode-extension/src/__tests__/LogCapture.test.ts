import { LogCapture } from '../LogCapture';

const createMockOutputChannel = () => ({
  appendLine: jest.fn(),
});

describe('LogCapture', () => {
  const originalEnv = process.env.RANGELINK_CAPTURE_LOGS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RANGELINK_CAPTURE_LOGS;
    } else {
      process.env.RANGELINK_CAPTURE_LOGS = originalEnv;
    }
  });

  describe('with capture enabled (RANGELINK_CAPTURE_LOGS=true)', () => {
    beforeEach(() => {
      process.env.RANGELINK_CAPTURE_LOGS = 'true';
    });

    it('proxies appendLine to the real output channel', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      capture.appendLine('[DEBUG] test message');

      expect(mockChannel.appendLine).toHaveBeenCalledWith('[DEBUG] test message');
    });

    it('captures lines in memory', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      capture.appendLine('line 1');
      capture.appendLine('line 2');
      capture.appendLine('line 3');

      expect(capture.getAllLines()).toStrictEqual(['line 1', 'line 2', 'line 3']);
    });

    it('returns lines since a named marker', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      capture.appendLine('before marker');
      capture.mark('test-start');
      capture.appendLine('after marker 1');
      capture.appendLine('after marker 2');

      expect(capture.getLinesSince('test-start')).toStrictEqual([
        'after marker 1',
        'after marker 2',
      ]);
    });

    it('returns all lines when marker does not exist', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      capture.appendLine('line 1');
      capture.appendLine('line 2');

      expect(capture.getLinesSince('nonexistent')).toStrictEqual(['line 1', 'line 2']);
    });

    it('supports multiple markers', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      capture.appendLine('phase 0');
      capture.mark('phase-1');
      capture.appendLine('phase 1 line');
      capture.mark('phase-2');
      capture.appendLine('phase 2 line');

      expect(capture.getLinesSince('phase-1')).toStrictEqual(['phase 1 line', 'phase 2 line']);
      expect(capture.getLinesSince('phase-2')).toStrictEqual(['phase 2 line']);
    });

    it('clear resets lines and markers', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      capture.appendLine('line 1');
      capture.mark('test');
      capture.appendLine('line 2');

      capture.clear();

      expect(capture.getAllLines()).toStrictEqual([]);
      expect(capture.getLinesSince('test')).toStrictEqual([]);
    });

    it('returns empty array when no lines captured after marker', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      capture.appendLine('before');
      capture.mark('end');

      expect(capture.getLinesSince('end')).toStrictEqual([]);
    });

    it('reports isCapturing as true', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      expect(capture.isCapturing).toBe(true);
    });
  });

  describe('with capture disabled (production)', () => {
    beforeEach(() => {
      delete process.env.RANGELINK_CAPTURE_LOGS;
    });

    it('proxies appendLine to the real output channel without storing', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      capture.appendLine('[DEBUG] test message');

      expect(mockChannel.appendLine).toHaveBeenCalledWith('[DEBUG] test message');
    });

    it('mark() throws LOG_CAPTURE_DISABLED', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      expect(() => capture.mark('test')).toThrowRangeLinkExtensionError('LOG_CAPTURE_DISABLED', {
        message:
          'LogCapture.mark() called without RANGELINK_CAPTURE_LOGS=true — this method is for integration tests only',
        functionName: 'LogCapture.mark',
      });
    });

    it('getLinesSince() throws LOG_CAPTURE_DISABLED', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      expect(() => capture.getLinesSince('test')).toThrowRangeLinkExtensionError(
        'LOG_CAPTURE_DISABLED',
        {
          message:
            'LogCapture.getLinesSince() called without RANGELINK_CAPTURE_LOGS=true — this method is for integration tests only',
          functionName: 'LogCapture.getLinesSince',
        },
      );
    });

    it('getAllLines() throws LOG_CAPTURE_DISABLED', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      expect(() => capture.getAllLines()).toThrowRangeLinkExtensionError('LOG_CAPTURE_DISABLED', {
        message:
          'LogCapture.getAllLines() called without RANGELINK_CAPTURE_LOGS=true — this method is for integration tests only',
        functionName: 'LogCapture.getAllLines',
      });
    });

    it('clear() throws LOG_CAPTURE_DISABLED', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      expect(() => capture.clear()).toThrowRangeLinkExtensionError('LOG_CAPTURE_DISABLED', {
        message:
          'LogCapture.clear() called without RANGELINK_CAPTURE_LOGS=true — this method is for integration tests only',
        functionName: 'LogCapture.clear',
      });
    });

    it('reports isCapturing as false', () => {
      const mockChannel = createMockOutputChannel();
      const capture = new LogCapture(mockChannel as any);

      expect(capture.isCapturing).toBe(false);
    });
  });
});
