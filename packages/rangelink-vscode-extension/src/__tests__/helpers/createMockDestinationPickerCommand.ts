import type { DestinationPickerCommand } from '../../commands';

export const createMockDestinationPickerCommand = (
  overrides: Partial<jest.Mocked<DestinationPickerCommand>> = {},
): jest.Mocked<DestinationPickerCommand> =>
  ({
    execute: jest.fn(),
    ...overrides,
  }) as unknown as jest.Mocked<DestinationPickerCommand>;
