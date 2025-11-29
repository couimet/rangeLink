import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { ClaudeCodeDestination } from '../../destinations/ClaudeCodeDestination';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import * as applySmartPaddingModule from '../../utils/applySmartPadding';
import {
  createMockChatPasteHelperFactory,
  type MockChatPasteHelper,
} from '../helpers/createMockChatPasteHelperFactory';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

describe('ClaudeCodeDestination', () => {
  let destination: ClaudeCodeDestination;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapter;
  let mockChatPasteHelperFactory: ReturnType<typeof createMockChatPasteHelperFactory>;
  let mockChatPasteHelper: MockChatPasteHelper;
  let applySmartPaddingSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockChatPasteHelperFactory = createMockChatPasteHelperFactory();
    // Get reference to the mock helper (factory always returns same instance)
    mockChatPasteHelper = mockChatPasteHelperFactory.create() as unknown as MockChatPasteHelper;

    // Spy on applySmartPadding
    applySmartPaddingSpy = jest.spyOn(applySmartPaddingModule, 'applySmartPadding');

    // Default test instances (tests can override if they need special behavior)
    mockAdapter = createMockVscodeAdapter();
    destination = new ClaudeCodeDestination(mockAdapter, mockChatPasteHelperFactory, mockLogger);

    // Clear factory.create() call count so tests can track calls made during test execution
    mockChatPasteHelperFactory.create.mockClear();
  });

  describe('Interface compliance', () => {
    it('should have correct id', () => {
      expect(destination.id).toBe('claude-code');
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe('Claude Code Chat');
    });
  });

  describe('isAvailable()', () => {
    it('should return true when extension is installed and active', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: ['anthropic.claude-code'],
      });
      const destination = new ClaudeCodeDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when extension is not installed', async () => {
      const destination = new ClaudeCodeDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(false);
    });

    it('should return false when extension is installed but not active', async () => {
      mockAdapter = createMockVscodeAdapter({
        extensionsOptions: [{ id: 'anthropic.claude-code', isActive: false }],
      });
      const destination = new ClaudeCodeDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(false);
    });
  });

  describe('isEligibleForPasteLink()', () => {
    it('should accept all links unconditionally (returns true for any input)', async () => {
      // Claude Code accepts all content - test various edge cases to document this behavior
      expect(
        await destination.isEligibleForPasteLink(createMockFormattedLink('src/file.ts#L10')),
      ).toBe(true);
      expect(await destination.isEligibleForPasteLink(createMockFormattedLink(''))).toBe(true);
      expect(await destination.isEligibleForPasteLink(createMockFormattedLink('   '))).toBe(true);
      expect(
        await destination.isEligibleForPasteLink(
          createMockFormattedLink(null as unknown as string),
        ),
      ).toBe(true);
      expect(
        await destination.isEligibleForPasteLink(
          createMockFormattedLink(undefined as unknown as string),
        ),
      ).toBe(true);
    });
  });

  describe('isEligibleForPasteContent()', () => {
    it('should accept all content unconditionally (returns true for any input)', async () => {
      // Claude Code accepts all content - test various edge cases to document this behavior
      expect(await destination.isEligibleForPasteContent('selected text')).toBe(true);
      expect(await destination.isEligibleForPasteContent('')).toBe(true);
      expect(await destination.isEligibleForPasteContent('   ')).toBe(true);
      expect(await destination.isEligibleForPasteContent(null as unknown as string)).toBe(true);
      expect(await destination.isEligibleForPasteContent(undefined as unknown as string)).toBe(
        true,
      );
    });
  });

  describe('pasteLink()', () => {
    it('should delegate to sendTextToChat with correct parameters and return its result', async () => {
      const sendTextToChatSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(destination as any, 'sendTextToChat')
        .mockResolvedValue(true);
      const testLink = 'src/file.ts#L10';
      const formattedLink = createMockFormattedLink(testLink);

      const result = await destination.pasteLink(formattedLink);

      expect(sendTextToChatSpy).toHaveBeenCalledTimes(1);
      expect(sendTextToChatSpy).toHaveBeenCalledWith({
        text: testLink,
        logContext: {
          fn: 'ClaudeCodeDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        unavailableMessage: 'Cannot paste: Claude Code extension not available',
        successLogMessage: 'Pasted link to Claude Code',
        errorLogMessage: 'Failed to paste link to Claude Code',
      });
      expect(result).toBe(true);
    });
  });

  describe('pasteContent()', () => {
    it('should delegate to sendTextToChat with correct parameters and return its result', async () => {
      const sendTextToChatSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(destination as any, 'sendTextToChat')
        .mockResolvedValue(false);
      const testContent = 'selected text';

      const result = await destination.pasteContent(testContent);

      expect(sendTextToChatSpy).toHaveBeenCalledTimes(1);
      expect(sendTextToChatSpy).toHaveBeenCalledWith({
        text: testContent,
        logContext: {
          fn: 'ClaudeCodeDestination.pasteContent',
          contentLength: testContent.length,
        },
        unavailableMessage: 'Cannot paste: Claude Code extension not available',
        successLogMessage: 'Pasted content to Claude Code',
        errorLogMessage: 'Failed to paste content to Claude Code',
      });
      expect(result).toBe(false);
    });
  });

  describe('sendTextToChat()', () => {
    it('should apply smart padding and delegate to executeWithAvailabilityCheck with openChat', async () => {
      const executeWithAvailabilityCheckSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(destination as any, 'executeWithAvailabilityCheck')
        .mockResolvedValue(true);
      const openChatSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(destination as any, 'openChat')
        .mockResolvedValue(undefined);
      const testText = 'some text';
      const paddedText = ` ${testText} `; // Mock padding behavior
      applySmartPaddingSpy.mockReturnValue(paddedText);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (destination as any).sendTextToChat({
        text: testText,
        logContext: { fn: 'test' },
        unavailableMessage: 'unavailable',
        successLogMessage: 'success',
        errorLogMessage: 'error',
      });

      // Verify applySmartPadding was called with original text
      expect(applySmartPaddingSpy).toHaveBeenCalledTimes(1);
      expect(applySmartPaddingSpy).toHaveBeenCalledWith(testText);

      // Verify executeWithAvailabilityCheck was called
      expect(executeWithAvailabilityCheckSpy).toHaveBeenCalledTimes(1);
      expect(executeWithAvailabilityCheckSpy).toHaveBeenCalledWith({
        logContext: { fn: 'test' },
        unavailableMessage: 'unavailable',
        successLogMessage: 'success',
        errorLogMessage: 'error',
        execute: expect.any(Function),
      });

      // Verify the execute function calls openChat with padded text
      const executeFunc = (
        executeWithAvailabilityCheckSpy.mock.calls[0][0] as {
          execute: () => Promise<void>;
        }
      ).execute;
      await executeFunc();

      expect(openChatSpy).toHaveBeenCalledWith(paddedText);
      expect(result).toBe(true);
    });
  });

  describe('openChat()', () => {
    it('should call tryFocusCommands and attemptPaste when text provided', async () => {
      const tryFocusCommandsSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(destination as any, 'tryFocusCommands')
        .mockResolvedValue(true);
      const testText = 'test text';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (destination as any).openChat(testText);

      expect(tryFocusCommandsSpy).toHaveBeenCalledTimes(1);
      expect(mockChatPasteHelperFactory.create).toHaveBeenCalledTimes(1);
      expect(mockChatPasteHelper.attemptPaste).toHaveBeenCalledWith(testText, {
        fn: 'ClaudeCodeDestination.openChat',
      });
    });

    it('should only call tryFocusCommands when no text provided', async () => {
      const tryFocusCommandsSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(destination as any, 'tryFocusCommands')
        .mockResolvedValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (destination as any).openChat();

      expect(tryFocusCommandsSpy).toHaveBeenCalledTimes(1);
      expect(mockChatPasteHelperFactory.create).not.toHaveBeenCalled();
      expect(mockChatPasteHelper.attemptPaste).not.toHaveBeenCalled();
    });
  });

    it('should NOT copy content to clipboard (RangeLinkService handles this)', async () => {
      const testContent = 'selected text from editor';
      const writeTextSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard');

      await destination.pasteContent(testContent);

      expect(writeTextSpy).not.toHaveBeenCalled();
    });

    it('should try opening chat with claude-vscode.focus command first', async () => {
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteContent('text');

      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.focus');
    });

    it('should try fallback commands if primary fails', async () => {
      const executeCommandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('claude-vscode.focus not found'))
        .mockResolvedValueOnce(undefined);

      await destination.pasteContent('text');

      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.focus');
      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.sidebar.open');
    });

    it('should NOT show notification (RangeLinkService handles this via getUserInstruction())', async () => {
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      await destination.pasteContent('text');

      expect(showInfoSpy).not.toHaveBeenCalled();
    });

    it('should return true when chat open succeeds', async () => {
      const result = await destination.pasteContent('text');

      expect(result).toBe(true);
    });

    it('should log chat open completion', async () => {
      const testContent = 'selected text';

      await destination.pasteContent(testContent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteContent',
          contentLength: testContent.length,
          chatOpened: true,
        },
        'Claude Code open completed',
      );
    });

    it('should log warning when extension not available', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);
      const testContent = 'text';

      await destination.pasteContent(testContent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteContent',
          contentLength: testContent.length,
        },
        'Cannot paste: Claude Code extension not available',
      );
    });

    it('should log warning when all chat commands fail', async () => {
      const testContent = 'text';
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Command not found'));

      await destination.pasteContent(testContent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteContent',
          contentLength: testContent.length,
        },
        'All Claude Code open commands failed',
      );
    });

    it('should still return true when chat commands fail (RangeLinkService shows notification)', async () => {
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Command not found'));
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      const result = await destination.pasteContent('text');

      expect(result).toBe(true);
      expect(showInfoSpy).not.toHaveBeenCalled(); // RangeLinkService handles notification
    });
  });

  describe('getLoggingDetails()', () => {
    it('should return empty object (no additional details for AI destinations)', () => {
      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual({});
    });
  });

  describe('focus()', () => {
    beforeEach(() => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([mockExtension]);
    });

    it('should return false when extension not available', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      const result = await destination.focus();

      expect(result).toBe(false);
    });

    it('should try opening chat with claude-vscode.focus command first', async () => {
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.focus();

      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.focus');
    });

    it('should try fallback commands if primary fails', async () => {
      const executeCommandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('claude-vscode.focus not found'))
        .mockResolvedValueOnce(undefined);

      await destination.focus();

      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.focus');
      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.sidebar.open');
    });

    it('should return true when chat open succeeds', async () => {
      const result = await destination.focus();

      expect(result).toBe(true);
    });

    it('should log chat open completion', async () => {
      await destination.focus();

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.focus',
          chatOpened: true,
        },
        'Claude Code open completed',
      );
    });

    it('should log warning when extension not available', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      await destination.focus();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'ClaudeCodeDestination.focus' },
        'Cannot paste: Claude Code extension not available',
      );
    });

    it('should still return true when all chat commands fail', async () => {
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Command not found'));

      const result = await destination.focus();

      expect(result).toBe(true);
    });
  });

  describe('equals()', () => {
    it('should return true when comparing same type (claude-code)', async () => {
      const otherDestination = new ClaudeCodeDestination(mockAdapter, mockLogger);

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
      } as any;

      const result = await destination.equals(cursorAIDest);

      expect(result).toBe(false);
    });
  });

  describe('getJumpSuccessMessage()', () => {
    it('should return formatted message for status bar', () => {
      const message = destination.getJumpSuccessMessage();

      expect(message).toBe('✓ Focused Claude Code Chat');
    });
  });
});
