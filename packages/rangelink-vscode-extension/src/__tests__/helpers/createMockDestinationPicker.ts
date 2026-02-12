import type { DestinationPicker } from '../../destinations';

export const createMockDestinationPicker = (
  overrides: Partial<jest.Mocked<DestinationPicker>> = {},
): jest.Mocked<DestinationPicker> =>
  ({
    execute: jest.fn(),
    ...overrides,
  }) as unknown as jest.Mocked<DestinationPicker>;
