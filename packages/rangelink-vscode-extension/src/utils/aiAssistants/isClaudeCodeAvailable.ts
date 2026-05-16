import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { EXTENSION_ID_CLAUDE_CODE } from './builtInAiAssistants';

export const isClaudeCodeAvailable = (ideAdapter: VscodeAdapter, logger: Logger): boolean => {
  const extension = ideAdapter.getExtension(EXTENSION_ID_CLAUDE_CODE);
  const isAvailable = extension !== undefined && extension.isActive;

  logger.debug(
    {
      fn: 'isClaudeCodeAvailable',
      extensionId: EXTENSION_ID_CLAUDE_CODE,
      extensionFound: extension !== undefined,
      extensionActive: extension?.isActive ?? false,
      isAvailable,
    },
    isAvailable
      ? 'Claude Code extension detected and active'
      : 'Claude Code extension not available (not installed or not active)',
  );

  return isAvailable;
};
