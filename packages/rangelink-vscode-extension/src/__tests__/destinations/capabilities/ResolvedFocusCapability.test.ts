import type { InsertFactory } from '../../../destinations/capabilities/insertFactories';
import { ResolvedFocusCapability } from '../../../destinations/capabilities/ResolvedFocusCapability';
import type { FocusStage, FocusTier } from '../../../destinations/types';
import { createMockVscodeAdapter } from '../../helpers';

import { createMockLogger } from '@couimet/logger-contract-testing';

const CONTEXT = { fn: 'test' };

const createMockInsertFactory = (): jest.Mocked<InsertFactory<void>> => ({
  forTarget: jest.fn().mockReturnValue(jest.fn().mockResolvedValue(true)),
});

describe('ResolvedFocusCapability', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('returns inserter directly for probeMode none without executing commands', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

    const factory = createMockInsertFactory();
    const tier: FocusTier = {
      commands: [['tier1.cmd']],
      insertFactory: factory,
      label: 'insertCommands',
      probeMode: 'none',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(true);
    expect(factory.forTarget).toHaveBeenCalled();
    expect(executeCommandSpy).not.toHaveBeenCalled();
    expect(capability.resolvedTierLabel).toBe('insertCommands');
    expect(mockLogger.debug).toHaveBeenCalledWith({ ...CONTEXT, tier: 'insertCommands' }, 'Resolved tier insertCommands — returning inserter directly');
  });

  it('executes focus command for probeMode execute and returns inserter', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const factory = createMockInsertFactory();
    const tier: FocusTier = {
      commands: [['focus.cmd']],
      insertFactory: factory,
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(true);
    expect(factory.forTarget).toHaveBeenCalled();
    expect(capability.resolvedTierLabel).toBe('focusAndPasteCommands');
  });

  it('advances to the next stage when a stage command throws', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValueOnce(new Error('First cmd failed')).mockResolvedValueOnce(undefined);

    const factory = createMockInsertFactory();
    const tier: FocusTier = {
      commands: [['tier.primary'], ['tier.fallback']],
      insertFactory: factory,
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(true);
    expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'tier.primary');
    expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'tier.fallback');
  });

  it('skips an empty stage and falls through to the next stage', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const factory = createMockInsertFactory();
    const tier: FocusTier = {
      commands: [[] as unknown as FocusStage, ['fallback.focus']],
      insertFactory: factory,
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result).toBeSuccessWith((value) => {
      expect(value).toStrictEqual({ inserter: expect.any(Function) });
    });
    expect(executeCommandSpy).toHaveBeenCalledTimes(1);
    expect(executeCommandSpy).toHaveBeenCalledWith('fallback.focus');
    expect(factory.forTarget).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'test', command: 'fallback.focus', tier: 'focusAndPasteCommands' },
      'Focus command succeeded (focusAndPasteCommands)',
    );
  });

  it('runs every command in a multi-command stage before the stage wins', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const factory = createMockInsertFactory();
    const tier: FocusTier = {
      commands: [['reveal.sidebar', 'focus.input'], ['fallback.focus']],
      insertFactory: factory,
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result).toBeSuccessWith((value) => {
      expect(value).toStrictEqual({ inserter: expect.any(Function) });
    });
    expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'reveal.sidebar');
    expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'focus.input');
    expect(factory.forTarget).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'test', command: 'reveal.sidebar', tier: 'focusAndPasteCommands' },
      'Focus command succeeded (focusAndPasteCommands)',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'test', command: 'focus.input', tier: 'focusAndPasteCommands' },
      'Focus command succeeded (focusAndPasteCommands)',
    );
  });

  it('fails a stage when a later command throws and advances to the next stage', async () => {
    const stageError = new Error('focus.input failed');
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(stageError)
      .mockResolvedValueOnce(undefined);

    const factory = createMockInsertFactory();
    const tier: FocusTier = {
      commands: [['reveal.sidebar', 'focus.input'], ['fallback.focus']],
      insertFactory: factory,
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result).toBeSuccessWith((value) => {
      expect(value).toStrictEqual({ inserter: expect.any(Function) });
    });
    expect(executeCommandSpy).toHaveBeenCalledTimes(3);
    expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'reveal.sidebar');
    expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'focus.input');
    expect(executeCommandSpy).toHaveBeenNthCalledWith(3, 'fallback.focus');
    expect(factory.forTarget).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'test', command: 'focus.input', tier: 'focusAndPasteCommands', error: stageError },
      'Focus command failed, trying next stage',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'test', command: 'fallback.focus', tier: 'focusAndPasteCommands' },
      'Focus command succeeded (focusAndPasteCommands)',
    );
  });

  it('returns error when all execute-mode focus commands fail', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Failed'));

    const tier: FocusTier = {
      commands: [['a.cmd'], ['b.cmd']],
      insertFactory: createMockInsertFactory(),
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result).toBeFailure({ reason: 'COMMAND_FOCUS_FAILED' });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { ...CONTEXT, tier: 'focusAndPasteCommands', allStagesFailed: true },
      'All focus stages failed for resolved tier focusAndPasteCommands',
    );
  });
});
