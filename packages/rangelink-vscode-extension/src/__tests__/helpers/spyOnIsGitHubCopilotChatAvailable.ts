import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import * as isGitHubCopilotChatAvailableModule from '../../utils/aiAssistants/isGitHubCopilotChatAvailable';

import type { Logger } from '@couimet/logger-contract';

export const spyOnIsGitHubCopilotChatAvailable = (): jest.SpyInstance<
  Promise<boolean>,
  [VscodeAdapter, Logger]
> => jest.spyOn(isGitHubCopilotChatAvailableModule, 'isGitHubCopilotChatAvailable');
