import type { LoggingContext } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { AIAssistantFocusCapability } from '../../../destinations/capabilities/AIAssistantFocusCapability';
import type { ColdRefocusConfig } from '../../../destinations/capabilities/ColdRefocusConfig';
import { FocusErrorReason } from '../../../destinations/capabilities/FocusCapability';
import type { FocusResult } from '../../../destinations/capabilities/FocusCapability';
import type { InsertFactory } from '../../../destinations/capabilities/insertFactories';
import { createMockVscodeAdapter } from '../../helpers';

const FOCUS_COMMANDS = ['ai.focus'];
const CTX: LoggingContext = { fn: 'test' };

const createMockInsertFactory = (): jest.Mocked<InsertFactory<void>> => ({
  forTarget: jest.fn().mockReturnValue(undefined),
});

describe('AIAssistantFocusCapability', () => {
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInsertFactory: jest.Mocked<InsertFactory<void>>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockAdapter = createMockVscodeAdapter();
    mockLogger = createMockLogger();
    mockInsertFactory = createMockInsertFactory();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createCapability = (
    commands: string[] = FOCUS_COMMANDS,
    getColdRefocus?: () => ColdRefocusConfig,
  ): AIAssistantFocusCapability =>
    new AIAssistantFocusCapability(
      mockAdapter,
      commands,
      getColdRefocus,
      mockInsertFactory,
      mockLogger,
    );

  it('succeeds on first focus command and returns inserter', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const capability = createCapability();
    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeOkWith((value: FocusResult['value']) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledWith('ai.focus');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'test', command: 'ai.focus' },
      'Focus command succeeded',
    );
  });

  it('falls back through command list until one succeeds', async () => {
    jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce(undefined);
    const capability = createCapability(['cmd.a', 'cmd.b', 'cmd.c']);
    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeOkWith((value: FocusResult['value']) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(2);
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(1, 'cmd.a');
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(2, 'cmd.b');
  });

  it('returns error when all focus commands fail', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('all failed'));
    const capability = createCapability(['cmd.a', 'cmd.b']);
    const result = await capability.focus(CTX);

    expect(result).toBeErrWith((error: FocusResult['error']) => {
      expect(error.reason).toBe(FocusErrorReason.COMMAND_FOCUS_FAILED);
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'test', allCommandsFailed: true },
      'All focus commands failed',
    );
  });

  it('waits FOCUS_TO_PASTE_DELAY_MS when no coldRefocus configured (warm delay)', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const capability = createCapability();

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeOkWith((value: FocusResult['value']) => {
      expect(value.inserter).toBeUndefined();
    });
  });

  it('waits FOCUS_TO_PASTE_DELAY_MS on second focus after cold-start (warm)', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 900, intervalMs: 300 });
    const capability = createCapability(FOCUS_COMMANDS, coldRefocus);

    const firstFocus = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(900);
    await firstFocus;

    const secondFocus = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await secondFocus;

    expect(result).toBeOkWith((value: FocusResult['value']) => {
      expect(value.inserter).toBeUndefined();
    });
  });

  it('re-fires focus commands at each interval during cold-start', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 900, intervalMs: 300 });
    const capability = createCapability(FOCUS_COMMANDS, coldRefocus);

    const focusPromise = capability.focus(CTX);

    await jest.advanceTimersByTimeAsync(900);
    const result = await focusPromise;

    expect(result).toBeOkWith((value: FocusResult['value']) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(3);
  });

  it('does not refocus on warm path even with coldRefocus configured', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 900, intervalMs: 300 });
    const capability = createCapability(FOCUS_COMMANDS, coldRefocus);

    const firstFocus = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(900);
    await firstFocus;

    (mockAdapter.executeCommand as jest.Mock).mockClear();

    const secondFocus = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    await secondFocus;

    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(1);
  });

  it('logs elapsed time after cold refocus loop', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 900, intervalMs: 300 });
    const capability = createCapability(FOCUS_COMMANDS, coldRefocus);

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(900);
    await focusPromise;

    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'test', totalMs: expect.any(Number) as number, intervalMs: 300 },
      'Cold refocus loop completed',
    );
  });

  it('falls back to warm delay when intervalMs is 0', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 2500, intervalMs: 0 });
    const capability = createCapability(FOCUS_COMMANDS, coldRefocus);

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeOkWith((value: FocusResult['value']) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'test', totalMs: 2500, intervalMs: 0 },
      'Invalid cold refocus config, falling back to warm delay',
    );
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(1);
  });

  it('falls back to warm delay when totalMs is 0', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 0, intervalMs: 300 });
    const capability = createCapability(FOCUS_COMMANDS, coldRefocus);

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeOkWith((value: FocusResult['value']) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(1);
  });
});
