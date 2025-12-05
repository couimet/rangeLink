import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { ClaudeCodeDestination } from '../../destinations/ClaudeCodeDestination';
import { PasteDestination } from '../../destinations/PasteDestination';
import { messagesEn } from '../../i18n/messages.en';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../../types/AutoPasteResult';
import { MessageCode } from '../../types/MessageCode';
import * as formatMessageModule from '../../utils/formatMessage';
import { createMockChatPasteHelperFactory } from '../helpers/createMockChatPasteHelperFactory';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

describe('ClaudeCodeDestination', () => {
  let destination: ClaudeCodeDestination;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapter;
  let mockChatPasteHelperFactory: ReturnType<typeof createMockChatPasteHelperFactory>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockChatPasteHelperFactory = createMockChatPasteHelperFactory();

    // Default test instances (tests can override if they need special behavior)
    mockAdapter = createMockVscodeAdapter();
    destination = new ClaudeCodeDestination(mockAdapter, mockChatPasteHelperFactory, mockLogger);
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

  describe('getFocusCommands()', () => {
    it('should return Claude Code command array in correct order', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commands = (destination as any).getFocusCommands();

      expect(commands).toStrictEqual([
        'claude-vscode.focus',
        'claude-vscode.sidebar.open',
        'claude-vscode.editor.open',
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

      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS);
      expect(instruction).toBe(messagesEn[MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS]);
      expect(instruction).toBe('Paste (Cmd/Ctrl+V) in Claude Code chat to use.');
    });
  });

  describe('getJumpSuccessMessage()', () => {
    it('should return formatted message for status bar with correct MessageCode', () => {
      const formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');

      const message = destination.getJumpSuccessMessage();

      expect(formatMessageSpy).toHaveBeenCalledWith(
        MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE,
      );
      expect(message).toBe(messagesEn[MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE]);
      expect(message).toBe('✓ Focused Claude Code Chat');
    });
  });

  describe('Integration tests', () => {
    describe('pasteLink()', () => {
      it('should delegate to base class and use displayName in log messages', async () => {
        mockAdapter = createMockVscodeAdapter({
          extensionsOptions: ['anthropic.claude-code'],
        });
        const destination = new ClaudeCodeDestination(
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
            fn: 'ClaudeCodeDestination.pasteLink',
            formattedLink,
            linkLength: testLink.length,
          },
          'Pasted link to Claude Code Chat',
        );
      });
    });

    describe('pasteContent()', () => {
      it('should delegate to base class and use displayName in log messages', async () => {
        mockAdapter = createMockVscodeAdapter({
          extensionsOptions: ['anthropic.claude-code'],
        });
        const destination = new ClaudeCodeDestination(
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
            fn: 'ClaudeCodeDestination.pasteContent',
            contentLength: testContent.length,
          },
          'Pasted content to Claude Code Chat',
        );
      });
    });

    describe('focus()', () => {
      it('should use displayName in log messages', async () => {
        mockAdapter = createMockVscodeAdapter({
          extensionsOptions: ['anthropic.claude-code'],
        });
        const destination = new ClaudeCodeDestination(
          mockAdapter,
          mockChatPasteHelperFactory,
          mockLogger,
        );

        const result = await destination.focus();

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'ClaudeCodeDestination.focus',
          },
          'Focused Claude Code Chat',
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
      it('should return true when comparing same type (claude-code)', async () => {
        const otherDestination = new ClaudeCodeDestination(
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
  });
});
