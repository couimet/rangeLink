import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { EXTENSION_ID_GEMINI_CODE_ASSIST } from './builtInAiAssistants';

import type { Logger } from '@couimet/logger-contract';

export const isGeminiCodeAssistAvailable = (ideAdapter: VscodeAdapter, logger: Logger): boolean => {
  const extension = ideAdapter.getExtension(EXTENSION_ID_GEMINI_CODE_ASSIST);
  const isAvailable = extension !== undefined && extension.isActive;

  logger.debug(
    {
      fn: 'isGeminiCodeAssistAvailable',
      extensionId: EXTENSION_ID_GEMINI_CODE_ASSIST,
      extensionFound: extension !== undefined,
      extensionActive: extension?.isActive ?? false,
    },
    isAvailable
      ? 'Gemini Code Assist detected and active'
      : 'Gemini Code Assist not available (not installed or not active)',
  );

  return isAvailable;
};
