/**
 * Mock PasteDestinationManager for testing
 *
 * Provides factory function to create mock destination managers with sensible defaults.
 */

import type { PasteDestination, PasteDestinationManager } from '../../destinations';
import { BindAbortReason, QuickPickBindResult, type TerminalBindResult } from '../../types';

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
  /** Mock return value for showDestinationQuickPickForPaste (default: Cancelled) */
  showDestinationQuickPickForPasteResult?: QuickPickBindResult;
  /** Mock return value for bindTerminal (default: aborted with USER_DECLINED_REPLACEMENT) */
  bindTerminalResult?: TerminalBindResult;
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
    showDestinationQuickPickForPasteResult = QuickPickBindResult.Cancelled,
    bindTerminalResult = {
      outcome: 'aborted',
      reason: BindAbortReason.USER_DECLINED_REPLACEMENT,
    },
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
    bind: jest.fn().mockResolvedValue(false),
    bindTerminal: jest.fn().mockResolvedValue(bindTerminalResult),
    unbind: jest.fn(),
    jumpToBoundDestination: jest.fn().mockResolvedValue(false),
    bindAndJump: jest.fn().mockResolvedValue(false),
    showDestinationQuickPickForPaste: jest
      .fn()
      .mockResolvedValue(showDestinationQuickPickForPasteResult),
    dispose: jest.fn(),
  } as unknown as jest.Mocked<PasteDestinationManager>;
};
