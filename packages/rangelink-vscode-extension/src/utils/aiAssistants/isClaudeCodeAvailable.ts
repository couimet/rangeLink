import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

export const CLAUDE_CODE_EXTENSION_ID = 'anthropic.claude-code';

export const isClaudeCodeAvailable = (ideAdapter: VscodeAdapter, logger: Logger): boolean => {
  const extension = ideAdapter.getExtension(CLAUDE_CODE_EXTENSION_ID);
  const isAvailable = extension !== undefined && extension.isActive;

  logger.debug(
    {
      fn: 'isClaudeCodeAvailable',
      extensionId: CLAUDE_CODE_EXTENSION_ID,
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
