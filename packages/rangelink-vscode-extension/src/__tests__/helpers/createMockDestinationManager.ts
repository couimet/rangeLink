/**
 * Mock PasteDestinationManager for testing
 *
 * Provides factory function to create mock destination managers with sensible defaults.
 */

import type {
  BindSuccessInfo,
  PasteDestination,
  PasteDestinationManager,
} from '../../destinations';
import type { ExtensionResult } from '../../types';

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
  /**
   * Mock return value for bind().
   *
   * When provided with isBound:false and boundDestination, simulates the
   * "starts unbound → bind succeeds → becomes bound" transition:
   * isBound returns false on first call then true, and getBoundDestination
   * returns undefined on first call then boundDestination.
   */
  bindResult?: ExtensionResult<BindSuccessInfo>;
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
    bindResult,
  } = options;

  if (isBound && boundDestination === undefined) {
    throw new Error(
      'createMockDestinationManager: isBound is true but boundDestination is undefined. ' +
        'Provide a boundDestination when isBound is true.',
    );
  }

  // boundDestination without isBound is only valid for bind transitions
  if (!isBound && boundDestination !== undefined && bindResult === undefined) {
    throw new Error(
      'createMockDestinationManager: isBound is false but boundDestination is defined. ' +
        'Remove boundDestination, set isBound to true, or provide bindResult for a transition scenario.',
    );
  }

  const isBindTransition = !isBound && boundDestination !== undefined && bindResult !== undefined;

  const isBoundMock = isBindTransition
    ? jest.fn().mockReturnValueOnce(false).mockReturnValue(true)
    : jest.fn().mockReturnValue(isBound);

  const getBoundDestinationMock = jest.fn().mockReturnValue(boundDestination);

  const bindMock = bindResult !== undefined ? jest.fn().mockResolvedValue(bindResult) : jest.fn();

  return {
    isBound: isBoundMock,
    sendLinkToDestination: jest.fn().mockResolvedValue(sendLinkToDestinationResult),
    sendTextToDestination: jest.fn().mockResolvedValue(sendTextToDestinationResult),
    getBoundDestination: getBoundDestinationMock,
    bind: bindMock,
    unbind: jest.fn(),
    focusBoundDestination: jest.fn(),
    bindAndFocus: jest.fn(),
    bindAndJump: jest.fn().mockResolvedValue(false),
    dispose: jest.fn(),
  } as unknown as jest.Mocked<PasteDestinationManager>;
};
