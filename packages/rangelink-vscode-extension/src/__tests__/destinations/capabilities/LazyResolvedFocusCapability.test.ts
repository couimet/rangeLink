import { createMockLogger } from 'barebone-logger-testing';

import type { InsertFactory } from '../../../destinations/capabilities/insertFactories';
import { LazyResolvedFocusCapability } from '../../../destinations/capabilities/LazyResolvedFocusCapability';
import type { FocusTier } from '../../../destinations/types';
import { createMockVscodeAdapter } from '../../helpers';

const CONTEXT = { fn: 'test' };
const LOG_PREFIX = 'TestAssistant';

const createMockInsertFactory = (): jest.Mocked<InsertFactory<void>> => ({
  forTarget: jest.fn().mockReturnValue(jest.fn().mockResolvedValue(true)),
});

describe('LazyResolvedFocusCapability', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('resolves on first focus() call via getCommands and caches the result', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const getCommandsSpy = jest
      .spyOn(mockAdapter, 'getCommands')
      .mockResolvedValue(['sparkAi.insertText']);

    const tier: FocusTier = {
      commands: ['sparkAi.insertText'],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };

    const capability = new LazyResolvedFocusCapability(mockAdapter, [tier], mockLogger, LOG_PREFIX);

    expect(capability.resolvedTierLabel).toBeUndefined();

    const result1 = await capability.focus(CONTEXT);
    expect(result1).toBeOk();
    expect(capability.resolvedTierLabel).toBe('insertCommands');
    expect(getCommandsSpy).toHaveBeenCalledTimes(1);

    const result2 = await capability.focus(CONTEXT);
    expect(result2).toBeOk();
    expect(getCommandsSpy).toHaveBeenCalledTimes(1);
  });

  it('returns error and caches failure when no tier has registered commands', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue([]);

    const tier: FocusTier = {
      commands: ['nonexistent.cmd'],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };

    const capability = new LazyResolvedFocusCapability(mockAdapter, [tier], mockLogger, LOG_PREFIX);

    const result1 = await capability.focus(CONTEXT);
    expect(result1).toBeErrWith((error: { reason: string }) => {
      expect(error).toStrictEqual({ reason: 'COMMAND_FOCUS_FAILED' });
    });

    const result2 = await capability.focus(CONTEXT);
    expect(result2).toBeErrWith((error: { reason: string }) => {
      expect(error.reason).toBe('COMMAND_FOCUS_FAILED');
    });
  });

  it('exposes isFallbackResolution when resolved tier is at fallbackTierIndex', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue(['builtin.focus']);

    const userTier: FocusTier = {
      commands: ['custom.insert'],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };
    const fallbackTier: FocusTier = {
      commands: ['builtin.focus'],
      insertFactory: createMockInsertFactory(),
      label: 'builtinFallback',
      probeMode: 'execute',
    };

    const FALLBACK_INDEX = 1;
    const capability = new LazyResolvedFocusCapability(
      mockAdapter,
      [userTier, fallbackTier],
      mockLogger,
      LOG_PREFIX,
      FALLBACK_INDEX,
    );

    expect(capability.isFallbackResolution).toBe(false);

    await capability.focus(CONTEXT);

    expect(capability.isFallbackResolution).toBe(true);
    expect(capability.resolvedTierLabel).toBe('builtinFallback');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      {
        ...CONTEXT,
        tier: 'builtinFallback',
        commands: ['builtin.focus'],
        logPrefix: LOG_PREFIX,
      },
      'TestAssistant: custom commands not registered, falling back to built-in commands',
    );
  });

  it('logs info when user tier resolves successfully', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue(['custom.insert']);

    const tier: FocusTier = {
      commands: ['custom.insert'],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };

    const capability = new LazyResolvedFocusCapability(mockAdapter, [tier], mockLogger, LOG_PREFIX);

    await capability.focus(CONTEXT);

    expect(capability.isFallbackResolution).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { ...CONTEXT, tier: 'insertCommands', logPrefix: LOG_PREFIX },
      'TestAssistant: resolved to insertCommands',
    );
  });

  it('delegates to ResolvedFocusCapability for execute probeMode after resolution', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue(['sparkAi.focus']);
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValue(undefined);

    const tier: FocusTier = {
      commands: ['sparkAi.focus'],
      insertFactory: createMockInsertFactory(),
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new LazyResolvedFocusCapability(mockAdapter, [tier], mockLogger, LOG_PREFIX);

    const result = await capability.focus(CONTEXT);

    expect(result).toBeOk();
    expect(executeCommandSpy).toHaveBeenCalledWith('sparkAi.focus');
    expect(capability.resolvedTierLabel).toBe('focusAndPasteCommands');
  });

  it('concurrent focus() calls share a single resolution — getCommands called exactly once', async () => {
    const mockAdapter = createMockVscodeAdapter();
    let resolveGetCommands: ((value: string[]) => void) | undefined;
    jest.spyOn(mockAdapter, 'getCommands').mockImplementation(
      () => new Promise((resolve) => { resolveGetCommands = resolve; }),
    );

    const tier: FocusTier = {
      commands: ['sparkAi.insertText'],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };

    const capability = new LazyResolvedFocusCapability(mockAdapter, [tier], mockLogger, LOG_PREFIX);

    const focus1 = capability.focus(CONTEXT);
    const focus2 = capability.focus(CONTEXT);

    resolveGetCommands!(['sparkAi.insertText']);

    const [result1, result2] = await Promise.all([focus1, focus2]);

    expect(result1).toBeOk();
    expect(result2).toBeOk();
    expect(mockAdapter.getCommands).toHaveBeenCalledTimes(1);
  });
});
