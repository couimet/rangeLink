import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import * as isGeminiCodeAssistAvailableModule from '../../utils/aiAssistants/isGeminiCodeAssistAvailable';

import type { Logger } from '@couimet/logger-contract';

export const spyOnIsGeminiCodeAssistAvailable = (): jest.SpyInstance<boolean, [VscodeAdapter, Logger]> =>
  jest.spyOn(isGeminiCodeAssistAvailableModule, 'isGeminiCodeAssistAvailable');
