import { createMockLogger } from 'barebone-logger-testing';

import type { AutoPasteResult } from '../../types/AutoPasteResult';
import type { EligibilityChecker } from '../../destinations/capabilities/EligibilityChecker';
import type { FocusManager } from '../../destinations/capabilities/FocusManager';
import type { TextInserter } from '../../destinations/capabilities/TextInserter';
import {
  ComposablePasteDestination,
  type ComposablePasteDestinationConfig,
} from '../../destinations/ComposablePasteDestination';
import type { PasteDestination } from '../../destinations/PasteDestination';

/**
 * Configuration overrides for creating a mock ComposablePasteDestination.
 *
 * All properties are optional with sensible defaults.
 */
export interface MockComposablePasteDestinationConfig
  extends Partial<ComposablePasteDestinationConfig> {
  textInserter?: jest.Mocked<TextInserter>;
  eligibilityChecker?: jest.Mocked<EligibilityChecker>;
  focusManager?: jest.Mocked<FocusManager>;
  getUserInstruction?: jest.Mock<string | undefined, [AutoPasteResult]>;
  compareWith?: jest.Mock<Promise<boolean>, [PasteDestination]>;
}

/**
 * Create a mock jest.Mocked<TextInserter> for testing.
 *
 * @returns Mocked TextInserter with insert() stub returning true
 */
export const createMockTextInserter = (): jest.Mocked<TextInserter> =>
  ({
    insert: jest.fn().mockResolvedValue(true),
  }) as unknown as jest.Mocked<TextInserter>;

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
 * Create a mock jest.Mocked<FocusManager> for testing.
 *
 * @returns Mocked FocusManager with focus() stub returning void
 */
export const createMockFocusManager = (): jest.Mocked<FocusManager> =>
  ({
    focus: jest.fn().mockResolvedValue(undefined),
  }) as unknown as jest.Mocked<FocusManager>;

/**
 * Create a mock ComposablePasteDestination for testing.
 *
 * Provides default mocks for all capabilities with sensible behaviors:
 * - TextInserter: Returns true (success)
 * - EligibilityChecker: Returns true (always eligible)
 * - FocusManager: Returns void (no-op)
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
    textInserter: createMockTextInserter(),
    eligibilityChecker: createMockEligibilityChecker(),
    focusManager: createMockFocusManager(),
    isAvailable: jest.fn().mockResolvedValue(true),
    jumpSuccessMessage: 'Mock jump success',
    loggingDetails: { mock: true },
    logger: createMockLogger(),
    ...overrides,
  };

  return ComposablePasteDestination.createForTesting(config);
};
