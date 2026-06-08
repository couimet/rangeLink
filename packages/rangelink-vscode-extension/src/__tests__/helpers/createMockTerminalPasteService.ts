import { Result } from 'rangelink-core-ts';

import type { TerminalPasteService } from '../../services';

export const createMockTerminalPasteService = (): jest.Mocked<TerminalPasteService> =>
  ({
    pasteIntoTerminal: jest.fn().mockResolvedValue(Result.ok(undefined)),
  }) as unknown as jest.Mocked<TerminalPasteService>;
