import { createMockLogger } from 'barebone-logger-testing';

import { resolveFocusTier } from '../../../destinations/capabilities/resolveFocusTier';
import type { FocusTier } from '../../../destinations/types';
import type { InsertFactory } from '../../../destinations/capabilities/insertFactories';

const createMockInsertFactory = (): jest.Mocked<InsertFactory<void>> => ({
  forTarget: jest.fn().mockReturnValue(jest.fn().mockResolvedValue(true)),
});

const LOG_PREFIX = 'TestAssistant';

describe('resolveFocusTier', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('resolves to first tier when its command is registered', () => {
    const tier1: FocusTier = {
      commands: ['sparkAi.insertText'],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };
    const tier2: FocusTier = {
      commands: ['sparkAi.focus'],
      insertFactory: createMockInsertFactory(),
      label: 'focusCommands',
      probeMode: 'execute',
    };

    const result = resolveFocusTier(
      [tier1, tier2],
      ['sparkAi.insertText', 'sparkAi.focus'],
      mockLogger,
      LOG_PREFIX,
    );

    expect(result).toBeDefined();
    expect(result!.resolvedTier.label).toBe('insertCommands');
    expect(result!.isFallback).toBe(false);
  });

  it('falls through to second tier when first has no registered commands', () => {
    const tier1: FocusTier = {
      commands: ['sparkAi.insertText'],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };
    const tier2: FocusTier = {
      commands: ['sparkAi.focus'],
      insertFactory: createMockInsertFactory(),
      label: 'focusCommands',
      probeMode: 'execute',
    };

    const result = resolveFocusTier(
      [tier1, tier2],
      ['sparkAi.focus'],
      mockLogger,
      LOG_PREFIX,
    );

    expect(result).toBeDefined();
    expect(result!.resolvedTier.label).toBe('focusCommands');
    expect(result!.isFallback).toBe(false);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'resolveFocusTier', tier: 'insertCommands', checkedCommands: ['sparkAi.insertText'], logPrefix: LOG_PREFIX },
      'TestAssistant: no registered commands for insertCommands, trying next tier',
    );
  });

  it('skips tiers with empty command arrays', () => {
    const emptyTier: FocusTier = {
      commands: [],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };
    const tier2: FocusTier = {
      commands: ['sparkAi.focus'],
      insertFactory: createMockInsertFactory(),
      label: 'focusCommands',
      probeMode: 'execute',
    };

    const result = resolveFocusTier(
      [emptyTier, tier2],
      ['sparkAi.focus'],
      mockLogger,
      LOG_PREFIX,
    );

    expect(result).toBeDefined();
    expect(result!.resolvedTier.label).toBe('focusCommands');
  });

  it('returns undefined when no tier has registered commands', () => {
    const tier: FocusTier = {
      commands: ['nonexistent.cmd'],
      insertFactory: createMockInsertFactory(),
      label: 'insertCommands',
      probeMode: 'none',
    };

    const result = resolveFocusTier(
      [tier],
      ['other.cmd'],
      mockLogger,
      LOG_PREFIX,
    );

    expect(result).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'resolveFocusTier', logPrefix: LOG_PREFIX, tierCount: 1 },
      'TestAssistant: no tiers have registered commands — resolution failed',
    );
  });

  it('marks resolution as fallback when winning tier is at or past fallbackTierIndex', () => {
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

    const result = resolveFocusTier(
      [userTier, fallbackTier],
      ['builtin.focus'],
      mockLogger,
      LOG_PREFIX,
      FALLBACK_INDEX,
    );

    expect(result).toBeDefined();
    expect(result!.resolvedTier.label).toBe('builtinFallback');
    expect(result!.isFallback).toBe(true);
  });

  it('marks resolution as non-fallback when winning tier is before fallbackTierIndex', () => {
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

    const result = resolveFocusTier(
      [userTier, fallbackTier],
      ['custom.insert', 'builtin.focus'],
      mockLogger,
      LOG_PREFIX,
      FALLBACK_INDEX,
    );

    expect(result).toBeDefined();
    expect(result!.resolvedTier.label).toBe('insertCommands');
    expect(result!.isFallback).toBe(false);
  });

  it('resolves to first registered command within a tier', () => {
    const tier: FocusTier = {
      commands: ['primary.cmd', 'fallback.cmd'],
      insertFactory: createMockInsertFactory(),
      label: 'focusAndPasteCommands',
      probeMode: 'execute',
    };

    const result = resolveFocusTier(
      [tier],
      ['fallback.cmd'],
      mockLogger,
      LOG_PREFIX,
    );

    expect(result).toBeDefined();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'resolveFocusTier', tier: 'focusAndPasteCommands', command: 'fallback.cmd', isFallback: false, logPrefix: LOG_PREFIX },
      'TestAssistant: resolved to focusAndPasteCommands (command: fallback.cmd)',
    );
  });
});
