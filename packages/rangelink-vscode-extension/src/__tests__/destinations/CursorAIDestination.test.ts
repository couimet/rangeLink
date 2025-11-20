import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { CursorAIDestination } from '../../destinations/CursorAIDestination';
import { messagesEn } from '../../i18n/messages.en';
import { MessageCode } from '../../types/MessageCode';
import * as formatMessageModule from '../../utils/formatMessage';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';

describe('CursorAIDestination', () => {
  let destination: CursorAIDestination;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    // Default: non-Cursor environment
    mockAdapter = createMockVscodeAdapter({
      envOptions: {
        appName: 'Visual Studio Code',
        uriScheme: 'vscode',
      },
    });
    destination = new CursorAIDestination(mockAdapter, mockLogger);
  });

  describe('Interface compliance', () => {
    it('should have correct id', () => {
      expect(destination.id).toBe('cursor-ai');
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe('Cursor AI Assistant');
    });
  });

  describe('isAvailable() - Detection via appName (PRIMARY)', () => {
    it('should return true when appName contains "cursor"', async () => {
      destination = new CursorAIDestination(
        createMockVscodeAdapter({ envOptions: { appName: 'Cursor' } }),
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return true when appName contains "cursor" (lowercase)', async () => {
      destination = new CursorAIDestination(
        createMockVscodeAdapter({ envOptions: { appName: 'cursor' } }),
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return true when appName contains "cursor" (mixed case)', async () => {
      destination = new CursorAIDestination(
        createMockVscodeAdapter({ envOptions: { appName: 'Cursor Editor' } }),
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should log detection via appName', async () => {
      destination = new CursorAIDestination(
        createMockVscodeAdapter({ envOptions: { appName: 'Cursor' } }),
        mockLogger,
      );

      await destination.isAvailable();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.isAvailable',
          method: 'appName',
          appName: 'cursor',
          detected: true,
        },
        'Cursor detected via appName',
      );
    });
  });

  describe('isAvailable() - Detection via extensions (SECONDARY)', () => {
    it('should return true when cursor extensions are present', async () => {
      // appName check will fail (default is 'Visual Studio Code')
      jest
        .spyOn(mockAdapter, 'extensions', 'get')
        .mockReturnValue([
          { id: 'cursor.cursor-ai', isActive: true } as any,
          { id: 'cursor.some-other', isActive: true } as any,
        ]);

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when no cursor extensions are present', async () => {
      // All checks fail
      jest
        .spyOn(mockAdapter, 'extensions', 'get')
        .mockReturnValue([{ id: 'other.extension', isActive: true } as any]);

      expect(await destination.isAvailable()).toBe(false);
    });

    it('should log detection via extensions', async () => {
      jest
        .spyOn(mockAdapter, 'extensions', 'get')
        .mockReturnValue([{ id: 'cursor.cursor-ai', isActive: true } as any]);

      await destination.isAvailable();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.isAvailable',
          method: 'extensions',
          extensionCount: 1,
          detected: true,
        },
        'Cursor detected via extensions (found 1)',
      );
    });
  });

  describe('isAvailable() - Detection via uriScheme (TERTIARY)', () => {
    it('should return true when uriScheme is "cursor"', async () => {
      // appName and extensions checks will fail
      destination = new CursorAIDestination(
        createMockVscodeAdapter({
          envOptions: {
            appName: 'Visual Studio Code',
            uriScheme: 'cursor',
          },
        }),
        mockLogger,
      );

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when uriScheme is not "cursor"', async () => {
      // All checks fail (default uriScheme is 'vscode')
      expect(await destination.isAvailable()).toBe(false);
    });

    it('should log detection via uriScheme', async () => {
      destination = new CursorAIDestination(
        createMockVscodeAdapter({
          envOptions: { appName: 'Visual Studio Code', uriScheme: 'cursor' },
        }),
        mockLogger,
      );

      await destination.isAvailable();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.isAvailable',
          method: 'uriScheme',
          uriScheme: 'cursor',
          detected: true,
        },
        'Cursor detected via uriScheme',
      );
    });
  });

  describe('isAvailable() - Logging for all methods', () => {
    it('should log final result when not detected', async () => {
      // All checks fail (defaults)
      await destination.isAvailable();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.isAvailable',
          detected: false,
        },
        'Cursor IDE not detected by any method',
      );
    });
  });

  describe('paste() - Clipboard workaround', () => {
    beforeEach(() => {
      // Cursor environment for paste tests
      mockAdapter = createMockVscodeAdapter({
        envOptions: { appName: 'Cursor' },
      });
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      destination = new CursorAIDestination(mockAdapter, mockLogger);
    });

    it('should return false when not running in Cursor IDE', async () => {
      // Override to non-Cursor environment
      destination = new CursorAIDestination(
        createMockVscodeAdapter({ envOptions: { appName: 'Visual Studio Code' } }),
        mockLogger,
      );

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(false);
    });

    it('should NOT copy link to clipboard (RangeLinkService handles this)', async () => {
      await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(mockAdapter.writeTextToClipboard).not.toHaveBeenCalled();
    });

    it('should try opening chat with aichat.newchataction command first', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();

      await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('aichat.newchataction');
    });

    it('should try fallback command if primary fails', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.commands.executeCommand as jest.Mock)
        .mockRejectedValueOnce(new Error('aichat.newchataction not found'))
        .mockResolvedValueOnce(undefined); // workbench.action.toggleAuxiliaryBar succeeds

      await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('aichat.newchataction');
      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.toggleAuxiliaryBar',
      );
    });

    it('should try commands in exact order (primary then fallback)', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      const executeCommandMock = mockVscode.commands.executeCommand as jest.Mock;
      executeCommandMock
        .mockRejectedValueOnce(new Error('aichat.newchataction not found'))
        .mockResolvedValueOnce(undefined); // workbench.action.toggleAuxiliaryBar succeeds

      await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      // Verify exact command sequence
      expect(executeCommandMock).toHaveBeenCalledTimes(2);
      expect(executeCommandMock.mock.calls[0][0]).toBe('aichat.newchataction');
      expect(executeCommandMock.mock.calls[1][0]).toBe('workbench.action.toggleAuxiliaryBar');
    });

    it('should NOT show notification (RangeLinkService handles this via getUserInstruction())', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();

      await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('should return true when chat open succeeds', async () => {
      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(true);
    });

    it('should log chat open completion', async () => {
      const testLink = 'src/file.ts#L10';
      const formattedLink = createMockFormattedLink(testLink);
      await destination.pasteLink(formattedLink);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
          chatOpened: true,
        },
        'Cursor chat open completed',
      );
    });

    it('should log warning when not available', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Visual Studio Code';
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);

      await destination.pasteLink(formattedLink);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        'Cannot paste: Not running in Cursor IDE',
      );
    });

    it('should log warning when all chat commands fail', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);
      (mockVscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error('Command not found'),
      );

      await destination.pasteLink(formattedLink);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        'All chat open commands failed',
      );
    });

    it('should still return true when chat commands fail (RangeLinkService shows notification)', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error('Command not found'),
      );

      const result = await destination.pasteLink(createMockFormattedLink('link'));

      expect(result).toBe(true);
      expect(mockVscode.window.showInformationMessage).not.toHaveBeenCalled(); // RangeLinkService handles notification
    });
  });

  describe('pasteContent() - Clipboard workaround for text', () => {
    beforeEach(() => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
    });

    it('should return false when not running in Cursor IDE', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Visual Studio Code';

      const result = await destination.pasteContent('selected text');

      expect(result).toBe(false);
    });

    it('should NOT copy content to clipboard (RangeLinkService handles this)', async () => {
      const testContent = 'selected text from editor';
      const writeTextSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard');

      await destination.pasteContent(testContent);

      expect(writeTextSpy).not.toHaveBeenCalled();
    });

    it('should try opening chat with aichat.newchataction command first', async () => {
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteContent('text');

      expect(executeCommandSpy).toHaveBeenCalledWith('aichat.newchataction');
    });

    it('should try fallback command if primary fails', async () => {
      const executeCommandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('aichat.newchataction not found'))
        .mockResolvedValueOnce(undefined);

      await destination.pasteContent('text');

      expect(executeCommandSpy).toHaveBeenCalledWith('aichat.newchataction');
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.toggleAuxiliaryBar');
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
          fn: 'CursorAIDestination.pasteContent',
          contentLength: testContent.length,
          chatOpened: true,
        },
        'Cursor chat open completed',
      );
    });

    it('should log warning when not available', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Visual Studio Code';
      const testContent = 'text';

      await destination.pasteContent(testContent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.pasteContent',
          contentLength: testContent.length,
        },
        'Cannot paste: Not running in Cursor IDE',
      );
    });

    it('should log warning when all chat commands fail', async () => {
      const testContent = 'text';
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Command not found'));

      await destination.pasteContent(testContent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.pasteContent',
          contentLength: testContent.length,
        },
        'All chat open commands failed',
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

  describe('Edge cases', () => {
    beforeEach(() => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
    });

    it('should handle empty text in paste', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();

      const result = await destination.pasteLink(createMockFormattedLink(''));

      expect(result).toBe(true);
      expect(mockVscode.env.clipboard.writeText).not.toHaveBeenCalled(); // RangeLinkService handles clipboard
    });

    it('should handle very long text', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      const longText = 'x'.repeat(10000);

      const result = await destination.pasteLink(createMockFormattedLink(longText));

      expect(result).toBe(true);
      expect(mockVscode.env.clipboard.writeText).not.toHaveBeenCalled(); // RangeLinkService handles clipboard
    });
  });

  describe('i18n integration', () => {
    let formatMessageSpy: jest.SpyInstance;

    beforeEach(() => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
      (mockVscode.env as any).uriScheme = 'cursor';
      formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');
    });

    it('should call formatMessage with INFO_CURSOR_AI_USER_INSTRUCTIONS when getting user instruction', () => {
      const instruction = destination.getUserInstruction();

      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS);
      expect(instruction).toBe(messagesEn[MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS]);
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
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
    });

    it('should return false when not running in Cursor IDE', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Visual Studio Code';

      const result = await destination.focus();

      expect(result).toBe(false);
    });

    it('should try opening chat with aichat.newchataction command first', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();

      await destination.focus();

      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('aichat.newchataction');
    });

    it('should try fallback command if primary fails', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.commands.executeCommand as jest.Mock)
        .mockRejectedValueOnce(new Error('aichat.newchataction not found'))
        .mockResolvedValueOnce(undefined);

      await destination.focus();

      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('aichat.newchataction');
      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.toggleAuxiliaryBar',
      );
    });

    it('should return true when chat open succeeds', async () => {
      const result = await destination.focus();

      expect(result).toBe(true);
    });

    it('should log chat open completion', async () => {
      await destination.focus();

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.focus',
          chatOpened: true,
        },
        'Cursor chat open completed',
      );
    });

    it('should log warning when not available', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Visual Studio Code';

      await destination.focus();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'CursorAIDestination.focus' },
        'Cannot paste: Not running in Cursor IDE',
      );
    });

    it('should still return true when all chat commands fail', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error('Command not found'),
      );

      const result = await destination.focus();

      expect(result).toBe(true);
    });
  });

  describe('equals()', () => {
    it('should return true when comparing same type (cursor-ai)', async () => {
      const otherDestination = new CursorAIDestination(mockAdapter, mockLogger);

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
      } as any;

      const result = await destination.equals(claudeCodeDest);

      expect(result).toBe(false);
    });
  });

  describe('getJumpSuccessMessage()', () => {
    it('should call formatMessage with STATUS_BAR_JUMP_SUCCESS_CURSOR_AI', () => {
      const formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');

      const message = destination.getJumpSuccessMessage();

      expect(formatMessageSpy).toHaveBeenCalledWith(MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI);
      expect(message).toBe(messagesEn[MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI]);
    });
  });
});
