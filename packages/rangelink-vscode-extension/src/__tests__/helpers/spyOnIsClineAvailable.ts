import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import * as isClineAvailableModule from '../../utils/aiAssistants/isClineAvailable';

import type { Logger } from '@couimet/logger-contract';

export const spyOnIsClineAvailable = (): jest.SpyInstance<boolean, [VscodeAdapter, Logger]> => jest.spyOn(isClineAvailableModule, 'isClineAvailable');
