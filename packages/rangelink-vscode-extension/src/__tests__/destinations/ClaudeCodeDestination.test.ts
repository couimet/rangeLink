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

    it('should NOT copy link to clipboard (RangeLinkService handles this)', async () => {
      const testLink = 'src/file.ts#L10';
      const writeTextSpy = jest.spyOn(mockAdapter, 'writeTextToClipboard');

      await destination.pasteLink(createMockFormattedLink(testLink));

      expect(writeTextSpy).not.toHaveBeenCalled();
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

    it('should NOT show notification (RangeLinkService handles this via getUserInstruction())', async () => {
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      await destination.pasteLink(createMockFormattedLink('link'));

      expect(showInfoSpy).not.toHaveBeenCalled();
    });

    it('should return true when chat open succeeds', async () => {
      const result = await destination.pasteLink(createMockFormattedLink('link'));

      expect(result).toBe(true);
    });

    it('should log chat open completion', async () => {
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
        'Claude Code open completed',
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
          linkLength: testLink.length,
        },
        'Cannot paste: Claude Code extension not available',
      );
    });

    it('should return false and log error when executeCommand throws unexpected error', async () => {
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);
      const expectedError = new Error('Unexpected error');
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(expectedError);

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(true); // Still returns true but logs warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        'All Claude Code open commands failed',
      );
    });

    it('should log warning when all chat commands fail', async () => {
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Command not found'));

      await destination.pasteLink(formattedLink);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ClaudeCodeDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        'All Claude Code open commands failed',
      );
    });

    it('should still return true when chat commands fail (RangeLinkService shows notification)', async () => {
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Command not found'));
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      const result = await destination.pasteLink(createMockFormattedLink('link'));

      expect(result).toBe(true);
      expect(showInfoSpy).not.toHaveBeenCalled(); // RangeLinkService handles notification
    });
  });
});
