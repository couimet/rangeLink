import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { CursorAIDestination } from '../../destinations/CursorAIDestination';
import { createMockFormattedLink, testDestinationInterfaceCompliance } from '../helpers';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';

describe('CursorAIDestination', () => {
  let destination: CursorAIDestination;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;

  const configureMockAsNonCursor = () => {
    const mockVscode = mockAdapter.__getVscodeInstance();
    (mockVscode.env as any).appName = 'Visual Studio Code';
    (mockVscode.env as any).uriScheme = 'vscode';
    (mockVscode.extensions as any).all = [];
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    destination = new CursorAIDestination(mockAdapter, mockLogger);
    configureMockAsNonCursor();
  });

  // Test interface compliance using helper
  testDestinationInterfaceCompliance(
    new CursorAIDestination(createMockVscodeAdapter(), createMockLogger()),
    'cursor-ai',
    'Cursor AI Assistant',
  );

  describe('isAvailable() - Detection via appName (PRIMARY)', () => {
    it('should return true when appName contains "cursor"', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return true when appName contains "cursor" (lowercase)', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'cursor';

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return true when appName contains "cursor" (mixed case)', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor Editor';

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should log detection via appName', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';

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
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.extensions as any).all = [
        { id: 'cursor.cursor-ai', isActive: true },
        { id: 'cursor.some-other', isActive: true },
      ];

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when no cursor extensions are present', async () => {
      // All checks fail
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.extensions as any).all = [{ id: 'other.extension', isActive: true }];

      expect(await destination.isAvailable()).toBe(false);
    });

    it('should log detection via extensions', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.extensions as any).all = [{ id: 'cursor.cursor-ai', isActive: true }];

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
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).uriScheme = 'cursor';

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when uriScheme is not "cursor"', async () => {
      // All checks fail (default uriScheme is 'vscode')
      expect(await destination.isAvailable()).toBe(false);
    });

    it('should log detection via uriScheme', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).uriScheme = 'cursor';

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
      // Mock Cursor environment (use appName for simplicity)
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Cursor';
    });

    it('should return false when not running in Cursor IDE', async () => {
      // Override to non-Cursor environment
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.env as any).appName = 'Visual Studio Code';

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(false);
    });

    it('should copy text to clipboard', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();

      await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledWith('src/file.ts#L10');
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

    it('should show notification prompting user to paste', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();

      await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(mockVscode.window.showInformationMessage).toHaveBeenCalledWith(
        'RangeLink copied to clipboard. Paste (Cmd/Ctrl+V) in Cursor chat to use.',
      );
    });

    it('should return true when clipboard copy succeeds', async () => {
      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(true);
    });

    it('should log clipboard workaround completion', async () => {
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
        'Clipboard workaround completed for link',
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
        },
        'Cannot paste: Not running in Cursor IDE',
      );
    });

    it('should return false and log error when clipboard write fails', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);
      const expectedError = new Error('Clipboard access denied');
      (mockVscode.env.clipboard.writeText as jest.Mock).mockRejectedValueOnce(expectedError);

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.pasteLink',
          formattedLink,
          error: expectedError,
        },
        'Failed to execute clipboard workaround',
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
        },
        'All chat open commands failed',
      );
    });

    it('should still return true and show notification when chat commands fail', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      (mockVscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error('Command not found'),
      );

      const result = await destination.pasteLink(createMockFormattedLink('link'));

      expect(result).toBe(true); // Clipboard copy succeeded
      expect(mockVscode.window.showInformationMessage).toHaveBeenCalled();
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
      expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should handle very long text', async () => {
      const mockVscode = mockAdapter.__getVscodeInstance();
      const longText = 'x'.repeat(10000);

      const result = await destination.pasteLink(createMockFormattedLink(longText));

      expect(result).toBe(true);
      expect(mockVscode.env.clipboard.writeText).toHaveBeenCalledWith(longText);
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

    it('should copy content to clipboard', async () => {
      const testContent = 'selected text from editor';
      const writeTextSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard');

      await destination.pasteContent(testContent);

      expect(writeTextSpy).toHaveBeenCalledWith(testContent);
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

    it('should show notification prompting user to paste', async () => {
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      await destination.pasteContent('text');

      expect(showInfoSpy).toHaveBeenCalledWith(
        'Text copied to clipboard. Paste (Cmd/Ctrl+V) in Cursor chat to use.',
      );
    });

    it('should return true when clipboard copy succeeds', async () => {
      const result = await destination.pasteContent('text');

      expect(result).toBe(true);
    });

    it('should log clipboard workaround completion', async () => {
      const testContent = 'selected text';

      await destination.pasteContent(testContent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.pasteContent',
          contentLength: testContent.length,
          chatOpened: true,
        },
        `Clipboard workaround completed for content (${testContent.length} chars)`,
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

    it('should return false and log error when clipboard write fails', async () => {
      const testContent = 'text';
      const expectedError = new Error('Clipboard access denied');
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockRejectedValueOnce(expectedError);

      const result = await destination.pasteContent(testContent);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'CursorAIDestination.pasteContent',
          contentLength: testContent.length,
          error: expectedError,
        },
        'Failed to execute clipboard workaround',
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

    it('should still return true and show notification when chat commands fail', async () => {
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Command not found'));
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      const result = await destination.pasteContent('text');

      expect(result).toBe(true);
      expect(showInfoSpy).toHaveBeenCalled();
    });
  });
});
