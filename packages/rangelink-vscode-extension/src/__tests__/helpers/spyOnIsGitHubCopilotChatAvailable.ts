import * as isGitHubCopilotChatAvailableModule from '../../utils/aiAssistants/isGitHubCopilotChatAvailable';

export const spyOnIsGitHubCopilotChatAvailable = (): jest.SpyInstance =>
  jest.spyOn(isGitHubCopilotChatAvailableModule, 'isGitHubCopilotChatAvailable');
