import { createMockLogger } from '@couimet/logger-contract-testing';

import {
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../../../__tests__/helpers';
import { GITHUB_COPILOT_CHAT_FOCUS_COMMANDS } from '../../../destinations/aiAssistantFocusCommands';
import { EXTENSION_ID_GITHUB_COPILOT_CHAT } from '../../aiAssistants/builtInAiAssistants';
import {
  isGitHubCopilotChatAvailable,
  GITHUB_COPILOT_CHAT_COMMAND,
} from '../../aiAssistants/isGitHubCopilotChatAvailable';

describe('isGitHubCopilotChatAvailable', () => {
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('command-based detection (primary)', () => {
    it('should return true when chat command exists', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: { availableCommands: [GITHUB_COPILOT_CHAT_COMMAND] },
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGitHubCopilotChatAvailable',
          chatCommand: 'workbench.action.chat.open',
          detectionMethod: 'command',
        },
        'GitHub Copilot Chat detected via command availability',
      );
    });

    it('should return true when chat command is among many commands', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: {
          availableCommands: [
            'other.command.one',
            GITHUB_COPILOT_CHAT_COMMAND,
            'another.command.two',
          ],
        },
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGitHubCopilotChatAvailable',
          chatCommand: 'workbench.action.chat.open',
          detectionMethod: 'command',
        },
        'GitHub Copilot Chat detected via command availability',
      );
    });

    it('should not check extension when command detection succeeds', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: { availableCommands: [GITHUB_COPILOT_CHAT_COMMAND] },
        extensionsOptions: [{ id: EXTENSION_ID_GITHUB_COPILOT_CHAT, isActive: true }],
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGitHubCopilotChatAvailable',
          chatCommand: 'workbench.action.chat.open',
          detectionMethod: 'command',
        },
        'GitHub Copilot Chat detected via command availability',
      );
    });
  });

  describe('extension-based detection (fallback)', () => {
    it('should return true when extension is installed and active', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: { availableCommands: [] },
        extensionsOptions: [{ id: EXTENSION_ID_GITHUB_COPILOT_CHAT, isActive: true }],
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGitHubCopilotChatAvailable',
          extensionId: 'github.copilot-chat',
          extensionFound: true,
          extensionActive: true,
          detectionMethod: 'extension',
        },
        'GitHub Copilot Chat detected via extension',
      );
    });

    it('should return false when extension is installed but inactive', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: { availableCommands: [] },
        extensionsOptions: [{ id: EXTENSION_ID_GITHUB_COPILOT_CHAT, isActive: false }],
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGitHubCopilotChatAvailable',
          extensionId: 'github.copilot-chat',
          extensionFound: true,
          extensionActive: false,
          detectionMethod: 'none',
        },
        'GitHub Copilot Chat not available (command not found, extension not active)',
      );
    });

    it('should return false when extension is not installed', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: { availableCommands: [] },
        extensionsOptions: [],
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGitHubCopilotChatAvailable',
          extensionId: 'github.copilot-chat',
          extensionFound: false,
          extensionActive: false,
          detectionMethod: 'none',
        },
        'GitHub Copilot Chat not available (command not found, extension not active)',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty command list', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: { availableCommands: [] },
        extensionsOptions: [],
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
    });

    it('should match fallback focus command when primary is not registered', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: {
          availableCommands: ['workbench.panel.chat.view.copilot.focus'],
        },
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGitHubCopilotChatAvailable',
          chatCommand: 'workbench.panel.chat.view.copilot.focus',
          detectionMethod: 'command',
        },
        'GitHub Copilot Chat detected via command availability',
      );
    });

    it('should handle other Copilot extensions without chat', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: { availableCommands: [] },
        extensionsOptions: [{ id: 'GitHub.copilot', isActive: true }],
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(false);
    });

    it('should handle multiple extensions when Copilot Chat is active', async () => {
      mockAdapter = createMockVscodeAdapter({
        commandsOptions: { availableCommands: [] },
        extensionsOptions: [
          { id: 'other.extension', isActive: true },
          { id: EXTENSION_ID_GITHUB_COPILOT_CHAT, isActive: true },
          { id: 'another.extension', isActive: false },
        ],
      });

      const result = await isGitHubCopilotChatAvailable(mockAdapter, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'isGitHubCopilotChatAvailable',
          extensionId: 'github.copilot-chat',
          extensionFound: true,
          extensionActive: true,
          detectionMethod: 'extension',
        },
        'GitHub Copilot Chat detected via extension',
      );
    });
  });
});

describe('GITHUB_COPILOT_CHAT_FOCUS_COMMANDS', () => {
  it('should export focus commands array with primary and fallback commands', () => {
    expect(GITHUB_COPILOT_CHAT_FOCUS_COMMANDS).toStrictEqual([
      'workbench.action.chat.open',
      'workbench.panel.chat.view.copilot.focus',
    ]);
  });
});
