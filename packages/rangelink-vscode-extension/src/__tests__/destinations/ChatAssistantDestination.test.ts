import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { FormattedLink } from 'rangelink-core-ts';

import { ChatAssistantDestination } from '../../destinations/ChatAssistantDestination';
import type { ChatPasteHelperFactory } from '../../destinations/ChatPasteHelperFactory';
import type { DestinationType } from '../../destinations/PasteDestination';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../../types/AutoPasteResult';
import { createMockChatPasteHelperFactory } from '../helpers/createMockChatPasteHelperFactory';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

/**
 * Concrete test implementation of ChatAssistantDestination.
 * Provides minimal implementation of abstract methods for testing base class behavior.
 */
class TestChatAssistantDestination extends ChatAssistantDestination {
  readonly id: DestinationType = 'claude-code';
  readonly displayName = 'Test Chat Assistant';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  protected getFocusCommands(): string[] {
    return ['test.command'];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUserInstruction(_autoPasteResult: AutoPasteResult): string | undefined {
    return undefined;
  }

  getJumpSuccessMessage(): string {
    return 'Test success';
  }
}

describe('ChatAssistantDestination', () => {
  let destination: TestChatAssistantDestination;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapter;
  let mockChatPasteHelperFactory: ChatPasteHelperFactory;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockChatPasteHelperFactory = createMockChatPasteHelperFactory();

    mockAdapter = createMockVscodeAdapter();
    destination = new TestChatAssistantDestination(
      mockAdapter,
      mockChatPasteHelperFactory,
      mockLogger,
    );
  });

  describe('isEligibleForPasteLink()', () => {
    it('should always return true', async () => {
      const formattedLink = { link: 'src/file.ts#L10' } as FormattedLink;

      const result = await destination.isEligibleForPasteLink(formattedLink);

      expect(result).toBe(true);
    });

    it('should return true for for null value', async () => {
      const result = await destination.isEligibleForPasteLink(null as unknown as FormattedLink);

      expect(result).toBe(true);
    });

    it('should return true for for undefined value', async () => {
      const result = await destination.isEligibleForPasteLink(
        undefined as unknown as FormattedLink,
      );

      expect(result).toBe(true);
    });
  });

  describe('isEligibleForPasteContent()', () => {
    it('should always return true', async () => {
      const content = 'selected text content';

      const result = await destination.isEligibleForPasteContent(content);

      expect(result).toBe(true);
    });

    it('should return true for for null value', async () => {
      const result = await destination.isEligibleForPasteContent(null as unknown as string);

      expect(result).toBe(true);
    });

    it('should return true for for undefined value', async () => {
      const result = await destination.isEligibleForPasteContent(undefined as unknown as string);

      expect(result).toBe(true);
    });
  });

  describe('pasteLink()', () => {
    it('should delegate to sendTextToChat and return true when sendTextToChat succeeds', async () => {
      const testLink = 'src/file.ts#L10-L20';
      const formattedLink = { link: testLink } as FormattedLink;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendTextToChatSpy = jest.spyOn(destination as any, 'sendTextToChat');
      sendTextToChatSpy.mockResolvedValue(true);

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(true);
      expect(sendTextToChatSpy).toHaveBeenCalledTimes(1);
      expect(sendTextToChatSpy).toHaveBeenCalledWith({
        contentType: 'Link',
        text: testLink,
        logContext: {
          fn: 'TestChatAssistantDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        unavailableMessage: 'Cannot paste: Test Chat Assistant not available',
        successLogMessage: 'Pasted link to Test Chat Assistant',
        errorLogMessage: 'Failed to paste link to Test Chat Assistant',
      });
    });

    it('should return false when sendTextToChat fails', async () => {
      const testLink = 'src/file.ts#L10-L20';
      const formattedLink = { link: testLink } as FormattedLink;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendTextToChatSpy = jest.spyOn(destination as any, 'sendTextToChat');
      sendTextToChatSpy.mockResolvedValue(false);

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(false);
      expect(sendTextToChatSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('pasteContent()', () => {
    it('should delegate to sendTextToChat and return true when sendTextToChat succeeds', async () => {
      const testContent = 'selected text content';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendTextToChatSpy = jest.spyOn(destination as any, 'sendTextToChat');
      sendTextToChatSpy.mockResolvedValue(true);

      const result = await destination.pasteContent(testContent);

      expect(result).toBe(true);
      expect(sendTextToChatSpy).toHaveBeenCalledTimes(1);
      expect(sendTextToChatSpy).toHaveBeenCalledWith({
        contentType: 'Text',
        text: testContent,
        logContext: {
          fn: 'TestChatAssistantDestination.pasteContent',
          contentLength: testContent.length,
        },
        unavailableMessage: 'Cannot paste: Test Chat Assistant not available',
        successLogMessage: 'Pasted content to Test Chat Assistant',
        errorLogMessage: 'Failed to paste content to Test Chat Assistant',
      });
    });

    it('should return false when sendTextToChat fails', async () => {
      const testContent = 'selected text content';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendTextToChatSpy = jest.spyOn(destination as any, 'sendTextToChat');
      sendTextToChatSpy.mockResolvedValue(false);

      const result = await destination.pasteContent(testContent);

      expect(result).toBe(false);
      expect(sendTextToChatSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('focus()', () => {
    it('should delegate to executeWithAvailabilityCheck and return true when successful', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executeSpy = jest.spyOn(destination as any, 'executeWithAvailabilityCheck');
      executeSpy.mockResolvedValue(true);

      const result = await destination.focus();

      expect(result).toBe(true);
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledWith({
        logContext: { fn: 'TestChatAssistantDestination.focus' },
        unavailableMessage: 'Cannot focus: Test Chat Assistant not available',
        successLogMessage: 'Focused Test Chat Assistant',
        errorLogMessage: 'Failed to focus Test Chat Assistant',
        execute: expect.any(Function),
      });
    });

    it('should return false when executeWithAvailabilityCheck fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executeSpy = jest.spyOn(destination as any, 'executeWithAvailabilityCheck');
      executeSpy.mockResolvedValue(false);

      const result = await destination.focus();

      expect(result).toBe(false);
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration tests', () => {
    describe('pasteLink()', () => {
      it('should delegate to base class and use displayName in log messages', async () => {
        const testLink = 'src/file.ts#L10';
        const formattedLink = { link: testLink } as FormattedLink;

        const result = await destination.pasteLink(formattedLink);

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            contentType: 'Link',
            fn: 'TestChatAssistantDestination.pasteLink',
            formattedLink,
            linkLength: testLink.length,
          },
          'Pasted link to Test Chat Assistant',
        );
      });
    });

    describe('pasteContent()', () => {
      it('should delegate to base class and use displayName in log messages', async () => {
        const testContent = 'selected text';

        const result = await destination.pasteContent(testContent);

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            contentType: 'Text',
            fn: 'TestChatAssistantDestination.pasteContent',
            contentLength: testContent.length,
          },
          'Pasted content to Test Chat Assistant',
        );
      });
    });

    describe('focus()', () => {
      it('should use displayName in log messages', async () => {
        const result = await destination.focus();

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'TestChatAssistantDestination.focus',
          },
          'Focused Test Chat Assistant',
        );
      });
    });
  });
});
