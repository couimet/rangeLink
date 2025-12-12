import type { Extension } from 'vscode';

import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

export const GITHUB_COPILOT_CHAT_COMMAND = 'workbench.action.chat.open';

export const GITHUB_COPILOT_CHAT_EXTENSION_ID = 'GitHub.copilot-chat';

export const isGitHubCopilotChatAvailable = async (
  ideAdapter: VscodeAdapter,
  logger: Logger,
): Promise<boolean> => {
  const commands = await ideAdapter.getCommands();
  const commandExists = commands.includes(GITHUB_COPILOT_CHAT_COMMAND);

  if (commandExists) {
    logger.debug(
      {
        fn: 'isGitHubCopilotChatAvailable',
        chatCommand: GITHUB_COPILOT_CHAT_COMMAND,
        detectionMethod: 'command',
      },
      'GitHub Copilot Chat detected via command availability',
    );
    return true;
  }

  const extension = ideAdapter.extensions.find(
    (ext: Extension<unknown>) => ext.id === GITHUB_COPILOT_CHAT_EXTENSION_ID,
  );
  const extensionAvailable = extension !== undefined && extension.isActive;

  logger.debug(
    {
      fn: 'isGitHubCopilotChatAvailable',
      extensionId: GITHUB_COPILOT_CHAT_EXTENSION_ID,
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
