import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import { ClaudeCodeDestination } from '../../destinations/ClaudeCodeDestination';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { createMockFormattedLink, testDestinationInterfaceCompliance } from '../helpers';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

describe('ClaudeCodeDestination', () => {
  let destination: ClaudeCodeDestination;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapter;
  let mockExtension: vscode.Extension<unknown>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    const mockVscode = (mockAdapter as any).__getVscodeInstance();
    destination = new ClaudeCodeDestination(mockAdapter, mockLogger);

    // Create mock extension
    mockExtension = {
      id: 'anthropic.claude-code',
      extensionUri: mockVscode.Uri.file('/path/to/extension'),
      extensionPath: '/path/to/extension',
      isActive: true,
      packageJSON: {},
      exports: undefined,
      activate: jest.fn(),
      extensionKind: 1, // ExtensionKind.Workspace
    } as vscode.Extension<unknown>;

    jest.clearAllMocks();
  });

  // Test interface compliance using helper
  testDestinationInterfaceCompliance(
    new ClaudeCodeDestination(createMockVscodeAdapter(), createMockLogger()),
    'claude-code',
    'Claude Code Chat',
  );

  describe('isAvailable() - Extension detection', () => {
    it('should return true when extension is installed and active', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([mockExtension]);

      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when extension is not installed', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      expect(await destination.isAvailable()).toBe(false);
    });

    it('should return false when extension is installed but not active', async () => {
      const inactiveExtension = {
        ...mockExtension,
        isActive: false,
      };
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([inactiveExtension]);

      expect(await destination.isAvailable()).toBe(false);
    });

    it('should log detection result when extension found', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([mockExtension]);

      await destination.isAvailable();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.isAvailable',
          extensionId: 'anthropic.claude-code',
          found: true,
          active: true,
          detected: true,
        },
        'Claude Code extension detected and active',
      );
    });

    it('should log detection result when extension not found', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      await destination.isAvailable();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.isAvailable',
          extensionId: 'anthropic.claude-code',
          found: false,
          active: false,
          detected: false,
        },
        'Claude Code extension not available',
      );
    });
  });

  describe('pasteLink() - Clipboard workaround', () => {
    beforeEach(() => {
      // Mock extension as available (mockExtension.isActive is already true from setup)
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([mockExtension]);
    });

    it('should return false when extension not available', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(false);
    });

    it('should copy link to clipboard', async () => {
      const testLink = 'src/file.ts#L10';
      const writeTextSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard');

      await destination.pasteLink(createMockFormattedLink(testLink));

      expect(writeTextSpy).toHaveBeenCalledWith(testLink);
    });

    it('should try opening chat with claude-vscode.focus command first', async () => {
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteLink(createMockFormattedLink('link'));

      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.focus');
    });

    it('should try fallback commands if primary fails', async () => {
      const executeCommandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('claude-vscode.focus not found'))
        .mockResolvedValueOnce(undefined); // claude-vscode.sidebar.open succeeds

      await destination.pasteLink(createMockFormattedLink('link'));

      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.focus');
      expect(executeCommandSpy).toHaveBeenCalledWith('claude-vscode.sidebar.open');
    });

    it('should show notification prompting user to paste', async () => {
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      await destination.pasteLink(createMockFormattedLink('link'));

      expect(showInfoSpy).toHaveBeenCalledWith(
        'RangeLink copied to clipboard. Paste (Cmd/Ctrl+V) in Claude Code chat to use.',
      );
    });

    it('should return true when clipboard copy succeeds', async () => {
      const result = await destination.pasteLink(createMockFormattedLink('link'));

      expect(result).toBe(true);
    });

    it('should log clipboard workaround completion', async () => {
      const testLink = 'src/file.ts#L10';
      const formattedLink = createMockFormattedLink(testLink);

      await destination.pasteLink(formattedLink);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
          chatOpened: true,
        },
        'Clipboard workaround completed for link',
      );
    });

    it('should log warning when extension not available', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);

      await destination.pasteLink(formattedLink);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteLink',
          formattedLink,
        },
        'Cannot paste: Claude Code extension not available',
      );
    });

    it('should return false and log error when clipboard write fails', async () => {
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);
      const expectedError = new Error('Clipboard access denied');
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockRejectedValueOnce(expectedError);

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteLink',
          formattedLink,
          error: expectedError,
        },
        'Failed to execute clipboard workaround',
      );
    });

    it('should log warning when all chat commands fail', async () => {
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);
      jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValue(new Error('Command not found'));

      await destination.pasteLink(formattedLink);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteLink',
          formattedLink,
        },
        'All Claude Code open commands failed',
      );
    });

    it('should still return true and show notification when chat commands fail', async () => {
      jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValue(new Error('Command not found'));
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      const result = await destination.pasteLink(createMockFormattedLink('link'));

      expect(result).toBe(true);
      expect(showInfoSpy).toHaveBeenCalled();
    });
  });

  describe('pasteContent() - Clipboard workaround for text', () => {
    beforeEach(() => {
      // Mock extension as available (mockExtension.isActive is already true from setup)
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([mockExtension]);
    });

    it('should return false when extension not available', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      const result = await destination.pasteContent('selected text');

      expect(result).toBe(false);
    });

    it('should copy content to clipboard', async () => {
      const testContent = 'selected text from editor';
      const writeTextSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard');

      await destination.pasteContent(testContent);

      expect(writeTextSpy).toHaveBeenCalledWith(testContent);
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

    it('should show notification prompting user to paste', async () => {
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      await destination.pasteContent('text');

      expect(showInfoSpy).toHaveBeenCalledWith(
        'Text copied to clipboard. Paste (Cmd/Ctrl+V) in Claude Code chat to use.',
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
          fn: 'ClaudeCodeDestination.pasteContent',
          contentLength: testContent.length,
          chatOpened: true,
        },
        `Clipboard workaround completed for content (${testContent.length} chars)`,
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

    it('should return false and log error when clipboard write fails', async () => {
      const testContent = 'text';
      const expectedError = new Error('Clipboard access denied');
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockRejectedValueOnce(expectedError);

      const result = await destination.pasteContent(testContent);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteContent',
          contentLength: testContent.length,
          error: expectedError,
        },
        'Failed to execute clipboard workaround',
      );
    });

    it('should log warning when all chat commands fail', async () => {
      const testContent = 'text';
      jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValue(new Error('Command not found'));

      await destination.pasteContent(testContent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteContent',
          contentLength: testContent.length,
        },
        'All Claude Code open commands failed',
      );
    });

    it('should still return true and show notification when chat commands fail', async () => {
      jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValue(new Error('Command not found'));
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      const result = await destination.pasteContent('text');

      expect(result).toBe(true);
      expect(showInfoSpy).toHaveBeenCalled();
    });
  });
});
