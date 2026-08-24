import { AIAssistantFocusCapability } from '../../../destinations/capabilities/AIAssistantFocusCapability';
import type { ColdRefocusConfig } from '../../../destinations/capabilities/ColdRefocusConfig';
import type { InsertFactory } from '../../../destinations/capabilities/insertFactories';
import { createMockVscodeAdapter } from '../../helpers';

import type { LoggingContext } from '@couimet/logger-contract';
import { createMockLogger } from '@couimet/logger-contract-testing';

const FOCUS_STAGES = [['ai.focus']];
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

  const createCapability = (stages: string[][] = FOCUS_STAGES, getColdRefocus?: () => ColdRefocusConfig): AIAssistantFocusCapability =>
    new AIAssistantFocusCapability(mockAdapter, stages, getColdRefocus, mockInsertFactory, mockLogger);

  it('succeeds when the single stage command resolves and returns inserter', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const capability = createCapability();
    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledWith('ai.focus');
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'test', command: 'ai.focus', stage: ['ai.focus'] }, 'Focus command succeeded');
  });

  it('falls back to the next stage when a stage command throws', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValueOnce(new Error('first failed')).mockResolvedValueOnce(undefined);
    const capability = createCapability([['cmd.a'], ['cmd.b'], ['cmd.c']]);
    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(2);
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(1, 'cmd.a');
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(2, 'cmd.b');
  });

  it('runs every command in a stage before returning (sequence, not fallback)', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const capability = createCapability([['open.panel', 'focus.input']]);
    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(2);
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(1, 'open.panel');
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(2, 'focus.input');
  });

  it('fails the stage when a later command in the stage throws and advances to the next stage', async () => {
    jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('focus.input failed'))
      .mockResolvedValueOnce(undefined);
    const capability = createCapability([['open.panel', 'focus.input'], ['fallback.open']]);
    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(3);
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(1, 'open.panel');
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(2, 'focus.input');
    expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(3, 'fallback.open');
  });

  it('returns error when all focus stages fail', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('all failed'));
    const capability = createCapability([['cmd.a'], ['cmd.b']]);
    const result = await capability.focus(CTX);

    expect(result).toBeFailureWith((error) => {
      expect(error.reason).toBe('COMMAND_FOCUS_FAILED');
    });
    expect(mockLogger.warn).toHaveBeenCalledWith({ fn: 'test', allStagesFailed: true }, 'All focus stages failed');
  });

  it('waits FOCUS_TO_PASTE_DELAY_MS when no coldRefocus configured (warm delay)', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const capability = createCapability();

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
  });

  it('waits FOCUS_TO_PASTE_DELAY_MS on second focus after cold-start (warm)', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 900, intervalMs: 300 });
    const capability = createCapability(FOCUS_STAGES, coldRefocus);

    const firstFocus = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(900);
    await firstFocus;

    const secondFocus = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await secondFocus;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
  });

  it('re-fires focus stages at each interval during cold-start', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 900, intervalMs: 300 });
    const capability = createCapability(FOCUS_STAGES, coldRefocus);

    const focusPromise = capability.focus(CTX);

    await jest.advanceTimersByTimeAsync(900);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(3);
  });

  it('does not refocus on warm path even with coldRefocus configured', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 900, intervalMs: 300 });
    const capability = createCapability(FOCUS_STAGES, coldRefocus);

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
    const capability = createCapability(FOCUS_STAGES, coldRefocus);

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(900);
    await focusPromise;

    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'test', totalMs: expect.any(Number) as number, intervalMs: 300 }, 'Cold refocus loop completed');
  });

  it('falls back to warm delay when intervalMs is 0', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 2500, intervalMs: 0 });
    const capability = createCapability(FOCUS_STAGES, coldRefocus);

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockLogger.warn).toHaveBeenCalledWith({ fn: 'test', totalMs: 2500, intervalMs: 0 }, 'Invalid cold refocus config, falling back to warm delay');
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(1);
  });

  it('falls back to warm delay when totalMs is 0', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 0, intervalMs: 300 });
    const capability = createCapability(FOCUS_STAGES, coldRefocus);

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(1);
  });

  it('falls back to warm delay when totalMs <= intervalMs (positive-but-invalid)', async () => {
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const coldRefocus = (): ColdRefocusConfig => ({ totalMs: 300, intervalMs: 300 });
    const capability = createCapability(FOCUS_STAGES, coldRefocus);

    const focusPromise = capability.focus(CTX);
    await jest.advanceTimersByTimeAsync(200);
    const result = await focusPromise;

    expect(result).toBeSuccessWith((value) => {
      expect(value.inserter).toBeUndefined();
    });
    expect(mockLogger.warn).toHaveBeenCalledWith({ fn: 'test', totalMs: 300, intervalMs: 300 }, 'Invalid cold refocus config, falling back to warm delay');
    expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(1);
  });
});
