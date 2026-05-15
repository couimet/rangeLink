import type { Logger } from 'barebone-logger';

import { GITHUB_COPILOT_CHAT_FOCUS_COMMANDS } from '../../destinations/aiAssistantFocusCommands';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { EXTENSION_ID_GITHUB_COPILOT_CHAT } from './builtInAiAssistants';

export const GITHUB_COPILOT_CHAT_COMMAND = 'workbench.action.chat.open';

export const isGitHubCopilotChatAvailable = async (
  ideAdapter: VscodeAdapter,
  logger: Logger,
): Promise<boolean> => {
  const commands = await ideAdapter.getCommands();
  const chatCommand = GITHUB_COPILOT_CHAT_FOCUS_COMMANDS.find((command) =>
    commands.includes(command),
  );
  const commandExists = chatCommand !== undefined;

  if (commandExists) {
    logger.debug(
      {
        fn: 'isGitHubCopilotChatAvailable',
        chatCommand,
        detectionMethod: 'command',
      },
      'GitHub Copilot Chat detected via command availability',
    );
    return true;
  }

  const extension = ideAdapter.getExtension(EXTENSION_ID_GITHUB_COPILOT_CHAT);
  const extensionAvailable = extension !== undefined && extension.isActive;

  logger.debug(
    {
      fn: 'isGitHubCopilotChatAvailable',
      extensionId: EXTENSION_ID_GITHUB_COPILOT_CHAT,
      extensionFound: extension !== undefined,
      extensionActive: extension?.isActive ?? false,
      detectionMethod: extensionAvailable ? 'extension' : 'none',
    },
    extensionAvailable
      ? 'GitHub Copilot Chat detected via extension'
      : 'GitHub Copilot Chat not available (command not found, extension not active)',
  );

  return extensionAvailable;
};
