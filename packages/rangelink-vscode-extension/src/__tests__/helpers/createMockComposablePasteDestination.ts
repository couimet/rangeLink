import { createMockLogger } from 'barebone-logger-testing';
import { Result } from 'rangelink-core-ts';

import {
  ComposablePasteDestination,
  type ComposablePasteDestinationConfig,
  type EligibilityChecker,
  type FocusSuccess,
  type PasteDestination,
  type PasteExecutor,
} from '../../destinations';
import type { AutoPasteResult } from '../../types';

/**
 * Configuration overrides for creating a mock ComposablePasteDestination.
 *
 * All properties are optional with sensible defaults.
 */
export interface MockComposablePasteDestinationConfig
  extends Partial<ComposablePasteDestinationConfig> {
  pasteExecutor?: jest.Mocked<PasteExecutor>;
  eligibilityChecker?: jest.Mocked<EligibilityChecker>;
  getUserInstruction?: jest.Mock<string | undefined, [AutoPasteResult]>;
  compareWith?: jest.Mock<Promise<boolean>, [PasteDestination]>;
}

/**
 * Create a mock jest.Mocked<PasteExecutor> for testing.
 *
 * @param insertReturns - What insert() should return (default: true)
 * @returns Mocked PasteExecutor with focus() returning Result.ok({ insert: ... })
 */
export const createMockPasteExecutor = (
  insertReturns: boolean = true,
): jest.Mocked<PasteExecutor> => {
  const mockInsert = jest.fn().mockResolvedValue(insertReturns);
  const focusSuccess: FocusSuccess = { insert: mockInsert };

  return {
    focus: jest.fn().mockResolvedValue(Result.ok(focusSuccess)),
    _mockInsert: mockInsert,
  } as unknown as jest.Mocked<PasteExecutor> & { _mockInsert: jest.Mock };
};

/**
 * Create a mock jest.Mocked<EligibilityChecker> for testing.
 *
 * @returns Mocked EligibilityChecker with isEligible() stub returning true
 */
export const createMockEligibilityChecker = (): jest.Mocked<EligibilityChecker> =>
  ({
    isEligible: jest.fn().mockResolvedValue(true),
  }) as unknown as jest.Mocked<EligibilityChecker>;

/**
 * Create a mock ComposablePasteDestination for testing.
 *
 * Provides default mocks for all capabilities with sensible behaviors:
 * - PasteExecutor: Returns Result.ok({ insert: ... }) that returns true
 * - EligibilityChecker: Returns true (always eligible)
 * - isAvailable: Returns true (always available)
 * - All other config: Sensible defaults
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance with mocked capabilities
 */
export const createMockComposablePasteDestination = (
  overrides: MockComposablePasteDestinationConfig = {},
): ComposablePasteDestination => {
  const config: ComposablePasteDestinationConfig = {
    id: 'text-editor',
    displayName: 'Mock Destination',
    resource: { kind: 'singleton' },
    pasteExecutor: createMockPasteExecutor(),
    eligibilityChecker: createMockEligibilityChecker(),
    isAvailable: jest.fn().mockResolvedValue(true),
    jumpSuccessMessage: 'Mock jump success',
    loggingDetails: { mock: true },
    logger: createMockLogger(),
    ...overrides,
  };

  return ComposablePasteDestination.createForTesting(config);
};
