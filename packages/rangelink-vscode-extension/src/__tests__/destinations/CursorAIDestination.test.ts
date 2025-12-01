import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { CursorAIDestination } from '../../destinations/CursorAIDestination';
import { PasteDestination } from '../../destinations/PasteDestination';
import { messagesEn } from '../../i18n/messages.en';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../../types/AutoPasteResult';
import { MessageCode } from '../../types/MessageCode';
import * as formatMessageModule from '../../utils/formatMessage';
import { createMockChatPasteHelperFactory } from '../helpers/createMockChatPasteHelperFactory';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

describe('CursorAIDestination', () => {
  let destination: CursorAIDestination;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapter;
  let mockChatPasteHelperFactory: ReturnType<typeof createMockChatPasteHelperFactory>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockChatPasteHelperFactory = createMockChatPasteHelperFactory();

    // Default test instances (tests can override if they need special behavior)
    mockAdapter = createMockVscodeAdapter();
    destination = new CursorAIDestination(mockAdapter, mockChatPasteHelperFactory, mockLogger);
  });

  describe('Interface compliance', () => {
    it('should have correct id', () => {
      expect(destination.id).toBe('cursor-ai');
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe('Cursor AI Assistant');
    });
  });

  describe('isAvailable()', () => {
    it('should return true when appName contains "Cursor"', async () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Cursor' },
      });
      const destination = new CursorAIDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return true when appName contains "cursor" (lowercase)', async () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'cursor' },
      });
      const destination = new CursorAIDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return true when appName contains "Cursor Editor" (mixed case)', async () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Cursor Editor' },
      });
      const destination = new CursorAIDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return true when Cursor-specific extensions are present', async () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Visual Studio Code' },
        extensionsOptions: ['cursor.cursor-ai', 'cursor.some-other'],
      });
      const destination = new CursorAIDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return true when uriScheme is "cursor"', async () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: {
          appName: 'Visual Studio Code',
          uriScheme: 'cursor',
        },
      });
      const destination = new CursorAIDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when no Cursor indicators are present', async () => {
      mockAdapter = createMockVscodeAdapter({
        envOptions: {
          appName: 'Visual Studio Code',
          uriScheme: 'vscode',
        },
      });
      const destination = new CursorAIDestination(
        mockAdapter,
        mockChatPasteHelperFactory,
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(false);
    });
  });

  describe('getFocusCommands()', () => {
    it('should return Cursor AI command array in correct order', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commands = (destination as any).getFocusCommands();

      expect(commands).toStrictEqual([
        'aichat.newchataction',
        'workbench.action.toggleAuxiliaryBar',
      ]);
    });
  });

  describe('getUserInstruction()', () => {
    it('should return undefined when automatic paste succeeds', () => {
      const instruction = destination.getUserInstruction(AutoPasteResult.Success);

      expect(instruction).toBeUndefined();
    });

    it('should return formatted user instruction message when automatic paste fails', () => {
      const formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');

      const instruction = destination.getUserInstruction(AutoPasteResult.Failure);

      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS);
      expect(instruction).toBe(messagesEn[MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS]);
      expect(instruction).toBe('Paste (Cmd/Ctrl+V) in Cursor AI chat to use.');
    });
  });

  describe('getJumpSuccessMessage()', () => {
    it('should return formatted message for status bar with correct MessageCode', () => {
      const formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');

      const message = destination.getJumpSuccessMessage();

      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI);
      expect(message).toBe(messagesEn[MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI]);
      expect(message).toBe('✓ Focused Cursor AI Assistant');
    });
  });

  describe('Integration tests', () => {
    describe('pasteLink()', () => {
      it('should delegate to base class and use displayName in log messages', async () => {
        mockAdapter = createMockVscodeAdapter({
          extensionsOptions: ['cursor.cursor-ai'],
        });
        const destination = new CursorAIDestination(
          mockAdapter,
          mockChatPasteHelperFactory,
          mockLogger,
        );

        const testLink = 'src/file.ts#L10';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedLink = { link: testLink } as any;
        const result = await destination.pasteLink(formattedLink);

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            contentType: 'Link',
            fn: 'CursorAIDestination.pasteLink',
            formattedLink,
            linkLength: testLink.length,
          },
          'Pasted link to Cursor AI Assistant',
        );
      });
    });

    describe('pasteContent()', () => {
      it('should delegate to base class and use displayName in log messages', async () => {
        mockAdapter = createMockVscodeAdapter({
          extensionsOptions: ['cursor.cursor-ai'],
        });
        const destination = new CursorAIDestination(
          mockAdapter,
          mockChatPasteHelperFactory,
          mockLogger,
        );
        const testContent = 'selected text';

        const result = await destination.pasteContent(testContent);

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            contentType: 'Text',
            fn: 'CursorAIDestination.pasteContent',
            contentLength: testContent.length,
          },
          'Pasted content to Cursor AI Assistant',
        );
      });
    });

    describe('focus()', () => {
      it('should use displayName in log messages', async () => {
        mockAdapter = createMockVscodeAdapter({
          extensionsOptions: ['cursor.cursor-ai'],
        });
        const destination = new CursorAIDestination(
          mockAdapter,
          mockChatPasteHelperFactory,
          mockLogger,
        );

        const result = await destination.focus();

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'CursorAIDestination.focus',
          },
          'Focused Cursor AI Assistant',
        );
      });
    });

    describe('getLoggingDetails()', () => {
      it('should return empty object (no additional details for AI destinations)', () => {
        const details = destination.getLoggingDetails();

        expect(details).toStrictEqual({});
      });
    });

    describe('equals()', () => {
      it('should return true when comparing same type (cursor-ai)', async () => {
        const otherDestination = new CursorAIDestination(
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
        const claudeCodeDest = {
          id: 'claude-code',
          displayName: 'Claude Code Chat',
        } as unknown as PasteDestination;

        const result = await destination.equals(claudeCodeDest);

        expect(result).toBe(false);
      });
    });
  });
});
