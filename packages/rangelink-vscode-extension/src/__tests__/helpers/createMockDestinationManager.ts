/**
 * Mock PasteDestinationManager for testing
 *
 * Provides factory function to create mock destination managers with sensible defaults.
 */

import type { PasteDestinationManager } from '../../destinations/PasteDestinationManager';
import type { PasteDestination } from '../../destinations/PasteDestination';

/**
 * Options for creating a mock destination manager
 */
export interface MockDestinationManagerOptions {
  /** Whether the manager is bound to a destination (default: false) */
  isBound?: boolean;
  /** Mock destination to return when bound (required if isBound is true) */
  boundDestination?: PasteDestination;
  /** Mock return value for sendToDestination (default: false) */
  sendToDestinationResult?: boolean;
}

/**
 * Create a mock PasteDestinationManager for testing
 *
 * @param options - Optional configuration for the mock
 * @returns Mock PasteDestinationManager with jest functions
 */
export const createMockDestinationManager = (
  options: MockDestinationManagerOptions = {},
): jest.Mocked<PasteDestinationManager> => {
  const {
    isBound = false,
    boundDestination = undefined,
    sendToDestinationResult = false,
  } = options;

  return {
    isBound: jest.fn().mockReturnValue(isBound),
    sendToDestination: jest.fn().mockResolvedValue(sendToDestinationResult),
    getBoundDestination: jest.fn().mockReturnValue(boundDestination),
    bind: jest.fn().mockResolvedValue(false),
    unbind: jest.fn(),
    dispose: jest.fn(),
  } as unknown as jest.Mocked<PasteDestinationManager>;
};
