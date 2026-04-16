import { createMockLogger } from 'barebone-logger-testing';

import type { InsertFactory } from '../../../destinations/capabilities/insertFactories';
import { ResolvedFocusCapability } from '../../../destinations/capabilities/ResolvedFocusCapability';
import type { FocusTier } from '../../../destinations/types';
import { createMockVscodeAdapter } from '../../helpers';

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
      commands: ['tier1.cmd'],
      insertFactory: factory,
      label: 'insertCommands',
      probeMode: 'none',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result).toBeOk();
    expect(factory.forTarget).toHaveBeenCalled();
    expect(executeCommandSpy).not.toHaveBeenCalled();
    expect(capability.resolvedTierLabel).toBe('insertCommands');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { ...CONTEXT, tier: 'insertCommands' },
      'Resolved tier insertCommands — returning inserter directly',
    );
  });

  it('executes focus command for probeMode execute and returns inserter', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const factory = createMockInsertFactory();
    const tier: FocusTier = {
      commands: ['focus.cmd'],
      insertFactory: factory,
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result).toBeOk();
    expect(factory.forTarget).toHaveBeenCalled();
    expect(capability.resolvedTierLabel).toBe('focusAndPasteCommands');
  });

  it('tries multiple commands within the resolved tier', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(new Error('First cmd failed'))
      .mockResolvedValueOnce(undefined);

    const factory = createMockInsertFactory();
    const tier: FocusTier = {
      commands: ['tier.primary', 'tier.fallback'],
      insertFactory: factory,
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result).toBeOk();
    expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'tier.primary');
    expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'tier.fallback');
  });

  it('returns error when all execute-mode focus commands fail', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Failed'));

    const tier: FocusTier = {
      commands: ['a.cmd', 'b.cmd'],
      insertFactory: createMockInsertFactory(),
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const capability = new ResolvedFocusCapability(mockAdapter, tier, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result).toBeErrWith((error: { reason: string }) => {
      expect(error).toStrictEqual({ reason: 'COMMAND_FOCUS_FAILED' });
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { ...CONTEXT, tier: 'focusAndPasteCommands', allCommandsFailed: true },
      'All focus commands failed for resolved tier focusAndPasteCommands',
    );
  });
});
