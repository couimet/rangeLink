import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { EXTENSION_ID_CLINE } from './builtInAiAssistants';

import type { Logger } from '@couimet/logger-contract';

export const isClineAvailable = (ideAdapter: VscodeAdapter, logger: Logger): boolean => {
  const extension = ideAdapter.getExtension(EXTENSION_ID_CLINE);
  const isAvailable = extension !== undefined && extension.isActive;

  logger.debug(
    {
      fn: 'isClineAvailable',
      extensionId: EXTENSION_ID_CLINE,
      extensionFound: extension !== undefined,
      extensionActive: extension?.isActive ?? false,
    },
    isAvailable ? 'Cline extension detected and active' : 'Cline extension not available (not installed or not active)',
  );

  return isAvailable;
};
