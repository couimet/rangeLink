import type { BindSuccessInfo, PasteDestinationManager } from '../../destinations';
import type { ExtensionResult } from '../../types';

export interface MockDestinationManagerOptions {
  /** Mock return value for sendLinkToDestination (default: false) */
  sendLinkToDestinationResult?: boolean;
  /** Mock return value for sendTextToDestination (default: false) */
  sendTextToDestinationResult?: boolean;
  /** Mock return value for bind() */
  bindResult?: ExtensionResult<BindSuccessInfo>;
}

export const createMockDestinationManager = (
  options: MockDestinationManagerOptions = {},
): jest.Mocked<PasteDestinationManager> => {
  const {
    sendLinkToDestinationResult = false,
    sendTextToDestinationResult = false,
    bindResult,
  } = options;

  const bindMock = bindResult !== undefined ? jest.fn().mockResolvedValue(bindResult) : jest.fn();

  return {
    bind: bindMock,
    unbind: jest.fn(),
    focusBoundDestination: jest.fn(),
    bindAndFocus: jest.fn(),
    sendLinkToDestination: jest.fn().mockResolvedValue(sendLinkToDestinationResult),
    sendTextToDestination: jest.fn().mockResolvedValue(sendTextToDestinationResult),
  } as unknown as jest.Mocked<PasteDestinationManager>;
};
