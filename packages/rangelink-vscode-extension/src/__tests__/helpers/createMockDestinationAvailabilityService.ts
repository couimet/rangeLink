import type { DestinationAvailabilityService } from '../../destinations';
import { MessageCode } from '../../types';

/**
 * Create a mock DestinationAvailabilityService for testing.
 * Only mocks the public methods; private properties are omitted via cast.
 */
export const createMockDestinationAvailabilityService =
  (): jest.Mocked<DestinationAvailabilityService> =>
    ({
      isAIAssistantAvailable: jest.fn().mockResolvedValue(false),
      getUnavailableMessageCode: jest
        .fn()
        .mockReturnValue(MessageCode.INFO_CLAUDE_CODE_NOT_AVAILABLE),
      getGroupedDestinationItems: jest.fn().mockResolvedValue({}),
      getTerminalItems: jest.fn().mockResolvedValue([]),
    }) as unknown as jest.Mocked<DestinationAvailabilityService>;
