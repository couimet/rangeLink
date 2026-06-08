import type { PasteDestination } from '../../destinations';

export const createMockPasteDestinationForSendRouter = (
  overrides: Partial<PasteDestination> = {},
): jest.Mocked<PasteDestination> =>
  ({
    id: 'terminal',
    displayName: 'Terminal ("bash")',
    rawLabel: 'bash',
    isAvailable: jest.fn().mockResolvedValue(true),
    isEligibleForPasteLink: jest.fn().mockResolvedValue(true),
    isEligibleForPasteContent: jest.fn().mockResolvedValue(true),
    pasteLink: jest.fn().mockResolvedValue(true),
    pasteContent: jest.fn().mockResolvedValue(true),
    getSupportedLinkTypes: jest.fn().mockReturnValue([]),
    getSupportedContentTypes: jest.fn().mockReturnValue([]),
    shouldPreserveClipboard: jest.fn().mockReturnValue(true),
    focus: jest.fn().mockResolvedValue(true),
    getJumpSuccessMessage: jest.fn().mockReturnValue(''),
    getLoggingDetails: jest.fn().mockReturnValue({}),
    getDestinationUri: jest.fn().mockReturnValue(undefined),
    equals: jest.fn().mockResolvedValue(false),
    ...overrides,
  }) as unknown as jest.Mocked<PasteDestination>;
