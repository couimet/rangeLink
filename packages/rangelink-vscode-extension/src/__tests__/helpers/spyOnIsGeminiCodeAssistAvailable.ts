import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import * as isGeminiCodeAssistAvailableModule from '../../utils/aiAssistants/isGeminiCodeAssistAvailable';

export const spyOnIsGeminiCodeAssistAvailable = (): jest.SpyInstance<
  Promise<boolean>,
  [VscodeAdapter, Logger]
> => jest.spyOn(isGeminiCodeAssistAvailableModule, 'isGeminiCodeAssistAvailable');
