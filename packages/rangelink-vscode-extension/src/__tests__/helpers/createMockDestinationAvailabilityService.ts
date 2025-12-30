import type { DestinationAvailabilityService } from '../../destinations/DestinationAvailabilityService';
import { MessageCode } from '../../types/MessageCode';

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
      getAvailableDestinations: jest.fn().mockResolvedValue([]),
    }) as unknown as jest.Mocked<DestinationAvailabilityService>;
