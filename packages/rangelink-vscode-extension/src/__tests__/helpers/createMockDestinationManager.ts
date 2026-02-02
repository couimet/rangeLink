/**
 * Mock PasteDestinationManager for testing
 *
 * Provides factory function to create mock destination managers with sensible defaults.
 */

import type { PasteDestination } from '../../destinations/PasteDestination';
import type { PasteDestinationManager } from '../../destinations/PasteDestinationManager';
import { ExtensionResult } from '../../types';

/**
 * Options for creating a mock destination manager
 */
export interface MockDestinationManagerOptions {
  /** Whether the manager is bound to a destination (default: false) */
  isBound?: boolean;
  /** Mock destination to return when bound (required if isBound is true) */
  boundDestination?: PasteDestination;
  /** Mock return value for sendLinkToDestination (default: false) */
  sendLinkToDestinationResult?: boolean;
  /** Mock return value for sendTextToDestination (default: false) */
  sendTextToDestinationResult?: boolean;
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
    sendLinkToDestinationResult = false,
    sendTextToDestinationResult = false,
  } = options;

  if (isBound && boundDestination === undefined) {
    throw new Error(
      'createMockDestinationManager: isBound is true but boundDestination is undefined. ' +
        'Provide a boundDestination when isBound is true.',
    );
  }

  if (!isBound && boundDestination !== undefined) {
    throw new Error(
      'createMockDestinationManager: isBound is false but boundDestination is defined. ' +
        'Remove boundDestination or set isBound to true.',
    );
  }

  return {
    isBound: jest.fn().mockReturnValue(isBound),
    sendLinkToDestination: jest.fn().mockResolvedValue(sendLinkToDestinationResult),
    sendTextToDestination: jest.fn().mockResolvedValue(sendTextToDestinationResult),
    getBoundDestination: jest.fn().mockReturnValue(boundDestination),
    bind: jest
      .fn()
      .mockResolvedValue(
        ExtensionResult.ok({ destinationName: 'Mock Destination', destinationType: 'terminal' }),
      ),
    unbind: jest.fn(),
    focusBoundDestination: jest.fn().mockResolvedValue(
      ExtensionResult.ok({
        destinationName: 'Mock Destination',
        destinationType: 'terminal',
      }),
    ),
    bindAndFocus: jest.fn().mockResolvedValue(
      ExtensionResult.ok({
        destinationName: 'Mock Destination',
        destinationType: 'terminal',
      }),
    ),
    dispose: jest.fn(),
  } as unknown as jest.Mocked<PasteDestinationManager>;
};
