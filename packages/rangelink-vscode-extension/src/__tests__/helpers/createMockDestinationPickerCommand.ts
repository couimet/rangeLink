/**
 * Mock DestinationPickerCommand for testing
 *
 * Provides factory function to create mock picker commands with sensible defaults.
 */

import type {
  DestinationPickerCommand,
  DestinationPickerResult,
} from '../../commands/DestinationPickerCommand';

/**
 * Options for creating a mock destination picker command
 */
export interface MockDestinationPickerCommandOptions {
  /** Mock result from execute() (default: cancelled) */
  executeResult?: DestinationPickerResult;
}

/**
 * Create a mock DestinationPickerCommand for testing
 *
 * @param options - Optional configuration for the mock
 * @returns Mock DestinationPickerCommand with jest functions
 */
export const createMockDestinationPickerCommand = (
  options: MockDestinationPickerCommandOptions = {},
): jest.Mocked<DestinationPickerCommand> => {
  const { executeResult = { outcome: 'cancelled' } } = options;

  return {
    execute: jest.fn().mockResolvedValue(executeResult),
  } as unknown as jest.Mocked<DestinationPickerCommand>;
};
