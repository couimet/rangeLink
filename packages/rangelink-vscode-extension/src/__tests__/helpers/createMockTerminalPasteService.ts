import { DetailedResult } from '@couimet/detailed-result';

import type { TerminalPasteService } from '../../services';

export const createMockTerminalPasteService = (): jest.Mocked<TerminalPasteService> =>
  ({
    pasteIntoTerminal: jest.fn().mockResolvedValue(DetailedResult.success(undefined)),
  }) as unknown as jest.Mocked<TerminalPasteService>;
