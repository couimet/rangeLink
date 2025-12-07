import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import { GitHubCopilotChatDestination } from '../../destinations/GitHubCopilotChatDestination';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { MessageCode } from '../../types/MessageCode';
import * as applySmartPaddingModule from '../../utils/applySmartPadding';
import * as formatMessageModule from '../../utils/formatMessage';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';
import { createMockUri } from '../helpers/createMockUri';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';
import { FormattedLink } from 'rangelink-core-ts';

describe('GitHubCopilotChatDestination', () => {
  let destination: GitHubCopilotChatDestination;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapter;
  let mockExtension: vscode.Extension<unknown>;
  let applySmartPaddingSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();

    // Create mock extension for GitHub Copilot Chat
    mockExtension = {
      id: 'GitHub.copilot-chat',
      extensionUri: createMockUri('/path/to/extension'),
      extensionPath: '/path/to/extension',
      isActive: true,
      packageJSON: {},
      exports: undefined,
      activate: jest.fn(),
      extensionKind: 1, // ExtensionKind.Workspace
    } as vscode.Extension<unknown>;

    // Mock applySmartPadding to return predictable output
    applySmartPaddingSpy = jest
      .spyOn(applySmartPaddingModule, 'applySmartPadding')
      .mockImplementation((text) => ` ${text} `);

    destination = new GitHubCopilotChatDestination(mockAdapter, mockLogger);
  });

  describe('Interface compliance', () => {
    it('should have correct id', () => {
      expect(destination.id).toBe('github-copilot-chat');
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe('GitHub Copilot Chat');
    });
  });

  describe('isAvailable()', () => {
    it('should return true when workbench.action.chat.open command exists (without checking extensions)', async () => {
      const getCommandsSpy = jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue([
        'non.relevant.command', // Irrelevant command (should be skipped)
        'another.unrelated.command', // Another irrelevant command
        'workbench.action.chat.open', // Target command (detection succeeds here)
        'third.command.not.checked', // This command shouldn't matter (array already contains target)
      ]);
      const extensionsSpy = jest.spyOn(mockAdapter, 'extensions', 'get');

      const result = await destination.isAvailable();

      expect(result).toBe(true);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.isAvailable',
          chatCommand: 'workbench.action.chat.open',
          detectionMethod: 'command',
        },
        'GitHub Copilot Chat detected via command availability',
      );

      expect(getCommandsSpy).toHaveBeenCalledTimes(1);

      expect(extensionsSpy).not.toHaveBeenCalled();
    });

    it('should return true when GitHub.copilot-chat extension is active (command not found)', async () => {
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([mockExtension]);

      const result = await destination.isAvailable();

      expect(result).toBe(true);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.isAvailable',
          extensionId: 'GitHub.copilot-chat',
          extensionFound: true,
          extensionActive: true,
          detectionMethod: 'extension',
        },
        'GitHub Copilot Chat detected via extension',
      );
    });

    it('should return false when extension exists but not active', async () => {
      const inactiveExtension = {
        ...mockExtension,
        isActive: false,
      };
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([inactiveExtension]);

      const result = await destination.isAvailable();

      expect(result).toBe(false);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.isAvailable',
          extensionId: 'GitHub.copilot-chat',
          extensionFound: true,
          extensionActive: false,
          detectionMethod: 'none',
        },
        'GitHub Copilot Chat not available (command not found, extension not active)',
      );
    });

    it('should return false when extension not found', async () => {
      const result = await destination.isAvailable();

      expect(result).toBe(false);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.isAvailable',
          extensionId: 'GitHub.copilot-chat',
          extensionFound: false,
          extensionActive: false,
          detectionMethod: 'none',
        },
        'GitHub Copilot Chat not available (command not found, extension not active)',
      );
    });
  });

  describe('isEligibleForPasteLink()', () => {
    it('should always return true (no special eligibility rules)', async () => {
      const result = await destination.isEligibleForPasteLink(createMockFormattedLink('link'));

      expect(result).toBe(true);
    });

    it('should always return true (even for null link)', async () => {
      const result = await destination.isEligibleForPasteLink(null as unknown as FormattedLink);

      expect(result).toBe(true);
    });

    it('should always return true (even for undefined link)', async () => {
      const result = await destination.isEligibleForPasteLink(
        undefined as unknown as FormattedLink,
      );

      expect(result).toBe(true);
    });
  });

  describe('isEligibleForPasteContent()', () => {
    it('should always return true (no special eligibility rules)', async () => {
      const result = await destination.isEligibleForPasteContent('content');

      expect(result).toBe(true);
    });

    it('should always return true (even for null content)', async () => {
      const result = await destination.isEligibleForPasteContent(null as unknown as string);

      expect(result).toBe(true);
    });

    it('should always return true (even for undefined content)', async () => {
      const result = await destination.isEligibleForPasteContent(undefined as unknown as string);

      expect(result).toBe(true);
    });
  });

  describe('pasteLink()', () => {
    beforeEach(() => {
      // Setup: GitHub Copilot available via command
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue(['workbench.action.chat.open']);
    });

    it('should return false when extension not available', async () => {
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue([]);
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      const result = await destination.pasteLink(createMockFormattedLink('src/file.ts#L10'));

      expect(result).toBe(false);
    });

    it('should delegate to applySmartPadding before sending', async () => {
      const testLink = 'src/file.ts#L10';
      const formattedLink = createMockFormattedLink(testLink);

      await destination.pasteLink(formattedLink);

      expect(applySmartPaddingSpy).toHaveBeenCalledTimes(1);
      expect(applySmartPaddingSpy).toHaveBeenCalledWith(testLink);
    });

    it('should call executeCommand with padded text and isPartialQuery parameter', async () => {
      const testLink = 'src/file.ts#L10';
      const paddedText = ` ${testLink} `;
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteLink(createMockFormattedLink(testLink));

      expect(executeCommandSpy).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: paddedText, // Verify PADDED text, not original
        isPartialQuery: true,
      });
    });

    it('should return true when command succeeds', async () => {
      const result = await destination.pasteLink(createMockFormattedLink('link'));

      expect(result).toBe(true);
    });

    it('should log info on success', async () => {
      const testLink = 'src/file.ts#L10';
      const formattedLink = createMockFormattedLink(testLink);

      await destination.pasteLink(formattedLink);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        'Pasted link to GitHub Copilot Chat',
      );
    });

    it('should log warning when extension not available', async () => {
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue([]);
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);

      await destination.pasteLink(formattedLink);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
        },
        'Cannot paste link: GitHub Copilot Chat extension not available',
      );
    });

    it('should return false and log error when executeCommand throws', async () => {
      const testLink = 'link';
      const formattedLink = createMockFormattedLink(testLink);
      const expectedError = new Error('Command failed');
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(expectedError);

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.pasteLink',
          formattedLink,
          linkLength: testLink.length,
          error: expectedError,
        },
        'Failed to paste link to GitHub Copilot Chat',
      );
    });

    it('should handle empty link text', async () => {
      const emptyLink = '';
      const paddedText = ` ${emptyLink} `;
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteLink(createMockFormattedLink(emptyLink));

      expect(applySmartPaddingSpy).toHaveBeenCalledWith(emptyLink);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: paddedText,
        isPartialQuery: true,
      });
    });

    it('should handle very long link text without truncation', async () => {
      const longLink = 'a'.repeat(5000);
      const paddedText = ` ${longLink} `;
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteLink(createMockFormattedLink(longLink));

      expect(applySmartPaddingSpy).toHaveBeenCalledWith(longLink);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: paddedText,
        isPartialQuery: true,
      });
    });
  });

  describe('pasteContent()', () => {
    beforeEach(() => {
      // Setup: GitHub Copilot available via command
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue(['workbench.action.chat.open']);
    });

    it('should return false when extension not available', async () => {
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue([]);
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      const result = await destination.pasteContent('selected text');

      expect(result).toBe(false);
    });

    it('should delegate to applySmartPadding before sending', async () => {
      const testContent = 'selected text';

      await destination.pasteContent(testContent);

      expect(applySmartPaddingSpy).toHaveBeenCalledTimes(1);
      expect(applySmartPaddingSpy).toHaveBeenCalledWith(testContent);
    });

    it('should call executeCommand with padded text and isPartialQuery parameter', async () => {
      const testContent = 'selected text';
      const paddedText = ` ${testContent} `;
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteContent(testContent);

      expect(executeCommandSpy).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: paddedText,
        isPartialQuery: true,
      });
    });

    it('should return true when command succeeds', async () => {
      const result = await destination.pasteContent('text');

      expect(result).toBe(true);
    });

    it('should log info on success', async () => {
      const testContent = 'selected text';

      await destination.pasteContent(testContent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.pasteContent',
          contentLength: testContent.length,
        },
        'Pasted content to GitHub Copilot Chat',
      );
    });

    it('should log warning when extension not available', async () => {
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue([]);
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);
      const testContent = 'text';

      await destination.pasteContent(testContent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.pasteContent',
          contentLength: testContent.length,
        },
        'Cannot paste content: GitHub Copilot Chat extension not available',
      );
    });

    it('should return false and log error when executeCommand throws', async () => {
      const testContent = 'text';
      const expectedError = new Error('Command failed');
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(expectedError);

      const result = await destination.pasteContent(testContent);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.pasteContent',
          contentLength: testContent.length,
          error: expectedError,
        },
        'Failed to paste content to GitHub Copilot Chat',
      );
    });

    it('should handle empty content', async () => {
      const emptyContent = '';
      const paddedText = ` ${emptyContent} `;
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteContent(emptyContent);

      expect(applySmartPaddingSpy).toHaveBeenCalledWith(emptyContent);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: paddedText,
        isPartialQuery: true,
      });
    });

    it('should handle very long content without truncation', async () => {
      const longContent = 'x'.repeat(10000);
      const paddedText = ` ${longContent} `;
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.pasteContent(longContent);

      expect(applySmartPaddingSpy).toHaveBeenCalledWith(longContent);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: paddedText,
        isPartialQuery: true,
      });
    });
  });

  describe('focus()', () => {
    beforeEach(() => {
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue(['workbench.action.chat.open']);
    });

    it('should return false when extension not available', async () => {
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue([]);
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      const result = await destination.focus();

      expect(result).toBe(false);
    });

    it('should call executeCommand WITHOUT query parameter', async () => {
      const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

      await destination.focus();

      expect(executeCommandSpy).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.action.chat.open');
    });

    it('should NOT call applySmartPadding (no text to pad)', async () => {
      await destination.focus();

      // applySmartPadding should not be called for focus (no text)
      expect(applySmartPaddingSpy).not.toHaveBeenCalled();
    });

    it('should return true when chat focus succeeds', async () => {
      const result = await destination.focus();

      expect(result).toBe(true);
    });

    it('should log info on success', async () => {
      await destination.focus();

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.focus',
        },
        'Focused GitHub Copilot Chat',
      );
    });

    it('should log warning when extension not available', async () => {
      jest.spyOn(mockAdapter, 'getCommands').mockResolvedValue([]);
      jest.spyOn(mockAdapter, 'extensions', 'get').mockReturnValue([]);

      await destination.focus();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.focus',
        },
        'Cannot focus: GitHub Copilot Chat extension not available',
      );
    });

    it('should return false and log error when executeCommand throws', async () => {
      const expectedError = new Error('Command failed');
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(expectedError);

      const result = await destination.focus();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'GitHubCopilotChatDestination.focus',
          error: expectedError,
        },
        'Failed to focus GitHub Copilot Chat',
      );
    });
  });

  describe('getUserInstruction()', () => {
    it('should return undefined (no manual instruction needed - automatic paste)', () => {
      const instruction = destination.getUserInstruction();

      expect(instruction).toBeUndefined();
    });
  });

  describe('getJumpSuccessMessage()', () => {
    it('should call formatMessage with STATUS_BAR_JUMP_SUCCESS_GITHUB_COPILOT_CHAT', () => {
      const formatMessageSpy = jest
        .spyOn(formatMessageModule, 'formatMessage')
        .mockReturnValue('✓ Focused GitHub Copilot Chat');

      const message = destination.getJumpSuccessMessage();

      expect(formatMessageSpy).toHaveBeenCalledWith(
        MessageCode.STATUS_BAR_JUMP_SUCCESS_GITHUB_COPILOT_CHAT,
      );
      expect(message).toBe('✓ Focused GitHub Copilot Chat');
    });
  });

  describe('getLoggingDetails()', () => {
    it('should return empty object (no additional details for AI destinations)', () => {
      const details = destination.getLoggingDetails();

      expect(details).toStrictEqual({});
    });
  });

  describe('equals()', () => {
    let otherDestination: GitHubCopilotChatDestination;

    beforeEach(() => {
      otherDestination = new GitHubCopilotChatDestination(mockAdapter, mockLogger);
    });

    it('should return true when comparing with another github-copilot-chat destination', async () => {
      const result = await destination.equals(otherDestination);

      expect(result).toBe(true);
    });

    it('should return false when comparing with different destination type', async () => {
      // Create a mock destination with different id
      const otherType = {
        id: 'claude-code' as const,
        displayName: 'Claude Code',
        isAvailable: jest.fn(),
        isEligibleForPasteLink: jest.fn(),
        isEligibleForPasteContent: jest.fn(),
        pasteLink: jest.fn(),
        pasteContent: jest.fn(),
        focus: jest.fn(),
        getUserInstruction: jest.fn(),
        getJumpSuccessMessage: jest.fn(),
        getLoggingDetails: jest.fn(),
        equals: jest.fn(),
      };

      const result = await destination.equals(otherType);

      expect(result).toBe(false);
    });

    it('should return false when comparing with undefined', async () => {
      const result = await destination.equals(undefined);

      expect(result).toBe(false);
    });

    it('should compare by id (AI assistants are singletons)', async () => {
      const sameIdDestination = new GitHubCopilotChatDestination(mockAdapter, mockLogger);

      const result = await destination.equals(sameIdDestination);

      expect(result).toBe(true);
    });
  });
});
