import { createMockLogger } from 'barebone-logger-testing';

import { FocusErrorReason } from '../../../destinations/capabilities/FocusCapability';
import { TieredFocusCapability } from '../../../destinations/capabilities/TieredFocusCapability';
import type { FocusTier } from '../../../destinations/types';
import type { InsertFactory } from '../../../destinations/capabilities/insertFactories';
import { createMockVscodeAdapter } from '../../helpers';

const CONTEXT = { fn: 'test' };

const createMockInsertFactory = (): jest.Mocked<InsertFactory<void>> => ({
  forTarget: jest.fn().mockReturnValue(jest.fn().mockResolvedValue(true)),
});

describe('TieredFocusCapability', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('succeeds on first tier when its command works', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const tier1Factory = createMockInsertFactory();
    const tier2Factory = createMockInsertFactory();
    const tiers: FocusTier[] = [
      { commands: ['tier1.cmd'], insertFactory: tier1Factory, label: 'insertCommands' },
      { commands: ['tier2.cmd'], insertFactory: tier2Factory, label: 'focusCommands' },
    ];

    const capability = new TieredFocusCapability(mockAdapter, tiers, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(true);
    expect(tier1Factory.forTarget).toHaveBeenCalled();
    expect(tier2Factory.forTarget).not.toHaveBeenCalled();
    expect(capability.lastTierLabel).toBe('insertCommands');
  });

  it('falls through to second tier when all first-tier commands fail', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(new Error('Tier 1 failed'))
      .mockResolvedValueOnce(undefined);

    const tier1Factory = createMockInsertFactory();
    const tier2Factory = createMockInsertFactory();
    const tiers: FocusTier[] = [
      { commands: ['tier1.cmd'], insertFactory: tier1Factory, label: 'insertCommands' },
      { commands: ['tier2.cmd'], insertFactory: tier2Factory, label: 'focusCommands' },
    ];

    const capability = new TieredFocusCapability(mockAdapter, tiers, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(true);
    expect(tier1Factory.forTarget).not.toHaveBeenCalled();
    expect(tier2Factory.forTarget).toHaveBeenCalled();
    expect(capability.lastTierLabel).toBe('focusCommands');
  });

  it('falls through all three tiers to the last one', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(new Error('Tier 1 failed'))
      .mockRejectedValueOnce(new Error('Tier 2 failed'))
      .mockResolvedValueOnce(undefined);

    const tier1Factory = createMockInsertFactory();
    const tier2Factory = createMockInsertFactory();
    const tier3Factory = createMockInsertFactory();
    const tiers: FocusTier[] = [
      { commands: ['tier1.cmd'], insertFactory: tier1Factory, label: 'insertCommands' },
      { commands: ['tier2.cmd'], insertFactory: tier2Factory, label: 'focusAndPasteCommands' },
      { commands: ['tier3.cmd'], insertFactory: tier3Factory, label: 'focusCommands' },
    ];

    const capability = new TieredFocusCapability(mockAdapter, tiers, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(true);
    expect(tier3Factory.forTarget).toHaveBeenCalled();
    expect(capability.lastTierLabel).toBe('focusCommands');
  });

  it('returns error when all tiers fail', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Failed'));

    const tiers: FocusTier[] = [
      { commands: ['a.cmd'], insertFactory: createMockInsertFactory(), label: 'insertCommands' },
      { commands: ['b.cmd'], insertFactory: createMockInsertFactory(), label: 'focusCommands' },
    ];

    const capability = new TieredFocusCapability(mockAdapter, tiers, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.reason).toBe('COMMAND_FOCUS_FAILED');
    }
    expect(capability.lastTierLabel).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { ...CONTEXT, allTiersFailed: true },
      'All tiers exhausted — focus failed',
    );
  });

  it('skips tiers with empty command arrays', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const emptyFactory = createMockInsertFactory();
    const tier2Factory = createMockInsertFactory();
    const tiers: FocusTier[] = [
      { commands: [], insertFactory: emptyFactory, label: 'insertCommands' },
      { commands: ['tier2.cmd'], insertFactory: tier2Factory, label: 'focusCommands' },
    ];

    const capability = new TieredFocusCapability(mockAdapter, tiers, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(true);
    expect(emptyFactory.forTarget).not.toHaveBeenCalled();
    expect(tier2Factory.forTarget).toHaveBeenCalled();
    expect(capability.lastTierLabel).toBe('focusCommands');
  });

  it('tries multiple commands within a tier before moving to next tier', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(new Error('First cmd failed'))
      .mockResolvedValueOnce(undefined);

    const factory = createMockInsertFactory();
    const tiers: FocusTier[] = [
      { commands: ['tier1.primary', 'tier1.fallback'], insertFactory: factory, label: 'insertCommands' },
    ];

    const capability = new TieredFocusCapability(mockAdapter, tiers, mockLogger);
    const result = await capability.focus(CONTEXT);

    expect(result.success).toBe(true);
    expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'tier1.primary');
    expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'tier1.fallback');
  });

  it('resets lastTierLabel on each focus call', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error('Failed'));

    const tiers: FocusTier[] = [
      { commands: ['cmd'], insertFactory: createMockInsertFactory(), label: 'insertCommands' },
    ];

    const capability = new TieredFocusCapability(mockAdapter, tiers, mockLogger);

    await capability.focus(CONTEXT);
    expect(capability.lastTierLabel).toBe('insertCommands');

    await capability.focus(CONTEXT);
    expect(capability.lastTierLabel).toBeUndefined();
  });
});
