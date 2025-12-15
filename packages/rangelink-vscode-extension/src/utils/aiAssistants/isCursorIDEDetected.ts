import type { Logger } from 'barebone-logger';
import type { Extension } from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

export const isCursorIDEDetected = (ideAdapter: VscodeAdapter, logger: Logger): boolean => {
  const fnContext = { fn: 'isCursorIDEDetected' };

  const appName = ideAdapter.appName.toLowerCase();
  if (appName.includes('cursor')) {
    logger.debug(
      {
        ...fnContext,
        appName: ideAdapter.appName,
        detectionMethod: 'appName',
      },
      'Cursor IDE detected via appName',
    );
    return true;
  }

  const cursorExtensions = ideAdapter.extensions.filter((ext: Extension<unknown>) =>
    ext.id.startsWith('cursor.'),
  );
  if (cursorExtensions.length > 0) {
    logger.debug(
      {
        ...fnContext,
        extensionIds: cursorExtensions.map((ext: Extension<unknown>) => ext.id),
        detectionMethod: 'extensions',
      },
      'Cursor IDE detected via Cursor-specific extensions',
    );
    return true;
  }

  const uriScheme = ideAdapter.uriScheme;
  if (uriScheme === 'cursor') {
    logger.debug(
      {
        ...fnContext,
        uriScheme,
        detectionMethod: 'uriScheme',
      },
      'Cursor IDE detected via URI scheme',
    );
    return true;
  }

  logger.debug(
    {
      ...fnContext,
      appName: ideAdapter.appName,
      uriScheme,
      extensionCount: ideAdapter.extensions.length,
      detectionMethod: 'none',
    },
    'Cursor IDE not detected',
  );

  return false;
};
