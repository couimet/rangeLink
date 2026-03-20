import { createMockLogger } from 'barebone-logger-testing';

import { createBindAIAssistantCommand } from '../../commands/createBindAIAssistantCommand';
import { AI_ASSISTANT_KINDS, type AIAssistantDestinationKind } from '../../types';
import {
  createMockDestinationAvailabilityService,
  createMockDestinationManager,
  createMockVscodeAdapter,
  spyOnFormatMessage,
} from '../helpers';

describe('createBindAIAssistantCommand', () => {
  const mockLogger = createMockLogger();

  it.each(AI_ASSISTANT_KINDS)(
    'binds to %s when available',
    async (kind: AIAssistantDestinationKind) => {
      const mockAvailability = createMockDestinationAvailabilityService();
      const mockManager = createMockDestinationManager();
      const mockAdapter = createMockVscodeAdapter();
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      (mockAvailability.isAIAssistantAvailable as jest.Mock).mockResolvedValue(true);

      const handler = createBindAIAssistantCommand(
        kind,
        mockAvailability,
        mockManager,
        mockAdapter,
        mockLogger,
      );
      await handler();

      expect(mockAvailability.isAIAssistantAvailable).toHaveBeenCalledWith(kind);
      expect(mockManager.bind).toHaveBeenCalledWith({ kind });
      expect(showInfoSpy).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: `createBindAIAssistantCommand[${kind}]`, kind },
        `Executing bind command for ${kind}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: `createBindAIAssistantCommand[${kind}]`, kind },
        `Bind command completed for ${kind}`,
      );
    },
  );

  it.each(AI_ASSISTANT_KINDS)(
    'shows info message when %s is not available',
    async (kind: AIAssistantDestinationKind) => {
      const formatMessageSpy = spyOnFormatMessage();
      const mockAvailability = createMockDestinationAvailabilityService();
      const mockManager = createMockDestinationManager();
      const mockAdapter = createMockVscodeAdapter();
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      (mockAvailability.isAIAssistantAvailable as jest.Mock).mockResolvedValue(false);

      const handler = createBindAIAssistantCommand(
        kind,
        mockAvailability,
        mockManager,
        mockAdapter,
        mockLogger,
      );
      await handler();

      expect(mockAvailability.isAIAssistantAvailable).toHaveBeenCalledWith(kind);
      expect(mockAvailability.getUnavailableMessageCode).toHaveBeenCalledWith(kind);

      const returnedMessageCode = mockAvailability.getUnavailableMessageCode.mock.results[0].value;
      expect(formatMessageSpy).toHaveBeenCalledWith(returnedMessageCode);

      const renderedMessage = formatMessageSpy.mock.results[0].value;
      expect(showInfoSpy).toHaveBeenCalledWith(renderedMessage);

      expect(mockManager.bind).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: `createBindAIAssistantCommand[${kind}]`, kind },
        `${kind} not available`,
      );
    },
  );
});
