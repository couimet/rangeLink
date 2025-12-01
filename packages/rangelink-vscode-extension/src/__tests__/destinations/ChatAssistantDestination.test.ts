import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { FormattedLink } from 'rangelink-core-ts';

import { ChatAssistantDestination } from '../../destinations/ChatAssistantDestination';
import type { ChatPasteHelperFactory } from '../../destinations/ChatPasteHelperFactory';
import { PasteDestination, type DestinationType } from '../../destinations/PasteDestination';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../../types/AutoPasteResult';
import * as applySmartPaddingModule from '../../utils/applySmartPadding';
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

  describe('getLoggingDetails()', () => {
    it('should return empty object (no additional details for AI destinations)', () => {
      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual({});
    });
  });

  describe('equals()', () => {
    it('should return true when comparing same type (claude-code)', async () => {
      const otherDestination = new TestChatAssistantDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      const result = await destination.equals(otherDestination);

      expect(result).toBe(true);
    });

    it('should return false when comparing with undefined', async () => {
      const result = await destination.equals(undefined);

      expect(result).toBe(false);
    });

    it('should return false when comparing with different destination type', async () => {
      const cursorAIDest = {
        id: 'cursor-ai',
        displayName: 'Cursor AI Assistant',
      } as unknown as PasteDestination;

      const result = await destination.equals(cursorAIDest);

      expect(result).toBe(false);
    });
  });

  describe('sendTextToChat()', () => {
    it('should apply smart padding and delegate to executeWithAvailabilityCheck with enhanced log context', async () => {
      const testText = 'test content';
      const paddedText = '\ntest content\n';
      const testOptions = {
        contentType: 'Link' as const,
        text: testText,
        logContext: { fn: 'TestChatAssistantDestination.pasteLink' },
        unavailableMessage: 'Cannot paste',
        successLogMessage: 'Pasted successfully',
        errorLogMessage: 'Failed to paste',
      };

      const applySmartPaddingSpy = jest.spyOn(applySmartPaddingModule, 'applySmartPadding');
      applySmartPaddingSpy.mockReturnValue(paddedText);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executeSpy = jest.spyOn(destination as any, 'executeWithAvailabilityCheck');
      executeSpy.mockResolvedValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (destination as any).sendTextToChat(testOptions);

      expect(result).toBe(true);
      expect(applySmartPaddingSpy).toHaveBeenCalledTimes(1);
      expect(applySmartPaddingSpy).toHaveBeenCalledWith(testText);
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledWith({
        logContext: {
          fn: 'TestChatAssistantDestination.pasteLink',
          contentType: 'Link',
        },
        unavailableMessage: 'Cannot paste',
        successLogMessage: 'Pasted successfully',
        errorLogMessage: 'Failed to paste',
        execute: expect.any(Function),
      });
    });

    it('should return false when executeWithAvailabilityCheck fails', async () => {
      const testOptions = {
        contentType: 'Text' as const,
        text: 'test content',
        logContext: { fn: 'TestChatAssistantDestination.pasteContent' },
        unavailableMessage: 'Cannot paste',
        successLogMessage: 'Pasted successfully',
        errorLogMessage: 'Failed to paste',
      };

      const applySmartPaddingSpy = jest.spyOn(applySmartPaddingModule, 'applySmartPadding');
      applySmartPaddingSpy.mockReturnValue('\ntest content\n');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executeSpy = jest.spyOn(destination as any, 'executeWithAvailabilityCheck');
      executeSpy.mockResolvedValue(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (destination as any).sendTextToChat(testOptions);

      expect(result).toBe(false);
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('openChat()', () => {
    it('should call tryFocusCommands and create helper to paste text when text is provided', async () => {
      const testText = 'test content';
      const mockHelper = {
        attemptPaste: jest.fn().mockResolvedValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tryFocusSpy = jest.spyOn(destination as any, 'tryFocusCommands');
      tryFocusSpy.mockResolvedValue(undefined);
      const createSpy = jest.spyOn(mockChatPasteHelperFactory, 'create');
      createSpy.mockReturnValue(mockHelper);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (destination as any).openChat(testText);

      expect(tryFocusSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(mockHelper.attemptPaste).toHaveBeenCalledTimes(1);
      expect(mockHelper.attemptPaste).toHaveBeenCalledWith(testText, {
        fn: 'TestChatAssistantDestination.openChat',
      });
    });

    it('should not call ChatPasteHelperFactory.create when text is not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tryFocusSpy = jest.spyOn(destination as any, 'tryFocusCommands');
      tryFocusSpy.mockResolvedValue(undefined);
      const createSpy = jest.spyOn(mockChatPasteHelperFactory, 'create');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (destination as any).openChat();

      expect(tryFocusSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should not call ChatPasteHelperFactory.create when when text is undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tryFocusSpy = jest.spyOn(destination as any, 'tryFocusCommands');
      tryFocusSpy.mockResolvedValue(undefined);
      const createSpy = jest.spyOn(mockChatPasteHelperFactory, 'create');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (destination as any).openChat(undefined);

      expect(tryFocusSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should not call ChatPasteHelperFactory.create when when text is an empty string', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tryFocusSpy = jest.spyOn(destination as any, 'tryFocusCommands');
      tryFocusSpy.mockResolvedValue(undefined);
      const createSpy = jest.spyOn(mockChatPasteHelperFactory, 'create');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (destination as any).openChat('');

      expect(tryFocusSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).not.toHaveBeenCalled();
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
